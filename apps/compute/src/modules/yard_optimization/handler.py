"""Yard optimization job handler — assembles solver input, runs OR-Tools.

Flow:
  1. Validate job payload (yard_id + explicit container_ids).
  2. Load the yard's slot layout from PostgreSQL.
  3. Look up requested containers and their attributes (size, reefer, hazmat).
  4. Run the OR-Tools solver → candidate result (never applied to DB).

Queries are scoped by yard_id / container ids. Container "attributes" that are
missing (weight etc.) default to safe values — the contract is the boundary.
"""

import logging
from typing import Any

from pydantic import ValidationError

from src.contracts.yard_optimization import (
    ContainerSize,
    YardContainer,
    YardOptimizationInput,
    YardOptimizationJobPayload,
    YardSlot,
)
from src.modules.yard_optimization.solvers.ortools_solver import solve_yard_optimization

logger = logging.getLogger(__name__)

# containers.units.size values are '20FT'|'40FT'|'40FT_HC'|'45FT'
_SIZE_TO_CONTRACT: dict[str, ContainerSize] = {
    "20FT": ContainerSize.TEU20,
    "40FT": ContainerSize.TEU40,
    "40FT_HC": ContainerSize.TEU40,
    "45FT": ContainerSize.TEU45,
}


async def _load_yard_state(yard_id: str, container_ids: list[str]) -> tuple[list[dict], list[dict]]:
    """Load slot rows (via yard.blocks) and requested container rows."""
    from src.shared.database import get_db, release_db

    conn = await get_db()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT s.id AS slot_id, s.block_id, s.bay, s.row, s.tier,
                       s.status, s.container_id
                FROM yard.slots s
                JOIN yard.blocks b ON b.id = s.block_id
                WHERE b.yard_id = %s
                ORDER BY s.block_id, s.bay, s.row, s.tier
                """,
                (yard_id,),
            )
            slot_rows = await cur.fetchall()
            if not container_ids:
                await conn.commit()
                return [], slot_rows
            await cur.execute(
                """
                SELECT id AS container_id, size, type, is_hazmat
                FROM containers.units
                WHERE id = ANY(%s)
                """,
                (container_ids,),
            )
            container_rows = await cur.fetchall()
            await conn.commit()
            return container_rows, slot_rows
    finally:
        await release_db(conn)


async def yard_optimization_handler(payload: dict[str, Any]) -> dict[str, Any]:
    """Registered in the worker registry as the YARD_OPTIMIZATION handler."""
    try:
        job_payload = YardOptimizationJobPayload.model_validate(payload)
    except ValidationError as exc:
        raise ValueError(f"invalid-payload: {exc}") from exc

    container_rows, slot_rows = await _load_yard_state(
        job_payload.yard_id, job_payload.container_ids
    )

    # Which slots are already occupied (mapped by container_id for membership)
    occupied_by: dict[str, str] = {}
    slots: list[YardSlot] = []
    for r in slot_rows:
        occupied = r["container_id"] is not None
        if occupied:
            occupied_by[r["container_id"]] = r["slot_id"]
        slots.append(
            YardSlot(
                slot_id=r["slot_id"],
                block_id=r["block_id"],
                bay=str(r["bay"]),
                row=str(r["row"]),
                tier=int(r["tier"]),
                occupied=occupied,
                occupied_by=r["container_id"],
            )
        )

    # Build container models; containers already on a slot are UNCHANGED,
    # the rest are candidates for placement.
    found_ids = {r["container_id"] for r in container_rows}
    missing = [cid for cid in job_payload.container_ids if cid not in found_ids]
    containers: list[YardContainer] = []
    for r in container_rows:
        containers.append(
            YardContainer(
                container_id=r["container_id"],
                size=_SIZE_TO_CONTRACT.get(r["size"], ContainerSize.TEU20),
                is_reefer=(r["type"] == "REEFER"),
                is_hazmat=bool(r["is_hazmat"]),
                current_slot_id=occupied_by.get(r["container_id"]),
            )
        )

    data = YardOptimizationInput(
        yard_id=job_payload.yard_id,
        containers=containers,
        slots=slots,
        max_reshuffles=job_payload.max_reshuffles,
    )
    result = solve_yard_optimization(data)

    out = result.model_dump()
    if missing:
        out["violations"] = [
            f"container-not-found: {cid} is not in containers.units" for cid in missing
        ]
    return out
