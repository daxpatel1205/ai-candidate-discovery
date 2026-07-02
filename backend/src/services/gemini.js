import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1';
const TEXT_MODEL = 'gemini-2.5-flash';
const EMBEDDING_MODEL = 'gemini-embedding-001';

function normalizeEmbed(embedding) {
  if (!Array.isArray(embedding)) return [];
  const magnitude = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return embedding;
  return embedding.map((value) => value / magnitude);
}

export async function createEmbedding(text) {
  if (!GEMINI_API_KEY) {
    const vector = Array.from({ length: 128 }, (_, i) => ((text.charCodeAt(i % text.length) || 50) % 100) / 100);
    return normalizeEmbed(vector);
  }

  try {
    const url = `${GEMINI_BASE_URL}/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
    const payload = {
      content: {
        parts: [{ text }]
      }
    };
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    const embedding = response.data?.embedding?.values;
    return normalizeEmbed(embedding || []);
  } catch (err) {
    console.error('Gemini createEmbedding failed, using mock embedding fallback:', err.message);
    const vector = Array.from({ length: 128 }, (_, i) => ((text.charCodeAt(i % text.length) || 50) % 100) / 100);
    return normalizeEmbed(vector);
  }
}

export async function generateText(prompt, options = {}) {
  if (!GEMINI_API_KEY) {
    return `No Gemini API key configured. Prompt summary unavailable.`;
  }

  try {
    const url = `${GEMINI_BASE_URL}/models/${TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: options.maxTokens || 420
      }
    };

    const response = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    console.error('Gemini generateText failed:', err.message);
    return `Gemini generation failed: ${err.message}. Prompt summary unavailable.`;
  }
}

export async function generateJson(prompt, fallback = {}, options = {}) {
  const wrapper = `${prompt}\n\nRespond only with parsable JSON.`;
  try {
    const text = await generateText(wrapper, { ...options, max_output_tokens: options.maxTokens || 500 });
    const jsonStart = text.indexOf('{');
    if (jsonStart >= 0) {
      const jsonText = text.slice(jsonStart);
      return JSON.parse(jsonText);
    }
  } catch {
    // continue to fallback
  }
  return fallback;
}
