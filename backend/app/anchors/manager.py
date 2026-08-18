import json
import re
from pathlib import Path
from app.config import settings
from typing import List, Dict, Optional

def _validate_id(anchor_set_id: str) -> None:
    if not isinstance(anchor_set_id, str):
        raise ValueError("anchor_set_id must be a string")
    if not re.match(r'^[a-zA-Z0-9_-]+$', anchor_set_id):
        raise ValueError("Invalid anchor_set_id format")

def get_anchor_dir() -> Path:
    anchor_dir = Path(settings.ANCHOR_SET_PATH)
    if anchor_dir.exists() and not anchor_dir.is_dir():
        raise RuntimeError(f"Anchor path {anchor_dir} exists but is not a directory")
    if not anchor_dir.exists():
        anchor_dir.mkdir(parents=True, exist_ok=True)
    return anchor_dir.resolve()

def _get_validated_path(anchor_set_id: str) -> Path:
    _validate_id(anchor_set_id)
    anchor_dir = get_anchor_dir()
    resolved_path = (anchor_dir / f"{anchor_set_id}.json").resolve()
    
    if not str(resolved_path).startswith(str(anchor_dir)):
        raise ValueError("Invalid path: path traversal detected")
        
    return resolved_path

def list_anchor_sets() -> List[Dict]:
    anchor_dir = get_anchor_dir()
    summaries = []
    
    for file_path in anchor_dir.glob("*.json"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            anchors = data.get("anchors", [])
            distribution = {"weak": 0, "developing": 0, "proficient": 0, "strong": 0, "exemplary": 0}
            
            for a in anchors:
                diff = a.get("difficulty")
                if diff in distribution:
                    distribution[diff] += 1
                    
            summaries.append({
                "anchor_set_id": data.get("anchor_set_id", file_path.stem),
                "content_type": data.get("content_type", ""),
                "description": data.get("description", ""),
                "anchor_count": len(anchors),
                "rubric_name": data.get("rubric_name", ""),
                "version": data.get("version", 1),
                "created_at": data.get("created_at", ""),
                "difficulty_distribution": distribution
            })
        except Exception:
            # Skip files that fail to parse
            continue
            
    return summaries

def get_anchor_set(anchor_set_id: str) -> Optional[Dict]:
    file_path = _get_validated_path(anchor_set_id)
    if not file_path.exists():
        return None
        
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_anchor_set(anchor_set_id: str, data: dict) -> Path:
    file_path = _get_validated_path(anchor_set_id)
    if file_path.exists():
        raise FileExistsError(f"Anchor set {anchor_set_id} already exists")
        
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    return file_path

def update_anchor_set(anchor_set_id: str, data: dict) -> Path:
    file_path = _get_validated_path(anchor_set_id)
    if not file_path.exists():
        raise FileNotFoundError(f"Anchor set {anchor_set_id} not found")
        
    with open(file_path, "r", encoding="utf-8") as f:
        existing_data = json.load(f)
        
    data["version"] = existing_data.get("version", 0) + 1
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    return file_path

def delete_anchor_set(anchor_set_id: str) -> bool:
    try:
        file_path = _get_validated_path(anchor_set_id)
    except ValueError:
        raise ValueError("Invalid anchor_set_id format")
        
    if not file_path.exists():
        return False
        
    file_path.unlink()
    return True

def anchor_set_exists(anchor_set_id: str) -> bool:
    try:
        return _get_validated_path(anchor_set_id).exists()
    except ValueError:
        return False
