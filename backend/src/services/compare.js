import { generateJson } from './gemini.js';

export async function compareCandidates(job, candidates) {
  const summaryRows = candidates.map((candidate) => ({
    candidate_id: candidate.id,
    name: candidate.name,
    skills: candidate.skills || [],
    experience_years: candidate.experience_years || 0,
    fraud_score: candidate.fraud_score || 0,
  }));

  const prompt = `Compare these candidates${job ? ` for job ${job.title}` : ''}.\n\nJob details: ${job ? JSON.stringify(job) : 'None'}\n\nCandidates: ${JSON.stringify(summaryRows, null, 2)}\n\nReturn JSON: { "summary": "...", "recommendation": "...", "comparison_matrix": [ { "candidate_id": "...", "pros": ["..."], "cons": ["..."], "best_for": "..." } ] }`;

  const fallback = {
    summary: `Compared ${candidates.length} candidates${job ? ` for ${job.title}` : ''}.`,
    recommendation: candidates[0]?.name || null,
    comparison_matrix: candidates.map((candidate) => ({
      candidate_id: candidate.id,
      pros: (candidate.skills || []).slice(0, 3),
      cons: ['Needs interview validation'],
      best_for: 'Further screening',
    })),
  };

  const result = await generateJson(prompt, fallback, { maxTokens: 350 });
  return result;
}
