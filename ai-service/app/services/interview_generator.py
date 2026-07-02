from typing import Any

from app.services.gemini import generate_json


def _fallback_questions(candidate: dict, job: dict | None, count: int, categories: list[str]) -> dict:
    skills = candidate.get("skills") or ["general skills"]
    role = job.get("title") if job else "the role"
    questions = []

    templates = {
        "technical": "Describe your experience with {skill} and a project where you applied it.",
        "behavioral": "Tell me about a time you demonstrated {skill} under pressure.",
        "situational": "How would you use {skill} to solve a problem in {role}?",
    }

    for i in range(count):
        cat = categories[i % len(categories)]
        skill = skills[i % len(skills)]
        questions.append({
            "id": i + 1,
            "category": cat,
            "question": templates.get(cat, templates["technical"]).format(skill=skill, role=role),
            "follow_ups": [
                "What was the outcome?",
                "What would you do differently?",
            ],
            "evaluation_criteria": [f"Depth of {skill} knowledge", "Problem-solving approach"],
            "difficulty": "medium",
        })

    return {
        "questions": questions,
        "summary": f"Generated {count} interview questions for {candidate.get('name', 'candidate')}.",
        "recommended_duration_minutes": count * 5,
    }


def generate_interview_questions(
    candidate: dict[str, Any],
    job: dict[str, Any] | None,
    difficulty: str,
    count: int,
    categories: list[str],
    language: str,
) -> dict[str, Any]:
    job_context = ""
    if job:
        job_context = f"""
Job Title: {job.get('title')}
Description: {job.get('description', '')[:800]}
Required Skills: {', '.join(job.get('required_skills') or [])}
"""

    prompt = f"""
Generate {count} interview questions in language code "{language}" for this candidate.

Candidate:
- Name: {candidate.get('name')}
- Skills: {', '.join(candidate.get('skills') or [])}
- Experience: {candidate.get('experience_years')} years
- Summary: {candidate.get('summary', '')[:500]}

{job_context}

Difficulty: {difficulty}
Categories to use: {', '.join(categories)}

Return JSON:
{{
  "questions": [
    {{
      "id": 1,
      "category": "technical|behavioral|situational",
      "question": "...",
      "follow_ups": ["...", "..."],
      "evaluation_criteria": ["...", "..."],
      "difficulty": "{difficulty}"
    }}
  ],
  "summary": "brief overview",
  "recommended_duration_minutes": 45
}}
"""

    fallback = _fallback_questions(candidate, job, count, categories)
    return generate_json(prompt, fallback)
