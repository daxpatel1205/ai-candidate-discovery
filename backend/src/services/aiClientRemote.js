import axios from 'axios';

const baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const aiClient = axios.create({
  baseURL,
  timeout: 30000,
});

export async function parseResume(filePath, mimeType) {
  const { data } = await aiClient.post('/parse/resume', { file_path: filePath, mime_type: mimeType });
  return data;
}

export async function indexCandidate(candidateId, text, metadata) {
  const { data } = await aiClient.post('/search/index', {
    candidate_id: candidateId,
    text,
    metadata,
  });
  return data;
}

export async function semanticSearch(query, filters = {}, limit = 20) {
  const { data } = await aiClient.post('/search/query', { query, filters, limit });
  return data;
}

export async function rankCandidates(job, candidates) {
  const { data } = await aiClient.post('/rank', { job, candidates });
  return data;
}

export async function generateInterviewQuestions(payload) {
  const { data } = await aiClient.post('/interview/generate', payload);
  return data;
}

export async function analyzeFraud(payload) {
  const { data } = await aiClient.post('/fraud/analyze', payload);
  return data;
}

export async function detectLanguage(text) {
  const { data } = await aiClient.post('/i18n/detect', { text });
  return data;
}

export async function translateText(text, targetLanguage, sourceLanguage) {
  const { data } = await aiClient.post('/i18n/translate', {
    text,
    target_language: targetLanguage,
    source_language: sourceLanguage,
  });
  return data;
}
