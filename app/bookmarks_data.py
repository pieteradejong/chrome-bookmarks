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
        """Load and preprocess the bookmarks data."""
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
        """Return the complete bookmark tree structure."""
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
        """Return a list of unvisited bookmarks."""
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
                    date_last_used=bookmark.date_last_used
                ))
        return unvisited

    def get_stats(self) -> BookmarkStats:
        """Get bookmark statistics."""
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
        epoch = -11644473600000
        return datetime(1601, 1, 1) + timedelta(milliseconds=epoch + timevalue / 1000)

    @staticmethod
    def chrome_time_to_str(timevalue: int) -> str:
        """Convert Chrome timestamp to string representation."""
        return BookmarkStore.chrome_time_to_datetime(timevalue).strftime("%Y-%m-%d %H:%M:%S")

    async def _check_url_accessible(self, url: str) -> Tuple[bool, ErrorDetails, Optional[Dict[str, Any]]]:
        """Check if a URL is accessible. Returns (is_accessible, error_details, technical_details)."""
        if not url:
            return False, ErrorDetails(ErrorCategory.OTHER, "Empty URL"), None

        # Check cache first
        if url in self._url_cache:
            is_accessible, error_details, details, cache_time = self._url_cache[url]
            if self._is_cache_valid(cache_time):
                return is_accessible, error_details, details
            # Cache expired, remove it
            del self._url_cache[url]
            
        details = {
            "status_code": None,
            "content_type": None,
            "response_time": None,
            "final_url": None,
            "ssl_valid": None,
            "dns_resolved": None
        }
        
        try:
            # First check DNS resolution
            try:
                hostname = urlparse(url).netloc
                socket.gethostbyname(hostname)
                details["dns_resolved"] = True
            except socket.gaierror:
                result = (False, ErrorDetails(ErrorCategory.DNS_FAILURE, "DNS resolution failed"), details)
                self._url_cache[url] = (*result, datetime.now())
                return result

            # Then check SSL if it's an HTTPS URL
            if url.startswith("https://"):
                try:
                    context = ssl.create_default_context()
                    with socket.create_connection((hostname, 443), timeout=5) as sock:
                        with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                            cert = ssock.getpeercert()
                            details["ssl_valid"] = bool(cert)
                except (ssl.SSLError, socket.timeout, ConnectionRefusedError) as e:
                    details["ssl_valid"] = False
                    result = (False, ErrorDetails(ErrorCategory.SSL_ERROR, f"SSL Error: {str(e)}"), details)
                    self._url_cache[url] = (*result, datetime.now())
                    return result
            
            start_time = datetime.now()
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(
                        url,
                        timeout=aiohttp.ClientTimeout(total=10),
                        allow_redirects=True,
                        ssl=False  # We already checked SSL separately
                    ) as response:
                        details["status_code"] = response.status
                        details["content_type"] = response.headers.get("content-type")
                        details["final_url"] = str(response.url)
                        details["response_time"] = (datetime.now() - start_time).total_seconds()
                        
                        if response.status < 400:
                            result = (True, ErrorDetails(ErrorCategory.OTHER, ""), details)
                            self._url_cache[url] = (*result, datetime.now())
                            return result
                        
                        error_msg = f"HTTP {response.status}: {response.reason}"
                        result = (False, categorize_error(error_msg, response.status), details)
                        self._url_cache[url] = (*result, datetime.now())
                        return result
                        
                except aiohttp.ClientError as e:
                    result = (False, categorize_error(f"Connection error: {str(e)}"), details)
                    self._url_cache[url] = (*result, datetime.now())
                    return result
                except asyncio.TimeoutError:
                    result = (False, ErrorDetails(ErrorCategory.TIMEOUT, "Connection timeout"), details)
                    self._url_cache[url] = (*result, datetime.now())
                    return result
                    
        except Exception as e:
            result = (False, categorize_error(f"Error checking URL: {str(e)}"), details)
            self._url_cache[url] = (*result, datetime.now())
            return result

    def clear_url_cache(self) -> None:
        """Clear the URL check cache."""
        self._url_cache.clear()

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get statistics about the URL cache."""
        now = datetime.now()
        valid_entries = sum(1 for _, cache_time in self._url_cache.values() if self._is_cache_valid(cache_time))
        expired_entries = len(self._url_cache) - valid_entries
        
        return {
            "total_cached": len(self._url_cache),
            "valid_entries": valid_entries,
            "expired_entries": expired_entries,
            "cache_expiry_days": self._url_cache_expiry.days
        }

    async def _check_urls_batch(self, urls: List[str], batch_size: int = 10) -> List[Tuple[str, bool, ErrorDetails, Optional[Dict[str, Any]]]]:
        """Check a batch of URLs concurrently."""
        results = []
        for i in range(0, len(urls), batch_size):
            batch = urls[i:i + batch_size]
            tasks = [self._check_url_accessible(url) for url in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for url, result in zip(batch, batch_results):
                if isinstance(result, Exception):
                    results.append((url, False, ErrorDetails(ErrorCategory.OTHER, str(result)), None))
                else:
                    is_accessible, error_details, details = result
                    results.append((url, is_accessible, error_details, details))
                    
        return results

    async def get_broken_bookmarks(self, include_details: bool = False) -> List[Tuple[BookmarkResponse, ErrorDetails, Optional[Dict[str, Any]]]]:
        """Get a list of broken bookmarks with categorized error messages and optional details."""
        if not self._loaded:
            self.load_data()

        # Collect all URLs first
        urls_to_check = []
        bookmark_map = {}
        for bookmark in self._bookmarks:
            if bookmark.url:
                urls_to_check.append(bookmark.url.full)
                bookmark_map[bookmark.url.full] = bookmark

        # Check URLs in batches
        results = await self._check_urls_batch(urls_to_check)
        
        # Process results
        broken_bookmarks = []
        for url, is_accessible, error_details, details in results:
            if not is_accessible and url in bookmark_map:
                bookmark = bookmark_map[url]
                broken_bookmarks.append((
                    BookmarkResponse(
                        id=bookmark.id,
                        name=bookmark.name,
                        url=bookmark.url.full,
                        type="url",
                        date_added=bookmark.date_added,
                        date_last_used=bookmark.date_last_used
                    ),
                    error_details,
                    details if include_details else None
                ))
                
        return broken_bookmarks

    def get_bookmark_analysis(self) -> Dict[str, Any]:
        """Get detailed analysis of bookmarks."""
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
        """Delete a bookmark by its title. Returns True if deleted, False if not found."""
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