#!/usr/bin/env python3
"""
Smart bookmark validation v2 - saves all enhanced fields to SQLite.
"""

import os
import sys
import asyncio
import aiohttp
import socket
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from urllib.parse import urlparse

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.bookmarks_data import BookmarkStore
from app.config import CACHE_FRESHNESS_HOURS

DB_PATH = os.path.join(os.path.dirname(__file__), '../data/bookmarks_cache.db')

# Domain-specific strategies
DOMAIN_STRATEGIES = {
    'docs.google.com': 'GET_RANGE',
    'drive.google.com': 'GET_RANGE',
    'sheets.google.com': 'GET_RANGE',
    'github.com': 'HEAD',
    'twitter.com': 'GET_RANGE',
    'x.com': 'GET_RANGE',
    'linkedin.com': 'GET_RANGE',
    'facebook.com': 'GET_RANGE',
    'instagram.com': 'GET_RANGE',
    'reddit.com': 'HEAD',
    'stackoverflow.com': 'HEAD',
    'youtube.com': 'HEAD',
    'medium.com': 'HEAD',
    'notion.so': 'GET_RANGE',
}

# Login detection patterns in HTML content
LOGIN_PATTERNS = [
    b'<form.*login',
    b'<form.*signin',
    b'<input.*password',
    b'<title>.*Sign [Ii]n',
    b'<title>.*Log[Ii]n',
    b'class="login',
    b'id="login',
    b'Authentication Required',
    b'Access Denied',
    b'Unauthorized',
]

class SmartBookmarkValidatorV2:
    def __init__(self, bookmarks_file: str):
        self.store = BookmarkStore(bookmarks_file)
        self.store.load_data()
        self.dns_cache = {}
        self.stats = {
            'total': 0,
            'dns_failed': 0,
            'tcp_failed': 0,
            'http_ok': 0,
            'http_auth': 0,
            'http_broken': 0,
            'cache_hits': 0,
            'bandwidth_bytes': 0
        }

    def save_to_sqlite(self, bookmark_data: Dict):
        """Save bookmark validation data with all enhanced fields."""
        with sqlite3.connect(DB_PATH) as conn:
            # Prepare all fields
            bookmark = bookmark_data['bookmark']
            status = bookmark_data['status']
            error_details = status.get('error_details', {})
            
            # Calculate bandwidth for this check
            bandwidth = 0
            if status.get('dns_resolved') == False:
                bandwidth = 50  # DNS check only
            elif status.get('tcp_connectable') == False:
                bandwidth = 150  # DNS + TCP
            else:
                # HTTP check
                method = error_details.get('method_used', 'HEAD')
                if method == 'HEAD':
                    bandwidth = 500
                elif method == 'GET_RANGE':
                    bandwidth = 2500
            
            # Execute the insert/update with all fields
            conn.execute('''
                INSERT INTO bookmarks_cache (
                    id, url, name, last_checked, broken_status, login_required,
                    error_details, http_method, dns_resolved, tcp_connectable,
                    redirect_count, final_url, content_preview, response_time_ms,
                    bandwidth_bytes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    url=excluded.url,
                    name=excluded.name,
                    last_checked=excluded.last_checked,
                    broken_status=excluded.broken_status,
                    login_required=excluded.login_required,
                    error_details=excluded.error_details,
                    http_method=excluded.http_method,
                    dns_resolved=excluded.dns_resolved,
                    tcp_connectable=excluded.tcp_connectable,
                    redirect_count=excluded.redirect_count,
                    final_url=excluded.final_url,
                    content_preview=excluded.content_preview,
                    response_time_ms=excluded.response_time_ms,
                    bandwidth_bytes=excluded.bandwidth_bytes
            ''', (
                bookmark.id,
                bookmark.url.full,
                bookmark.name,
                datetime.utcnow().isoformat(),
                status['broken_status'],
                status['login_required'],
                json.dumps(error_details),
                error_details.get('method_used'),
                status.get('dns_resolved', True),
                status.get('tcp_connectable', True),
                0,  # redirect_count - TODO: track this
                error_details.get('final_url'),
                error_details.get('content_preview'),
                int(error_details.get('response_time', 0) * 1000) if error_details.get('response_time') else None,
                bandwidth
            ))
            conn.commit()

    def is_cache_fresh(self, bookmark_id: str) -> bool:
        """Check if bookmark cache is fresh."""
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT last_checked FROM bookmarks_cache WHERE id = ?', (bookmark_id,))
            row = cursor.fetchone()
            if row and row[0]:
                try:
                    last_checked = datetime.fromisoformat(row[0])
                    return datetime.utcnow() - last_checked < timedelta(hours=CACHE_FRESHNESS_HOURS)
                except:
                    pass
        return False

    async def check_dns(self, hostname: str) -> bool:
        """Check if hostname resolves to IP address."""
        if hostname in self.dns_cache:
            return self.dns_cache[hostname]
        
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, socket.gethostbyname, hostname)
            self.dns_cache[hostname] = True
            return True
        except (socket.gaierror, socket.error):
            self.dns_cache[hostname] = False
            self.stats['dns_failed'] += 1
            return False

    async def check_tcp_connect(self, hostname: str, port: int = 443) -> bool:
        """Check if we can establish TCP connection."""
        try:
            _, writer = await asyncio.wait_for(
                asyncio.open_connection(hostname, port),
                timeout=3.0
            )
            writer.close()
            await writer.wait_closed()
            return True
        except (asyncio.TimeoutError, OSError):
            self.stats['tcp_failed'] += 1
            return False

    def detect_login_required(self, content: bytes) -> bool:
        """Detect if content contains login page patterns."""
        content_lower = content.lower()
        return any(pattern in content_lower for pattern in LOGIN_PATTERNS)

    async def check_http_status(self, session: aiohttp.ClientSession, url: str) -> Dict:
        """Perform HTTP check using appropriate method based on domain."""
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        
        # Determine strategy
        strategy = DOMAIN_STRATEGIES.get(domain, 'HEAD_WITH_FALLBACK')
        
        result = {
            'url': url,
            'method_used': None,
            'status_code': None,
            'is_accessible': False,
            'login_required': False,
            'final_url': None,
            'response_time': None,
            'content_preview': None,
            'error': None
        }
        
        start_time = datetime.now()
        
        try:
            # Try HEAD first unless strategy says otherwise
            if strategy in ['HEAD', 'HEAD_WITH_FALLBACK']:
                try:
                    async with session.head(
                        url, 
                        timeout=aiohttp.ClientTimeout(total=8),
                        allow_redirects=True,
                        ssl=False
                    ) as response:
                        result['method_used'] = 'HEAD'
                        result['status_code'] = response.status
                        result['final_url'] = str(response.url)
                        result['response_time'] = (datetime.now() - start_time).total_seconds()
                        self.stats['bandwidth_bytes'] += 500
                        
                        if response.status < 400:
                            result['is_accessible'] = True
                            self.stats['http_ok'] += 1
                        elif response.status in [401, 403]:
                            result['is_accessible'] = True
                            result['login_required'] = True
                            self.stats['http_auth'] += 1
                        elif response.status == 405 and strategy == 'HEAD_WITH_FALLBACK':
                            raise aiohttp.ClientError("HEAD not supported")
                        else:
                            self.stats['http_broken'] += 1
                            
                        return result
                        
                except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                    if strategy != 'HEAD_WITH_FALLBACK':
                        result['error'] = str(e)
                        return result
            
            # Use GET with Range header
            if strategy in ['GET_RANGE', 'HEAD_WITH_FALLBACK']:
                start_time = datetime.now()
                headers = {'Range': 'bytes=0-2047'}
                
                async with session.get(
                    url,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                    allow_redirects=True,
                    ssl=False
                ) as response:
                    result['method_used'] = 'GET_RANGE'
                    result['status_code'] = response.status
                    result['final_url'] = str(response.url)
                    result['response_time'] = (datetime.now() - start_time).total_seconds()
                    
                    # Read content preview
                    content = await response.content.read(2048)
                    result['content_preview'] = content[:1024].decode('utf-8', errors='ignore')
                    self.stats['bandwidth_bytes'] += len(content) + 500
                    
                    if response.status < 400:
                        result['is_accessible'] = True
                        # Check for login patterns in content
                        if self.detect_login_required(content):
                            result['login_required'] = True
                            self.stats['http_auth'] += 1
                        else:
                            self.stats['http_ok'] += 1
                    elif response.status in [401, 403]:
                        result['is_accessible'] = True
                        result['login_required'] = True
                        self.stats['http_auth'] += 1
                    else:
                        self.stats['http_broken'] += 1
                        
        except aiohttp.ClientError as e:
            result['error'] = f"Connection error: {str(e)}"
            self.stats['http_broken'] += 1
        except asyncio.TimeoutError:
            result['error'] = "Timeout"
            self.stats['http_broken'] += 1
        except Exception as e:
            result['error'] = f"Unexpected error: {str(e)}"
            self.stats['http_broken'] += 1
            
        return result

    async def validate_bookmark(self, session: aiohttp.ClientSession, bookmark) -> Optional[Dict]:
        """Validate a single bookmark with tiered checking."""
        # Check cache first
        if self.is_cache_fresh(bookmark.id):
            self.stats['cache_hits'] += 1
            return None
        
        url = bookmark.url.full
        parsed = urlparse(url)
        hostname = parsed.netloc
        
        # Stage 1: DNS Check
        print(f"🔍 Checking: {bookmark.name[:50]}...")
        dns_resolved = await self.check_dns(hostname)
        if not dns_resolved:
            print(f"  ❌ DNS failed: {hostname}")
            return {
                'bookmark': bookmark,
                'status': {
                    'dns_resolved': False,
                    'tcp_connectable': None,
                    'broken_status': 'broken',
                    'login_required': 'no',
                    'error_details': {
                        'category': 'DNS Failure',
                        'message': f'DNS resolution failed for {hostname}',
                        'method_used': 'DNS'
                    }
                }
            }
        
        # Stage 2: TCP Connect (for HTTPS sites)
        tcp_connectable = True
        if parsed.scheme == 'https':
            tcp_connectable = await self.check_tcp_connect(hostname, 443)
            if not tcp_connectable:
                print(f"  ❌ TCP connect failed: {hostname}:443")
                return {
                    'bookmark': bookmark,
                    'status': {
                        'dns_resolved': True,
                        'tcp_connectable': False,
                        'broken_status': 'broken',
                        'login_required': 'no',
                        'error_details': {
                            'category': 'Connection Error',
                            'message': f'Cannot connect to {hostname}:443',
                            'method_used': 'TCP'
                        }
                    }
                }
        
        # Stage 3: HTTP Check
        result = await self.check_http_status(session, url)
        
        # Determine final status
        if result['is_accessible']:
            if result['login_required']:
                print(f"  🔒 Login required [{result['status_code']}] ({result['method_used']})")
                broken_status = 'ok'
                login_required = 'yes'
            else:
                print(f"  ✅ Accessible [{result['status_code']}] ({result['method_used']})")
                broken_status = 'ok'
                login_required = 'no'
        else:
            print(f"  ❌ Broken [{result['status_code']}] - {result['error']}")
            broken_status = 'broken'
            login_required = 'no'
        
        return {
            'bookmark': bookmark,
            'status': {
                'dns_resolved': dns_resolved,
                'tcp_connectable': tcp_connectable,
                'broken_status': broken_status,
                'login_required': login_required,
                'error_details': {
                    'status_code': result['status_code'],
                    'method_used': result['method_used'],
                    'response_time': result['response_time'],
                    'final_url': result['final_url'],
                    'error': result['error'],
                    'content_preview': result['content_preview'][:500] if result['content_preview'] else None
                }
            }
        }

    async def validate_all(self):
        """Validate all bookmarks with smart batching."""
        bookmarks = [b for b in self.store._bookmarks if b.url]
        self.stats['total'] = len(bookmarks)
        
        print(f"\n🚀 Smart validation v2 of {self.stats['total']} bookmarks")
        print("=" * 60)
        
        # Process bookmarks
        connector = aiohttp.TCPConnector(limit=20, limit_per_host=5)
        async with aiohttp.ClientSession(connector=connector) as session:
            # Process in batches
            batch_size = 20
            
            for i in range(0, len(bookmarks), batch_size):
                batch = bookmarks[i:i + batch_size]
                tasks = [self.validate_bookmark(session, b) for b in batch]
                batch_results = await asyncio.gather(*tasks)
                
                # Save results to database
                for result in batch_results:
                    if result:  # Not cached
                        self.save_to_sqlite(result)
                
                # Progress update
                processed = min(i + batch_size, len(bookmarks))
                print(f"\n📈 Progress: {processed}/{len(bookmarks)}")
                print(f"   Cache hits: {self.stats['cache_hits']}")
                print(f"   DNS failed: {self.stats['dns_failed']}")
                print(f"   TCP failed: {self.stats['tcp_failed']}")
                print(f"   Accessible: {self.stats['http_ok']}")
                print(f"   Login required: {self.stats['http_auth']}")
                print(f"   Broken: {self.stats['http_broken']}")
                print(f"   Bandwidth used: {self.stats['bandwidth_bytes'] / 1024:.1f} KB")
        
        print("\n" + "=" * 60)
        print("✅ Validation complete!")
        print(f"📊 Final stats:")
        print(f"   Total bookmarks: {self.stats['total']}")
        print(f"   Cache hits: {self.stats['cache_hits']} ({self.stats['cache_hits']/self.stats['total']*100:.1f}%)")
        print(f"   DNS failures: {self.stats['dns_failed']}")
        print(f"   TCP failures: {self.stats['tcp_failed']}")
        print(f"   Accessible: {self.stats['http_ok']}")
        print(f"   Login required: {self.stats['http_auth']}")
        print(f"   Broken: {self.stats['http_broken']}")
        print(f"   Total bandwidth: {self.stats['bandwidth_bytes'] / 1024 / 1024:.2f} MB")
        print(f"   Avg per bookmark: {self.stats['bandwidth_bytes'] / max(1, self.stats['total'] - self.stats['cache_hits']) / 1024:.1f} KB")

async def main():
    bookmarks_file = os.path.join(os.path.dirname(__file__), '../data/bookmarks.json')
    if not os.path.exists(bookmarks_file):
        print(f"❌ Bookmarks file not found: {bookmarks_file}")
        sys.exit(1)
    
    validator = SmartBookmarkValidatorV2(bookmarks_file)
    await validator.validate_all()

if __name__ == "__main__":
    asyncio.run(main()) 