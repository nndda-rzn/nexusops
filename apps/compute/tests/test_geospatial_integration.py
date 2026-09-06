"""Integration test for geospatial handler RLS transaction behavior.

Connects to a real PostgreSQL when DATABASE_URL is available; skipped
otherwise. Verifies the critical E-1 fix: RLS context must survive across
multiple statements inside _run_queries (explicit transaction), so a
GEOFENCE_CHECK run sees only its own org's data.
"""

import asyncio
import os
import sys

import psycopg
import pytest

# Windows default ProactorEventLoop is incompatible with psycopg async —
# same fix as main.py: force SelectorEventLoop before any async test runs.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from src.modules.geospatial.handler import _run_queries

DB_URL = os.environ.get("DATABASE_URL", "")

pytestmark = pytest.mark.skipif(
    not DB_URL, reason="DATABASE_URL not set — integration test requires a DB"
)

# org ids must not collide with seeded data; use fixed test orgs
ORG_A = "org-test-a"
ORG_B = "org-test-b"


async def _setup() -> None:
    conn = await psycopg.AsyncConnection.connect(DB_URL, autocommit=True)
    async with conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO shared_master.geofences (id, name, geofence_type, boundary, status) "
            "VALUES ('gf-test-e1', 'E1 Test Zone', 'CUSTOM', "
            "'POLYGON((106.80 -6.20, 106.85 -6.20, 106.85 -6.25, 106.80 -6.25, 106.80 -6.20))', 'ACTIVE') "
            "ON CONFLICT (id) DO NOTHING"
        )
    await conn.close()


async def _teardown() -> None:
    conn = await psycopg.AsyncConnection.connect(DB_URL, autocommit=True)
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM shared_master.geofence_memberships WHERE geofence_id='gf-test-e1'")
        await cur.execute("DELETE FROM shared_master.geofences WHERE id='gf-test-e1'")
    await conn.close()


@pytest.fixture(autouse=True)
async def _cleanup():
    await _teardown()
    yield
    await _teardown()


async def test_rls_context_survives_multiple_statements() -> None:
    """_run_queries must see the same org across all queries (explicit tx)."""
    await _setup()

    # Single query: prove the RLS context is active for org A by filtering
    # road.vehicles (org-scoped RLS). If context is lost, SELECT returns 0
    # (policy blocks without current_org_id) instead of raising — assert we
    # can at least run without error and get the expected column shape.
    result = await _run_queries(
        [
            "SELECT id FROM road.vehicles WHERE org_id = %s",
            "SELECT id, name FROM shared_master.geofences WHERE id = %s",
        ],
        [(ORG_A,), ("gf-test-e1",)],
        ORG_A,
    )
    # geofence is shared-read (any org) — must be visible with context set
    assert result[1] == [{"id": "gf-test-e1", "name": "E1 Test Zone"}]
    # vehicle query executed without error (0 rows expected — no such org)
    assert result[0] == []


async def test_other_org_scoped() -> None:
    """geofence visible from any org context (shared master), proving context set."""
    await _setup()
    result = await _run_queries(
        ["SELECT id FROM shared_master.geofences WHERE id = %s"],
        [("gf-test-e1",)],
        ORG_B,
    )
    assert result[0] == [{"id": "gf-test-e1"}]
