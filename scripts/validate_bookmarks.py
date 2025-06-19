import os
import sys
import asyncio
from datetime import datetime, timedelta
from app.bookmarks_data import BookmarkStore, categorize_error, ErrorDetails, ErrorCategory
from app.sqlite_cache import sqlite_cache, BookmarkCacheEntry
from app.config import CACHE_FRESHNESS_HOURS

BOOKMARKS_FILE = os.path.join(os.path.dirname(__file__), '../data/bookmarks.json')

if not os.path.exists(BOOKMARKS_FILE):
    print(f"Bookmarks file not found: {BOOKMARKS_FILE}")
    sys.exit(1)

store = BookmarkStore(BOOKMARKS_FILE)
store.load_data()

bookmarks = [b for b in store._bookmarks if b.url]
total = len(bookmarks)
print(f"\n🔎 Validating {total} bookmarks...")

PURPLE = "\033[95m"
RESET = "\033[0m"

async def check_and_update(bookmark):
    cache_entry = sqlite_cache.get(bookmark.id)
    fresh = False
    if cache_entry and cache_entry.last_checked:
        last_checked = datetime.fromisoformat(cache_entry.last_checked)
        if datetime.utcnow() - last_checked < timedelta(hours=CACHE_FRESHNESS_HOURS):
            fresh = True
    if fresh:
        print(f"💾 [CACHE] {bookmark.name} ({bookmark.url.full}) is fresh, skipping.")
        return 'cache'
    # Otherwise, perform network check
    print(f"🌐 [NET] Checking: {bookmark.name} ({bookmark.url.full}) ...")
    is_accessible, error_details, details = await store._check_url_accessible(bookmark.url.full)
    now = datetime.utcnow().isoformat()
    broken_status = "broken" if not is_accessible else "ok"
    def error_details_to_dict(error_details):
        d = error_details._asdict() if hasattr(error_details, '_asdict') else dict(error_details)
        if isinstance(d.get('category'), ErrorCategory):
            d['category'] = d['category'].value
        return d
    entry = BookmarkCacheEntry(
        id=bookmark.id,
        url=bookmark.url.full,
        name=bookmark.name,
        last_checked=now,
        broken_status=broken_status,
        error_details=error_details_to_dict(error_details)
    )
    sqlite_cache.upsert(entry)
    print(f"{PURPLE}💾 [DB] Saved: {bookmark.name} ({bookmark.url.full}) as {broken_status}{RESET}")
    return broken_status

async def main():
    cache_hits = 0
    broken = 0
    ok = 0
    for idx, bookmark in enumerate(bookmarks):
        result = await check_and_update(bookmark)
        if result == 'cache':
            cache_hits += 1
        elif result == 'broken':
            broken += 1
        elif result == 'ok':
            ok += 1
        if (idx + 1) % 10 == 0 or (idx + 1) == total:
            print(f"📊 Progress: {idx + 1}/{total} | Broken: {broken} | OK: {ok} | Cache hits: {cache_hits}")
    print(f"\n📊 Validation complete: {broken} broken, {ok} ok, {cache_hits} cache hits, {total} total.")

if __name__ == "__main__":
    asyncio.run(main()) 