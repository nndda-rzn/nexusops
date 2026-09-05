"""Job processor — orchestrates one stream message end-to-end.

Flow per message:
  1. Parse + validate envelope (message_version, job_id, org_id, job_type)
  2. Claim job in PostgreSQL (status QUEUED/RETRYING → RUNNING) — atomic.
     No row returned → duplicate/stale message → ACK and skip.
  3. Look up handler in registry. Unknown job_type → permanent failure (DEAD).
  4. Run handler → persist result → COMPLETED → append audit event.
  5. Handler raised → FAILED/RETRYING/DEAD depending on retryable + attempts.

ACK is performed by the caller (worker) only after this function returns
without raising a retryable error — see main_worker.handle_message.
"""

import json
from typing import Any

from src.workers import job_repository
from src.workers.registry import HANDLERS

# Stream message envelope version — must match API JOB_STREAM_MESSAGE_VERSION
MESSAGE_VERSION = "1"

# Errors that are permanent (no automatic retry)
PERMANENT_ERROR_PREFIXES = ("invalid-payload", "unknown-job-type", "handler-not-registered")

# Backoff schedule in seconds per attempt (1-indexed): 30s, 2m, 10m
RETRY_BACKOFF_SECONDS = [0, 30, 120, 600]


def parse_envelope(data: dict[str, str]) -> dict[str, Any]:
    """Validate stream message shape. Raises ValueError on malformed messages."""
    if data.get("message_version") != MESSAGE_VERSION:
        raise ValueError(
            f"invalid-payload: unsupported message_version "
            f"{data.get('message_version')!r} (expected {MESSAGE_VERSION!r})"
        )
    job_id = data.get("job_id")
    org_id = data.get("org_id")
    job_type = data.get("job_type")
    if not job_id or not org_id or not job_type:
        raise ValueError("invalid-payload: missing job_id/org_id/job_type")
    try:
        payload = json.loads(data.get("payload", "{}"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid-payload: payload not valid JSON: {exc}") from exc
    if not isinstance(payload, dict):
        raise ValueError("invalid-payload: payload must be a JSON object")
    return {
        "job_id": job_id,
        "org_id": org_id,
        "job_type": job_type,
        "attempt": int(data.get("attempt", "1") or "1"),
        "payload": payload,
    }


def _backoff_seconds(attempt: int) -> int:
    """Return retry delay in seconds for a given 1-based attempt."""
    if attempt >= len(RETRY_BACKOFF_SECONDS):
        return RETRY_BACKOFF_SECONDS[-1]
    return RETRY_BACKOFF_SECONDS[attempt]


def _is_permanent_error(error: str) -> bool:
    return any(error.startswith(prefix) for prefix in PERMANENT_ERROR_PREFIXES)


async def process_message(data: dict[str, str], worker_id: str) -> None:
    """Handle a single stream message. Raises only non-retryable exceptions."""
    # 1. Envelope validation — permanent failure path handled by caller via
    #    handle_message's non-retryable branch when we raise ValueError.
    try:
        envelope = parse_envelope(data)
    except ValueError as exc:
        error = str(exc)
        # Best effort: mark DEAD so the job is not stuck QUEUED forever.
        try:
            await job_repository.mark_job_failed(
                data.get("job_id", "unknown"),
                data.get("org_id", "unknown"),
                error,
                retry_count=99,
                max_retries=3,
                retryable=False,
            )
        except Exception:  # noqa: BLE001 — never mask the original error
            pass
        raise ValueError(error) from exc

    job_id = envelope["job_id"]
    org_id = envelope["org_id"]
    job_type = envelope["job_type"]
    attempt = envelope["attempt"]

    # 2. Claim job — atomic; duplicate/stale message returns None → skip
    claimed = await job_repository.claim_job(job_id, org_id, worker_id)
    if claimed is None:
        # Already processed / cancelled / claimed by another worker
        return

    from_status = claimed.get("status")

    # 3. Handler lookup
    handler = HANDLERS.get(job_type)
    if handler is None:
        error = f"handler-not-registered: no handler for job_type {job_type!r}"
        max_retries = int(claimed.get("max_retries") or 3)
        retry_count = int(claimed.get("retry_count") or 0) + 1
        await job_repository.mark_job_failed(
            job_id, org_id, error, retry_count, max_retries, retryable=False
        )
        await job_repository.append_job_event(
            job_id, org_id, from_status, "DEAD", error, worker_id
        )
        return

    # 4. Run handler
    try:
        result = await handler(envelope["payload"])
    except Exception as exc:  # noqa: BLE001 — capture any solver failure
        error = f"{type(exc).__name__}: {exc}"
        max_retries = int(claimed.get("max_retries") or 3)
        retry_count = int(claimed.get("retry_count") or 0) + 1
        retryable = not _is_permanent_error(str(exc))
        retry_delay = _backoff_seconds(attempt) if retryable else 0
        target = await job_repository.mark_job_failed(
            job_id, org_id, error, retry_count, max_retries,
            retryable=retryable, retry_delay_seconds=retry_delay,
        )
        await job_repository.append_job_event(
            job_id, org_id, from_status, target, error, worker_id
        )
        return

    # 5. Success
    await job_repository.mark_job_completed(job_id, org_id, result)
    await job_repository.append_job_event(
        job_id, org_id, from_status, "COMPLETED", "Job completed successfully", worker_id
    )
