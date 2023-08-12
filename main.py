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


def load_json_from_file(filepath: str) -> dict:
    with open(filepath, "r") as f:
        try:
            bookmarks: dict = json.load(f)
            return bookmarks
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Error: Failed to convert JSON to dictionary. Reason: {e}"
            )


def preview(data: dict, n: int = 1000) -> None:
    print(f"Previewing first {n} characters of data...\n")
    print(json.dumps(data, indent=4)[:n])


def preview_keys(data: dict) -> None:
    print("Showing highest level keys only...\n")
    print(json.dumps(list(data.keys()), indent=4))


def preview_level(data: dict) -> None:
    print("Previewing...\n")
    d = data["roots"]["bookmark_bar"]
    print(d.keys())


def process_url_obj(curr_obj: dict) -> dict:
    names_and_urls.append((curr_obj["name"], curr_obj["url"]))
    return curr_obj


def process_empty_folder(root: dict) -> dict:
    empty_folders.append(root)
    return root


def process_unrecognized_object_type(root: dict) -> dict:
    print(f"Found unrecognized object type: {root}")
    return root


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


def parse_url(url: str) -> Optional[URL]:
    parsed_url = urlparse(url)

    if not parsed_url.scheme or not parsed_url.hostname:
        print("Invalid URL: Missing scheme or hostname.")
        return None

    # `hostname` instead of `netloc` because former is sufficient subset for our needs
    # `params` is rare but include for completeness' sake
    return URL(
        scheme=parsed_url.scheme,  # e.g., "https"
        hostname=parsed_url.hostname,  # e.g., "www.example.com"
        port=parsed_url.port,  # e.g., 8080
        path=parsed_url.path,  # e.g., "/path/to/resource"
        params=parsed_url.params,  # e.g., "path-params"
        query=parsed_url.query,  # e.g., "query=value"
        fragment=parsed_url.fragment,  # e.g., "fragment-id"
        query_params=parse_qs(parsed_url.query),  # e.g., {'query': ['value']}
    )


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


def display_names_and_urls(nau: list) -> None:
    for _ in nau:
        # print(f"name: {_[0]}, url: {_[1]}")
        print(f"name: {_[0]}, url: {parse_url(_[1])}")
    print(len(nau))


def main():
    print("Starting bookmark analysis...\n")
    data: dict = load_json_from_file(CHROME_BOOKMARKS_FILE_PATH)

    # preview(data, n=1000)
    # print("Analysis complete...\n")

    # preview_keys(data)
    # preview_level(data)
    traverse_bookmark_bar(data["roots"]["bookmark_bar"])
    display_names_and_urls(names_and_urls)

    print(f"Found {len(empty_folders)} empty folders: {empty_folders}")


if __name__ == "__main__":
    main()
