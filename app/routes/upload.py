import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import UPLOAD_DIR, MAX_FILE_SIZE
from app.services.file_processing import validate_upload, extract_text

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        validate_upload(file.filename or "", file.size if hasattr(file, "size") else None)

        file_id = uuid.uuid4().hex
        save_path = UPLOAD_DIR / f"{file_id}_{file.filename}"

        content = await file.read()
        if not content:
            raise ValueError("Uploaded file is empty.")

        save_path.write_bytes(content)

        extracted_text, file_type = extract_text(str(save_path))

        return {
            "file_id": file_id,
            "filename": file.filename,
            "file_type": file_type,
            "status": "uploaded",
            "content_preview": extracted_text[:2000],
            "content_length": len(extracted_text),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}") from exc
