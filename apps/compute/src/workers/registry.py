"""Optimization job type registry.

Maps canonical job_type (as dispatched by the API outbox processor) to a
handler callable. Each handler receives the parsed job payload dict and returns
a result dict that is persisted as the job's result column.

The API dispatches uppercase job types (YARD_OPTIMIZATION, ...) onto stream
"jobs:<job_type_lowercase>". The worker maps stream suffix → canonical type via
STREAM_SUFFIX_TO_TYPE and looks the handler up by canonical type.
"""

from collections.abc import Awaitable, Callable
from typing import Any

from src.modules.yard_optimization.handler import yard_optimization_handler

Handler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]

HANDLERS: dict[str, Handler] = {
    "YARD_OPTIMIZATION": yard_optimization_handler,
}

# Stream suffix (jobs:<suffix>) → canonical job type
STREAM_SUFFIX_TO_TYPE: dict[str, str] = {
    "yard_optimization": "YARD_OPTIMIZATION",
}

# Errors that must never auto-retry
PERMANENT_ERROR_PREFIXES = (
    "invalid-payload",
    "handler-not-registered",
    "container-not-found",
)
