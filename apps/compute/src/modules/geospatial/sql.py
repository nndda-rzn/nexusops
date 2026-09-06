"""PostGIS queries for geospatial job handlers.

All reads run under one tenant RLS context inside an explicit transaction
(mirrors the API's withDbContext). SQL builders are separated from handler
logic so handler.py stays focused and under the repo's 150-line convention.
"""

from typing import Any

from src.shared.database import get_db, release_db


async def run_queries(
    queries: list[str],
    params: list[tuple],
    org_id: str,
) -> list[list[dict[str, Any]]]:
    """Run multiple SQL queries under one tenant RLS context.

    Explicit transaction is required: psycopg runs each statement in its own
    implicit transaction, so set_config(..., is_local=true) would be lost after
    the first statement. Inside one explicit transaction the RLS context lives
    for all queries. entity_type is set too, matching job_repository.
    """
    conn = await get_db()
    try:
        async with conn.transaction():
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT set_config('app.current_org_id', %s, true), "
                    "set_config('app.entity_type', 'ENTITY', true)",
                    (org_id,),
                )
                results: list[list[dict[str, Any]]] = []
                for query, p in zip(queries, params):
                    await cur.execute(query, p)
                    raw = await cur.fetchall()
                    if raw and isinstance(raw[0], dict):
                        results.append(list(raw))
                    else:
                        # tuple rows (no dict_row factory) → wrap with column names
                        cols = [d.name for d in cur.description] if cur.description else []
                        results.append([dict(zip(cols, r)) for r in raw])
                return results
    finally:
        await release_db(conn)


def geofence_check_queries(
    org_id: str,
    geofence_id: str,
    vehicle_ids: list[str],
) -> tuple[list[str], list[tuple]]:
    """Build GEOFENCE_CHECK queries: latest position per vehicle + boundary."""
    if vehicle_ids:
        placeholders = ",".join(["%s"] * len(vehicle_ids))
        vehicle_filter = f"AND vp.vehicle_id IN ({placeholders})"
        vehicle_params: tuple = (org_id, *vehicle_ids)
    else:
        vehicle_filter = ""
        vehicle_params = (org_id,)

    queries = [
        f"""
        SELECT vp.vehicle_id, vp.position
        FROM road.vehicle_positions vp
        JOIN road.vehicles v ON v.id = vp.vehicle_id
        WHERE v.org_id = %s
          {vehicle_filter}
          AND vp.recorded_at = (
              SELECT MAX(recorded_at) FROM road.vehicle_positions vp2
              WHERE vp2.vehicle_id = vp.vehicle_id
          )
        """,
        "SELECT id, boundary FROM shared_master.geofences WHERE id = %s AND status = 'ACTIVE'",
    ]
    params = [vehicle_params, (geofence_id,)]
    return queries, params


def route_geojson_queries(
    org_id: str,
    route_ids: list[str],
) -> tuple[list[str], list[tuple]]:
    """Build ROUTE_GEOJSON query for org routes (optionally filtered by ids)."""
    if route_ids:
        placeholders = ",".join(["%s"] * len(route_ids))
        query = f"""
            SELECT id, origin, destination, geometry, distance_km,
                   estimated_duration_minutes, route_type
            FROM road.routes
            WHERE org_id = %s AND id IN ({placeholders})
        """
        params: tuple = (org_id, *route_ids)
    else:
        query = """
            SELECT id, origin, destination, geometry, distance_km,
                   estimated_duration_minutes, route_type
            FROM road.routes
            WHERE org_id = %s
        """
        params = (org_id,)
    return [query], [params]
