import sys
import argparse
import json
from urllib.parse import urlparse, parse_qs
from dataclasses import dataclass
from typing import Optional, Dict, Literal, List
from datetime import datetime, timedelta
import logging


CHROME_PROFILE_NAME: str = "Profile 1"
CHROME_BOOKMARKS_FILE_PATH: str = (
    f"/Users/pieterdejong/Library/Application Support/Google/Chrome/"
    f"{CHROME_PROFILE_NAME}"
    f"/Bookmarks"
)

# TODO current issue is variable scope: globals arent defined wuthin function scope
# need to handle global data var somehow

logger = logging.getLogger(__name__)


@dataclass
class URL:
    full: str
    scheme: str
    hostname: str
    port: Optional[int]
    path: Optional[str]
    query: Optional[str]
    params: Optional[str]
    fragment: Optional[str]
    query_params: Optional[Dict[str, list]]
    hash: int


@dataclass
class Bookmark:
    url: URL
    date_added: int
    date_last_used: int
    guid: str
    id: str
    name: str
    type: Literal["url"]


@dataclass
class Folder:
    children: list
    date_added: int
    date_last_used: int
    date_modified: int
    guid: str
    id: str
    name: str
    type: Literal["folder"]


bookmarks_json: dict = {}
bookmarks: List[Bookmark] = []


def bookmarks_all_as_tree():
    """Return the complete bookmark tree structure."""
    global bookmarks_json
    
    if not bookmarks_json:
        # If bookmarks_json is empty, try to load it
        try:
            with open(CHROME_BOOKMARKS_FILE_PATH, "r") as file:
                bookmarks_json = json.load(file)
        except Exception as e:
            logger.error(f"Error loading bookmarks: {e}")
            return {}
    
    # Return the bookmark bar tree with proper structure
    bookmark_bar = bookmarks_json.get('roots', {}).get('bookmark_bar', {})
    if not bookmark_bar:
        return {}
        
    # Ensure the bookmark bar has the required fields
    bookmark_bar.setdefault('id', 'bookmark_bar')
    bookmark_bar.setdefault('name', 'Bookmarks Bar')
    bookmark_bar.setdefault('type', 'folder')
    bookmark_bar.setdefault('children', [])
    
    return bookmark_bar


def bookmarks_all_as_flat():
    return bookmarks


def bookmarks_unvisited() -> List[dict]:
    """Return a list of unvisited bookmarks in a format compatible with the API."""
    # Ensure bookmarks are loaded
    if not bookmarks_json:
        logger.info("bookmarks_json is empty, attempting to load bookmarks")
        bookmarks_all_as_tree()
    
    logger.info(f"Total number of bookmarks loaded: {len(bookmarks)}")
    
    # Convert dataclass bookmarks to dict format
    unvisited = []
    for bookmark in bookmarks:
        logger.debug(f"Checking bookmark: {bookmark.name} (last used: {bookmark.date_last_used})")
        if bookmark.date_last_used == 0:
            logger.info(f"Found unvisited bookmark: {bookmark.name}")
            unvisited.append({
                'id': bookmark.id,
                'name': bookmark.name,
                'url': bookmark.url.full if bookmark.url else None,
                'type': 'url',
                'dateAdded': bookmark.date_added,
                'lastVisited': bookmark.date_last_used,
                'children': None
            })
    
    logger.info(f"Found {len(unvisited)} unvisited bookmarks")
    return unvisited


# TODO:
# - write tests for these time functions;
# - write the reverse process so you can translate date window into timevalues
# - add function to search using time window
def chrome_time_value_to_datetime(timevalue: int) -> datetime:
    epoch = -11644473600000
    return datetime(1601, 1, 1) + timedelta(milliseconds=epoch + timevalue / 1000)


def chrome_time_value_to_datetime_repr(timevalue: int) -> str:
    datetime_as_obj = chrome_time_value_to_datetime(timevalue)
    return datetime_as_obj.strftime("%Y-%m-%d %H:%M:%S")


def load_and_preprocess_data() -> bool:
    """Load and preprocess the bookmarks data."""
    try:
        with open(CHROME_BOOKMARKS_FILE_PATH, "r") as file:
            global bookmarks_json
            bookmarks_json = json.load(file)
            # Process the bookmark bar tree
            bookmark_bar = bookmarks_json.get('roots', {}).get('bookmark_bar', {})
            if bookmark_bar:
                traverse_bookmark_bar(bookmark_bar)
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


def parse_bookmark(bookmark_obj: dict) -> Bookmark:
    return Bookmark(
        url=parse_url(bookmark_obj["url"]),  # URL dataclass
        date_added=bookmark_obj["date_added"],
        date_last_used=bookmark_obj["date_last_used"],
        guid=bookmark_obj["guid"],
        id=bookmark_obj["id"],
        name=bookmark_obj["name"],
        type="url",
    )


def process_url_obj(url_obj: dict) -> dict:
    if url_obj["type"] not in ["url", "folder"]:
        raise ValueError(
            f'Json component object must be of type `url` or `folder` - given: {[url_obj["type"]]}'
        )

    bookmark: Bookmark = parse_bookmark(url_obj)
    # print(f'appending bookmark: {bookmark}')
    bookmarks.append(bookmark)
    # print(f'bookmarks length: {len(bookmarks)}')

    return url_obj


def parse_url(url: str) -> URL:
    parsed_url = urlparse(url)

    if not parsed_url.scheme or not parsed_url.hostname:
        print("Invalid URL: Missing scheme or hostname.")
        # TODO handle more severely? log? record otherwise?
        return

    # We use `hostname` (only domain name) over `netloc` (may include auth or port).
    # Incl `params` for thoroughness, though seldom used in modern URLs.
    return URL(
        full=url,
        scheme=parsed_url.scheme,  # e.g., "https"
        hostname=parsed_url.hostname,  # e.g., "www.example.com"
        port=parsed_url.port,  # e.g., 8080
        path=parsed_url.path,  # e.g., "/path/to/resource"
        params=parsed_url.params,  # e.g., "path-params"
        query=parsed_url.query,  # e.g., "query=value"
        fragment=parsed_url.fragment,  # e.g., "fragment-id"
        query_params=parse_qs(parsed_url.query),  # e.g., {'query': ['value']}
        hash=hash(parsed_url),
    )


# In Chrome, Bookmarks consist of "Bookmarks Bar", "Other", and "Mobile".
# This is meant to traverse the first. May not work on the other two.
def traverse_bookmark_bar(root: dict) -> None:
    """Traverse the bookmark bar tree and process all bookmarks."""
    if not root:
        return
        
    # Clear the global bookmarks list before processing
    global bookmarks
    bookmarks = []
    
    def _traverse(node: dict) -> None:
        if node["type"] == "url":
            process_url_obj(node)
        elif node["type"] == "folder":
            children = node.get("children", [])
            for child in children:
                _traverse(child)
    
    _traverse(root)


# def detect_and_process_duplicates(names_and_urls: list) -> list[tuple[URL, int]]:
#     urls = [n[1] for n in names_and_urls]
#     print(f"Number of urls: {len(urls)}")
#     uniques, duplicates = set(), []
#     for u in urls:
#         if u in uniques:
#             duplicates.append(u)
#         else:
#             uniques.add(u)
#     print(f"Found {len(uniques)} unique URLs and {len(duplicates)} duplicates.")


def main(mode: str) -> None:
    if mode != "local":
        print(
            "Exiting program. Running in non-local mode so will not attempt analysis."
        )
        sys.exit(0)

    print("Starting bookmarks analysis...\n")

    data: dict = load_and_preprocess_data(CHROME_BOOKMARKS_FILE_PATH)
    traverse_bookmark_bar(data["roots"]["bookmark_bar"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the script in a specific mode.")
    parser.add_argument(
        "--mode",
        type=str,
        default="nonlocal",
        help='Must specify "local" to attempt analysis.',
    )

    args = parser.parse_args()
    main(args.mode)
    # TODO: to fix the tests, we must know whether json is supposed to be available,
    # so we need to know whether running locally
