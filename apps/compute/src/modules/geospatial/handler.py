"""Geospatial job handlers - GeoPandas containment + route GeoJSON export.

Registered as GEOFENCE_CHECK / ROUTE_GEOJSON handlers. The worker sets the
RLS tenant context in an explicit transaction (see sql.run_queries) so
PostGIS reads are scoped exactly like API reads. Read-only: results are
stored on the optimization job.

Rows are fetched via async psycopg (WKT strings), then materialized into
GeoDataFrames for containment - matches docs/06-compute/geopandas.md without
a sync DB connection. Route GeoJSON export builds features with shapely
mapping (no GeoDataFrame needed).
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
from src.modules.geospatial.sql import (
    geofence_check_queries,
    route_geojson_queries,
    run_queries,
)


def _parse_points(vehicle_rows: list[dict[str, Any]]) -> tuple[list[str], list[Any]]:
    """Extract valid WKT points; malformed positions are skipped."""
    checked: list[str] = []
    points: list[Any] = []
    for r in vehicle_rows:
        try:
            points.append(wkt.loads(r["position"]))
            checked.append(r["vehicle_id"])
        except Exception:  # noqa: BLE001 - malformed position skips vehicle
            continue
    return checked, points


async def geofence_check_handler(payload: dict[str, Any]) -> dict[str, Any]:
    """GEOFENCE_CHECK - which vehicles are inside a geofence.

    Loads latest position per vehicle + geofence boundary, materializes a
    GeoDataFrame of points and tests containment with GeoPandas .within().
    """
    try:
        inp = GeofenceCheckInput.model_validate(payload)
    except ValidationError as exc:
        raise ValueError(f"invalid-payload: {exc}") from exc

    queries, params = geofence_check_queries(inp.org_id, inp.geofence_id, inp.vehicle_ids)
    vehicle_rows, geofence_rows = await run_queries(queries, params, inp.org_id)

    if not geofence_rows:
        raise ValueError("invalid-payload: geofence not found or inactive")

    try:
        boundary = wkt.loads(geofence_rows[0]["boundary"])
    except Exception as exc:  # noqa: BLE001 - WKT parse failure is a data problem
        raise ValueError(f"invalid-payload: geofence boundary not valid WKT: {exc}") from exc

    checked, points = _parse_points(vehicle_rows)
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

    queries, params = route_geojson_queries(inp.org_id, inp.route_ids)
    rows = await run_queries(queries, params, inp.org_id)

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
