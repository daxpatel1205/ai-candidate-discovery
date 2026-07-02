import os
import json
import re
from typing import Any

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-2.0-flash"


def _get_model():
    if not GEMINI_API_KEY:
        return None
    return genai.GenerativeModel(MODEL_NAME)


def generate_json(prompt: str, fallback: dict[str, Any]) -> dict[str, Any]:
    model = _get_model()
    if not model:
        return fallback

    try:
        response = model.generate_content(
            f"{prompt}\n\nRespond with valid JSON only, no markdown fences.",
            generation_config={"response_mime_type": "application/json"},
        )
        return json.loads(response.text)
    except Exception:
        return fallback
