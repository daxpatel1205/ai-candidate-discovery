import fs from 'fs';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

async function ocrText(buffer) {
  if (!buffer || buffer.length === 0) return '';
  let worker;
  try {
    worker = await createWorker('eng');
    const { data } = await worker.recognize(buffer);
    return normalizeText(data.text || '');
  } catch (err) {
    console.warn('OCR failed, returning empty text:', err.message);
    return '';
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch (_) { /* ignore cleanup errors */ }
    }
  }
}

async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeText(result.value || '');
}

export async function extractText(filePath, mimeType) {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const buffer = fs.readFileSync(filePath);

  if (!buffer || buffer.length === 0) {
    throw new Error('The uploaded file is empty.');
  }

  if (ext === 'pdf' || mimeType?.includes('pdf')) {
    try {
      const data = await pdfParse(buffer);
      const extracted = normalizeText(data.text || '');
      if (extracted.length < 80) {
        const ocrResult = await ocrText(buffer);
        return ocrResult.length > extracted.length ? ocrResult : extracted;
      }
      return extracted;
    } catch (pdfErr) {
      console.warn(`pdf-parse failed on ${filePath}, trying OCR fallback: ${pdfErr.message}`);
      try {
        return await ocrText(buffer);
      } catch (ocrErr) {
        throw new Error(`Failed to extract text from PDF: ${pdfErr.message}. OCR also failed: ${ocrErr.message}`);
      }
    }
  }

  if (ext === 'docx' || mimeType?.includes('officedocument') || mimeType?.includes('word')) {
    try {
      return await extractDocxText(buffer);
    } catch (err) {
      throw new Error(`Failed to extract text from DOCX: ${err.message}`);
    }
  }

  const imageTypes = ['png', 'jpg', 'jpeg', 'tif', 'tiff'];
  if (imageTypes.includes(ext) || mimeType?.startsWith('image/')) {
    try {
      return await ocrText(buffer);
    } catch (err) {
      throw new Error(`Failed OCR on image: ${err.message}`);
    }
  }

  return normalizeText(buffer.toString('utf8'));
}

function extractEmail(text) {
  const match = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/i);
  return match?.[0] || null;
}

function extractPhone(text) {
  const match = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
  return match?.[0]?.trim() || null;
}

function extractSkills(text) {
  const skills = [
    'javascript', 'typescript', 'react', 'node', 'express', 'vue', 'angular', 'next.js', 'nestjs',
    'python', 'java', 'golang', 'c++', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'mongodb',
    'sql', 'postgres', 'mysql', 'redis', 'graphql', 'rest', 'html', 'css', 'tailwind', 'figma',
    'machine learning', 'ai', 'data science', 'tensorflow', 'pytorch', 'nlp', 'linux', 'devops',
    'jira', 'notion', 'salesforce', 'aws lambda', 'serverless', 'docker-compose', 'git',
    'asana', 'slack', 'communication', 'leadership', 'mentoring', 'project management',
  ];

  const found = new Set();
  const lower = text.toLowerCase();
  for (const skill of skills) {
    if (lower.includes(skill) && found.size < 30) {
      found.add(skill);
    }
  }
  return Array.from(found);
}

function extractExperience(text) {
  const lower = text.toLowerCase();
  const match = lower.match(/(\d+)\+?\s*(?:years?|yrs?)/);
  return match ? parseInt(match[1], 10) : null;
}

function extractEducation(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const education = [];

  for (const line of lines) {
    if (/\b(university|college|school|academy|institute|bachelor|master|mba|phd)\b/i.test(line)) {
      education.push({ degree: line, institution: line, year: null });
      if (education.length >= 4) break;
    }
  }

  return education;
}

function extractProjects(text) {
  const projects = [];
  const blocks = text.split(/\n\n+/).map((block) => block.trim()).filter(Boolean);
  for (const block of blocks) {
    if (/\b(project|built|launched|engineered|designed)\b/i.test(block) && block.length < 500) {
      projects.push(block);
      if (projects.length >= 4) break;
    }
  }
  return projects;
}

function extractSummary(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const summaryLines = lines.slice(0, 4);
  return summaryLines.join(' ').slice(0, 800);
}

function extractCertifications(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.filter((line) => /\b(certified|certificate|certification|aws|azure|gcp|scrum|pmp)\b/i).slice(0, 8);
}

export {
  normalizeText,
  extractEmail,
  extractPhone,
  extractSkills,
  extractExperience,
  extractEducation,
  extractSummary,
};

export async function parseResume(filePath, mimeType) {
  try {
    const rawText = await extractText(filePath, mimeType);
    if (!rawText) {
      return { raw_text: '', structured: {} };
    }
    const structured = {
      name: rawText.split(/\r?\n/).find((line) => line.trim().length > 2)?.trim() || 'Unknown',
      email: extractEmail(rawText),
      phone: extractPhone(rawText),
      skills: extractSkills(rawText),
      experience_years: extractExperience(rawText),
      education: extractEducation(rawText),
      projects: extractProjects(rawText),
      certifications: extractCertifications(rawText),
      summary: extractSummary(rawText),
    };
    return { raw_text: rawText, structured };
  } catch (err) {
    console.error(`Error parsing resume file ${filePath}:`, err);
    return { raw_text: '', structured: {} };
  }
}
