import axios from 'axios';
import { generateText } from './gemini.js';

async function fetchLinkedInProfileFromApify(profileUrl) {
  const token = process.env.APIFY_TOKEN;
  const owner = process.env.APIFY_ACTOR_USERNAME;
  const actor = process.env.APIFY_ACTOR_NAME;
  if (!token || !owner || !actor) return null;

  const endpoint = `https://api.apify.com/v2/acts/${owner}~${actor}/run-sync?token=${token}`;
  try {
    const response = await axios.post(endpoint, { url: profileUrl }, { timeout: 100000 });
    return response.data;
  } catch (e) {
    return null;
  }
}

function cleanupLinkedInProfileData(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2).slice(0, 5000);
  } catch (e) {
    return String(data);
  }
}

export async function analyzeLinkedInProfile(profileUrl = '', profileText = '') {
  const profileSource = profileText || await fetchLinkedInProfileFromApify(profileUrl);
  const sourceText = cleanupLinkedInProfileData(profileSource);

  // Build prompt using string concatenation to avoid nested template pitfalls
  let prompt = 'You are a LinkedIn Profile Optimization Expert. Analyze the profile from the provided information and give complete, actionable suggestions for each section below.\n\n';
  prompt += `Profile URL: ${profileUrl}\n`;
  if (sourceText) {
    prompt += 'Profile data:\n';
    prompt += sourceText + '\n\n';
  } else {
    prompt += 'Profile data could not be fetched automatically. Analyze the URL and provide the best improvement strategy you can while noting that actual profile content is unavailable.\n\n';
  }
  prompt += 'Return valid JSON with keys: headline, photo_banner, about, experience, skills, bonus, notes. Each field should be plain text only.';

  const fallback = {
    headline: 'No profile content available to analyze. Please add a LinkedIn profile summary or configure Apify.',
    photo_banner: 'No profile content available to analyze. Please add a summary or configure Apify.',
    about: 'No profile content available to analyze. Please add a summary or configure Apify.',
    experience: 'No profile content available to analyze. Please add a summary or configure Apify.',
    skills: 'No profile content available to analyze. Please add a summary or configure Apify.',
    bonus: 'No profile content available to analyze. Please add a summary or configure Apify.',
    notes: 'If Apify is not configured, provide a short profile summary or use the app with Apify enabled.',
  };

  const result = await generateText(prompt, { maxTokens: 900 });
  const jsonStart = (result || '').indexOf('{');
  if (jsonStart >= 0) {
    try {
      return JSON.parse(result.slice(jsonStart));
    } catch (e) {
      return { ...fallback, notes: `Failed to parse AI response. Raw response:\n${result}` };
    }
  }

  return { ...fallback, notes: result };
}

export function computeHeatScore(candidate = {}) {
  const skills = Array.isArray(candidate.skills) ? candidate.skills.length : 0;
  const experience = Number(candidate.experienceYears || 0);
  const fraud = Number(candidate.fraudScore || 0);

  const score = Math.min(
    100,
    Math.max(
      0,
      skills * 6 + Math.min(40, experience * 3) + 30 - fraud * 0.5
    )
  );

  return Math.round(score * 10) / 10;
}

export function buildTags(candidate = {}) {
  const tags = new Set(candidate.tags || []);
  const skills = (candidate.skills || []).map((skill) => String(skill).toLowerCase());
  const text = String(candidate.summary || '') + ' ' + (candidate.education?.map((e) => e.degree).join(' ') || '');

  if (skills.length >= 8) tags.add('Skill-rich');
  if (skills.includes('ai') || skills.includes('machine learning') || skills.includes('nlp')) tags.add('AI-ready');
  if (skills.includes('leadership') || /lead(er|ship)/i.test(text)) tags.add('Leadership');
  if (/remote|distributed|work from home/i.test(text)) tags.add('Remote-friendly');
  if (candidate.experienceYears >= 8) tags.add('Senior-level');
  if (candidate.fraudScore >= 60) tags.add('Risk flagged');
  if (candidate.fraudScore < 30) tags.add('Trusted');
  if (candidate.email) tags.add('Contactable');

  return Array.from(tags);
}

export function calculateSkillGap(candidateSkills = [], requiredSkills = [], preferredSkills = []) {
  const normalized = candidateSkills.map((skill) => String(skill).trim().toLowerCase());
  const required = (requiredSkills || []).map((skill) => String(skill).trim());
  const preferred = (preferredSkills || []).map((skill) => String(skill).trim());

  const missingRequired = required.filter((skill) => !normalized.includes(skill.toLowerCase()));
  const matchedPreferred = preferred.filter((skill) => normalized.includes(skill.toLowerCase()));
  const readiness = required.length ? Math.round(((required.length - missingRequired.length) / required.length) * 100) : 100;

  return {
    required_skills: required,
    preferred_skills: preferred,
    missing_required: missingRequired,
    matched_preferred: matchedPreferred,
    readiness_score: readiness,
    summary: `The candidate matches ${required.length - missingRequired.length}/${required.length} required skills and ${matchedPreferred.length}/${preferred.length} preferred skills.`,
  };
}

export async function generateRecruiterEmail(candidate = {}, job = {}, tone = 'professional') {
  const prompt = `Write a concise ${tone} outreach email from a recruiter to ${candidate.name || 'the candidate'} for the role of ${job.title || 'a role'}.

Candidate skills: ${(candidate.skills || []).join(', ') || 'N/A'}
Candidate highlights: ${candidate.summary || 'No summary available'}
Job description: ${job.description || 'No description provided'}
Company: ${job.location || 'remote/hybrid'}

Return the response in JSON with keys subject and body.`;

  const fallback = {
    subject: `Opportunity: ${job.title || 'Hiring opportunity'}`,
    body: `Hi ${candidate.name || ''},\n\nI reviewed your profile and believe you could be a strong fit for ${job.title || 'an exciting opportunity'}. The role includes ${job.requiredSkills?.slice(0, 3).join(', ') || 'key skills in your area of expertise'}.\n\nWould you be open to a quick conversation?\n\nBest,\nRecruiting Team`,
  };

  const response = await generateText(prompt, { maxTokens: 260 });
  if (!response) return fallback;

  const jsonStart = response.indexOf('{');
  if (jsonStart >= 0) {
    try {
      return JSON.parse(response.slice(jsonStart));
    } catch {
      // fall through to parse fallback style
    }
  }

  const subjectMatch = response.match(/Subject:\s*(.*)/i);
  const bodyMatch = response.split(/Body:\s*/i)[1];

  return {
    subject: subjectMatch?.[1]?.trim() || fallback.subject,
    body: bodyMatch?.trim() || response.trim() || fallback.body,
  };
}

export async function suggestResumeImprovements(candidate = {}, rawText = '') {
  const prompt = `Provide actionable resume improvement suggestions for this candidate profile. Include formatting, clarity, strength of achievements, and missing skill signals.

Candidate name: ${candidate.name || 'Unknown'}
Skills: ${(candidate.skills || []).join(', ') || 'N/A'}
Experience: ${candidate.experienceYears || 'N/A'} years
Summary: ${candidate.summary || 'N/A'}
Resume text: ${rawText.slice(0, 1500)}

Return the answer as a short list of suggestions.`;

  const result = await generateText(prompt, { maxTokens: 260 });
  return result || 'No suggestions are available at this time.';
}

export async function answerCandidateQuestion(candidate = {}, message = '') {
  const prompt = `You are an intelligent recruiter assistant. Based on the candidate profile below, answer the question clearly and professionally.

Candidate profile:
Name: ${candidate.name || 'Unknown'}
Skills: ${(candidate.skills || []).join(', ') || 'N/A'}
Experience: ${candidate.experienceYears || 'N/A'} years
Summary: ${candidate.summary || 'N/A'}
Tags: ${(candidate.tags || []).join(', ') || 'N/A'}

Question: ${message}

Provide a concise answer with useful context from the candidate profile.`;

  const response = await generateText(prompt, { maxTokens: 220 });
  return response || 'Unable to respond at this time.';
}
