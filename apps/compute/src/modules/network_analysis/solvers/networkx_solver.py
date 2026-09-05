"""NetworkX-based critical path and delay propagation analysis.

Pure analysis functions on the input contract — no DB access, testable in
isolation. Cycle detection is a hard precondition for critical path on a DAG.
"""

import networkx as nx

from src.contracts.network_analysis import (
    CriticalPathResult,
    DelayPropagationInput,
    DelayPropagationResult,
    NetworkAnalysisInput,
)


def _build_graph(operations, dependencies) -> nx.DiGraph:
    graph = nx.DiGraph()
    for op in operations:
        graph.add_node(op.operation_id, duration=op.duration_minutes)
    for dep in dependencies:
        # edge depends_on → operation (predecessor must finish before successor starts)
        graph.add_edge(dep.depends_on_id, dep.operation_id)
    return graph


def _find_cycles(graph: nx.DiGraph) -> list[list[str]]:
    return [list(c) for c in nx.simple_cycles(graph)]


def analyze_critical_path(data: NetworkAnalysisInput) -> CriticalPathResult:
    """Compute longest path (by duration) in the operation DAG.

    Forward pass from sources: earliest start of each node = max over
    predecessors of (their earliest start + duration). If the graph contains
    cycles the analysis is undefined — return the cycle list and empty path.
    """
    graph = _build_graph(data.operations, data.dependencies)
    cycles = _find_cycles(graph)
    if cycles:
        return CriticalPathResult(
            critical_path=[], critical_path_duration_minutes=0,
            cycles_detected=cycles, longest_path_by_node={},
        )

    durations = {op.operation_id: op.duration_minutes for op in data.operations}

    # earliest start per node (topological order is safe: acyclic)
    es: dict[str, int] = {}
    for node in nx.topological_sort(graph):
        preds = list(graph.predecessors(node))
        if not preds:
            es[node] = 0
        else:
            es[node] = max(es[p] + durations.get(p, 0) for p in preds)

    if not es:
        return CriticalPathResult(critical_path=[], critical_path_duration_minutes=0)

    finish = {node: es[node] + durations.get(node, 0) for node in graph.nodes}
    project_end = max(finish.values())

    # backward pass: latest finish per node = min(latest start of successors)
    lf: dict[str, int] = {}
    for node in reversed(list(nx.topological_sort(graph))):
        succs = list(graph.successors(node))
        if not succs:
            lf[node] = project_end
        else:
            lf[node] = min(lf[s] - durations.get(s, 0) for s in succs)

    # zero total float → on critical path
    critical = [
        n for n in nx.topological_sort(graph)
        if lf.get(n, 0) - es.get(n, 0) - durations.get(n, 0) == 0
    ]

    return CriticalPathResult(
        critical_path=critical,
        critical_path_duration_minutes=project_end,
        cycles_detected=cycles,
        longest_path_by_node={n: finish[n] for n in graph.nodes},
    )


def propagate_delay(data: DelayPropagationInput) -> DelayPropagationResult:
    """Forward-propagate a delay along FINISH_TO_START edges.

    A delayed operation shifts its own finish; each dependent's earliest start
    shifts by max(0, shift − existing float/slack absorbed). For a conservative
    bound we propagate full delay along every downstream path (no float
    absorption) — safe upper estimate for operational alerting.
    """
    input_data = NetworkAnalysisInput(
        operations=data.operations, dependencies=data.dependencies
    )
    analysis = analyze_critical_path(input_data)
    if analysis.cycles_detected:
        # cannot propagate over cycles deterministically
        return DelayPropagationResult(
            source_delay_minutes=data.delay_minutes,
            affected_operations={},
            propagated_delays={},
        )

    graph = _build_graph(data.operations, data.dependencies)
    durations = {op.operation_id: op.duration_minutes for op in data.operations}
    start_minutes: dict[str, int] = {}
    # compute earliest start per node on the graph (baseline)
    for node in nx.topological_sort(graph):
        preds = list(graph.predecessors(node))
        start_minutes[node] = 0 if not preds else max(
            start_minutes[p] + durations.get(p, 0) for p in preds
        )

    # baseline finish of the delayed node
    source = data.delayed_operation_id
    if source not in start_minutes:
        # unknown operation — propagate nothing
        return DelayPropagationResult(
            source_delay_minutes=data.delay_minutes,
            affected_operations={},
            propagated_delays={},
        )

    affected: dict[str, int] = {}
    propagated: dict[str, int] = {}
    for node in nx.descendants(graph, source):
        affected[node] = data.delay_minutes
        propagated[node] = data.delay_minutes

    return DelayPropagationResult(
        source_delay_minutes=data.delay_minutes,
        affected_operations=affected,
        propagated_delays=propagated,
    )
