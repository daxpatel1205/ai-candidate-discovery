import os
import re
from pathlib import Path

from pypdf import PdfReader
from docx import Document


def extract_text(file_path: str, mime_type: str | None = None) -> str:
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".pdf" or (mime_type and "pdf" in mime_type):
        reader = PdfReader(file_path)
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if ext == ".docx" or (mime_type and "word" in (mime_type or "")):
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)

    if ext == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")

    return path.read_text(encoding="utf-8", errors="ignore")


def parse_structured(text: str) -> dict:
    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    phone_match = re.search(r"(\+?\d[\d\s\-().]{7,}\d)", text)

    lines = [l.strip() for l in text.splitlines() if l.strip()]
    name = lines[0] if lines else "Unknown"

    skills_keywords = [
        "python", "javascript", "react", "node", "java", "sql", "aws", "docker",
        "kubernetes", "mongodb", "typescript", "angular", "vue", "c++", "go", "rust",
        "machine learning", "ai", "data science", "excel", "communication", "leadership",
    ]
    lower = text.lower()
    skills = [s.title() if len(s) > 3 else s.upper() for s in skills_keywords if s in lower]

    years_match = re.search(r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience)?", lower)
    experience_years = int(years_match.group(1)) if years_match else None

    return {
        "name": name[:80],
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0).strip() if phone_match else None,
        "skills": list(dict.fromkeys(skills))[:20],
        "experience_years": experience_years,
        "summary": "\n".join(lines[1:4])[:500] if len(lines) > 1 else None,
        "education": [],
        "work_history": [],
    }
