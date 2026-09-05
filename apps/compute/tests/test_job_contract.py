"""Tests for the job envelope contract and registry.

Pure unit tests — no Redis, no PostgreSQL. The end-to-end contract
(API → Redis Stream → worker → DB) requires running infra.
"""

import json

import pytest

from src.workers.job_processor import (
    MESSAGE_VERSION,
    RETRY_BACKOFF_SECONDS,
    _backoff_seconds,
    _is_permanent_error,
    parse_envelope,
)
from src.workers.registry import HANDLERS, STREAM_SUFFIX_TO_TYPE


def _valid_message(**overrides: str) -> dict[str, str]:
    data: dict[str, str] = {
        "message_version": MESSAGE_VERSION,
        "job_id": "01J_JOB",
        "org_id": "org_1",
        "job_type": "YARD_OPTIMIZATION",
        "attempt": "1",
        "requested_by": "user_1",
        "payload": '{"yard_id": "yard_1", "container_ids": []}',
    }
    data.update(overrides)
    return data


def test_parse_envelope_returns_typed_fields() -> None:
    env = parse_envelope(_valid_message())
    assert env["job_id"] == "01J_JOB"
    assert env["org_id"] == "org_1"
    assert env["job_type"] == "YARD_OPTIMIZATION"
    assert env["attempt"] == 1
    assert env["payload"] == {"yard_id": "yard_1", "container_ids": []}


def test_parse_envelope_rejects_bad_message_version() -> None:
    with pytest.raises(ValueError, match="message_version"):
        parse_envelope(_valid_message(message_version="999"))


def test_parse_envelope_rejects_missing_fields() -> None:
    with pytest.raises(ValueError, match="missing job_id/org_id/job_type"):
        parse_envelope(_valid_message(job_id=""))


def test_parse_envelope_rejects_malformed_payload_json() -> None:
    with pytest.raises(ValueError, match="payload not valid JSON"):
        parse_envelope(_valid_message(payload="{not json"))


def test_parse_envelope_rejects_non_object_payload() -> None:
    with pytest.raises(ValueError, match="must be a JSON object"):
        parse_envelope(_valid_message(payload='"just a string"'))


def test_yard_optimization_handler_registered() -> None:
    assert "YARD_OPTIMIZATION" in HANDLERS
    assert "yard_optimization" in STREAM_SUFFIX_TO_TYPE
    assert STREAM_SUFFIX_TO_TYPE["yard_optimization"] == "YARD_OPTIMIZATION"


def test_all_registered_handlers_have_stream_suffix() -> None:
    """Every registered handler must have a dispatchable stream suffix."""
    assert set(HANDLERS.keys()) == set(STREAM_SUFFIX_TO_TYPE.values())


def test_backoff_schedule_seconds() -> None:
    assert _backoff_seconds(1) == 30
    assert _backoff_seconds(2) == 120
    assert _backoff_seconds(3) == 600
    assert _backoff_seconds(9) == RETRY_BACKOFF_SECONDS[-1]


def test_permanent_error_detection() -> None:
    assert _is_permanent_error("invalid-payload: missing field")
    assert _is_permanent_error("handler-not-registered: foo")
    assert not _is_permanent_error("ValueError: solver crashed")


def test_serialized_payload_roundtrip_matches_parse() -> None:
    """The envelope the API writes must parse cleanly."""
    payload = {"yard_id": "yard_1", "container_ids": ["cnt_1"]}
    stream_message = {
        "message_version": MESSAGE_VERSION,
        "job_id": "01J_JOB",
        "org_id": "org_1",
        "job_type": "YARD_OPTIMIZATION",
        "attempt": "1",
        "requested_by": "user_1",
        "payload": json.dumps(payload),
    }
    env = parse_envelope(stream_message)
    assert env["payload"] == payload
