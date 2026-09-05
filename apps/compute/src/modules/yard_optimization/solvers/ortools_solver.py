"""OR-Tools CP-SAT solver for yard slot allocation.

Decision:
  - for every movable/unplaced container, pick an empty compatible slot
    (or leave it unassigned when no slot fits).

Hard constraints:
  - one container per slot
  - reefer container → slot that supports reefer
  - hazmat container → slot that supports hazmat
  - container size ≤ slot max_size
  - occupied slots cannot receive a new container (unless reshuffle of the
    container occupying them is allowed by max_reshuffles — not modelled here;
    Phase 4B scope is inbound placement into free slots)

Objective (minimize):
  - weighted penalty for unassigned containers (high priority containers
    penalised more)
  - preference for placing into the lowest tier / earliest bay (spread load)
"""

from ortools.sat.python import cp_model

from src.contracts.yard_optimization import (
    MovementType,
    SolverStatus,
    YardAssignment,
    YardContainer,
    YardOptimizationInput,
    YardOptimizationResult,
    YardSlot,
)

_TIME_LIMIT_SECONDS = 30


def _compatible(container: YardContainer, slot: YardSlot) -> bool:
    if slot.occupied:
        return False
    if container.is_reefer and not slot.supports_reefer:
        return False
    if container.is_hazmat and not slot.supports_hazmat:
        return False
    # numeric compare on size enum values ("20"/"40"/"45")
    if int(container.size.value) > int(slot.max_size.value):
        return False
    return True


def _sorted_slots(slots: list[YardSlot]) -> list[YardSlot]:
    """Deterministic ordering — lower bay first (spread load across block)."""
    return sorted(slots, key=lambda s: (s.block_id, s.bay, s.row, s.tier))


def solve_yard_optimization(data: YardOptimizationInput) -> YardOptimizationResult:
    containers = data.containers
    slots = [s for s in _sorted_slots(data.slots) if not s.occupied]
    if not containers:
        return YardOptimizationResult(
            status=SolverStatus.OPTIMAL, assignments=[], unassigned_containers=[],
            metrics={"reshuffles": 0, "unassigned": 0, "utilized_slots": 0},
        )

    # ── containers that stay put: already placed in a valid slot ──
    # Phase 4B scope: containers WITHOUT a slot (inbound) get placed.
    # Containers already in a slot are reported UNCHANGED; reshuffle of placed
    # containers is a later increment (requires freeing their source slot).
    to_assign = [c for c in containers if c.current_slot_id is None]
    fixed = [c for c in containers if c.current_slot_id is not None]

    # Assign fixed containers to their current occupied slot (already in DB)
    fixed_assignments = [
        YardAssignment(
            container_id=c.container_id,
            slot_id=c.current_slot_id or "",
            movement_type=MovementType.UNCHANGED,
        )
        for c in fixed
        if c.current_slot_id
    ]
    fixed_slot_ids = {c.current_slot_id for c in fixed if c.current_slot_id}

    free_slots = [s for s in slots if s.slot_id not in fixed_slot_ids]

    if not to_assign:
        return YardOptimizationResult(
            status=SolverStatus.OPTIMAL,
            assignments=fixed_assignments,
            unassigned_containers=[],
            metrics={"reshuffles": 0, "unassigned": 0, "utilized_slots": len(fixed_assignments)},
        )

    model = cp_model.CpModel()

    # x[i][j] = 1 if container i is placed in free slot j
    x: list[list[cp_model.IntVar]] = []
    for ci, container in enumerate(to_assign):
        row_vars: list[cp_model.IntVar] = []
        for sj, slot in enumerate(free_slots):
            if _compatible(container, slot):
                row_vars.append(model.new_bool_var(f"x_{ci}_{sj}"))
            else:
                row_vars.append(None)
        x.append(row_vars)

    # y[i] = 1 if container i is left unassigned
    y = [model.new_bool_var(f"unassigned_{i}") for i in range(len(to_assign))]

    # each container is placed at most once
    for ci in range(len(to_assign)):
        candidates = [x[ci][sj] for sj in range(len(free_slots)) if x[ci][sj] is not None]
        model.add(sum(candidates) + y[ci] == 1)

    # each slot holds at most one container
    for sj in range(len(free_slots)):
        col = [x[ci][sj] for ci in range(len(to_assign)) if x[ci][sj] is not None]
        model.add(sum(col) <= 1)

    # objective: unassigned penalty (scaled by priority), minus placement reward
    unassigned_base = 1000
    objective_terms: list[cp_model.LinearExpr] = []
    for ci, container in enumerate(to_assign):
        objective_terms.append((unassigned_base + container.priority * 100) * y[ci])
    for ci in range(len(to_assign)):
        for sj in range(len(free_slots)):
            var = x[ci][sj]
            if var is not None:
                objective_terms.append(-1 * var)  # reward each placement
    model.minimize(cp_model.LinearExpr.sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = _TIME_LIMIT_SECONDS
    status_code = solver.solve(model)

    assignments: list[YardAssignment] = []
    unassigned: list[str] = []
    utilized = len(fixed_assignments)

    if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for ci, container in enumerate(to_assign):
            placed = False
            for sj in range(len(free_slots)):
                var = x[ci][sj]
                if var is not None and solver.value(var) == 1:
                    assignments.append(
                        YardAssignment(
                            container_id=container.container_id,
                            slot_id=free_slots[sj].slot_id,
                            movement_type=(
                                MovementType.RESHUFFLE
                                if container.current_slot_id is not None
                                else MovementType.PLACE
                            ),
                        )
                    )
                    placed = True
                    utilized += 1
                    break
            if not placed:
                unassigned.append(container.container_id)

        status = (
            SolverStatus.OPTIMAL
            if status_code == cp_model.OPTIMAL
            else SolverStatus.TIME_LIMIT
        )
        if len(unassigned) == 0 and status_code == cp_model.FEASIBLE:
            status = SolverStatus.FEASIBLE
        return YardOptimizationResult(
            status=status,
            assignments=[*fixed_assignments, *assignments],
            unassigned_containers=unassigned,
            metrics={
                "reshuffles": sum(
                    1 for a in assignments if a.movement_type == MovementType.RESHUFFLE
                ),
                "unassigned": len(unassigned),
                "utilized_slots": utilized,
            },
        )

    # INFEASIBLE / UNKNOWN
    return YardOptimizationResult(
        status=SolverStatus.INFEASIBLE,
        assignments=fixed_assignments,
        unassigned_containers=[c.container_id for c in to_assign],
        metrics={"reshuffles": 0, "unassigned": len(to_assign), "utilized_slots": len(fixed_assignments)},
    )
