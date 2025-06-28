#!/usr/bin/env python3
"""
Fix bookmarks that are marked as broken due to bot protection.
These are actually working links that just block automated requests.
"""

import sqlite3
import json
from pathlib import Path

def fix_bot_protected_links():
    """Update bot-protected links to be marked as ok with bot_protection flag."""
    db_path = Path(__file__).parent.parent / "data" / "bookmarks_cache.db"
    
    if not db_path.exists():
        print("❌ Database not found!")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("🔧 Fixing bot-protected bookmark status...")
    
    # Find all 403 and 999 status code bookmarks marked as broken
    cursor.execute("""
        SELECT id, url, name, error_details 
        FROM bookmarks_cache 
        WHERE broken_status = 'broken' 
        AND (
            json_extract(error_details, '$.status_code') = 403 
            OR json_extract(error_details, '$.status_code') = 999
        )
    """)
    
    bot_protected_bookmarks = cursor.fetchall()
    print(f"Found {len(bot_protected_bookmarks)} bot-protected links marked as broken")
    
    # Common bot-protected domains
    bot_protected_domains = {
        'linkedin.com': '999 status',
        'stackoverflow.com': '403 - bot protection',
        'udemy.com': '403 - bot protection',
        'glassdoor.com': '403 - bot protection',
        'ibm.com/docs': '403 - bot protection',
        'uiverse.io': '403 - bot protection',
    }
    
    fixed_count = 0
    for bookmark_id, url, name, error_details in bot_protected_bookmarks:
        # Check if it's a known bot-protected domain
        is_bot_protected = any(domain in url for domain in bot_protected_domains)
        
        # Parse error details
        try:
            error_data = json.loads(error_details) if error_details else {}
            status_code = error_data.get('status_code')
            
            # LinkedIn always uses 999
            if status_code == 999 or (status_code == 403 and is_bot_protected):
                # Update to ok with bot protection note
                cursor.execute("""
                    UPDATE bookmarks_cache 
                    SET broken_status = 'ok',
                        login_required = 'bot_protected',
                        error_details = ?
                    WHERE id = ?
                """, (json.dumps({
                    'status_code': status_code,
                    'reason': 'bot_protection',
                    'original_error': error_data
                }), bookmark_id))
                fixed_count += 1
                
                if fixed_count <= 5:  # Show first 5 examples
                    print(f"  ✓ Fixed: {name[:60]}...")
        except json.JSONDecodeError:
            continue
    
    conn.commit()
    
    print(f"\n✅ Fixed {fixed_count} bot-protected links")
    
    # Show summary of bookmarks by protection type
    cursor.execute("""
        SELECT 
            broken_status,
            login_required,
            COUNT(*) as count 
        FROM bookmarks_cache 
        WHERE url LIKE '%linkedin.com%' 
           OR url LIKE '%stackoverflow.com%'
           OR url LIKE '%udemy.com%'
           OR url LIKE '%glassdoor.com%'
        GROUP BY broken_status, login_required
        ORDER BY broken_status, login_required
    """)
    
    print("\nBot-protected domains by status:")
    for status, login_req, count in cursor.fetchall():
        print(f"  Status: {status}, Login Required: {login_req} - Count: {count}")
    
    conn.close()

if __name__ == "__main__":
    fix_bot_protected_links() 