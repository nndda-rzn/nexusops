"""Optimization job type registry and no-op reference handler.

The registry maps job_type (as dispatched by the API outbox processor) to a
handler callable. Each handler receives the parsed job payload and returns a
result dict that is persisted as the job's result column.

Phase 4A ships with a no-op handler that proves the full API → Redis Stream →
worker → PostgreSQL loop. Real solvers (yard, berth, workforce, ...) register
here in later Phase 4 increments.
"""

from collections.abc import Awaitable, Callable
from typing import Any

Handler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]

# job types that are NOT yet implemented — worker must treat as permanent error
_UNKNOWN_JOB_ERROR = "handler-not-registered"


async def noop_optimization_handler(payload: dict[str, Any]) -> dict[str, Any]:
    """Reference handler: validates the envelope and returns an echo result.

    Used to prove the end-to-end job lifecycle without a real solver.
    """
    return {
        "status": "OK",
        "handler": "noop",
        "received_payload": payload,
    }


def is_known_job_type(job_type: str) -> bool:
    return job_type in HANDLERS


HANDLERS: dict[str, Handler] = {
    "noop": noop_optimization_handler,
}

JOB_TYPE_ERRORS = {
    "NOOP": "noop",
}
