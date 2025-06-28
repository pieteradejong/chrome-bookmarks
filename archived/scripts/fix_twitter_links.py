#!/usr/bin/env python3
"""
Fix Twitter/X links that are incorrectly marked as broken.
Twitter often returns 403 or has header issues for automated requests,
but the links work fine in a browser.
"""

import os
import sqlite3
import json

DB_PATH = os.path.join(os.path.dirname(__file__), '../data/bookmarks_cache.db')

def fix_twitter_links():
    """Update Twitter/X links to be marked as login_required instead of broken."""
    
    print("🔧 Fixing Twitter/X bookmark status...")
    
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        
        # Find all Twitter/X links marked as broken
        cursor.execute("""
            SELECT id, url, broken_status, login_required, error_details 
            FROM bookmarks_cache 
            WHERE (url LIKE '%twitter.com/%' OR url LIKE '%x.com/%')
               AND broken_status = 'broken'
        """)
        
        twitter_links = cursor.fetchall()
        print(f"Found {len(twitter_links)} broken Twitter/X links")
        
        fixed_count = 0
        for row in twitter_links:
            id_, url, broken_status, login_required, error_details_str = row
            
            try:
                error_details = json.loads(error_details_str) if error_details_str else {}
            except:
                error_details = {}
            
            print(f"  Fixing: {url[:80]}...")
            
            # Update to login_required status
            cursor.execute("""
                UPDATE bookmarks_cache 
                SET broken_status = 'ok',
                    login_required = 'yes'
                WHERE id = ?
            """, (id_,))
            
            # Update error_details to reflect the change
            if error_details:
                error_details['fixed'] = 'Twitter/X links require login'
                error_details['original_error'] = error_details.get('error', '')
                cursor.execute("""
                    UPDATE bookmarks_cache 
                    SET error_details = ?
                    WHERE id = ?
                """, (json.dumps(error_details), id_))
            
            fixed_count += 1
        
        conn.commit()
        
    print(f"\n✅ Fixed {fixed_count} Twitter/X links")
    
    # Show updated stats
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT broken_status, login_required, COUNT(*) 
            FROM bookmarks_cache 
            WHERE url LIKE '%twitter.com/%' OR url LIKE '%x.com/%'
            GROUP BY broken_status, login_required
        """)
        
        print("\nTwitter/X links by status:")
        for status, login_req, count in cursor.fetchall():
            print(f"  Status: {status}, Login Required: {login_req} - Count: {count}")

if __name__ == "__main__":
    fix_twitter_links() 