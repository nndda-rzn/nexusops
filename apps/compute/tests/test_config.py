from src.shared.config import settings


def test_settings_loaded() -> None:
    """Settings should load with defaults when env vars not set."""
    assert settings.app_env in ("development", "staging", "production")
    assert settings.redis_stream_prefix == "nexusops:jobs"
    assert settings.job_max_retries == 3
    assert settings.solver_timeout_seconds == 120
