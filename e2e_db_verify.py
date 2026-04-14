from sqlalchemy import text
from app.db.session import get_sync_db

with get_sync_db() as db:
    rows = db.execute(text("SELECT cluster_id, is_bridge FROM submissions WHERE job_id='237f070c-6d5a-4f90-992e-da1afaa9adfa'")).fetchall()
print(f"Total rows retrieved: {len(rows)}")
for row in rows:
    print(f"cluster_id: {row[0]}, is_bridge: {row[1]}")
