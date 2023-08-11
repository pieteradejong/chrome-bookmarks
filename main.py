import json

CHROME_PROFILE_NAME: str = "Profile 1"
CHROME_BOOKMARKS_FILE_PATH: str = (
    f"/Users/pieterdejong/Library/Application Support/Google/Chrome/"
    f"{CHROME_PROFILE_NAME}"
    f"/Bookmarks"
)

names_and_urls: tuple = []

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
    # print(json.dumps(data["roots"]["bookmark_bar"]["children"], indent=4))
    # print(json.dumps(data["roots"]["bookmark_bar"], indent=4))
    d = data["roots"]["bookmark_bar"]
    print(d.keys())

    
def process_url_obj(curr_obj: dict) -> dict:
    names_and_urls.append((curr_obj["name"], curr_obj["url"]))
    return curr_obj


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
            pass
            # TODO: log/record empty folder
    else:
        print("WARNING: unknown type found")
        # TODO: log error
    # recursively traverse tree of bookmark_obj
    # if url: is a leaf, just process and return None
    # if folder: if empty, just return None
    # if and not empty: recurse on each obj in children (dfs!)
    

def display_names_and_urls(nau: list) -> None:
    for _ in nau:
        print(f"name: {_[0]}, url: {_[1]}")
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


if __name__ == "__main__":
    main()
