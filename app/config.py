import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

ALLOWED_EXTENSIONS = {"pdf", "docx", "pptx", "png", "jpg", "jpeg"}
MAX_FILE_SIZE = 15 * 1024 * 1024
