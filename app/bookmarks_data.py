import json
import logging
from typing import Dict, List, Optional, Set, Tuple, Any, NamedTuple
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from pathlib import Path
import aiohttp
import asyncio
import ssl
import socket
import concurrent.futures
from enum import Enum
import re

from app.models import URL, Bookmark, Folder, BookmarkResponse, BookmarkStats
from app.config import logger
from app.config import CACHE_FRESHNESS_HOURS
from app.sqlite_cache import sqlite_cache, BookmarkCacheEntry

PURPLE = "\033[95m"
RESET = "\033[0m"

class ErrorCategory(Enum):
    DNS_FAILURE = "DNS Failure"
    SSL_ERROR = "SSL Error"
    AUTH_REQUIRED = "Authentication Required"
    NOT_FOUND = "Not Found"
    SERVER_ERROR = "Server Error"
    TIMEOUT = "Timeout"
    CONNECTION_ERROR = "Connection Error"
    OTHER = "Other"

class ErrorDetails(NamedTuple):
    category: ErrorCategory
    message: str
    status_code: Optional[int] = None
    technical_details: Optional[Dict[str, Any]] = None

def categorize_error(error: str, status_code: Optional[int] = None) -> ErrorDetails:
    """Categorize an error message into a specific category."""
    error_lower = error.lower()
    
    # DNS errors
    if "dns resolution failed" in error_lower:
        return ErrorDetails(ErrorCategory.DNS_FAILURE, error)
    
    # SSL errors
    if any(ssl_term in error_lower for ssl_term in ["ssl", "certificate", "tls"]):
        return ErrorDetails(ErrorCategory.SSL_ERROR, error)
    
    # Authentication errors
    if status_code in [401, 403] or "unauthorized" in error_lower or "forbidden" in error_lower:
        return ErrorDetails(ErrorCategory.AUTH_REQUIRED, error, status_code)
    
    # Not found errors
    if status_code == 404 or "not found" in error_lower:
        return ErrorDetails(ErrorCategory.NOT_FOUND, error, status_code)
    
    # Server errors
    if status_code and 500 <= status_code < 600:
        return ErrorDetails(ErrorCategory.SERVER_ERROR, error, status_code)
    
    # Timeout errors
    if "timeout" in error_lower:
        return ErrorDetails(ErrorCategory.TIMEOUT, error)
    
    # Connection errors
    if any(conn_term in error_lower for conn_term in ["connection", "connect", "network"]):
        return ErrorDetails(ErrorCategory.CONNECTION_ERROR, error)
    
    # Other errors
    return ErrorDetails(ErrorCategory.OTHER, error, status_code)

def error_details_to_dict(error_details):
    d = error_details._asdict() if hasattr(error_details, '_asdict') else dict(error_details)
    if isinstance(d.get('category'), Enum):
        d['category'] = d['category'].value
    return d

class BookmarkStore:
    def __init__(self, bookmarks_file_path: str):
        self.bookmarks_file_path = bookmarks_file_path
        self._bookmarks: List[Bookmark] = []
        self._folders: List[Folder] = []
        self._bookmarks_json: Dict = {}
        self._loaded = False
        # Cache for URL check results
        self._url_cache: Dict[str, Tuple[bool, ErrorDetails, Optional[Dict[str, Any]], datetime]] = {}
        self._url_cache_expiry = timedelta(days=7)

    def _is_cache_valid(self, cache_time: datetime) -> bool:
        """Check if a cache entry is still valid."""
        return datetime.now() - cache_time < self._url_cache_expiry

    def load_data(self) -> bool:
        if self._loaded:
            return True
        try:
            with open(self.bookmarks_file_path, "r") as file:
                self._bookmarks_json = json.load(file)
                # Process the bookmark bar tree
                bookmark_bar = self._bookmarks_json.get('roots', {}).get('bookmark_bar', {})
                if bookmark_bar:
                    self._traverse_bookmark_bar(bookmark_bar)
                self._loaded = True
                return True
        except json.JSONDecodeError as e:
            logger.error(f"Error: Failed to convert JSON to dictionary. Reason: {e}")
            raise ValueError(f"Error: Failed to convert JSON to dictionary. Reason: {e}")
        except (FileNotFoundError, PermissionError) as e:
            logger.error(f"Error accessing bookmarks file: {e}")
            raise e
        except Exception as e:
            logger.error(f"Unexpected error loading bookmarks: {e}")
            raise e

    def _parse_url(self, url: str) -> Optional[URL]:
        """Parse a URL string into a URL object."""
        parsed_url = urlparse(url)

        if not parsed_url.scheme or not parsed_url.hostname:
            logger.warning(f"Invalid URL: Missing scheme or hostname: [{parsed_url}]")
            return None

        return URL(
            full=url,
            scheme=parsed_url.scheme,
            hostname=parsed_url.hostname,
            port=parsed_url.port,
            path=parsed_url.path,
            params=parsed_url.params,
            query=parsed_url.query,
            fragment=parsed_url.fragment,
            query_params=parse_qs(parsed_url.query),
            hash=hash(parsed_url),
        )

    def _parse_bookmark(self, bookmark_obj: dict) -> Bookmark:
        """Parse a bookmark dictionary into a Bookmark object."""
        return Bookmark(
            url=self._parse_url(bookmark_obj["url"]),
            date_added=int(bookmark_obj["date_added"]),
            date_last_used=int(bookmark_obj["date_last_used"]),
            guid=bookmark_obj["guid"],
            id=bookmark_obj["id"],
            name=bookmark_obj["name"],
            type="url",
        )

    def _parse_folder(self, folder_obj: dict) -> Folder:
        """Parse a folder dictionary into a Folder object."""
        return Folder(
            children=folder_obj["children"],
            date_added=int(folder_obj["date_added"]),
            date_last_used=int(folder_obj["date_last_used"]),
            date_modified=int(folder_obj["date_modified"]),
            guid=folder_obj["guid"],
            id=folder_obj["id"],
            name=folder_obj["name"],
            type="folder",
        )

    def _process_node(self, node: dict) -> None:
        """Process a bookmark or folder node."""
        obj_type = node.get("type")
        if obj_type not in ["url", "folder"]:
            raise ValueError(f'Node type must be `url` or `folder` - given: {obj_type}')

        if obj_type == "url":
            bookmark = self._parse_bookmark(node)
            self._bookmarks.append(bookmark)
        elif obj_type == "folder":
            folder = self._parse_folder(node)
            self._folders.append(folder)

    def _traverse_bookmark_bar(self, root: dict) -> None:
        """Traverse the bookmark bar tree and process all nodes."""
        if not root:
            return

        # Clear existing data before processing
        self._bookmarks = []
        self._folders = []

        def _traverse(node: dict) -> None:
            self._process_node(node)
            if node["type"] == "folder":
                for child in node.get("children", []):
                    _traverse(child)

        _traverse(root)

    def get_bookmark_tree(self) -> Optional[Dict]:
        if not self._loaded:
            self.load_data()
        
        bookmark_bar = self._bookmarks_json.get('roots', {}).get('bookmark_bar', {})
        if not bookmark_bar:
            return None
            
        # Ensure the bookmark bar has the required fields
        bookmark_bar.setdefault('id', 'bookmark_bar')
        bookmark_bar.setdefault('name', 'Bookmarks Bar')
        bookmark_bar.setdefault('type', 'folder')
        bookmark_bar.setdefault('children', [])
        
        return bookmark_bar

    def get_unvisited_bookmarks(self) -> List[BookmarkResponse]:
        if not self._loaded:
            self.load_data()

        unvisited = []
        for bookmark in self._bookmarks:
            if bookmark.date_last_used == 0:
                unvisited.append(BookmarkResponse(
                    id=bookmark.id,
                    name=bookmark.name,
                    url=bookmark.url.full if bookmark.url else None,
                    type="url",
                    date_added=bookmark.date_added,
                    date_last_used=bookmark.date_last_used,
                    age_display=self.chrome_time_to_age_display(bookmark.date_added),
                    domain=self.extract_domain(bookmark.url.full) if bookmark.url else None
                ))
        return unvisited

    def get_stats(self) -> BookmarkStats:
        if not self._loaded:
            self.load_data()

        # Find empty folders
        empty_folders = [f for f in self._folders if len(f.children) == 0]
        
        # Find duplicate URLs
        seen_urls: Set[str] = set()
        duplicates = []
        for bookmark in self._bookmarks:
            if bookmark.url and bookmark.url.full in seen_urls:
                duplicates.append(bookmark)
            elif bookmark.url:
                seen_urls.add(bookmark.url.full)

        # Count unique hostnames
        hostname_counts = Counter()
        for bookmark in self._bookmarks:
            if bookmark.url:
                hostname_counts[bookmark.url.hostname] += 1

        return BookmarkStats(
            total_bookmarks=len(self._bookmarks),
            total_folders=len(self._folders),
            empty_folders=len(empty_folders),
            unvisited_bookmarks=len(self.get_unvisited_bookmarks()),
            duplicate_urls=len(duplicates),
            unique_hostnames=dict(hostname_counts)
        )

    @staticmethod
    def chrome_time_to_datetime(timevalue: int) -> datetime:
        """Convert Chrome timestamp to datetime."""
        # Chrome timestamps are microseconds since January 1, 1601 UTC
        epoch_start = datetime(1601, 1, 1)
        return epoch_start + timedelta(microseconds=timevalue)

    @staticmethod
    def chrome_time_to_str(timevalue: int) -> str:
        """Convert Chrome timestamp to string representation."""
        return BookmarkStore.chrome_time_to_datetime(timevalue).strftime("%Y-%m-%d %H:%M:%S")

    @staticmethod
    def chrome_time_to_age_display(timevalue: int) -> str:
        """Convert Chrome timestamp to human-readable age (e.g., '3 days ago', '2 months ago')."""
        if timevalue == 0:
            return "Never"
        
        bookmark_date = BookmarkStore.chrome_time_to_datetime(timevalue)
        now = datetime.now()
        delta = now - bookmark_date
        
        days = delta.days
        
        if days == 0:
            return "Today"
        elif days == 1:
            return "Yesterday"
        elif days < 7:
            return f"{days} days ago"
        elif days < 30:
            weeks = days // 7
            return f"{weeks} week{'s' if weeks > 1 else ''} ago"
        elif days < 365:
            months = days // 30
            return f"{months} month{'s' if months > 1 else ''} ago"
        else:
            years = days // 365
            return f"{years} year{'s' if years > 1 else ''} ago"

    @staticmethod
    def extract_domain(url: str) -> Optional[str]:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            return parsed.netloc
        except Exception:
            return None

    async def _check_url_accessible(self, url: str) -> Tuple[bool, ErrorDetails, Optional[Dict[str, Any]]]:
        """Check if a URL is accessible using optimized HEAD-first approach with multi-layer caching. Returns (is_accessible, error_details, technical_details)."""
        if not url:
            logger.warning("⚠️  Empty URL provided to _check_url_accessible.")
            return False, ErrorDetails(ErrorCategory.OTHER, "Empty URL"), None

        # Layer 1: Check in-memory cache first (fastest)
        if url in self._url_cache:
            is_accessible, error_details, details, cache_time = self._url_cache[url]
            if self._is_cache_valid(cache_time):
                logger.debug(f"💾 [MEM] Cache hit: {url}")
                return is_accessible, error_details, details
            # Cache expired, remove it
            del self._url_cache[url]

        # Layer 2: Check SQLite cache (persistent across restarts)
        sqlite_entry = sqlite_cache.get_by_url(url)
        if sqlite_entry and sqlite_entry.last_checked:
            try:
                last_checked = datetime.fromisoformat(sqlite_entry.last_checked)
                if datetime.utcnow() - last_checked < timedelta(hours=CACHE_FRESHNESS_HOURS):
                    # Cache is fresh, populate in-memory cache and return
                    is_accessible = sqlite_entry.broken_status != "broken"
                    error_details = ErrorDetails(
                        ErrorCategory.OTHER if is_accessible else ErrorCategory.OTHER,
                        sqlite_entry.error_details.get("message", "") if sqlite_entry.error_details else ""
                    )
                    # Reconstruct technical details from cache
                    technical_details = sqlite_entry.error_details if sqlite_entry.error_details else {}
                    
                    # Populate in-memory cache for next time
                    self._url_cache[url] = (is_accessible, error_details, technical_details, last_checked)
                    
                    logger.debug(f"💾 [DB] Cache hit: {url} (checked {last_checked})")
                    return is_accessible, error_details, technical_details
            except (ValueError, TypeError) as e:
                logger.warning(f"⚠️  Invalid cache timestamp for {url}: {e}")
            
        details = {
            "status_code": None,
            "content_type": None,
            "response_time": None,
            "final_url": None,
            "ssl_valid": None,
            "dns_resolved": None,
            "method_used": None
        }
        
        try:
            # First check DNS resolution (fastest failure mode)
            try:
                hostname = urlparse(url).netloc
                socket.gethostbyname(hostname)
                details["dns_resolved"] = True
                logger.debug(f"🔗 DNS resolved: {hostname}")
            except socket.gaierror:
                logger.error(f"❌ DNS resolution failed: {url}")
                result = (False, ErrorDetails(ErrorCategory.DNS_FAILURE, "DNS resolution failed"), details)
                # Cache in memory
                self._url_cache[url] = (*result, datetime.now())
                # Cache in SQLite for persistence
                self._save_url_to_sqlite_cache(url, False, result[1], details)
                return result

            # Then check SSL if it's an HTTPS URL (second fastest failure mode)
            if url.startswith("https://"):
                try:
                    context = ssl.create_default_context()
                    with socket.create_connection((hostname, 443), timeout=3) as sock:
                        with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                            cert = ssock.getpeercert()
                            details["ssl_valid"] = bool(cert)
                            logger.debug(f"🔒 SSL valid: {url}")
                except (ssl.SSLError, socket.timeout, ConnectionRefusedError) as e:
                    details["ssl_valid"] = False
                    logger.error(f"❌ SSL Error: {url} - {str(e)}")
                    result = (False, ErrorDetails(ErrorCategory.SSL_ERROR, f"SSL Error: {str(e)}"), details)
                    # Cache in memory
                    self._url_cache[url] = (*result, datetime.now())
                    # Cache in SQLite for persistence
                    self._save_url_to_sqlite_cache(url, False, result[1], details)
                    return result
            
            # Now try HTTP check - HEAD first, then GET fallback
            start_time = datetime.now()
            async with aiohttp.ClientSession() as session:
                # Try HEAD request first (much faster)
                try:
                    async with session.head(
                        url,
                        timeout=aiohttp.ClientTimeout(total=8),
                        allow_redirects=True,
                        ssl=False  # We already checked SSL separately
                    ) as response:
                        details["status_code"] = response.status
                        details["content_type"] = response.headers.get("content-type")
                        details["final_url"] = str(response.url)
                        details["response_time"] = (datetime.now() - start_time).total_seconds()
                        details["method_used"] = "HEAD"
                        
                        if response.status < 400:
                            logger.info(f"✅ HEAD OK: {url} [{response.status}] ({details['response_time']:.2f}s)")
                            result = (True, ErrorDetails(ErrorCategory.OTHER, ""), details)
                            # Cache in memory
                            self._url_cache[url] = (*result, datetime.now())
                            # Cache in SQLite for persistence
                            self._save_url_to_sqlite_cache(url, True, result[1], details)
                            return result
                        elif response.status == 405:  # Method Not Allowed - try GET
                            logger.debug(f"🔄 HEAD not supported for {url}, trying GET...")
                            # Fall through to GET request
                        else:
                            error_msg = f"HTTP {response.status}: {response.reason}"
                            logger.error(f"❌ HEAD Error: {url} - {error_msg}")
                            result = (False, categorize_error(error_msg, response.status), details)
                            # Cache in memory
                            self._url_cache[url] = (*result, datetime.now())
                            # Cache in SQLite for persistence
                            self._save_url_to_sqlite_cache(url, False, result[1], details)
                            return result
                            
                except aiohttp.ClientError as e:
                    logger.debug(f"🔄 HEAD failed for {url}: {str(e)}, trying GET...")
                    # Fall through to GET request
                except asyncio.TimeoutError:
                    logger.error(f"⏰ HEAD Timeout: {url}")
                    result = (False, ErrorDetails(ErrorCategory.TIMEOUT, "HEAD request timeout"), details)
                    # Cache in memory
                    self._url_cache[url] = (*result, datetime.now())
                    # Cache in SQLite for persistence
                    self._save_url_to_sqlite_cache(url, False, result[1], details)
                    return result

                # GET request fallback (only if HEAD failed or returned 405)
                try:
                    start_time = datetime.now()  # Reset timer for GET request
                    async with session.get(
                        url,
                        timeout=aiohttp.ClientTimeout(total=10),
                        allow_redirects=True,
                        ssl=False  # We already checked SSL separately
                    ) as response:
                        # Only read first 1KB to verify it's working (much faster than full download)
                        await response.content.read(1024)
                        
                        details["status_code"] = response.status
                        details["content_type"] = response.headers.get("content-type")
                        details["final_url"] = str(response.url)
                        details["response_time"] = (datetime.now() - start_time).total_seconds()
                        details["method_used"] = "GET"
                        
                        if response.status < 400:
                            logger.info(f"✅ GET OK: {url} [{response.status}] ({details['response_time']:.2f}s)")
                            result = (True, ErrorDetails(ErrorCategory.OTHER, ""), details)
                            # Cache in memory
                            self._url_cache[url] = (*result, datetime.now())
                            # Cache in SQLite for persistence
                            self._save_url_to_sqlite_cache(url, True, result[1], details)
                            return result
                        
                        error_msg = f"HTTP {response.status}: {response.reason}"
                        logger.error(f"❌ GET Error: {url} - {error_msg}")
                        result = (False, categorize_error(error_msg, response.status), details)
                        # Cache in memory
                        self._url_cache[url] = (*result, datetime.now())
                        # Cache in SQLite for persistence
                        self._save_url_to_sqlite_cache(url, False, result[1], details)
                        return result
                        
                except aiohttp.ClientError as e:
                    logger.error(f"❌ Connection error: {url} - {str(e)}")
                    result = (False, categorize_error(f"Connection error: {str(e)}"), details)
                    # Cache in memory
                    self._url_cache[url] = (*result, datetime.now())
                    # Cache in SQLite for persistence
                    self._save_url_to_sqlite_cache(url, False, result[1], details)
                    return result
                except asyncio.TimeoutError:
                    logger.error(f"⏰ GET Timeout: {url}")
                    result = (False, ErrorDetails(ErrorCategory.TIMEOUT, "GET request timeout"), details)
                    # Cache in memory
                    self._url_cache[url] = (*result, datetime.now())
                    # Cache in SQLite for persistence
                    self._save_url_to_sqlite_cache(url, False, result[1], details)
                    return result
                    
        except Exception as e:
            logger.error(f"❌ Error checking URL: {url} - {str(e)}")
            result = (False, categorize_error(f"Error checking URL: {str(e)}"), details)
            # Cache in memory
            self._url_cache[url] = (*result, datetime.now())
            # Cache in SQLite for persistence
            self._save_url_to_sqlite_cache(url, False, result[1], details)
            return result

    def _save_url_to_sqlite_cache(self, url: str, is_accessible: bool, error_details: ErrorDetails, technical_details: Optional[Dict[str, Any]]) -> None:
        """Save URL check result to SQLite cache for persistence."""
        try:
            # Create a cache entry with URL as ID (for URL-level caching)
            url_hash = str(hash(url))  # Simple hash for ID
            entry = BookmarkCacheEntry(
                id=f"url_{url_hash}",
                url=url,
                name=None,  # URL-only cache entry
                last_checked=datetime.utcnow().isoformat(),
                broken_status="ok" if is_accessible else "broken",
                error_details={
                    **error_details_to_dict(error_details),
                    **(technical_details or {})
                }
            )
            sqlite_cache.upsert(entry)
            logger.debug(f"💾 [DB] Saved URL cache: {url} as {'ok' if is_accessible else 'broken'}")
        except Exception as e:
            logger.warning(f"⚠️  Failed to save URL to SQLite cache: {e}")

    def clear_url_cache(self) -> None:
        """Clear the URL check cache."""
        self._url_cache.clear()

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get statistics about the URL cache including both memory and SQLite cache."""
        now = datetime.now()
        valid_entries = sum(1 for _, _, _, cache_time in self._url_cache.values() if self._is_cache_valid(cache_time))
        expired_entries = len(self._url_cache) - valid_entries
        
        # Get SQLite cache stats
        sqlite_entries = sqlite_cache.get_all()
        sqlite_url_entries = [e for e in sqlite_entries if e.id.startswith("url_")]
        
        return {
            "memory_cache": {
                "total_cached": len(self._url_cache),
                "valid_entries": valid_entries,
                "expired_entries": expired_entries,
                "cache_expiry_days": self._url_cache_expiry.days
            },
            "sqlite_cache": {
                "total_entries": len(sqlite_entries),
                "url_entries": len(sqlite_url_entries),
                "bookmark_entries": len(sqlite_entries) - len(sqlite_url_entries),
                "broken_entries": len([e for e in sqlite_entries if e.broken_status == "broken"]),
                "ok_entries": len([e for e in sqlite_entries if e.broken_status == "ok"])
            }
        }

    async def _check_urls_batch(self, urls: List[str], batch_size: int = 20) -> List[Tuple[str, bool, ErrorDetails, Optional[Dict[str, Any]]]]:
        """Check a batch of URLs concurrently with optimized batch size and rate limiting."""
        results = []
        semaphore = asyncio.Semaphore(batch_size)  # Rate limiting
        
        async def check_with_semaphore(url: str):
            async with semaphore:
                return await self._check_url_accessible(url)
        
        # Process all URLs concurrently with semaphore limiting
        tasks = [check_with_semaphore(url) for url in urls]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for url, result in zip(urls, batch_results):
            if isinstance(result, Exception):
                results.append((url, False, ErrorDetails(ErrorCategory.OTHER, str(result)), None))
            else:
                is_accessible, error_details, details = result
                results.append((url, is_accessible, error_details, details))
                
        return results

    async def get_broken_bookmarks(self, include_details: bool = False) -> List[Tuple[BookmarkResponse, ErrorDetails, Optional[Dict[str, Any]]]]:
        """Get a list of broken bookmarks with categorized error messages and optional details, using SQLite cache to minimize network requests."""
        if not self._loaded:
            self.load_data()

        logger.info("\n🔎 Checking for broken bookmarks...")
        def is_cache_fresh(entry, max_age_hours=CACHE_FRESHNESS_HOURS):
            if not entry or not entry.last_checked:
                return False
            last_checked = datetime.fromisoformat(entry.last_checked)
            return datetime.utcnow() - last_checked < timedelta(hours=max_age_hours)

        bookmarks_to_check = [b for b in self._bookmarks if b.url]
        total = len(bookmarks_to_check)
        cache_hits = 0
        cache_misses = 0
        network_checks = 0
        broken_count = 0
        completed = 0
        broken_ids = set()

        async def check_bookmark(bookmark):
            nonlocal cache_hits, cache_misses, network_checks, broken_count, completed
            cache_entry = sqlite_cache.get(bookmark.id)
            if is_cache_fresh(cache_entry):
                cache_hits += 1
                completed += 1
                if cache_entry.broken_status == "broken":
                    broken_count += 1
                    broken_ids.add(bookmark.id)
                    logger.info(f"💾 [CACHE] Broken: {bookmark.name} ({bookmark.url.full}) - {cache_entry.error_details.get('message', '') if cache_entry.error_details else ''}")
                    return (
                        BookmarkResponse(
                            id=bookmark.id,
                            name=bookmark.name,
                            url=bookmark.url.full,
                            type="url",
                            date_added=bookmark.date_added,
                            date_last_used=bookmark.date_last_used
                        ),
                        cache_entry.error_details,
                        cache_entry.error_details if include_details else None
                    )
                else:
                    logger.info(f"💾 [CACHE] OK: {bookmark.name} ({bookmark.url.full})")
                    return None
            # Otherwise, perform network check
            cache_misses += 1
            logger.info(f"🌐 [NET] Checking: {bookmark.name} ({bookmark.url.full}) ...")
            is_accessible, error_details, details = await self._check_url_accessible(bookmark.url.full)
            now = datetime.utcnow().isoformat()
            broken_status = "broken" if not is_accessible else "ok"
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
            network_checks += 1
            completed += 1
            if not is_accessible:
                broken_count += 1
                broken_ids.add(bookmark.id)
                logger.info(f"❌ [NET] Broken: {bookmark.name} ({bookmark.url.full}) - {error_details.message}")
                return (
                    BookmarkResponse(
                        id=bookmark.id,
                        name=bookmark.name,
                        url=bookmark.url.full,
                        type="url",
                        date_added=bookmark.date_added,
                        date_last_used=bookmark.date_last_used
                    ),
                    error_details_to_dict(error_details),
                    details if include_details else None
                )
            else:
                logger.info(f"✅ [NET] OK: {bookmark.name} ({bookmark.url.full})")
            return None

        results = []
        for idx, b in enumerate(bookmarks_to_check):
            result = await check_bookmark(b)
            results.append(result)
            if (idx + 1) % 10 == 0 or (idx + 1) == total:
                logger.info(f"📊 Progress: {idx + 1}/{total} | Broken: {broken_count} | Cache hits: {cache_hits} | Misses: {cache_misses} | Network: {network_checks}")
        broken_bookmarks = [r for r in results if r is not None]
        logger.info(f"\n📊 Broken bookmarks summary: {broken_count} broken, {cache_hits} cache hits, {cache_misses} cache misses, {network_checks} network checks, {total} total.")
        return broken_bookmarks

    def get_bookmark_analysis(self) -> Dict[str, Any]:
        if not self._loaded:
            self.load_data()

        analysis = {
            "total_bookmarks": len(self._bookmarks),
            "total_folders": len(self._folders),
            "by_scheme": defaultdict(int),
            "by_tld": defaultdict(int),
            "by_status": {
                "unvisited": 0,
                "visited": 0,
                "recent": 0,  # visited in last 30 days
                "old": 0,     # not visited in last 30 days
            },
            "by_folder_depth": defaultdict(int),
            "empty_folders": [],
            "potential_duplicates": []
        }

        # Track seen URLs for duplicate detection
        seen_urls = {}
        
        # Get current time in Chrome timestamp format
        now = int((datetime.now() - datetime(1601, 1, 1)).total_seconds() * 1000000)
        thirty_days_ago = now - (30 * 24 * 60 * 60 * 1000000)

        for bookmark in self._bookmarks:
            # Count by scheme
            if bookmark.url:
                analysis["by_scheme"][bookmark.url.scheme] += 1
                
                # Count by TLD
                hostname_parts = bookmark.url.hostname.split(".")
                if len(hostname_parts) > 1:
                    tld = hostname_parts[-1]
                    analysis["by_tld"][tld] += 1
                
                # Track for duplicates
                if bookmark.url.full in seen_urls:
                    analysis["potential_duplicates"].append({
                        "url": bookmark.url.full,
                        "bookmarks": [
                            {"name": seen_urls[bookmark.url.full].name, "id": seen_urls[bookmark.url.full].id},
                            {"name": bookmark.name, "id": bookmark.id}
                        ]
                    })
                else:
                    seen_urls[bookmark.url.full] = bookmark

            # Count by visit status
            if bookmark.date_last_used == 0:
                analysis["by_status"]["unvisited"] += 1
            else:
                analysis["by_status"]["visited"] += 1
                if bookmark.date_last_used >= thirty_days_ago:
                    analysis["by_status"]["recent"] += 1
                else:
                    analysis["by_status"]["old"] += 1

        # Find empty folders
        for folder in self._folders:
            if not folder.children:
                analysis["empty_folders"].append({
                    "name": folder.name,
                    "id": folder.id,
                    "date_added": self.chrome_time_to_str(folder.date_added)
                })

        return analysis

    def delete_bookmark_by_title(self, title: str) -> bool:
        if not self._loaded:
            self.load_data()

        # Find the bookmark in the bookmark bar tree
        bookmark_bar = self._bookmarks_json.get('roots', {}).get('bookmark_bar', {})
        if not bookmark_bar:
            return False

        def _delete_from_node(node: dict) -> bool:
            if node["type"] == "url" and node["name"] == title:
                return True
            elif node["type"] == "folder":
                for i, child in enumerate(node.get("children", [])):
                    if _delete_from_node(child):
                        node["children"].pop(i)
                        return True
            return False

        if _delete_from_node(bookmark_bar):
            # Save the updated bookmarks file
            with open(self.bookmarks_file_path, "w") as file:
                json.dump(self._bookmarks_json, file, indent=2)
            # Reload the data
            self.load_data()
            return True
        return False 