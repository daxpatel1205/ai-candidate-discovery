from typing import Any

from app.services.gemini import generate_json


def rank_candidates(job: dict[str, Any], candidates: list[dict[str, Any]]) -> dict[str, Any]:
    required = set(s.lower() for s in (job.get("required_skills") or []))
    rankings = []

    for candidate in candidates:
        skills = set(s.lower() for s in (candidate.get("skills") or []))
        matched = skills & required
        missing = required - skills

        skill_score = (len(matched) / len(required) * 60) if required else 40
        exp = candidate.get("experience_years") or 0
        exp_min = job.get("experience_min") or 0
        exp_score = min(25, max(0, 25 - abs(exp - exp_min) * 3))
        fraud_penalty = min(15, (candidate.get("fraud_score") or 0) * 0.15)

        score = round(max(0, min(100, skill_score + exp_score + 15 - fraud_penalty)), 1)

        rankings.append({
            "candidate_id": candidate.get("id"),
            "name": candidate.get("name"),
            "score": score,
            "matched_skills": list(matched),
            "missing_skills": list(missing),
            "explanation": f"Matched {len(matched)}/{len(required) or 'N/A'} required skills. "
            f"Experience: {exp} years.",
        })

    rankings.sort(key=lambda x: x["score"], reverse=True)

    prompt = f"""
Enhance ranking explanations for job "{job.get('title')}".
Candidates: {rankings[:10]}

Return JSON: {{ "rankings": [ {{ "candidate_id": "...", "explanation": "richer explanation" }} ] }}
"""

    enhanced = generate_json(prompt, {"rankings": []})
    enhanced_map = {r["candidate_id"]: r["explanation"] for r in enhanced.get("rankings", [])}

    for r in rankings:
        if r["candidate_id"] in enhanced_map:
            r["explanation"] = enhanced_map[r["candidate_id"]]

    return {"rankings": rankings}


def compare_candidates(job: dict[str, Any] | None, candidates: list[dict[str, Any]]) -> dict[str, Any]:
    comparison = []
    for c in candidates:
        comparison.append({
            "id": c.get("id"),
            "name": c.get("name"),
            "skills_count": len(c.get("skills") or []),
            "experience_years": c.get("experience_years"),
            "fraud_score": c.get("fraud_score", 0),
            "strengths": (c.get("skills") or [])[:5],
        })

    prompt = f"""
Compare these candidates{" for job " + job.get("title") if job else ""}.
Candidates: {comparison}

Return JSON:
{{
  "summary": "...",
  "recommendation": "...",
  "comparison_matrix": [
    {{ "candidate_id": "...", "pros": ["..."], "cons": ["..."], "best_for": "..." }}
  ]
}}
"""

    fallback = {
        "summary": f"Compared {len(candidates)} candidates.",
        "recommendation": candidates[0].get("name") if candidates else None,
        "comparison_matrix": [
            {
                "candidate_id": c.get("id"),
                "pros": (c.get("skills") or [])[:3],
                "cons": ["Requires deeper interview validation"],
                "best_for": "Further evaluation",
            }
            for c in candidates
        ],
    }

    return generate_json(prompt, fallback)
