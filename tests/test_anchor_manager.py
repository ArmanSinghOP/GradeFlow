import pytest
import os
import json
from app.anchors.manager import (
    list_anchor_sets,
    get_anchor_set,
    save_anchor_set,
    update_anchor_set,
    delete_anchor_set,
    anchor_set_exists,
    get_anchor_dir
)
from app.config import settings

@pytest.fixture(autouse=True)
def setup_anchor_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "ANCHOR_SET_PATH", str(tmp_path))
    monkeypatch.setattr("app.anchors.manager.settings.ANCHOR_SET_PATH", str(tmp_path))

def test_list_empty_directory():
    assert list_anchor_sets() == []

def test_save_and_retrieve_anchor_set():
    data = {"anchor_set_id": "test-anchor", "version": 1}
    save_anchor_set("test-anchor", data)
    retrieved = get_anchor_set("test-anchor")
    assert retrieved == data

def test_save_duplicate_raises():
    data = {"anchor_set_id": "test-anchor"}
    save_anchor_set("test-anchor", data)
    with pytest.raises(FileExistsError):
        save_anchor_set("test-anchor", data)

def test_update_increments_version():
    data = {"anchor_set_id": "test-anchor", "version": 1}
    save_anchor_set("test-anchor", data)
    update_anchor_set("test-anchor", data)
    retrieved = get_anchor_set("test-anchor")
    assert retrieved["version"] == 2

def test_update_nonexistent_raises():
    data = {"anchor_set_id": "missing"}
    with pytest.raises(FileNotFoundError):
        update_anchor_set("missing", data)

def test_delete_existing():
    data = {"anchor_set_id": "test-anchor"}
    save_anchor_set("test-anchor", data)
    assert delete_anchor_set("test-anchor") is True
    assert get_anchor_set("test-anchor") is None

def test_delete_nonexistent():
    assert delete_anchor_set("missing") is False

def test_list_returns_summaries():
    save_anchor_set("set1", {"anchor_set_id": "set1", "anchors": [{"difficulty": "weak"}]})
    save_anchor_set("set2", {"anchor_set_id": "set2", "anchors": [{"difficulty": "strong"}]})
    
    summaries = list_anchor_sets()
    assert len(summaries) == 2
    assert "anchor_count" in summaries[0]
    assert "difficulty_distribution" in summaries[0]

def test_path_traversal_blocked():
    with pytest.raises(ValueError):
        get_anchor_set("../evil")
    with pytest.raises(ValueError):
        get_anchor_set("../../etc/passwd")

def test_anchor_set_exists():
    assert anchor_set_exists("test-anchor") is False
    save_anchor_set("test-anchor", {"anchor_set_id": "test-anchor"})
    assert anchor_set_exists("test-anchor") is True
    delete_anchor_set("test-anchor")
    assert anchor_set_exists("test-anchor") is False
