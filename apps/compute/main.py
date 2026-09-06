import asyncio
import selectors
import sys

from src.shared.logging import setup_logging, logger
from src.workers.main_worker import main

setup_logging()

if __name__ == "__main__":
    logger.info("Starting NexusOps Compute Engine")

    if sys.platform == "win32":
        # Windows default is ProactorEventLoop, which is incompatible with
        # psycopg async and redis-py asyncio (timeouts / "cannot use
        # ProactorEventLoop"). Force a SelectorEventLoop for both.
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    asyncio.run(main())