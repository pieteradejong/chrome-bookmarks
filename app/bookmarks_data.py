import json
import logging
from typing import Dict, List, Optional, Set
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from pathlib import Path

from app.models import URL, Bookmark, Folder, BookmarkResponse, BookmarkStats
from app.config import logger


class BookmarkStore:
    def __init__(self, bookmarks_file_path: str):
        self.bookmarks_file_path = bookmarks_file_path
        self._bookmarks: List[Bookmark] = []
        self._folders: List[Folder] = []
        self._bookmarks_json: Dict = {}
        self._loaded = False

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