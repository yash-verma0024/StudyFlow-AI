import json
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import UPLOAD_DIR, GEMINI_API_KEY
from app.services.ai_service import AIService
from app.services.file_processing import extract_text

router = APIRouter(prefix="/api", tags=["generate"])


class GenerateRequest(BaseModel):
    file_id: str
    filename: str
    subject: str | None = None


@router.post("/generate")
async def generate_study_material(payload: GenerateRequest):
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")

        file_path = None
        for item in UPLOAD_DIR.iterdir():
            if item.name.startswith(payload.file_id + "_"):
                file_path = item
                break

        if not file_path:
            raise HTTPException(status_code=404, detail="Uploaded file not found.")

        extracted_text, file_type = extract_text(str(file_path))
        ai_service = AIService()
        result = ai_service.generate_study_material(extracted_text, payload.subject)

        return {
            "filename": payload.filename,
            "file_type": file_type,
            "content_preview": extracted_text[:2000],
            "study_material": result,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}") from exc
