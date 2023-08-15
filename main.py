import sys
import argparse
import json
from urllib.parse import urlparse, parse_qs
from dataclasses import dataclass
from typing import Optional, Dict

CHROME_PROFILE_NAME: str = "Profile 1"
CHROME_BOOKMARKS_FILE_PATH: str = (
    f"/Users/pieterdejong/Library/Application Support/Google/Chrome/"
    f"{CHROME_PROFILE_NAME}"
    f"/Bookmarks"
)

names_and_urls: tuple = []
empty_folders: list = []
url_hash_to_class: dict = {}


@dataclass
class URL:
    scheme: str
    hostname: str
    port: Optional[int]
    path: Optional[str]
    query: Optional[str]
    params: Optional[str]
    fragment: Optional[str]
    query_params: Optional[Dict[str, list]]
    hash: int


def load_json_from_file(filepath: str) -> Dict[str, any]:
    with open(filepath, "r") as f:
        try:
            bookmarks: Dict[str, any] = json.load(f)
            return bookmarks
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Error: Failed to convert JSON to dictionary. Reason: {e}"
            )
        except FileNotFoundError:
            raise FileNotFoundError(f"Error: The file {filepath} was not found.")
        except PermissionError:
            raise PermissionError(f"Error: Permission denied for accessing {filepath}.")


# def preview(data: dict, n: int = 1000) -> None:
#     print(f"Previewing first {n} characters of data...\n")
#     print(json.dumps(data, indent=4)[:n])


# def preview_keys(data: dict) -> None:
#     print("Showing highest level keys only...\n")
#     print(json.dumps(list(data.keys()), indent=4))


# def preview_level(data: dict) -> None:
#     print("Previewing...\n")
#     d = data["roots"]["bookmark_bar"]
#     print(d.keys())


def process_url_obj(curr_obj: dict) -> dict:
    names_and_urls.append((curr_obj["name"], curr_obj["url"]))
    return curr_obj


def process_empty_folder(root: dict) -> dict:
    empty_folders.append(root)
    return root


def process_unrecognized_object_type(root: dict) -> dict:
    print(f"Found unrecognized object type: {root}")
    return root


def parse_url(url: str) -> Optional[URL]:
    parsed_url = urlparse(url)

    if not parsed_url.scheme or not parsed_url.hostname:
        print("Invalid URL: Missing scheme or hostname.")
        return None

    # We use `hostname` (only domain name) over `netloc` (may include auth or port).
    # Incl `params` for thoroughness, though seldom used in modern URLs.
    return URL(
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


def detect_and_process_duplicates(urls: list[URL]) -> list[tuple[URL, int]]:
    pass
    # if not hsh in url_hash_to_class:
    #     url_hash_to_class[hsh] = url_dc
    # else:
    #     process_duplicate_url(url_dc)


# In Chrome, Bookmarks consist of "Bookmarks Bar", "Other", and "Mobile".
# This is meant to traverse the first. May not work on the other two.
def traverse_bookmark_bar(root: dict) -> None:
    if not root:
        return
    if root["type"] == "url":
        process_url_obj(root)
    elif root["type"] == "folder":
        children = root["children"]
        if len(children) > 0:
            for c in children:
                traverse_bookmark_bar(c)
        else:
            process_empty_folder(root)
    else:
        process_unrecognized_object_type(root)


# Only for development purposes. Not integral to functional reqs.
def display_names_and_urls(names_and_urls: list) -> None:
    for nau in names_and_urls:
        print(f"name: {nau[0]}, url: {parse_url(nau[1])}")
    print(len(names_and_urls))


def main(mode: str) -> None:
    if mode != "local":
        print(
            "Exiting program. Running in non-local mode so will not attempt analysis."
        )
        sys.exit(0)

    print("Starting bookmarks analysis...\n")

    data: dict = load_json_from_file(CHROME_BOOKMARKS_FILE_PATH)
    traverse_bookmark_bar(data["roots"]["bookmark_bar"])
    display_names_and_urls(names_and_urls)

    print(f"Found {len(empty_folders)} empty folders: {empty_folders}")


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
