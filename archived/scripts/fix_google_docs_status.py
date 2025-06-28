#!/usr/bin/env python3
"""
Fix Google Docs links that are incorrectly marked as broken.
These links are actually behind authentication, not truly broken.
"""

import os
import sys
import sqlite3
import json
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

DB_PATH = os.path.join(os.path.dirname(__file__), '../data/bookmarks_cache.db')

def fix_google_docs_status():
    """Update Google Docs links with 401 status to be marked as login_required."""
    
    print("🔧 Fixing Google Docs bookmark status...")
    
    with sqlite3.connect(DB_PATH) as conn:
        # First, let's see what we have
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, url, broken_status, login_required, error_details 
            FROM bookmarks_cache 
            WHERE url LIKE '%docs.google.com%' 
               OR url LIKE '%drive.google.com%'
               OR url LIKE '%sheets.google.com%'
        """)
        
        google_links = cursor.fetchall()
        print(f"Found {len(google_links)} Google links in cache")
        
        fixed_count = 0
        for row in google_links:
            id_, url, broken_status, login_required, error_details_str = row
            
            try:
                error_details = json.loads(error_details_str) if error_details_str else {}
            except:
                error_details = {}
            
            # Check if this is a 401/403 error that should be marked as login_required
            status_code = error_details.get('status_code')
            category = error_details.get('category', '')
            
            # Fix entries with authentication errors
            if (status_code in [401, 403] or 
                category == "Authentication Required" or
                (broken_status == "broken" and "401" in str(error_details))):
                
                print(f"  Fixing: {url[:60]}... (Status: {status_code})")
                
                # Update the entry
                cursor.execute("""
                    UPDATE bookmarks_cache 
                    SET login_required = 'yes',
                        broken_status = 'ok'
                    WHERE id = ?
                """, (id_,))
                
                # Also update error_details to indicate it's login required
                if error_details:
                    error_details['login_required'] = True
                    error_details['fixed_status'] = 'Updated from broken to login_required'
                    cursor.execute("""
                        UPDATE bookmarks_cache 
                        SET error_details = ?
                        WHERE id = ?
                    """, (json.dumps(error_details), id_))
                
                fixed_count += 1
        
        conn.commit()
        
    print(f"\n✅ Fixed {fixed_count} Google Docs/Drive links")
    print("📊 Summary:")
    
    # Show updated stats
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        
        # Count by status
        cursor.execute("""
            SELECT broken_status, login_required, COUNT(*) 
            FROM bookmarks_cache 
            WHERE url LIKE '%docs.google.com%' 
               OR url LIKE '%drive.google.com%'
               OR url LIKE '%sheets.google.com%'
            GROUP BY broken_status, login_required
        """)
        
        print("\nGoogle links by status:")
        for status, login_req, count in cursor.fetchall():
            print(f"  Status: {status}, Login Required: {login_req} - Count: {count}")

def update_validate_logic():
    """Show how the validation logic should be updated."""
    print("\n💡 Recommendation for future validation:")
    print("The _save_url_to_sqlite_cache function should be updated to:")
    print("1. Set login_required='yes' for AUTH_REQUIRED category")
    print("2. Consider AUTH_REQUIRED as 'ok' status (accessible but needs login)")
    print("3. Only mark as 'broken' for true failures like 404, DNS failures, etc.")

if __name__ == "__main__":
    fix_google_docs_status()
    update_validate_logic() 