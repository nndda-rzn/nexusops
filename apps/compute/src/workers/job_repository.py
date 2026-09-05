"""Job repository for the compute worker.

All state transitions happen in PostgreSQL (source of truth). Redis messages
are only transport. The worker claims a job with an atomic UPDATE guarded by
`status IN ('QUEUED','RETRYING')` — duplicate or re-delivered stream messages
are harmless: only one claimant wins; others see 0 rows and ACK.

RLS: every transaction sets `app.current_org_id` (tenant context) so the RLS
policies used by the API apply identically here. See
apps/api/src/shared/database/schema/planning.ts and migration 0025.
"""

from typing import Any

import psycopg
from psycopg.rows import dict_row

from src.shared.database import get_db, release_db


async def _with_conn(coro):
    conn = await get_db()
    try:
        return await coro(conn)
    finally:
        await release_db(conn)


async def _set_tenant_context(conn: psycopg.AsyncConnection, org_id: str) -> None:
    """Set RLS context inside the caller's open transaction (is_local = true)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT set_config('app.current_org_id', %s, true), "
            "set_config('app.entity_type', 'ENTITY', true)",
            (org_id,),
        )


async def claim_job(job_id: str, org_id: str, worker_id: str) -> dict[str, Any] | None:
    """Atomically claim a QUEUED/RETRYING job. Returns row or None."""

    async def _claim(conn: psycopg.AsyncConnection) -> dict[str, Any] | None:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT set_config('app.current_org_id', %s, true)",
                (org_id,),
            )
            await cur.execute(
                """
                UPDATE planning.optimization_jobs
                SET status = 'RUNNING',
                    worker_id = %(worker_id)s,
                    claimed_at = now(),
                    heartbeat_at = now(),
                    started_at = COALESCE(started_at, now())
                WHERE id = %(job_id)s
                  AND org_id = %(org_id)s
                  AND status IN ('QUEUED', 'RETRYING')
                RETURNING *
                """,
                {"job_id": job_id, "org_id": org_id, "worker_id": worker_id},
            )
            row = await cur.fetchone()
            await conn.commit()
            return row

    return await _with_conn(_claim)


async def mark_job_completed(job_id: str, org_id: str, result: dict[str, Any]) -> None:
    """Persist solver result and move job to COMPLETED."""

    async def _complete(conn: psycopg.AsyncConnection) -> None:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT set_config('app.current_org_id', %s, true)",
                (org_id,),
            )
            await cur.execute(
                """
                UPDATE planning.optimization_jobs
                SET status = 'COMPLETED',
                    result = %(result)s,
                    error = NULL,
                    completed_at = now()
                WHERE id = %(job_id)s AND org_id = %(org_id)s
                """,
                {
                    "job_id": job_id,
                    "org_id": org_id,
                    "result": psycopg.types.json.Jsonb(result),
                },
            )
            await conn.commit()

    await _with_conn(_complete)


async def mark_job_failed(
    job_id: str,
    org_id: str,
    error: str,
    retry_count: int,
    max_retries: int,
    retryable: bool,
    retry_delay_seconds: int = 0,
) -> str:
    """Mark job FAILED and return next status: 'RETRYING' (if retryable) or 'DEAD'."""

    async def _fail(conn: psycopg.AsyncConnection) -> str:
        can_retry = retryable and retry_count < max_retries
        target = "RETRYING" if can_retry else "DEAD"
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT set_config('app.current_org_id', %s, true)",
                (org_id,),
            )
            if can_retry and retry_delay_seconds > 0:
                await cur.execute(
                    """
                    UPDATE planning.optimization_jobs
                    SET status = 'RETRYING',
                        error = %(error)s,
                        retry_count = %(retry_count)s,
                        failed_at = now(),
                        next_retry_at = now() + make_interval(secs => %(delay)s)
                    WHERE id = %(job_id)s AND org_id = %(org_id)s
                    """,
                    {
                        "job_id": job_id,
                        "org_id": org_id,
                        "error": error,
                        "retry_count": retry_count,
                        "delay": retry_delay_seconds,
                    },
                )
            else:
                await cur.execute(
                    """
                    UPDATE planning.optimization_jobs
                    SET status = %(target)s,
                        error = %(error)s,
                        retry_count = %(retry_count)s,
                        failed_at = now()
                    WHERE id = %(job_id)s AND org_id = %(org_id)s
                    """,
                    {
                        "job_id": job_id,
                        "org_id": org_id,
                        "error": error,
                        "retry_count": retry_count,
                        "target": target,
                    },
                )
            await conn.commit()
        return target

    return await _with_conn(_fail)


async def append_job_event(
    job_id: str, org_id: str, from_status: str | None, to_status: str,
    message: str, worker_id: str,
) -> None:
    """Append an audit row to planning.optimization_job_events."""

    async def _append(conn: psycopg.AsyncConnection) -> None:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT set_config('app.current_org_id', %s, true)",
                (org_id,),
            )
            await cur.execute(
                """
                INSERT INTO planning.optimization_job_events
                    (id, org_id, job_id, from_status, to_status, message, actor_id, created_at)
                VALUES (%(id)s, %(org_id)s, %(job_id)s,
                        %(from_status)s, %(to_status)s, %(message)s, %(worker_id)s, now())
                """,
                {
                    "id": str(__import__("uuid").uuid4()),
                    "job_id": job_id,
                    "org_id": org_id,
                    "from_status": from_status,
                    "to_status": to_status,
                    "message": message,
                    "worker_id": worker_id,
                },
            )
            await conn.commit()

    await _with_conn(_append)
