import json

CHROME_PROFILE_NAME: str = "Profile 1"
CHROME_BOOKMARKS_FILE_PATH: str = (
    f"/Users/pieterdejong/Library/Application Support/Google/Chrome/"
    f"{CHROME_PROFILE_NAME}"
    f"/Bookmarks"
)


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
    print(f"Showing highest level keys only...\n")
    print(json.dumps(list(data.keys()), indent=4))

def preview_bookmarks(data: dict) -> None:
    print(f"Showing bookmarks only...\n")
    # print(json.dumps(data["roots"]["bookmark_bar"]["children"], indent=4))
    print(json.dumps(data["roots"], indent=4))

def main():
    print("Starting bookmark analysis...\n")
    data: dict = load_json_from_file(CHROME_BOOKMARKS_FILE_PATH)

    # preview(data, n=1000)
    # print("Analysis complete...\n")

    preview_keys(data)
    preview_bookmarks(data)


if __name__ == "__main__":
    main()
