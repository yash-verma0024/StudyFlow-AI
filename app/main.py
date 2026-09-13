from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.config import BASE_DIR
from app.routes import upload, generate, quiz

app = FastAPI(title="StudyFlow AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(generate.router)
app.include_router(quiz.router)

frontend_dir = BASE_DIR / "frontend"
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def read_root():
    return FileResponse(BASE_DIR / "frontend" / "index.html")
