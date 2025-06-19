import sqlite3
from dataclasses import dataclass, asdict
from typing import Optional, List, Any, Dict
from datetime import datetime, timedelta
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '../data/bookmarks_cache.db')

@dataclass
class BookmarkCacheEntry:
    id: str
    url: str
    name: Optional[str] = None
    last_checked: Optional[str] = None  # ISO format string
    broken_status: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None

class SQLiteBookmarkCache:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS bookmarks_cache (
                    id TEXT PRIMARY KEY,
                    url TEXT NOT NULL,
                    name TEXT,
                    last_checked TEXT,
                    broken_status TEXT,
                    error_details TEXT
                )
            ''')
            conn.commit()

    def upsert(self, entry: BookmarkCacheEntry):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO bookmarks_cache (id, url, name, last_checked, broken_status, error_details)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    url=excluded.url,
                    name=excluded.name,
                    last_checked=excluded.last_checked,
                    broken_status=excluded.broken_status,
                    error_details=excluded.error_details
            ''', (
                entry.id,
                entry.url,
                entry.name,
                entry.last_checked,
                entry.broken_status,
                json.dumps(entry.error_details) if entry.error_details else None
            ))
            conn.commit()

    def get(self, id: str) -> Optional[BookmarkCacheEntry]:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute('SELECT * FROM bookmarks_cache WHERE id = ?', (id,)).fetchone()
            if row:
                return BookmarkCacheEntry(
                    id=row[0],
                    url=row[1],
                    name=row[2],
                    last_checked=row[3],
                    broken_status=row[4],
                    error_details=json.loads(row[5]) if row[5] else None
                )
            return None

    def get_by_url(self, url: str) -> Optional[BookmarkCacheEntry]:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute('SELECT * FROM bookmarks_cache WHERE url = ?', (url,)).fetchone()
            if row:
                return BookmarkCacheEntry(
                    id=row[0],
                    url=row[1],
                    name=row[2],
                    last_checked=row[3],
                    broken_status=row[4],
                    error_details=json.loads(row[5]) if row[5] else None
                )
            return None

    def get_all(self) -> List[BookmarkCacheEntry]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute('SELECT * FROM bookmarks_cache').fetchall()
            return [
                BookmarkCacheEntry(
                    id=row[0],
                    url=row[1],
                    name=row[2],
                    last_checked=row[3],
                    broken_status=row[4],
                    error_details=json.loads(row[5]) if row[5] else None
                ) for row in rows
            ]

    def get_stale(self, max_age_hours: int = 24) -> List[BookmarkCacheEntry]:
        cutoff = (datetime.utcnow() - timedelta(hours=max_age_hours)).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute('SELECT * FROM bookmarks_cache WHERE last_checked IS NULL OR last_checked < ?', (cutoff,)).fetchall()
            return [
                BookmarkCacheEntry(
                    id=row[0],
                    url=row[1],
                    name=row[2],
                    last_checked=row[3],
                    broken_status=row[4],
                    error_details=json.loads(row[5]) if row[5] else None
                ) for row in rows
            ]

    def delete(self, id: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM bookmarks_cache WHERE id = ?', (id,))
            conn.commit()

    def clear(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM bookmarks_cache')
            conn.commit()

# Singleton instance
sqlite_cache = SQLiteBookmarkCache() 