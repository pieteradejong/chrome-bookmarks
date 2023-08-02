import json

CHROME_PROFILE_NAME: str = "Profile 1"
CHROME_BOOKMARKS_FILE_PATH: str = f"/Users/pieterdejong/Library/Application Support/Google/Chrome/{CHROME_PROFILE_NAME}/Bookmarks"


def load_json_from_file(filepath: str) -> dict:
    with open(filepath, "r") as f:
        try:
            bookmarks: dict = json.load(f)
            return bookmarks
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Error: Failed to convert JSON to dictionary. Reason: {e}"
            )


def preview(data, n: int = 1000) -> None:
    print(f"Previewing first {n} characters of data...\n")
    print(json.dumps(data, indent=4)[:n])


def main():
    print(f"Starting bookmark analysis...\n")
    data: dict = load_json_from_file(CHROME_BOOKMARKS_FILE_PATH)

    preview(data, n=1000)
    print(f"Analysis complete...\n")


if __name__ == "__main__":
    main()
