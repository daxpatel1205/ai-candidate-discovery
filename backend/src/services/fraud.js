import { generateJson } from './gemini.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getRiskLevel(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export async function analyzeFraud(payload) {
  const { resume_text = '', structured = {} } = payload;
  const text = (resume_text || '').trim();
  const length = text.length;
  const hasContact = Boolean(structured.email || structured.phone);
  const skillsCount = (structured.skills || []).length;
  const summary = String(structured.summary || '').trim();

  let score = 50;
  const flags = [];
  const recommendations = [];

  if (!hasContact) {
    flags.push({ type: 'missing_contact', severity: 'high', message: 'Resume lacks an email or phone number.' });
    score -= 20;
  }

  if (length < 1200) {
    flags.push({ type: 'short_resume', severity: 'medium', message: 'Resume content is sparse and may miss details.' });
    score -= 10;
  }

  if (skillsCount < 3) {
    flags.push({ type: 'low_skill_coverage', severity: 'medium', message: 'Found fewer than 3 skills, which may indicate an incomplete profile.' });
    score -= 10;
  }

  if (summary.length < 50) {
    flags.push({ type: 'weak_summary', severity: 'low', message: 'Summary is too short or missing, reducing clarity.' });
    score -= 5;
  }

  if (/\b(good communication|hardworking|team player|responsible|detail oriented)\b/i.test(text)) {
    flags.push({ type: 'generic_phrases', severity: 'low', message: 'Resume contains generic phrases that may reduce differentiation.' });
    score -= 5;
  }

  score = clamp(score, 0, 100);

  if (score <= 20) {
    recommendations.push('Review the resume for missing contact details and add more role-specific experience.');
  } else if (score <= 50) {
    recommendations.push('Improve the resume summary, highlight achievements, and validate the candidate skills.');
  } else {
    recommendations.push('Candidate profile appears generally healthy; focus review on specific role fit and interview questions.');
  }

  const fallback = {
    risk_score: score,
    risk_level: getRiskLevel(score),
    flags,
    recommendations,
  };

  const prompt = `Analyze the following resume for possible fraud or weak signals. Return JSON only.\n\nResume text: ${text.slice(0, 3000)}\n\nResume structured data: ${JSON.stringify(structured)}\n\nReturn JSON with keys: risk_score, risk_level, flags, recommendations.`;

  const enhanced = await generateJson(prompt, fallback, { maxTokens: 250 });

  return {
    risk_score: enhanced.risk_score ?? fallback.risk_score,
    risk_level: enhanced.risk_level ?? fallback.risk_level,
    flags: enhanced.flags ?? fallback.flags,
    recommendations: enhanced.recommendations ?? fallback.recommendations,
  };
}
