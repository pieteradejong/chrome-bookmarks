#!/usr/bin/env python3
"""
Simple HEAD request checker for bookmarks.
Issues HEAD requests to all bookmarks and saves results to SQLite.
"""

import os
import sys
import asyncio
import sqlite3
import aiohttp
from datetime import datetime
from typing import List, Dict, Tuple

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.bookmarks_data import BookmarkStore

# Simple database schema
DB_PATH = os.path.join(os.path.dirname(__file__), '../data/head_check_results.db')

def init_db():
    """Initialize simple SQLite database for HEAD check results."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS head_check_results (
                url TEXT PRIMARY KEY,
                name TEXT,
                status_code INTEGER,
                is_accessible BOOLEAN,
                response_time_ms INTEGER,
                checked_at TEXT,
                error_message TEXT
            )
        ''')
        conn.commit()

async def head_check(session: aiohttp.ClientSession, url: str) -> Dict:
    """Perform simple HEAD request and return results."""
    start_time = datetime.now()
    
    try:
        async with session.head(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return {
                'url': url,
                'status_code': response.status,
                'is_accessible': response.status < 400,
                'response_time_ms': response_time,
                'error_message': None
            }
            
    except aiohttp.ClientError as e:
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        return {
            'url': url,
            'status_code': None,
            'is_accessible': False,
            'response_time_ms': response_time,
            'error_message': str(e)
        }
    except Exception as e:
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        return {
            'url': url,
            'status_code': None,
            'is_accessible': False,
            'response_time_ms': response_time,
            'error_message': f"Unexpected error: {str(e)}"
        }

def save_result(url: str, name: str, result: Dict):
    """Save HEAD check result to SQLite."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            INSERT OR REPLACE INTO head_check_results 
            (url, name, status_code, is_accessible, response_time_ms, checked_at, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            url,
            name,
            result['status_code'],
            result['is_accessible'],
            result['response_time_ms'],
            datetime.now().isoformat(),
            result['error_message']
        ))
        conn.commit()

async def main():
    # Initialize database
    init_db()
    
    # Load bookmarks
    bookmarks_file = os.path.join(os.path.dirname(__file__), '../data/bookmarks.json')
    if not os.path.exists(bookmarks_file):
        print(f"❌ Bookmarks file not found: {bookmarks_file}")
        sys.exit(1)
    
    store = BookmarkStore(bookmarks_file)
    store.load_data()
    
    # Get all bookmark URLs
    bookmarks = [b for b in store._bookmarks if b.url]
    total = len(bookmarks)
    
    print(f"🔍 Checking {total} bookmarks with HEAD requests...")
    
    # Process bookmarks in batches
    batch_size = 20
    checked = 0
    accessible = 0
    broken = 0
    
    async with aiohttp.ClientSession() as session:
        for i in range(0, total, batch_size):
            batch = bookmarks[i:i + batch_size]
            
            # Process batch concurrently
            tasks = [head_check(session, bookmark.url.full) for bookmark in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Save results and update counters
            for bookmark, result in zip(batch, results):
                if isinstance(result, Exception):
                    result = {
                        'url': bookmark.url.full,
                        'status_code': None,
                        'is_accessible': False,
                        'response_time_ms': 0,
                        'error_message': str(result)
                    }
                
                save_result(bookmark.url.full, bookmark.name, result)
                
                checked += 1
                if result['is_accessible']:
                    accessible += 1
                    print(f"✅ {bookmark.name} [{result['status_code']}] ({result['response_time_ms']}ms)")
                else:
                    broken += 1
                    error = result['error_message'] or f"HTTP {result['status_code']}"
                    print(f"❌ {bookmark.name} - {error}")
            
            # Progress update
            print(f"📊 Progress: {checked}/{total} | ✅ {accessible} accessible | ❌ {broken} broken")
    
    print(f"\n🎉 Complete! Results saved to: {DB_PATH}")
    print(f"📊 Final: {accessible} accessible, {broken} broken out of {total} total")

if __name__ == "__main__":
    asyncio.run(main()) 