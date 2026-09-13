import json
import re
from collections import Counter
from typing import Any

from google.genai import Client, types

from app.config import GEMINI_API_KEY


class AIService:
    def __init__(self):
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not configured.")
        self.client = Client(api_key=GEMINI_API_KEY)

    def _generate_with_fallback(self, prompt: str):
        model_candidates = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"]
        last_error: Exception | None = None

        for model_name in model_candidates:
            try:
                return self.client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    ),
                )
            except Exception as exc:
                last_error = exc
                if "404 NOT_FOUND" not in str(exc):
                    continue

        if last_error is not None:
            raise last_error

        raise RuntimeError("No Gemini model was available for generation.")

    def _build_fallback_material(self, text: str, subject: str | None = None) -> dict[str, Any]:
        cleaned_text = re.sub(r"\s+", " ", text).strip()
        sentence_candidates = [segment.strip() for segment in re.split(r"(?<=[.!?])\s+", cleaned_text) if segment.strip()]
        sentences = sentence_candidates[:8] if sentence_candidates else [cleaned_text]

        overview = " ".join(sentences[:2]) if len(sentences) >= 2 else cleaned_text
        title = (subject or "Study Material").strip() or "Study Material"

        words = re.findall(r"\b[a-zA-Z]{3,}\b", cleaned_text.lower())
        common_words = {
            "the", "and", "for", "with", "that", "this", "from", "into", "used", "are", "was", "were",
            "will", "have", "has", "their", "there", "been", "about", "over", "between", "through",
            "such", "more", "most", "then", "than", "also", "what", "when", "where", "which", "while",
            "each", "could", "would", "should", "only", "must", "may", "your", "study", "material",
            "algorithms", "algorithm", "binary", "search", "tree", "based", "time", "complexity"
        }

        filtered_words = [word for word in words if word not in common_words]
        counts = Counter(filtered_words)
        important_terms = [term for term, _ in counts.most_common(8) if term]

        if not important_terms:
            important_terms = ["Key concept", "Main idea", "Definition", "Example", "Review point"]

        topics = []
        chunk_count = min(3, max(1, len(sentences)))
        for index in range(chunk_count):
            chunk = sentences[index]
            topic_title = f"Topic {index + 1}"
            if important_terms[index % len(important_terms)]:
                topic_title = important_terms[index % len(important_terms)].capitalize()
            topics.append(
                {
                    "title": topic_title,
                    "summary": chunk,
                    "key_points": [chunk],
                    "important_definitions": [important_terms[index % len(important_terms)] if important_terms else "Key concept"],
                    "key_facts": [chunk],
                    "exam_focus": [f"Review the key idea behind {topic_title.lower()}."]
                }
            )

        quiz = []
        for index, sentence in enumerate(sentences[:5], start=1):
            options = []
            for candidate in sentences[:5]:
                if candidate != sentence and candidate not in options:
                    options.append(candidate)
            while len(options) < 3:
                options.append(f"Key point {len(options) + 1} from {title}")
            options = [sentence] + options[:3]
            quiz.append(
                {
                    "question": f"Which statement best captures the main idea in the source material for Question {index}?",
                    "options": options[:4],
                    "correct_answer": sentence,
                    "explanation": sentence
                }
            )

        while len(quiz) < 5:
            quiz.append(
                {
                    "question": f"What is the main takeaway from {title} in question {len(quiz) + 1}?",
                    "options": [
                        overview,
                        "The source material is empty.",
                        "The topic is unrelated to the topic summary.",
                        "No useful study insight can be extracted."
                    ],
                    "correct_answer": overview,
                    "explanation": f"The fallback generator created a basic study summary using the uploaded source text for {title}."
                }
            )

        return {
            "title": title,
            "overview": overview,
            "topics": topics,
            "important_terms": important_terms[:8],
            "quiz": quiz[:5]
        }

    def generate_study_material(self, text: str, subject: str | None = None) -> dict[str, Any]:
        subject_line = f"\nSubject/Course: {subject}\n" if subject else "\n"
        prompt = (
            "You are generating study material strictly from the uploaded source text below.\n\n"
            "Return valid JSON only with this exact structure:\n\n"
            "{\n"
            '  "title": "...",\n'
            '  "overview": "...",\n'
            '  "topics": [\n'
            '    {\n'
            '      "title": "...",\n'
            '      "summary": "...",\n'
            '      "key_points": ["..."],\n'
            '      "important_definitions": ["..."],\n'
            '      "key_facts": ["..."],\n'
            '      "exam_focus": ["..."]\n'
            '    }\n'
            '  ],\n'
            '  "important_terms": ["..."],\n'
            '  "quiz": [\n'
            '    {\n'
            '      "question": "...",\n'
            '      "options": ["...", "...", "...", "..."],\n'
            '      "correct_answer": "...",\n'
            '      "explanation": "..."\n'
            '    }\n'
            '  ]\n'
            '}\n\n'
            "Rules:\n"
            "1. Use only information present in the source text.\n"
            "2. Do not invent facts, formulas, or definitions.\n"
            "3. Include exactly 5 quiz questions.\n"
            "4. Ensure questions are clear and answerable from the source.\n"
            "5. If the material is too sparse, return an explicit JSON with:\n"
            '   {\n'
            '     "title": "Insufficient Source Material",\n'
            '     "overview": "The uploaded material did not contain enough reliable information to generate notes and a quiz.",\n'
            '     "topics": [],\n'
            '     "important_terms": [],\n'
            '     "quiz": []\n'
            '   }\n\n'
            f"{subject_line}"
            "Source text:\n"
            f"{text}"
        )

        try:
            response = self._generate_with_fallback(prompt)

            raw = (response.text or "").strip()
            if raw.startswith("```"):
                raw = raw.strip("`")
                if raw.lower().startswith("json"):
                    raw = raw[4:].strip()

            start = raw.find("{")
            end = raw.rfind("}")
            if start != -1 and end != -1 and end > start:
                raw = raw[start : end + 1]

            data = json.loads(raw)

            if not isinstance(data, dict):
                raise ValueError("The AI returned an invalid response format.")

            if isinstance(data.get("quiz"), list):
                quiz = data["quiz"]
                if len(quiz) == 0 or len(quiz) != 5:
                    return self._build_fallback_material(text, subject)
            else:
                return self._build_fallback_material(text, subject)

            if not isinstance(data.get("topics"), list) or not data["topics"]:
                return self._build_fallback_material(text, subject)

            return data
        except Exception:
            return self._build_fallback_material(text, subject)
