"""Network analysis input/output contracts.

Critical path & delay propagation run as async optimization jobs handled by the
compute worker. The API submits operation dependency data; the analysis result
is stored back on the job. Nothing here mutates operations tables — it is a
read-only analysis.
"""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class DependencyType(StrEnum):
    FINISH_TO_START = "FINISH_TO_START"
    START_TO_START = "START_TO_START"
    FINISH_TO_FINISH = "FINISH_TO_FINISH"
    START_TO_FINISH = "START_TO_FINISH"


class OperationNode(BaseModel):
    model_config = ConfigDict(frozen=True)

    operation_id: str
    org_id: str
    status: str
    scheduled_start: str | None = None  # ISO timestamp
    scheduled_end: str | None = None    # ISO timestamp
    actual_end: str | None = None       # ISO timestamp (for delay propagation)
    delay_minutes: int = 0
    duration_minutes: int = Field(default=0, ge=0)


class OperationDependency(BaseModel):
    model_config = ConfigDict(frozen=True)

    operation_id: str
    depends_on_id: str
    depends_on_org_id: str = ""
    dependency_type: DependencyType = DependencyType.FINISH_TO_START


class NetworkAnalysisInput(BaseModel):
    """Input for critical path analysis."""

    operations: list[OperationNode] = Field(default_factory=list)
    dependencies: list[OperationDependency] = Field(default_factory=list)


class DelayPropagationInput(BaseModel):
    """Input for delay propagation — which op is late and by how much."""

    operations: list[OperationNode] = Field(default_factory=list)
    dependencies: list[OperationDependency] = Field(default_factory=list)
    delayed_operation_id: str
    delay_minutes: int = Field(default=0, ge=0)


class CriticalPathResult(BaseModel):
    """Result of critical path analysis."""

    critical_path: list[str] = Field(default_factory=list)
    critical_path_duration_minutes: int = 0
    cycles_detected: list[list[str]] = Field(default_factory=list)
    longest_path_by_node: dict[str, int] = Field(default_factory=dict)


class DelayPropagationResult(BaseModel):
    """Result of delay propagation."""

    source_delay_minutes: int = 0
    affected_operations: dict[str, int] = Field(default_factory=dict)
    # new projected end offsets (operation_id → shift in minutes) vs original
    propagated_delays: dict[str, int] = Field(default_factory=dict)
