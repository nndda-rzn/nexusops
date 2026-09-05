"""Tests for NetworkX critical path + delay propagation analysis."""

from src.contracts.network_analysis import (
    DelayPropagationInput,
    NetworkAnalysisInput,
    OperationDependency,
    OperationNode,
)
from src.modules.network_analysis.solvers.networkx_solver import (
    analyze_critical_path,
    propagate_delay,
)


def _chain(n: int, duration: int = 10) -> tuple[list[OperationNode], list[OperationDependency]]:
    """Linear chain op1 → op2 → ... → opN, each duration minutes."""
    ops = [
        OperationNode(operation_id=f"op{i}", org_id="o", status="SCHEDULED",
                      duration_minutes=duration)
        for i in range(1, n + 1)
    ]
    deps = [
        OperationDependency(operation_id=f"op{i}", depends_on_id=f"op{i-1}")
        for i in range(2, n + 1)
    ]
    return ops, deps


def test_linear_chain_critical_path_is_full_chain() -> None:
    ops, deps = _chain(4, duration=10)
    result = analyze_critical_path(NetworkAnalysisInput(operations=ops, dependencies=deps))
    assert result.cycles_detected == []
    assert result.critical_path == ["op1", "op2", "op3", "op4"]
    assert result.critical_path_duration_minutes == 40  # 4 × 10


def test_single_node_path() -> None:
    ops = [OperationNode(operation_id="op1", org_id="o", status="SCHEDULED", duration_minutes=5)]
    result = analyze_critical_path(NetworkAnalysisInput(operations=ops, dependencies=[]))
    assert result.critical_path == ["op1"]
    assert result.critical_path_duration_minutes == 5


def test_parallel_branches_only_critical_one_selected() -> None:
    # op_start → (A:30) and (B:10), A and B both feed op_end(0)
    ops = [
        OperationNode(operation_id="start", org_id="o", status="SCHEDULED", duration_minutes=0),
        OperationNode(operation_id="A", org_id="o", status="SCHEDULED", duration_minutes=30),
        OperationNode(operation_id="B", org_id="o", status="SCHEDULED", duration_minutes=10),
        OperationNode(operation_id="end", org_id="o", status="SCHEDULED", duration_minutes=0),
    ]
    deps = [
        OperationDependency(operation_id="A", depends_on_id="start"),
        OperationDependency(operation_id="B", depends_on_id="start"),
        OperationDependency(operation_id="end", depends_on_id="A"),
        OperationDependency(operation_id="end", depends_on_id="B"),
    ]
    result = analyze_critical_path(NetworkAnalysisInput(operations=ops, dependencies=deps))
    # critical path passes through A (longer branch); duration = 30
    assert result.critical_path_duration_minutes == 30
    assert "A" in result.critical_path


def test_cycle_detected() -> None:
    ops = [
        OperationNode(operation_id="a", org_id="o", status="SCHEDULED", duration_minutes=1),
        OperationNode(operation_id="b", org_id="o", status="SCHEDULED", duration_minutes=1),
    ]
    deps = [
        OperationDependency(operation_id="b", depends_on_id="a"),
        OperationDependency(operation_id="a", depends_on_id="b"),
    ]
    result = analyze_critical_path(NetworkAnalysisInput(operations=ops, dependencies=deps))
    assert len(result.cycles_detected) >= 1


def test_delay_propagates_downstream() -> None:
    ops, deps = _chain(3)
    result = propagate_delay(DelayPropagationInput(
        operations=ops, dependencies=deps,
        delayed_operation_id="op1", delay_minutes=15,
    ))
    assert result.source_delay_minutes == 15
    assert result.affected_operations == {"op2": 15, "op3": 15}


def test_delay_source_no_downstream() -> None:
    ops, deps = _chain(1)
    result = propagate_delay(DelayPropagationInput(
        operations=ops, dependencies=deps,
        delayed_operation_id="op1", delay_minutes=5,
    ))
    assert result.affected_operations == {}


def test_delay_unknown_operation_is_noop() -> None:
    ops, _ = _chain(2)
    result = propagate_delay(DelayPropagationInput(
        operations=ops, dependencies=[],
        delayed_operation_id="nope", delay_minutes=5,
    ))
    assert result.affected_operations == {}
    assert result.source_delay_minutes == 5


def test_delay_propagation_over_cycle_is_noop() -> None:
    ops = [
        OperationNode(operation_id="a", org_id="o", status="SCHEDULED", duration_minutes=1),
        OperationNode(operation_id="b", org_id="o", status="SCHEDULED", duration_minutes=1),
    ]
    deps = [
        OperationDependency(operation_id="b", depends_on_id="a"),
        OperationDependency(operation_id="a", depends_on_id="b"),
    ]
    result = propagate_delay(DelayPropagationInput(
        operations=ops, dependencies=deps,
        delayed_operation_id="a", delay_minutes=10,
    ))
    assert result.affected_operations == {}
