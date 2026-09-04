from src.shared.logging import setup_logging, logger
from src.workers.main_worker import main
import asyncio

setup_logging()

if __name__ == "__main__":
    logger.info("Starting NexusOps Compute Engine")
    asyncio.run(main())
