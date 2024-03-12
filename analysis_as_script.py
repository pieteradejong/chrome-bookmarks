import json
from urllib.parse import urlparse, parse_qs
from dataclasses import dataclass
from typing import Optional, Dict, Literal, List
from datetime import datetime, timedelta
import requests
import logging
import argparse

DEFAULT_CHROME_PROFILE_NAME = "Profile 1"


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
folders: List[Folder] = []


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


def load_and_preprocess_data() -> Dict[str, any]:
    try:
        with open(chrome_bookmarks_file_path, "r") as file:
            bookmarks_json = json.load(file)
            return bookmarks_json
    except json.JSONDecodeError as e:
        raise ValueError(f"Error: Failed to convert JSON to dictionary. Reason: {e}")
    except (FileNotFoundError, PermissionError) as e:
        raise e


def parse_bookmark(bookmark_obj: dict) -> Bookmark:
    return Bookmark(
        url=parse_url(bookmark_obj["url"]),  # URL dataclass
        date_added=int(bookmark_obj["date_added"]),
        date_last_used=int(bookmark_obj["date_last_used"]),
        guid=bookmark_obj["guid"],
        id=bookmark_obj["id"],
        name=bookmark_obj["name"],
        type="url",
    )


def parse_folder(folder_obj: dict) -> Folder:
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


def process_url_obj(url_obj: dict) -> None:
    obj_type = url_obj.get("type", None)
    if obj_type not in ["url", "folder"]:
        raise ValueError(
            f'Url object type must be `url` or `folder` - given: {[url_obj["type"]]}'
        )

    if obj_type == "url":
        bookmark: Bookmark = parse_bookmark(url_obj)
        bookmarks.append(bookmark)
    elif obj_type == "folder":
        folder: Folder = parse_folder(url_obj)
        folders.append(folder)


def parse_url(url: str) -> URL:
    parsed_url = urlparse(url)

    if not parsed_url.scheme or not parsed_url.hostname:
        print(f"Invalid URL: Missing scheme or hostname: [{parsed_url}]")
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
    if not root:
        return
    type = root.get("type", None)
    if type in ["url", "folder"]:
        process_url_obj(root)
        if type == "folder":
            children = root.get("children", [])
            for c in children:
                traverse_bookmark_bar(c)
    else:
        raise ValueError(
            f"Unexpected type of object: [{root}] not of type url or folder."
        )


def is_url_valid(url):
    try:
        print(f"HTTP request to {url}:")
        response = requests.head(url, allow_redirects=True)
        return response.status_code == 200
    except requests.RequestException:
        return False


def get_url_invalid():
    return list(filter(lambda x: is_url_valid(x.url.full) == False, bookmarks[:5]))


def get_never_opened():
    return list(filter(lambda x: x.date_last_used == 0, bookmarks))


def folders_no_children() -> List[Folder]:
    return list(filter(lambda folder: len(folder.children) == 0, folders))


def init():
    logging.info("Initializing application")
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
    )

    parser = argparse.ArgumentParser(description="Analyze Chrome bookmarks.")
    parser.add_argument(
        "--profile",
        help="Specify the Chrome profile name",
        default=DEFAULT_CHROME_PROFILE_NAME,
    )
    args = parser.parse_args()

    global chrome_bookmarks_file_path
    chrome_bookmarks_file_path = (
        "/Users/pieterdejong/Library/Application Support/Google/Chrome/"
        f"{args.profile}"
        f"/Bookmarks"
    )


def main() -> None:
    init()
    logging.info("Starting bookmarks analysis...\n")

    data: dict = load_and_preprocess_data()
    traverse_bookmark_bar(data["roots"]["bookmark_bar"])
    never_opened = get_never_opened()

    print(f"Count total bookmarks length: {len(bookmarks)}")
    print(f"Numer of folders: {len(folders)}")

    empty_folders = folders_no_children()
    print(f"Number of folders with no children: {len(empty_folders)}")

    print(f"Count of never opened: {len(never_opened)}")

    # url_invalid = get_url_invalid()
    # print(f"Count of first 5 invalid: {len(url_invalid)}")
    # for item in url_invalid:
    #     print(f"invalid: {item}\n")
    logging.info("End of analysis")


if __name__ == "__main__":
    main()
