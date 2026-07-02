import { createEmbedding } from './gemini.js';
import { nearestCandidates } from './vectorUtils.js';
import { Candidate } from '../models/Candidate.js';

export async function searchCandidates(query, filters = {}, limit = 20) {
  const queryEmbedding = await createEmbedding(query);
  const candidates = await Candidate.find({ embedding: { $exists: true, $ne: [] } });
  const scored = nearestCandidates(queryEmbedding, candidates, limit);

  return {
    matches: scored
      .filter((item) => !filters.language || item.candidate.language === filters.language)
      .slice(0, limit)
      .map((item) => ({
        candidate_id: String(item.candidate._id),
        score: item.score,
        snippet: item.candidate.summary || item.candidate.skills?.slice(0, 5).join(', ') || '',
        candidate: item.candidate,
      })),
  };
}
