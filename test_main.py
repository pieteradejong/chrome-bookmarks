import main
import pytest


def test_load_valid_json_into_dict():
    try:
        data_dict = main.load_json_from_file(main.CHROME_BOOKMARKS_FILE_PATH)
    except ValueError as e:
        pytest.fail(f"Failed to load JSON from file: {e}")

    assert isinstance(data_dict, dict), "JSON data should be loaded as a dictionary"


def test_loading_invalid_json():
    filepath: str = "json_invalid"
    with pytest.raises(
        ValueError, match=r"Failed to convert JSON to dictionary\. Reason: .*"
    ):
        main.load_json_from_file(filepath)
