"""Network analysis job handlers — validate payload, run analysis, return result.

Registered as CRITICAL_PATH / NETWORK_ANALYSIS / DELAY_PROPAGATION handlers.
Operators pass operation + dependency lists in the job payload. Analysis is
read-only: results are stored on the optimization job.
"""

from typing import Any

from pydantic import ValidationError

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


def _parse_ops(ops: list[dict[str, Any]]) -> list[OperationNode]:
    return [OperationNode.model_validate(op) for op in ops]


def _parse_deps(deps: list[dict[str, Any]]) -> list[OperationDependency]:
    return [OperationDependency.model_validate(d) for d in deps]


async def critical_path_handler(payload: dict[str, Any]) -> dict[str, Any]:
    """CRITICAL_PATH job handler."""
    try:
        ops = _parse_ops(payload.get("operations", []))
        deps = _parse_deps(payload.get("dependencies", []))
        result = analyze_critical_path(NetworkAnalysisInput(operations=ops, dependencies=deps))
    except ValidationError as exc:
        raise ValueError(f"invalid-payload: {exc}") from exc
    return result.model_dump()


async def delay_propagation_handler(payload: dict[str, Any]) -> dict[str, Any]:
    """DELAY_PROPAGATION job handler."""
    try:
        ops = _parse_ops(payload.get("operations", []))
        deps = _parse_deps(payload.get("dependencies", []))
        result = propagate_delay(DelayPropagationInput(
            operations=ops,
            dependencies=deps,
            delayed_operation_id=str(payload.get("delayed_operation_id", "")),
            delay_minutes=int(payload.get("delay_minutes", 0)),
        ))
    except ValidationError as exc:
        raise ValueError(f"invalid-payload: {exc}") from exc
    if result.source_delay_minutes == 0:
        raise ValueError("invalid-payload: delay_minutes must be > 0")
    return result.model_dump()


# default handler for NETWORK_ANALYSIS = critical path (no delay)
async def network_analysis_handler(payload: dict[str, Any]) -> dict[str, Any]:
    return await critical_path_handler(payload)
