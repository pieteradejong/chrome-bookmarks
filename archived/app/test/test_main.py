import main_as_runnable as main_as_runnable
import pytest


def test_load_invalid_json():
    filepath: str = "json_invalid"
    with pytest.raises(
        ValueError, match=r"Failed to convert JSON to dictionary\. Reason: .*"
    ):
        main_as_runnable.load_json_from_file(filepath)
