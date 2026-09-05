from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    app_env: str = Field(default="development", alias="APP_ENV")
    log_level: str = Field(default="info", alias="LOG_LEVEL")
    worker_concurrency: int = Field(default=2, alias="WORKER_CONCURRENCY")

    # Database
    database_url: str = Field(..., alias="DATABASE_URL")

    # Redis
    redis_url: str = Field(default="redis://localhost:6379", alias="REDIS_URL")
    redis_stream_prefix: str = Field(default="nexusops:jobs", alias="REDIS_STREAM_PREFIX")
    redis_consumer_group: str = Field(default="nexusops-workers", alias="REDIS_CONSUMER_GROUP")

    # Worker config
    job_max_retries: int = Field(default=3, alias="JOB_MAX_RETRIES")
    job_retry_delay_seconds: int = Field(default=30, alias="JOB_RETRY_DELAY_SECONDS")
    solver_timeout_seconds: int = Field(default=120, alias="SOLVER_TIMEOUT_SECONDS")

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()  # type: ignore[call-arg]
