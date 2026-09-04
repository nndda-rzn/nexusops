import psycopg
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from src.shared.config import settings

_pool: AsyncConnectionPool | None = None


async def get_pool() -> AsyncConnectionPool:
    global _pool
    if _pool is None:
        _pool = AsyncConnectionPool(
            conninfo=settings.database_url,
            min_size=1,
            max_size=settings.worker_concurrency + 2,
            kwargs={"row_factory": dict_row},
            open=False,
        )
        await _pool.open()
    return _pool


async def get_db() -> psycopg.AsyncConnection:  # type: ignore[type-arg]
    """Get a connection from the pool."""
    pool = await get_pool()
    return await pool.getconn()


async def release_db(conn: psycopg.AsyncConnection) -> None:  # type: ignore[type-arg]
    """Return a connection to the pool."""
    pool = await get_pool()
    await pool.putconn(conn)


async def close_db() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
