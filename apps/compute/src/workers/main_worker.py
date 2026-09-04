import asyncio
import json
import signal
from typing import Any

from src.shared.config import settings
from src.shared.logging import logger, setup_logging
from src.shared.redis_client import get_redis, close_redis
from src.shared.database import close_db


class RedisStreamWorker:
    """
    Base Redis Streams consumer worker.
    Handles consumer group management, message acknowledgement,
    retry logic, and dead letter queue.
    """

    def __init__(self, stream: str, handler_map: dict[str, Any]) -> None:
        self.stream = stream
        self.handler_map = handler_map
        self.consumer_name = f"worker-{asyncio.get_event_loop().time()}"
        self.group = settings.redis_consumer_group
        self.running = False

    async def setup_consumer_group(self) -> None:
        redis = await get_redis()
        try:
            await redis.xgroup_create(
                self.stream,
                self.group,
                id="0",
                mkstream=True,
            )
            logger.info("Consumer group created", stream=self.stream, group=self.group)
        except Exception as e:
            if "BUSYGROUP" in str(e):
                logger.info("Consumer group already exists", stream=self.stream)
            else:
                raise

    async def process_message(self, message_id: str, data: dict[str, str]) -> None:
        job_type = data.get("job_type", "unknown")
        handler = self.handler_map.get(job_type)

        if handler is None:
            logger.warning("No handler for job type", job_type=job_type)
            return

        try:
            payload = json.loads(data.get("payload", "{}"))
            await handler(payload)

            redis = await get_redis()
            await redis.xack(self.stream, self.group, message_id)
            logger.info("Message processed", job_type=job_type, message_id=message_id)

        except Exception as e:
            logger.error(
                "Message processing failed",
                job_type=job_type,
                message_id=message_id,
                error=str(e),
            )
            await self.handle_retry(message_id, data, str(e))

    async def handle_retry(
        self, message_id: str, data: dict[str, str], error: str
    ) -> None:
        retry_count = int(data.get("retry_count", "0"))

        if retry_count >= settings.job_max_retries:
            logger.error(
                "Max retries exceeded, moving to DLQ",
                message_id=message_id,
                retry_count=retry_count,
            )
            redis = await get_redis()
            await redis.xadd(
                f"{settings.redis_stream_prefix}:dead_letter",
                {**data, "error": error, "original_stream": self.stream},
            )
            await redis.xack(self.stream, self.group, message_id)
        else:
            logger.warning(
                "Retrying message",
                message_id=message_id,
                retry_count=retry_count + 1,
            )
            redis = await get_redis()
            await redis.xadd(
                self.stream,
                {**data, "retry_count": str(retry_count + 1)},
            )
            await redis.xack(self.stream, self.group, message_id)

    async def run(self) -> None:
        await self.setup_consumer_group()
        self.running = True
        redis = await get_redis()

        logger.info(
            "Worker started",
            stream=self.stream,
            group=self.group,
            consumer=self.consumer_name,
        )

        while self.running:
            try:
                messages = await redis.xreadgroup(
                    groupname=self.group,
                    consumername=self.consumer_name,
                    streams={self.stream: ">"},
                    count=1,
                    block=5000,  # block 5 seconds
                )

                if not messages:
                    continue

                for _stream, stream_messages in messages:
                    for message_id, data in stream_messages:
                        await self.process_message(message_id, data)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Worker error", error=str(e))
                await asyncio.sleep(1)

        logger.info("Worker stopped", stream=self.stream)

    def stop(self) -> None:
        self.running = False


async def main() -> None:
    setup_logging()
    logger.info("NexusOps Compute Engine starting...")

    # Graceful shutdown
    loop = asyncio.get_event_loop()

    workers: list[RedisStreamWorker] = []

    def handle_shutdown() -> None:
        logger.info("Shutdown signal received")
        for worker in workers:
            worker.stop()

    loop.add_signal_handler(signal.SIGTERM, handle_shutdown)
    loop.add_signal_handler(signal.SIGINT, handle_shutdown)

    # TODO: Initialize workers per job type
    # e.g. yard_optimization worker, berth_scheduling worker, etc.
    # Will be added in feature/planning/* branches

    logger.info("Compute engine ready, waiting for jobs...")

    try:
        # Keep alive until shutdown
        while True:
            await asyncio.sleep(1)
    finally:
        await close_redis()
        await close_db()
        logger.info("Compute engine stopped")


if __name__ == "__main__":
    asyncio.run(main())
