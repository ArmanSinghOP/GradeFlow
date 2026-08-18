from fastapi import APIRouter, HTTPException, status
from typing import Any
from datetime import datetime
from app.schemas.anchor import (
    AnchorSetCreate,
    AnchorListResponse,
    CalibrationPreviewRequest,
    CalibrationPreviewResponse,
    ValidationResponse
)
from app.anchors.manager import (
    list_anchor_sets,
    get_anchor_set,
    save_anchor_set,
    update_anchor_set,
    delete_anchor_set,
    anchor_set_exists
)
from app.anchors.validator import (
    validate_anchor_set,
    compute_calibration_preview
)

router = APIRouter()

@router.get("", response_model=AnchorListResponse)
def list_anchors() -> Any:
    sets = list_anchor_sets()
    return {"anchor_sets": sets, "total": len(sets)}

@router.get("/{anchor_set_id}")
def get_anchor(anchor_set_id: str) -> Any:
    try:
        data = get_anchor_set(anchor_set_id)
        if not data:
            raise HTTPException(status_code=404, detail="Anchor set not found")
        return data
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid anchor_set_id format")

@router.post("", status_code=status.HTTP_201_CREATED)
def create_anchor(payload: AnchorSetCreate) -> Any:
    try:
        anchor_set_id = payload.anchor_set_id
        if anchor_set_exists(anchor_set_id):
            raise HTTPException(status_code=409, detail="Anchor set already exists. Use PUT to update.")
            
        data = payload.model_dump()
        result = validate_anchor_set(data, anchor_set_id)
        
        if not result.is_valid:
            raise HTTPException(
                status_code=422,
                detail={"detail": "Validation failed", "errors": result.errors, "warnings": result.warnings}
            )
            
        data["created_at"] = datetime.utcnow().isoformat()
        save_anchor_set(anchor_set_id, data)
        
        return {
            "anchor_set_id": anchor_set_id,
            "message": "Anchor set created successfully",
            "warnings": result.warnings,
            "anchor_count": result.anchor_count,
            "difficulty_distribution": result.difficulty_distribution
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{anchor_set_id}")
def update_anchor(anchor_set_id: str, payload: AnchorSetCreate) -> Any:
    try:
        if payload.anchor_set_id != anchor_set_id:
            raise HTTPException(status_code=400, detail="anchor_set_id in body must match path")
            
        if not anchor_set_exists(anchor_set_id):
            raise HTTPException(status_code=404, detail="Anchor set not found")
            
        data = payload.model_dump()
        result = validate_anchor_set(data, anchor_set_id)
        
        if not result.is_valid:
            raise HTTPException(
                status_code=422,
                detail={"detail": "Validation failed", "errors": result.errors, "warnings": result.warnings}
            )
            
        update_anchor_set(anchor_set_id, data)
        
        return {
            "anchor_set_id": anchor_set_id,
            "message": "Anchor set updated successfully",
            "new_version": data.get("version", 0) + 1,
            "warnings": result.warnings,
            "anchor_count": result.anchor_count
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{anchor_set_id}")
def delete_anchor(anchor_set_id: str) -> Any:
    try:
        deleted = delete_anchor_set(anchor_set_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Anchor set not found")
        return {"message": "Anchor set deleted", "anchor_set_id": anchor_set_id}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid anchor_set_id format")

@router.post("/{anchor_set_id}/preview", response_model=CalibrationPreviewResponse)
def preview_calibration(anchor_set_id: str, payload: CalibrationPreviewRequest) -> Any:
    try:
        data = get_anchor_set(anchor_set_id)
        if not data:
            raise HTTPException(status_code=404, detail="Anchor set not found")
            
        preview = compute_calibration_preview(data, payload.sample_scores)
        return preview
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid anchor_set_id format")

@router.post("/{anchor_set_id}/validate", response_model=ValidationResponse)
def validate_anchor(anchor_set_id: str) -> Any:
    try:
        data = get_anchor_set(anchor_set_id)
        if not data:
            raise HTTPException(status_code=404, detail="Anchor set not found")
            
        result = validate_anchor_set(data, anchor_set_id)
        
        return {
            "anchor_set_id": anchor_set_id,
            "is_valid": result.is_valid,
            "errors": result.errors,
            "warnings": result.warnings,
            "anchor_count": result.anchor_count,
            "difficulty_distribution": result.difficulty_distribution
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid anchor_set_id format")
