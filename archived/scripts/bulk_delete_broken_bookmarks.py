#!/usr/bin/env python3
"""
Bulk delete bookmarks that definitely don't exist.
Focuses on efficiency - deleting bookmarks that are confirmed non-existent.
"""

import sqlite3
import json
import sys
import os
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.bookmarks_data import BookmarkStore

def get_deletion_candidates():
    """Get bookmarks categorized by deletion confidence."""
    db_path = Path(__file__).parent.parent / "data" / "bookmarks_cache.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Tier 1: Definitely delete - pages that don't exist
    cursor.execute("""
        SELECT id, url, name, json_extract(error_details, '$.status_code') as status_code
        FROM bookmarks_cache 
        WHERE broken_status = 'broken' 
        AND login_required != 'yes'
        AND (
            json_extract(error_details, '$.status_code') IN (404, 410)
            OR json_extract(error_details, '$.error') LIKE '%Connection error%'
            OR json_extract(error_details, '$.error') LIKE '%DNS%'
            OR error_details LIKE '%Connection error%'
        )
    """)
    
    tier1_definitely_delete = cursor.fetchall()
    
    # Tier 2: Probably delete - long-term server errors
    cursor.execute("""
        SELECT id, url, name, json_extract(error_details, '$.status_code') as status_code
        FROM bookmarks_cache 
        WHERE broken_status = 'broken' 
        AND login_required != 'yes'
        AND json_extract(error_details, '$.status_code') IN (500, 503, 525, 530)
    """)
    
    tier2_probably_delete = cursor.fetchall()
    
    # Tier 3: Review first - might be bot protection we missed
    cursor.execute("""
        SELECT id, url, name, json_extract(error_details, '$.status_code') as status_code
        FROM bookmarks_cache 
        WHERE broken_status = 'broken' 
        AND login_required != 'yes'
        AND json_extract(error_details, '$.status_code') = 403
        AND url NOT LIKE '%linkedin.com%'
        AND url NOT LIKE '%stackoverflow.com%'
        AND url NOT LIKE '%udemy.com%'
        AND url NOT LIKE '%glassdoor.com%'
        LIMIT 10
    """)
    
    tier3_review_first = cursor.fetchall()
    
    conn.close()
    return tier1_definitely_delete, tier2_probably_delete, tier3_review_first

def delete_bookmarks_by_titles(bookmark_titles, dry_run=True):
    """Delete bookmarks from Chrome bookmarks file by title."""
    store = BookmarkStore()
    store.load_data()
    
    deleted_count = 0
    for title in bookmark_titles:
        if dry_run:
            print(f"  [DRY RUN] Would delete: {title}")
            deleted_count += 1
        else:
            if store.delete_bookmark_by_title(title):
                print(f"  ✅ Deleted: {title}")
                deleted_count += 1
            else:
                print(f"  ❌ Failed to delete: {title}")
    
    return deleted_count

def main():
    print("🔍 Analyzing bookmarks for bulk deletion...")
    
    tier1, tier2, tier3 = get_deletion_candidates()
    
    print(f"\n📊 Deletion Analysis:")
    print(f"  Tier 1 (Definitely Delete): {len(tier1)} bookmarks")
    print(f"    - 404 Not Found, 410 Gone, DNS/Connection failures")
    print(f"  Tier 2 (Probably Delete): {len(tier2)} bookmarks") 
    print(f"    - 500/503 server errors, SSL failures")
    print(f"  Tier 3 (Review First): {len(tier3)} bookmarks")
    print(f"    - 403 errors that might be bot protection")
    
    if len(tier1) == 0:
        print("\n✅ No bookmarks found that definitely don't exist!")
        return
    
    print(f"\n🎯 Tier 1 Examples (first 5):")
    for i, (bookmark_id, url, name, status_code) in enumerate(tier1[:5]):
        print(f"  {i+1}. [{status_code}] {name[:50]}...")
        print(f"     {url[:80]}...")
    
    # Ask for confirmation
    choice = input(f"\n❓ Delete {len(tier1)} Tier 1 bookmarks? (y/N): ").lower()
    
    if choice == 'y':
        print("🗑️  Deleting Tier 1 bookmarks...")
        tier1_titles = [name for _, _, name, _ in tier1]
        tier1_ids = [bookmark_id for bookmark_id, _, _, _ in tier1]
        
        deleted = delete_bookmarks_by_titles(tier1_titles, dry_run=False)
        print(f"✅ Deleted {deleted} bookmarks from Chrome bookmarks file")
        
        # Remove from cache too
        db_path = Path(__file__).parent.parent / "data" / "bookmarks_cache.db"
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        placeholders = ','.join(['?' for _ in tier1_ids])
        cursor.execute(f"DELETE FROM bookmarks_cache WHERE id IN ({placeholders})", tier1_ids)
        conn.commit()
        conn.close()
        print(f"✅ Removed {len(tier1_ids)} entries from cache")
        
        # Check Tier 2
        if len(tier2) > 0:
            print(f"\n🤔 Tier 2 ({len(tier2)} server error bookmarks):")
            print("These might be temporarily down but could come back online.")
            choice2 = input("Delete these too? (y/N): ").lower()
            if choice2 == 'y':
                tier2_titles = [name for _, _, name, _ in tier2]
                tier2_ids = [bookmark_id for bookmark_id, _, _, _ in tier2]
                
                deleted2 = delete_bookmarks_by_titles(tier2_titles, dry_run=False)
                print(f"✅ Deleted {deleted2} additional bookmarks")
                
                # Remove from cache
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                placeholders = ','.join(['?' for _ in tier2_ids])
                cursor.execute(f"DELETE FROM bookmarks_cache WHERE id IN ({placeholders})", tier2_ids)
                conn.commit()
                conn.close()
                print(f"✅ Removed {len(tier2_ids)} entries from cache")
    else:
        print("🚫 Deletion cancelled")
        
        # Show dry run for Tier 1
        print("\n🧪 Dry run - would delete these Tier 1 bookmarks:")
        tier1_titles = [name for _, _, name, _ in tier1]
        would_delete = delete_bookmarks_by_titles(tier1_titles, dry_run=True)
        print(f"📋 Would delete {would_delete} bookmarks")

if __name__ == "__main__":
    main() 