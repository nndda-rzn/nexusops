import asyncio
import signal
import uuid

from src.shared.config import settings
from src.shared.database import close_db
from src.shared.logging import logger, setup_logging
from src.shared.redis_client import close_redis, get_redis
from src.workers import job_repository
from src.workers.job_processor import process_message
from src.workers.registry import STREAM_SUFFIX_TO_TYPE

# Stream names — must match API RedisKeys.jobStream(jobType) with the shared
# keyPrefix: API publishes to "jobs:<job_type_lowercase>".
# Only streams with a registered handler are consumed (registry is the source
# of truth). Unimplemented job types are rejected by the API job request when
# the worker registry has no handler — see registry.STREAM_SUFFIX_TO_TYPE.
STREAM_PREFIX = f"{settings.redis_stream_prefix}:"
STREAMS: list[str] = [f"{STREAM_PREFIX}{suffix}" for suffix in STREAM_SUFFIX_TO_TYPE]


class RedisStreamWorker:
    """
    Redis Streams consumer worker. Consumes one stream, maps the message's
    job_type to a handler via job_processor.process_message, then ACKs.
    """

    def __init__(self, stream: str) -> None:
        self.stream = stream
        self.consumer_name = f"worker-{uuid.uuid4().hex[:8]}"
        self.group = settings.redis_consumer_group
        self.running = False

    async def setup_consumer_group(self) -> None:
        redis = await get_redis()
        try:
            await redis.xgroup_create(self.stream, self.group, id="0", mkstream=True)
            logger.info("Consumer group created", stream=self.stream, group=self.group)
        except Exception as e:  # noqa: BLE001
            if "BUSYGROUP" in str(e):
                logger.info("Consumer group already exists", stream=self.stream)
            else:
                raise

    async def handle_message(self, message_id: str, data: dict[str, str]) -> None:
        """Process one message, ACK on success, retry/DLQ on failure."""
        redis = await get_redis()

        try:
            await process_message(data, self.consumer_name)
            await redis.xack(self.stream, self.group, message_id)
            logger.info("Message processed", job_id=data.get("job_id"), message_id=message_id)
        except ValueError as exc:
            # Permanent envelope errors — do not retry, DLQ immediately.
            await self._dead_letter(message_id, data, str(exc))
            await redis.xack(self.stream, self.group, message_id)
        except Exception as exc:  # noqa: BLE001
            logger.error("Message processing failed", message_id=message_id, error=str(exc))
            await self.handle_retry(message_id, data, str(exc))

    async def _dead_letter(
        self, message_id: str, data: dict[str, str], error: str
    ) -> None:
        redis = await get_redis()
        await redis.xadd(
            f"{settings.redis_stream_prefix}:dead_letter",
            {**data, "error": error, "original_stream": self.stream},
        )
        logger.error("Message moved to DLQ", message_id=message_id, error=error)

    async def handle_retry(
        self, message_id: str, data: dict[str, str], error: str
    ) -> None:
        """Retry logic lives in job_processor + DB (next_retry_at).
        If the processor could not persist state (DB down), re-publish the
        stream message so it is not lost. Otherwise ACK — the DB owns retries."""
        redis = await get_redis()
        try:
            # Best-effort: attempt to persist a FAILED state so the job
            # is not stuck RUNNING. If DB is down this also fails.
            await job_repository.mark_job_failed(
                data.get("job_id", "unknown"),
                data.get("org_id", "unknown"),
                error,
                retry_count=1,
                max_retries=settings.job_max_retries,
                retryable=True,
            )
            await redis.xack(self.stream, self.group, message_id)
        except Exception:  # noqa: BLE001
            # DB unavailable — keep message pending for redelivery
            logger.error(
                "Could not persist job failure; leaving message for redelivery",
                message_id=message_id,
            )

    async def run(self) -> None:
        await self.setup_consumer_group()
        self.running = True
        redis = await get_redis()
        logger.info("Worker started", stream=self.stream, consumer=self.consumer_name)

        while self.running:
            try:
                messages = await redis.xreadgroup(
                    groupname=self.group,
                    consumername=self.consumer_name,
                    streams={self.stream: ">"},
                    count=10,
                    block=5000,
                )
                if not messages:
                    continue
                for _stream, stream_messages in messages:
                    for message_id, data in stream_messages:
                        await self.handle_message(message_id, data)
            except asyncio.CancelledError:
                break
            except Exception as exc:  # noqa: BLE001
                logger.error("Worker error", error=str(exc))
                await asyncio.sleep(1)

        logger.info("Worker stopped", stream=self.stream)

    def stop(self) -> None:
        self.running = False


async def build_workers() -> list[RedisStreamWorker]:
    """One worker per registered job-type stream so pools can scale per solver."""
    return [RedisStreamWorker(stream=f"{STREAM_PREFIX}{suffix}") for suffix in STREAM_SUFFIX_TO_TYPE]


async def main() -> None:
    setup_logging()
    logger.info("NexusOps Compute Engine starting...")

    workers = await build_workers()
    shutdown_event = asyncio.Event()

    def handle_shutdown() -> None:
        logger.info("Shutdown signal received")
        for worker in workers:
            worker.stop()
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGTERM, handle_shutdown)
    loop.add_signal_handler(signal.SIGINT, handle_shutdown)

    tasks = [asyncio.create_task(w.run()) for w in workers]

    logger.info("Compute engine ready, waiting for jobs...")

    try:
        await shutdown_event.wait()
    finally:
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        await close_redis()
        await close_db()
        logger.info("Compute engine stopped")


if __name__ == "__main__":
    asyncio.run(main())
