#!/usr/bin/env python3
"""
Update the database schema to support enhanced bookmark status tracking.
"""

import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '../data/bookmarks_cache.db')

def update_schema():
    """Add new columns to support enhanced status tracking."""
    print("📊 Updating database schema...")
    
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        
        # Get current columns
        cursor.execute("PRAGMA table_info(bookmarks_cache)")
        existing_columns = {row[1] for row in cursor.fetchall()}
        
        # Define new columns to add
        new_columns = [
            ("http_method", "TEXT", "Method used for HTTP check"),
            ("dns_resolved", "BOOLEAN", "Whether DNS resolution succeeded"),
            ("tcp_connectable", "BOOLEAN", "Whether TCP connection succeeded"),
            ("redirect_count", "INTEGER", "Number of redirects followed"),
            ("final_url", "TEXT", "Final URL after redirects"),
            ("content_preview", "TEXT", "First 1KB of content"),
            ("response_time_ms", "INTEGER", "Response time in milliseconds"),
            ("bandwidth_bytes", "INTEGER", "Bytes transferred for this check")
        ]
        
        # Add columns that don't exist
        for col_name, col_type, description in new_columns:
            if col_name not in existing_columns:
                try:
                    cursor.execute(f"ALTER TABLE bookmarks_cache ADD COLUMN {col_name} {col_type}")
                    print(f"✅ Added column: {col_name} ({description})")
                except sqlite3.OperationalError as e:
                    print(f"⚠️  Could not add column {col_name}: {e}")
        
        # Create indexes for better query performance
        indexes = [
            ("idx_broken_status", "broken_status"),
            ("idx_login_required", "login_required"),
            ("idx_last_checked", "last_checked"),
            ("idx_url", "url"),
            ("idx_dns_resolved", "dns_resolved")
        ]
        
        for idx_name, col_name in indexes:
            try:
                cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON bookmarks_cache({col_name})")
                print(f"✅ Created index: {idx_name}")
            except sqlite3.OperationalError as e:
                print(f"⚠️  Could not create index {idx_name}: {e}")
        
        conn.commit()
    
    # Show updated schema
    print("\n📋 Updated schema:")
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(bookmarks_cache)")
        print("\nColumn Name          | Type    | Not Null | Default")
        print("-" * 55)
        for row in cursor.fetchall():
            cid, name, type_, notnull, dflt_value, pk = row
            print(f"{name:<20} | {type_:<7} | {notnull:<8} | {dflt_value or 'NULL'}")
    
    print("\n✅ Schema update complete!")

if __name__ == "__main__":
    update_schema() 