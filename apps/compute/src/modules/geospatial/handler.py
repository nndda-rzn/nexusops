"""Geospatial job handlers - GeoPandas containment + route GeoJSON export.

Registered as GEOFENCE_CHECK / ROUTE_GEOJSON handlers. The worker sets the
RLS tenant context (app.current_org_id) in the same transaction so PostGIS
reads are scoped exactly like API reads. Read-only: results are stored on
the optimization job.

Rows are fetched via async psycopg (WKT strings), then materialized into
GeoDataFrames for spatial analysis - matches the GeoPandas approach in
docs/06-compute/geopandas.md without a sync DB connection. Route GeoJSON
export builds features with shapely mapping (no GeoDataFrame needed).
"""

from typing import Any

import geopandas as gpd
from pydantic import ValidationError
from shapely import wkt
from shapely.geometry import mapping

from src.contracts.geospatial import (
    GeofenceCheckInput,
    GeofenceCheckResult,
    RouteGeojsonInput,
    RouteGeojsonResult,
)
from src.shared.database import get_db, release_db


async def _run_queries(
    queries: list[str],
    params: list[tuple],
    org_id: str,
) -> list[list[dict[str, Any]]]:
    """Run multiple SQL queries under one tenant RLS context."""
    conn = await get_db()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT set_config('app.current_org_id', %s, true)",
                (org_id,),
            )
            results: list[list[dict[str, Any]]] = []
            for query, p in zip(queries, params):
                await cur.execute(query, p)
                cols = [d.name for d in cur.description] if cur.description else []
                rows = [dict(zip(cols, r)) for r in await cur.fetchall()]
                results.append(rows)
            await conn.commit()
            return results
    finally:
        await release_db(conn)

async def geofence_check_handler(payload: dict[str, Any]) -> dict[str, Any]:
    """GEOFENCE_CHECK - which vehicles are inside a geofence.

    Loads latest position per vehicle + geofence boundary, materializes a
    GeoDataFrame of points and tests containment with GeoPandas .within().
    """
    try:
        inp = GeofenceCheckInput.model_validate(payload)
    except ValidationError as exc:
        raise ValueError(f"invalid-payload: {exc}") from exc

    if inp.vehicle_ids:
        placeholders = ",".join(["%s"] * len(inp.vehicle_ids))
        vehicle_filter = f"AND vp.vehicle_id IN ({placeholders})"
        vehicle_params: tuple = (inp.org_id, *inp.vehicle_ids)
    else:
        vehicle_filter = ""
        vehicle_params = (inp.org_id,)

    rows = await _run_queries(
        [
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
        ],
        [vehicle_params, (inp.geofence_id,)],
        inp.org_id,
    )

    vehicle_rows, geofence_rows = rows
    if not geofence_rows:
        raise ValueError("invalid-payload: geofence not found or inactive")

    try:
        boundary = wkt.loads(geofence_rows[0]["boundary"])
    except Exception as exc:  # noqa: BLE001 - WKT parse failure is a data problem
        raise ValueError(f"invalid-payload: geofence boundary not valid WKT: {exc}") from exc

    checked: list[str] = []
    points: list[Any] = []
    for r in vehicle_rows:
        try:
            points.append(wkt.loads(r["position"]))
            checked.append(r["vehicle_id"])
        except Exception:  # noqa: BLE001 - malformed position skips vehicle
            continue

    inside: list[str] = []
    if points:
        gdf = gpd.GeoDataFrame(
            {"vehicle_id": checked},
            geometry=points,
            crs="EPSG:4326",
        )
        inside = gdf[gdf.within(boundary)]["vehicle_id"].tolist()

    result = GeofenceCheckResult(
        geofence_id=inp.geofence_id,
        inside_vehicle_ids=inside,
        checked_vehicle_ids=checked,
    )
    return result.model_dump()

async def route_geojson_handler(payload: dict[str, Any]) -> dict[str, Any]:
    """ROUTE_GEOJSON - export route geometries as GeoJSON FeatureCollection."""
    try:
        inp = RouteGeojsonInput.model_validate(payload)
    except ValidationError as exc:
        raise ValueError(f"invalid-payload: {exc}") from exc

    if inp.route_ids:
        placeholders = ",".join(["%s"] * len(inp.route_ids))
        query = f"""
            SELECT id, origin, destination, geometry, distance_km,
                   estimated_duration_minutes, route_type
            FROM road.routes
            WHERE org_id = %s AND id IN ({placeholders})
        """
        params: tuple = (inp.org_id, *inp.route_ids)
    else:
        query = """
            SELECT id, origin, destination, geometry, distance_km,
                   estimated_duration_minutes, route_type
            FROM road.routes
            WHERE org_id = %s
        """
        params = (inp.org_id,)

    rows = await _run_queries([query], [params], inp.org_id)

    features: list[dict[str, Any]] = []
    for r in rows[0]:
        geom = r.get("geometry")
        if not geom:
            continue
        try:
            shape = wkt.loads(geom)
        except Exception:  # noqa: BLE001 - malformed geometry skipped
            continue
        features.append({
            "type": "Feature",
            "geometry": mapping(shape),
            "properties": {
                "id": r["id"],
                "distance_km": r.get("distance_km"),
                "estimated_duration_minutes": r.get("estimated_duration_minutes"),
                "route_type": r.get("route_type"),
            },
        })

    result = RouteGeojsonResult(features=features)
    return result.model_dump()
