from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["quiz"])


class QuizSubmission(BaseModel):
    answers: dict[str, str]
    quiz: list[dict]


@router.post("/quiz/submit")
async def submit_quiz(payload: QuizSubmission):
    try:
        if not payload.quiz:
            raise HTTPException(status_code=400, detail="No quiz available.")

        score = 0
        results = []

        for idx, question in enumerate(payload.quiz, start=1):
            selected = payload.answers.get(str(idx), "")
            correct = question.get("correct_answer", "")
            is_correct = selected == correct
            if is_correct:
                score += 1

            results.append(
                {
                    "question_number": idx,
                    "question": question.get("question", ""),
                    "selected_answer": selected,
                    "correct_answer": correct,
                    "is_correct": is_correct,
                    "explanation": question.get("explanation", ""),
                }
            )

        percentage = round((score / len(payload.quiz)) * 100, 1) if payload.quiz else 0

        return {
            "score": score,
            "total": len(payload.quiz),
            "percentage": percentage,
            "results": results,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Quiz evaluation failed: {exc}") from exc
