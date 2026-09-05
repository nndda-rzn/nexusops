"""Tests for the yard optimization OR-Tools solver.

These run against the pure solver (no DB). Inputs are fixture-built
YardOptimizationInput instances; we assert the hard constraints of the output.
"""

from src.contracts.yard_optimization import (
    ContainerSize,
    MovementType,
    SolverStatus,
    YardContainer,
    YardOptimizationInput,
    YardSlot,
)
from src.modules.yard_optimization.solvers.ortools_solver import solve_yard_optimization


def _slots(n: int, *, reefer: bool = False, hazmat: bool = False) -> list[YardSlot]:
    return [
        YardSlot(
            slot_id=f"slot_{i}",
            block_id="B01",
            bay=f"{i:02d}",
            row="A",
            tier=1,
            supports_reefer=reefer,
            supports_hazmat=hazmat,
        )
        for i in range(n)
    ]


def test_inbound_containers_all_placed_when_slots_available() -> None:
    containers = [YardContainer(container_id=f"c{i}") for i in range(3)]
    data = YardOptimizationInput(yard_id="y1", containers=containers, slots=_slots(5))
    result = solve_yard_optimization(data)

    assert result.status == SolverStatus.OPTIMAL
    assert result.unassigned_containers == []
    placed = [a for a in result.assignments if a.movement_type == MovementType.PLACE]
    assert len(placed) == 3
    slot_ids = {a.slot_id for a in placed}
    assert len(slot_ids) == 3  # no slot doubles up


def test_no_slot_overlap_for_same_container() -> None:
    containers = [YardContainer(container_id=f"c{i}") for i in range(4)]
    data = YardOptimizationInput(yard_id="y1", containers=containers, slots=_slots(4))
    result = solve_yard_optimization(data)
    assert result.status == SolverStatus.OPTIMAL
    container_to_slot = {a.container_id: a.slot_id for a in result.assignments}
    assert len(container_to_slot) == len(result.assignments)
    assert len(set(container_to_slot.values())) == len(container_to_slot)


def test_reefer_container_requires_reefer_slot() -> None:
    containers = [
        YardContainer(container_id="reefer_1", is_reefer=True),
        YardContainer(container_id="dry_1", is_reefer=False),
    ]
    # only one reefer-capable slot among 3
    slots = [
        *[
            YardSlot(slot_id="dry", block_id="B", bay="00", row="A", tier=1)
        ],
        YardSlot(slot_id="reef", block_id="B", bay="01", row="A", tier=1, supports_reefer=True),
    ]
    data = YardOptimizationInput(yard_id="y1", containers=containers, slots=slots)
    result = solve_yard_optimization(data)

    assert result.status == SolverStatus.OPTIMAL
    assert result.unassigned_containers == []
    reefer_assign = next(
        a for a in result.assignments if a.container_id == "reefer_1"
    )
    assert reefer_assign.slot_id == "reef"


def test_hazmat_container_requires_hazmat_slot() -> None:
    containers = [YardContainer(container_id="haz_1", is_hazmat=True)]
    slots = [
        YardSlot(slot_id="plain", block_id="B", bay="00", row="A", tier=1),
        YardSlot(slot_id="haz", block_id="B", bay="01", row="A", tier=1, supports_hazmat=True),
    ]
    data = YardOptimizationInput(yard_id="y1", containers=containers, slots=slots)
    result = solve_yard_optimization(data)
    assert result.status == SolverStatus.OPTIMAL
    assert result.assignments[0].slot_id == "haz"


def test_occupied_slot_never_receives_container() -> None:
    containers = [YardContainer(container_id="c1")]
    slots = [
        YardSlot(slot_id="occ", block_id="B", bay="00", row="A", tier=1, occupied=True,
                 occupied_by="other"),
        YardSlot(slot_id="free", block_id="B", bay="01", row="A", tier=1),
    ]
    data = YardOptimizationInput(yard_id="y1", containers=containers, slots=slots)
    result = solve_yard_optimization(data)
    placed_slot = result.assignments[0].slot_id
    assert placed_slot == "free"


def test_unplaced_container_when_no_compatible_slot() -> None:
    containers = [
        YardContainer(container_id="big", size=ContainerSize.TEU45),
    ]
    slots = [
        YardSlot(slot_id="small", block_id="B", bay="00", row="A", tier=1,
                 max_size=ContainerSize.TEU20),
    ]
    data = YardOptimizationInput(yard_id="y1", containers=containers, slots=slots)
    result = solve_yard_optimization(data)
    # unassignment is a valid outcome (soft), not a model infeasibility
    assert "big" in result.unassigned_containers
    placed = [a for a in result.assignments if a.movement_type == MovementType.PLACE]
    assert placed == []


def test_existing_placement_reported_unchanged() -> None:
    containers = [YardContainer(container_id="already", current_slot_id="s1")]
    slots = [
        YardSlot(slot_id="s1", block_id="B", bay="00", row="A", tier=1, occupied=True,
                 occupied_by="already"),
    ]
    data = YardOptimizationInput(yard_id="y1", containers=containers, slots=slots)
    result = solve_yard_optimization(data)
    assert result.assignments[0].movement_type == MovementType.UNCHANGED
    assert result.assignments[0].slot_id == "s1"


def test_empty_problem_returns_optimal() -> None:
    data = YardOptimizationInput(yard_id="y1", containers=[], slots=_slots(3))
    result = solve_yard_optimization(data)
    assert result.status == SolverStatus.OPTIMAL
    assert result.assignments == []


def test_high_priority_container_wins_scarce_slot() -> None:
    containers = [
        YardContainer(container_id="urgent", priority=10),
        YardContainer(container_id="normal", priority=1),
    ]
    # only 1 free slot → solver must place urgent (heavy penalty for leaving it)
    slots = [
        YardSlot(slot_id="only", block_id="B", bay="00", row="A", tier=1),
        YardSlot(slot_id="occ", block_id="B", bay="01", row="A", tier=1,
                 occupied=True, occupied_by="x"),
    ]
    data = YardOptimizationInput(yard_id="y1", containers=containers, slots=slots)
    result = solve_yard_optimization(data)
    placed = [a.container_id for a in result.assignments if a.slot_id == "only"]
    assert "urgent" in placed
