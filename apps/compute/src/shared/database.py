import psycopg
from psycopg.rows import dict_row
from src.shared.config import settings

_conn: psycopg.AsyncConnection | None = None  # type: ignore[type-arg]


async def get_db() -> psycopg.AsyncConnection:  # type: ignore[type-arg]
    global _conn
    if _conn is None or _conn.closed:
        _conn = await psycopg.AsyncConnection.connect(
            settings.database_url,
            row_factory=dict_row,
        )
    return _conn


async def close_db() -> None:
    global _conn
    if _conn is not None and not _conn.closed:
        await _conn.close()
        _conn = None
