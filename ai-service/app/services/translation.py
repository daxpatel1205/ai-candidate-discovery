from langdetect import detect, detect_langs, LangDetectException

from app.services.gemini import generate_json

LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "hi": "Hindi",
    "zh-cn": "Chinese",
    "zh-tw": "Chinese (Traditional)",
    "ar": "Arabic",
    "pt": "Portuguese",
    "ja": "Japanese",
}


def detect_language(text: str) -> dict:
    sample = (text or "")[:5000].strip()
    if not sample:
        return {"language": "en", "confidence": 0.0, "language_name": "English", "alternatives": []}

    try:
        primary = detect(sample)
        alternatives = [
            {"language": lang.lang, "confidence": round(lang.prob, 4), "language_name": LANGUAGE_NAMES.get(lang.lang, lang.lang)}
            for lang in detect_langs(sample)[:3]
        ]
        return {
            "language": primary,
            "confidence": alternatives[0]["confidence"] if alternatives else 0.9,
            "language_name": LANGUAGE_NAMES.get(primary, primary),
            "alternatives": alternatives,
        }
    except LangDetectException:
        return {"language": "en", "confidence": 0.0, "language_name": "English", "alternatives": []}


def translate_text(text: str, target_language: str, source_language: str | None = None) -> dict:
    detected = detect_language(text) if not source_language else {
        "language": source_language,
        "language_name": LANGUAGE_NAMES.get(source_language, source_language),
    }

    prompt = f"""
Translate the following resume/candidate text to language code "{target_language}".
Preserve formatting, names, company names, and technical terms where appropriate.

Source language: {detected.get('language', 'auto')}

Text:
{text[:6000]}

Return JSON:
{{
  "translated_text": "...",
  "source_language": "{detected.get('language', 'en')}",
  "target_language": "{target_language}",
  "notes": "any translation caveats"
}}
"""

    fallback = {
        "translated_text": text,
        "source_language": detected.get("language", "en"),
        "target_language": target_language,
        "detected_source": detected.get("language"),
        "notes": "Translation unavailable without Gemini API key; returning original text.",
    }

    result = generate_json(prompt, fallback)
    result["detected_source"] = detected.get("language")
    return result
