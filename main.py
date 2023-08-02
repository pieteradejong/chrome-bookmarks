import json

CHROME_PROFILE_NAME: str = "Profile 1"
CHROME_BOOKMARKS_FILE: str = f"/Users/pieterdejong/Library/Application Support/Google/Chrome/{CHROME_PROFILE_NAME}/Bookmarks"

def read_file_to_json(CHROME_BOOKMARKS_FILE):
    with open(CHROME_BOOKMARKS_FILE) as f:
        data = json.load(f)
        return data

def preview(data, n: int=1000) -> None:
    print(f"Previewing first {n} characters of data...\n")
    print(json.dumps(data, indent=4)[:n])

def main():
    print("Starting bookmark analysis...\n")
    data = read_file_to_json(CHROME_BOOKMARKS_FILE)
    preview(data, n=1000)
    print("Analysis complete...\n")

if __name__ == "__main__":
    main()
