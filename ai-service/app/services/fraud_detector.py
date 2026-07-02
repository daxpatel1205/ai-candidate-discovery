import re
from typing import Any


def _risk_level(score: int) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def _check_timeline_gaps(work_history: list[dict]) -> list[dict]:
    flags = []
    for entry in work_history:
        start = entry.get("startDate") or entry.get("start_date") or ""
        end = entry.get("endDate") or entry.get("end_date") or "present"
        if start and end and start > end and end.lower() != "present":
            flags.append({
                "type": "timeline_inconsistency",
                "severity": "high",
                "message": f"End date before start date at {entry.get('company', 'unknown company')}",
            })
    return flags


def _check_skill_inflation(skills: list[str], experience_years: int | None) -> list[dict]:
    flags = []
    if not skills:
        return flags

    senior_skills = {"kubernetes", "terraform", "system design", "architecture", "leadership", "aws", "ml ops"}
    claimed = {s.lower() for s in skills}
    overlap = claimed & senior_skills

    if experience_years is not None and experience_years < 2 and len(overlap) >= 4:
        flags.append({
            "type": "skill_inflation",
            "severity": "medium",
            "message": f"Junior experience ({experience_years}y) with many senior skills: {', '.join(overlap)}",
        })

    if len(skills) > 25:
        flags.append({
            "type": "skill_inflation",
            "severity": "low",
            "message": f"Unusually high skill count ({len(skills)} listed)",
        })

    return flags


def _check_boilerplate(text: str) -> list[dict]:
    flags = []
    boilerplate_phrases = [
        "highly motivated",
        "team player",
        "fast learner",
        "detail-oriented",
        "results-driven",
        "passionate professional",
    ]
    lower = text.lower()
    hits = [p for p in boilerplate_phrases if p in lower]
    if len(hits) >= 4:
        flags.append({
            "type": "generic_content",
            "severity": "low",
            "message": "Resume contains excessive generic boilerplate phrases",
        })
    return flags


def _check_contact_anomalies(structured: dict) -> list[dict]:
    flags = []
    email = structured.get("email") or ""
    if email and re.search(r"@(?:mail|email)\.(?:com|net)$", email, re.I):
        flags.append({
            "type": "suspicious_contact",
            "severity": "medium",
            "message": "Email uses a disposable-looking domain pattern",
        })
    return flags


def _check_experience_mismatch(text: str, structured: dict) -> list[dict]:
    flags = []
    years = structured.get("experience_years")
    if years and years > 30:
        flags.append({
            "type": "experience_anomaly",
            "severity": "high",
            "message": f"Claimed experience ({years} years) exceeds plausible range",
        })

    date_matches = re.findall(r"(20\d{2}|19\d{2})", text)
    if date_matches and years:
        earliest = min(int(d) for d in date_matches)
        implied = 2026 - earliest
        if years > implied + 3:
            flags.append({
                "type": "experience_anomaly",
                "severity": "medium",
                "message": "Stated years of experience may exceed career timeline",
            })

    return flags


def analyze_fraud(candidate_id: str, resume_text: str, structured: dict[str, Any]) -> dict[str, Any]:
    flags: list[dict] = []

    flags.extend(_check_timeline_gaps(structured.get("work_history") or []))
    flags.extend(_check_skill_inflation(structured.get("skills") or [], structured.get("experience_years")))
    flags.extend(_check_boilerplate(resume_text))
    flags.extend(_check_contact_anomalies(structured))
    flags.extend(_check_experience_mismatch(resume_text, structured))

    severity_weights = {"high": 25, "medium": 15, "low": 5}
    risk_score = min(100, sum(severity_weights.get(f["severity"], 10) for f in flags))

    recommendations = []
    if risk_score >= 70:
        recommendations.append("Conduct thorough background verification before proceeding.")
    if any(f["type"] == "skill_inflation" for f in flags):
        recommendations.append("Use skills-based technical assessment to validate claims.")
    if any(f["type"] == "timeline_inconsistency" for f in flags):
        recommendations.append("Request clarification on employment dates during screening.")
    if not recommendations:
        recommendations.append("No major fraud indicators detected. Standard verification recommended.")

    return {
        "candidate_id": candidate_id,
        "risk_score": risk_score,
        "risk_level": _risk_level(risk_score),
        "flags": flags,
        "recommendations": recommendations,
        "verified_fields": {
            "has_email": bool(structured.get("email")),
            "has_work_history": bool(structured.get("work_history")),
            "skills_count": len(structured.get("skills") or []),
        },
    }
