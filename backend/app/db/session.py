from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_sessionmaker_db = async_sessionmaker(engine, expire_on_commit=False)

# Sync engine is created lazily so that test environments (which use
# aiosqlite/SQLite and don't have a real Postgres URL) don't fail on import.
_sync_engine = None
_SyncSession = None


def _get_sync_engine():
    global _sync_engine, _SyncSession
    if _sync_engine is None:
        sync_url = settings.DATABASE_URL.replace(
            "postgresql+asyncpg://", "postgresql+psycopg2://"
        )
        _sync_engine = create_engine(sync_url, echo=False)
        _SyncSession = sessionmaker(bind=_sync_engine)
    return _sync_engine, _SyncSession


@contextmanager
def get_sync_db():
    _, SyncSession = _get_sync_engine()
    session = SyncSession()
    try:
        yield session
    finally:
        session.close()


async def get_db():
    async with async_sessionmaker_db() as session:
        yield session
