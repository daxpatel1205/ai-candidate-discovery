import { generateJson } from './gemini.js';

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  hi: 'Hindi',
  zh: 'Chinese',
  ar: 'Arabic',
  pt: 'Portuguese',
  ja: 'Japanese',
};

export function detectLanguage(text) {
  const sample = (text || '').slice(0, 4000).toLowerCase();
  if (!sample.trim()) {
    return { language: 'en', confidence: 0.0, language_name: 'English', alternatives: [] };
  }

  if (/\b(el|la|que|y|en|para|los|las|se)\b/.test(sample)) {
    return { language: 'es', confidence: 0.82, language_name: 'Spanish', alternatives: [] };
  }
  if (/\b(le|la|et|que|dans|une|pour)\b/.test(sample)) {
    return { language: 'fr', confidence: 0.78, language_name: 'French', alternatives: [] };
  }
  if (/\b(der|die|und|ist|zu|das|ein)\b/.test(sample)) {
    return { language: 'de', confidence: 0.75, language_name: 'German', alternatives: [] };
  }
  if (/\b(है|और|के|में|यह|से|को)\b/.test(sample)) {
    return { language: 'hi', confidence: 0.9, language_name: 'Hindi', alternatives: [] };
  }
  return { language: 'en', confidence: 0.96, language_name: 'English', alternatives: [] };
}

export async function translateText(text, targetLanguage, sourceLanguage) {
  const detected = sourceLanguage || detectLanguage(text).language || 'en';
  const prompt = `Translate the following text into ${LANGUAGE_NAMES[targetLanguage] || targetLanguage}.
Source language: ${LANGUAGE_NAMES[detected] || detected}
Text: ${text.slice(0, 4000)}\n\nReturn JSON: { "translated_text": "...", "source_language": "${detected}", "target_language": "${targetLanguage}", "notes": "..." }`;

  const fallback = {
    translated_text: text,
    source_language: detected,
    target_language: targetLanguage,
    notes: 'Translation unavailable without Gemini API key; returning original text.',
  };

  const result = await generateJson(prompt, fallback, { maxTokens: 450 });
  return { ...fallback, ...result };
}
