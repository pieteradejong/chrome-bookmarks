import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), '../data/bookmarks_cache.db')

if not os.path.exists(DB_PATH):
    print(f"Database file not found: {DB_PATH}")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Count total entries
cursor.execute('SELECT COUNT(*) FROM bookmarks_cache')
total = cursor.fetchone()[0]

# Count broken and ok
cursor.execute("SELECT COUNT(*) FROM bookmarks_cache WHERE broken_status = 'broken'")
broken = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM bookmarks_cache WHERE broken_status = 'ok'")
ok = cursor.fetchone()[0]

print(f"\n📊 Bookmarks Cache DB Report")
print(f"---------------------------")
print(f"Total entries: {total}")
print(f"Broken:        {broken}")
print(f"OK:            {ok}")

# Show a few sample entries
print(f"\nSample entries:")
cursor.execute('SELECT id, url, name, last_checked, broken_status, error_details FROM bookmarks_cache LIMIT 5')
for row in cursor.fetchall():
    print(f"- ID: {row[0]} | Status: {row[4]} | Last checked: {row[3]}")
    print(f"  Name: {row[2]}")
    print(f"  URL:  {row[1]}")
    print(f"  Error details: {row[5]}")
    print()

conn.close() 