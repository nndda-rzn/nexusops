"""Geospatial analysis input/output contracts.

GEOFENCE_CHECK and ROUTE_GEOJSON run as async optimization jobs handled by the
compute worker. The API submits entity references; the worker reads the
PostGIS tables (RLS via app.current_org_id) and returns containment/geometry
results stored back on the job. Read-only analysis.
"""

from pydantic import BaseModel, ConfigDict, Field


class GeofenceCheckInput(BaseModel):
    """Input for geofence containment check - evaluates one geofence against
    the latest position of every vehicle in the org (or explicit list)."""

    model_config = ConfigDict(frozen=True)

    org_id: str
    geofence_id: str
    vehicle_ids: list[str] = Field(default_factory=list)  # empty = all vehicles

class GeofenceCheckResult(BaseModel):
    """Result of geofence containment check."""

    geofence_id: str
    inside_vehicle_ids: list[str] = Field(default_factory=list)
    checked_vehicle_ids: list[str] = Field(default_factory=list)

class RouteGeojsonInput(BaseModel):
    """Input for route geometry export to GeoJSON."""

    model_config = ConfigDict(frozen=True)

    org_id: str
    route_ids: list[str] = Field(default_factory=list)  # empty = all routes in org

class RouteGeojsonResult(BaseModel):
    """Result of route geometry export."""

    type: str = "FeatureCollection"
    features: list[dict] = Field(default_factory=list)
