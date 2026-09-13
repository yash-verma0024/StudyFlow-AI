# StudyFlow AI

StudyFlow AI is a polished single-page study assistant built for a hackathon demo. It lets a student upload study material, extract text, generate structured revision notes, and produce a 5-question practice quiz grounded in the same source.

## Features

- Upload study material in PDF, DOCX, PPTX, PNG, or JPG format
- Automatic text extraction for supported file types
- Optional subject/course input for better generation context
- Structured revision notes
- 5-question quiz generation
- Instant quiz scoring with explanations
- Download notes, download quiz, copy notes, and generate an exam paper draft
- Built-in fallback handling when Gemini is unavailable or rate-limited

## Tech stack

- FastAPI backend
- Static frontend served from the backend
- Google GenAI / Gemini integration
- Python file extraction for PDF, DOCX, and PPTX

## Project structure

- `app/main.py` - FastAPI app entry point
- `app/routes/upload.py` - upload API
- `app/routes/generate.py` - generation API
- `app/routes/quiz.py` - quiz scoring API
- `app/services/ai_service.py` - Gemini integration and fallback generation
- `app/services/file_processing.py` - text extraction logic
- `frontend/` - frontend HTML, CSS, and JavaScript
- `uploads/` - temporary uploaded files
- `.env` - local environment configuration

## Setup

1. Open a terminal in the project folder.
2. Make sure the virtual environment exists.
3. Create or update `.env` with your Gemini API key:

   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. Install dependencies:

   ```powershell
   python -m pip install -r requirements.txt
   ```

## Run locally

From the project root:

```powershell
cd "c:\Users\verma\OneDrive\Desktop\Documents\Hackathon"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then open:

```text
http://127.0.0.1:8000
```

## Health check

```text
http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

## Demo path

The guaranteed demo route is:

PDF / DOCX / PPTX / PNG / JPG -> upload -> extract text -> generate notes -> 5-question quiz -> score + explanations

## Notes

- The app is intentionally designed as a single-page study tool, not a multi-tool workspace.
- Image OCR is not enabled in the current build, so the guaranteed working path is PDF, DOCX, or PPTX.
- If Gemini is temporarily unavailable, the app uses a local fallback generator so the flow still continues.
- If port 8000 is already in use, stop the old process first and restart the app.

## Troubleshooting

### Port 8000 already in use

```powershell
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### App starts but generation fails

- Check that `.env` contains a valid `GEMINI_API_KEY`
- Make sure the backend is running from the same project folder
- Try a larger, clearer document for better generation quality

## Verified status

The project has been verified to support:

- backend health endpoint
- frontend landing page
- upload flow
- study material generation
- quiz scoring flow
- notes/quiz download helpers
