import { generateJson } from './gemini.js';

export async function rankCandidates(job, candidates) {
  const required = new Set((job.required_skills || []).map((s) => String(s).toLowerCase()));
  const preferred = new Set((job.preferred_skills || []).map((s) => String(s).toLowerCase()));

  const rankings = candidates.map((candidate) => {
    const skills = new Set((candidate.skills || []).map((s) => String(s).toLowerCase()));
    const matchedRequired = [...required].filter((skill) => skills.has(skill));
    const matchedPreferred = [...preferred].filter((skill) => skills.has(skill));
    const missingRequired = [...required].filter((skill) => !skills.has(skill));

    const skillScore = required.size ? (matchedRequired.length / required.size) * 50 : 30;
    const preferredScore = preferred.size ? Math.min(15, matchedPreferred.length * 3) : 10;
    const experienceYears = Number(candidate.experience_years || 0);
    const experienceScore = Math.min(20, Math.max(0, 20 - Math.abs((job.experience_min || 0) - experienceYears) * 2));
    const fraudPenalty = Math.min(15, Number(candidate.fraud_score || 0) * 0.12);
    const score = Math.round(Math.max(0, Math.min(100, skillScore + preferredScore + experienceScore + 15 - fraudPenalty)) * 10) / 10;

    return {
      candidate_id: candidate.id,
      name: candidate.name,
      score,
      matched_skills: matchedRequired,
      missing_skills: missingRequired,
      explanation: `Matched ${matchedRequired.length}/${required.size || 0} required skills and ${matchedPreferred.length} preferred skills. Experience: ${experienceYears} years.`,
    };
  });

  const prompt = `Enhance the quality of explanations for candidate ranking on job '${job.title}'.\n\nJob description: ${job.description}\n\nRankings: ${JSON.stringify(rankings.slice(0, 10), null, 2)}\n\nReturn JSON: { "rankings": [ { "candidate_id": "...", "explanation": "..." } ] }`;
  const enhanced = await generateJson(prompt, { rankings: [] }, { maxTokens: 300 });
  const enhancedMap = new Map((enhanced.rankings || []).map((item) => [item.candidate_id, item.explanation]));

  const enriched = rankings.map((rank) => ({
    ...rank,
    explanation: enhancedMap.get(rank.candidate_id) || rank.explanation,
  }));

  enriched.sort((a, b) => b.score - a.score);
  return { rankings: enriched };
}
