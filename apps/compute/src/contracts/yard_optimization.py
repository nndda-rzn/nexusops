"""Yard optimization input/output contracts (Pydantic).

These are the typed boundaries of the yard optimization solver. The worker
handler builds a `YardOptimizationInput` from DB data (or, in tests, from
fixtures), runs the solver, and returns a `YardOptimizationResult`.

The solver NEVER mutates operational tables — it only produces candidate
assignments. Applying a plan to real yard slots is an API-side decision
(Phase 4C plan activation).
"""

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ContainerSize(StrEnum):
    TEU20 = "20"
    TEU40 = "40"
    TEU45 = "45"


class YardContainer(BaseModel):
    """Container needing a slot placement or reshuffle decision."""

    model_config = ConfigDict(frozen=True)

    container_id: str
    size: ContainerSize = ContainerSize.TEU20
    weight_kg: float = Field(default=0.0, ge=0)
    is_reefer: bool = False
    is_hazmat: bool = False
    priority: int = Field(default=1, ge=0)  # higher = more urgent
    # Where the container currently sits (None = inbound, needs placement)
    current_slot_id: str | None = None
    # True if the container may be reshuffled out of its current slot
    movable: bool = True


class YardSlot(BaseModel):
    """A single yard slot position."""

    model_config = ConfigDict(frozen=True)

    slot_id: str
    block_id: str
    bay: str
    row: str
    tier: int = Field(default=1, ge=1)
    supports_reefer: bool = False
    supports_hazmat: bool = False
    max_size: ContainerSize = ContainerSize.TEU45
    occupied: bool = False
    occupied_by: str | None = None


class YardOptimizationInput(BaseModel):
    """Full input to the solver."""

    yard_id: str
    containers: list[YardContainer] = Field(default_factory=list)
    slots: list[YardSlot] = Field(default_factory=list)
    max_reshuffles: int = Field(default=0, ge=0)


class MovementType(StrEnum):
    PLACE = "PLACE"        # inbound → empty slot
    RESHUFFLE = "RESHUFFLE"  # occupied slot → other slot (reposition)
    UNCHANGED = "UNCHANGED"  # keep current slot (was valid placement)


class YardAssignment(BaseModel):
    """One container → slot decision produced by the solver."""

    container_id: str
    slot_id: str
    movement_type: MovementType


class SolverStatus(StrEnum):
    OPTIMAL = "OPTIMAL"
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    TIME_LIMIT = "TIME_LIMIT"


class YardOptimizationResult(BaseModel):
    """Solver output. Never applied to DB directly."""

    status: SolverStatus
    assignments: list[YardAssignment] = Field(default_factory=list)
    unassigned_containers: list[str] = Field(default_factory=list)
    metrics: dict[str, float | int] = Field(default_factory=dict)
    violations: list[str] = Field(default_factory=list)


# ── payload received from the API job input ──
class YardOptimizationJobPayload(BaseModel):
    """Payload stored in planning.optimization_jobs.input for YARD_OPTIMIZATION.

    The operator explicitly lists the container_ids to place: `containers.units`
    has no reliable "waiting for yard slot" state (yard commands write
    yard.slots.container_id but do not flip the unit's status), so the solver
    input is assembled from this list + the yard's slot layout.
    """

    yard_id: str
    container_ids: list[str] = Field(default_factory=list)
    max_reshuffles: int = 0
    reason: Literal["pre_planning", "replan", "container_arrival"] = "pre_planning"
