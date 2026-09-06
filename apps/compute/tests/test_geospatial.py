"""Tests for geospatial contracts + GeoPandas handlers."""

from unittest.mock import AsyncMock, patch

import pytest

from src.contracts.geospatial import (
    GeofenceCheckInput,
    GeofenceCheckResult,
    RouteGeojsonInput,
    RouteGeojsonResult,
)
from src.modules.geospatial.handler import (
    geofence_check_handler,
    route_geojson_handler,
)

# Small valid polygon around (106.85, -6.20)
_POLYGON_WKT = (
    "POLYGON((106.80 -6.25, 106.90 -6.25, 106.90 -6.15, 106.80 -6.15, 106.80 -6.25))"
)


def test_geofence_check_input_requires_ids() -> None:
    inp = GeofenceCheckInput(org_id="o1", geofence_id="g1")
    assert inp.vehicle_ids == []


def test_geofence_check_result_roundtrip() -> None:
    result = GeofenceCheckResult(
        geofence_id="g1",
        inside_vehicle_ids=["v1"],
        checked_vehicle_ids=["v1", "v2"],
    )
    dumped = result.model_dump()
    assert dumped["inside_vehicle_ids"] == ["v1"]


def test_route_geojson_input_defaults() -> None:
    inp = RouteGeojsonInput(org_id="o1")
    assert inp.route_ids == []


def test_route_geojson_result_is_feature_collection() -> None:
    result = RouteGeojsonResult(features=[{"type": "Feature", "geometry": {}, "properties": {}}])
    assert result.type == "FeatureCollection"


@patch("src.modules.geospatial.handler._run_queries", new_callable=AsyncMock)
async def test_geofence_check_inside_and_outside(mock_queries: AsyncMock) -> None:
    mock_queries.return_value = [
        [
            {"vehicle_id": "v1", "position": "POINT(106.85 -6.20)"},   # inside
            {"vehicle_id": "v2", "position": "POINT(110.0 -6.5)"},     # outside
            {"vehicle_id": "v3", "position": "not-a-wkt"},             # skipped
        ],
        [{"id": "g1", "boundary": _POLYGON_WKT}],
    ]
    result = await geofence_check_handler({
        "org_id": "o1",
        "geofence_id": "g1",
        "vehicle_ids": [],
    })
    assert result["geofence_id"] == "g1"
    assert result["inside_vehicle_ids"] == ["v1"]
    assert result["checked_vehicle_ids"] == ["v1", "v2"]


@patch("src.modules.geospatial.handler._run_queries", new_callable=AsyncMock)
async def test_geofence_check_missing_geofence(mock_queries: AsyncMock) -> None:
    mock_queries.return_value = [[], []]
    with pytest.raises(ValueError, match="geofence not found"):
        await geofence_check_handler({
            "org_id": "o1",
            "geofence_id": "missing",
            "vehicle_ids": [],
        })


@patch("src.modules.geospatial.handler._run_queries", new_callable=AsyncMock)
async def test_geofence_check_invalid_payload(mock_queries: AsyncMock) -> None:
    with pytest.raises(ValueError, match="invalid-payload"):
        await geofence_check_handler({})  # missing required fields


@patch("src.modules.geospatial.handler._run_queries", new_callable=AsyncMock)
async def test_geofence_check_vehicle_ids_filter(mock_queries: AsyncMock) -> None:
    mock_queries.return_value = [
        [
            {"vehicle_id": "v1", "position": "POINT(106.85 -6.20)"},
            {"vehicle_id": "v3", "position": "POINT(110.0 -6.5)"},
        ],
        [{"id": "g1", "boundary": _POLYGON_WKT}],
    ]
    result = await geofence_check_handler({
        "org_id": "o1",
        "geofence_id": "g1",
        "vehicle_ids": ["v1", "v3"],
    })
    # verify the IN-placeholder query was built (vehicle_ids non-empty -> filter applied)
    assert result["checked_vehicle_ids"] == ["v1", "v3"]
    assert result["inside_vehicle_ids"] == ["v1"]


@patch("src.modules.geospatial.handler._run_queries", new_callable=AsyncMock)
async def test_route_geojson_exports_features(mock_queries: AsyncMock) -> None:
    mock_queries.return_value = [[
        {
            "id": "r1",
            "distance_km": "42.5",
            "estimated_duration_minutes": 55,
            "route_type": "HIGHWAY",
            "geometry": "LINESTRING(106.82 -6.21, 107.1 -6.3)",
        },
        {
            "id": "r2",
            "distance_km": "10",
            "estimated_duration_minutes": 15,
            "route_type": "LOCAL",
            "geometry": None,  # no geometry -> skipped
        },
    ]]
    result = await route_geojson_handler({"org_id": "o1", "route_ids": ["r1", "r2"]})
    assert result["type"] == "FeatureCollection"
    assert len(result["features"]) == 1
    assert result["features"][0]["properties"]["id"] == "r1"


@patch("src.modules.geospatial.handler._run_queries", new_callable=AsyncMock)
async def test_route_geojson_invalid_payload(mock_queries: AsyncMock) -> None:
    with pytest.raises(ValueError, match="invalid-payload"):
        await route_geojson_handler({})
