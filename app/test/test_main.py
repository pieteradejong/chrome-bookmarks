import main
import pytest


# def test_load_valid_json():
# TODO: add file with valid json to verify it loads correctly.
# filepath: str = "json_valid"
# bookmarks = main.load_json_from_file(filepath)
# assert isinstance(bookmarks, Dict[str, any])
# try:
#     bookmarks = main.load_json_from_file(main.CHROME_BOOKMARKS_FILE_PATH)
# except ValueError as e:
#     pytest.fail(f"Failed to load JSON from file: {e}")
# assert isinstance(bookmarks, Dict[str, any]), "Loaded data should be a dictionary"
# assert bookmarks['checksum'] == "John", "Name should be John"
# assert bookmarks['age'] == 30, "Age should be 30"
# assert bookmarks['city'] == "New York", "City should be New York"

# assert isinstance(bookmarks, dict), "JSON data should be loaded as a dictionary"
# assert isinstance(bookmarks["roots"], dict), "Value should be either string or dict"
# assert isinstance(bookmarks["roots"]["bookmark_bar"], dict), \
# "Value should be either string or dict"


def test_load_invalid_json():
    filepath: str = "json_invalid"
    with pytest.raises(
        ValueError, match=r"Failed to convert JSON to dictionary\. Reason: .*"
    ):
        main.load_json_from_file(filepath)
