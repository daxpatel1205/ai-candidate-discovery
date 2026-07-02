export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function nearestCandidates(queryEmbedding, candidates, limit = 20) {
  return candidates
    .map((candidate) => ({
      candidate,
      score: cosineSimilarity(queryEmbedding, candidate.embedding || []),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((item) => item.candidate.embedding?.length)
    .map((item) => ({
      candidate: item.candidate,
      score: Number(item.score.toFixed(4)),
    }));
}
