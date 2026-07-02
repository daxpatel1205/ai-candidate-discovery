/**
 * Resume Review Engine
 * Expert-level ATS, Recruiter & Career Coach Analysis
 * Works fully offline — no Gemini API key required
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACTION_VERBS = ['developed','built','engineered','designed','launched','led','managed','architected','optimized','deployed','implemented','delivered','created','improved','reduced','increased','scaled','mentored','collaborated','automated','integrated','migrated','streamlined','spearheaded','coordinated','executed','analyzed','evaluated','negotiated','drove','boosted','accelerated','transformed','revamped','pioneered'];

const TECH_SKILLS_DB = ['javascript','typescript','python','java','go','rust','c++','c#','react','next.js','vue','angular','node.js','express','nestjs','fastapi','django','flask','spring boot','aws','azure','gcp','docker','kubernetes','terraform','ci/cd','git','linux','mongodb','postgresql','mysql','redis','elasticsearch','kafka','graphql','rest api','microservices','machine learning','ai','deep learning','nlp','llm','langchain','data science','spark','hadoop','sql','nosql','html','css','tailwind','figma','system design','agile','scrum','devops'];

const SOFT_SKILLS_DB = ['leadership','communication','problem solving','teamwork','collaboration','mentoring','project management','time management','adaptability','critical thinking','presentation','stakeholder management','cross-functional','negotiation','decision making'];

const POWER_WORDS = ['spearheaded','pioneered','transformed','revolutionized','architected','championed','orchestrated','accelerated','optimized','delivered','exceeded','achieved','drove','elevated','innovated'];

const FILLER_PHRASES = ['responsible for','worked on','helped with','assisted in','involved in','duties included','tasked with','handled','participated in'];

const SECTION_KEYWORDS = {
  summary: ['summary','profile','objective','about','professional summary','career summary'],
  experience: ['experience','work history','employment','career history','professional experience','work experience'],
  education: ['education','academic','degree','university','college','school','qualifications'],
  skills: ['skills','technical skills','core competencies','technologies','tools','expertise','proficiencies'],
  projects: ['projects','portfolio','work samples','personal projects','side projects','open source'],
  certifications: ['certifications','certificates','credentials','licenses','accreditations'],
  achievements: ['achievements','accomplishments','awards','honors','recognition'],
  contact: ['email','phone','linkedin','github','portfolio','location','address'],
};

const HIGH_VALUE_CERTS = {
  tech: ['AWS Certified','Google Cloud','Azure Certified','CKA','CKD','PMP','Scrum','CISSP','CEH','TOGAF'],
  data: ['Google Data Analytics','IBM Data Science','Tableau','Power BI','Apache Kafka','Databricks'],
  business: ['PMP','Six Sigma','Lean','ITIL','CFA','CPA','SHRM'],
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function clamp(v, min = 0, max = 10) { return Math.min(max, Math.max(min, v)); }
function clamp100(v) { return Math.min(100, Math.max(0, v)); }

function countMatches(text, terms) {
  const lower = text.toLowerCase();
  return terms.filter(t => lower.includes(t.toLowerCase())).length;
}

function hasSection(text, type) {
  const lower = text.toLowerCase();
  return SECTION_KEYWORDS[type]?.some(kw => lower.includes(kw)) || false;
}

function extractLines(text) {
  return text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
}

function extractBullets(text) {
  return extractLines(text).filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l));
}

function hasMetrics(text) {
  return /\d+[\+%x×]|\$[\d,]+|[\d,]+\s*(users|customers|revenue|leads|requests|transactions|sales|clients|projects|teams?|engineers?|hours?|days?|months?)/i.test(text);
}

function extractEmails(text) {
  return (text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []);
}

function extractPhones(text) {
  return (text.match(/(\+?\d[\d\s\-().]{7,}\d)/g) || []).slice(0, 2);
}

function extractUrls(text) {
  return (text.match(/https?:\/\/[^\s]+|linkedin\.com\/[^\s]+|github\.com\/[^\s]+/gi) || []);
}

function getGrade(score) {
  if (score >= 92) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 78) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 62) return 'C+';
  if (score >= 55) return 'C';
  return 'D';
}

function extractExperienceBlocks(text) {
  const lines = extractLines(text);
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const isRole = /\b(engineer|developer|manager|analyst|lead|director|architect|designer|consultant|specialist|intern|associate|head|vp|cto|ceo|founder)\b/i.test(line) && line.length < 120;
    const isCompanyLine = /\bat\s+\w|\b(inc|ltd|llc|corp|company|technologies|solutions|labs|systems|group)\b/i.test(line);

    if (isRole || isCompanyLine) {
      if (current) blocks.push(current);
      current = { title: line, bullets: [], company: '' };
    } else if (current && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))) {
      current.bullets.push(line.replace(/^[•\-*]\s*/, ''));
    }
  }
  if (current) blocks.push(current);
  return blocks.slice(0, 6);
}

function extractProjectBlocks(text) {
  const lower = text.toLowerCase();
  const lines = extractLines(text);
  const projects = [];
  let inProjects = false;

  for (const line of lines) {
    if (/\b(projects|portfolio|open source)\b/i.test(line) && line.length < 40) { inProjects = true; continue; }
    if (inProjects && line.length > 10 && line.length < 120 && !/^\d+$/.test(line)) {
      projects.push(line.replace(/^[•\-*]\s*/, ''));
      if (projects.length >= 5) break;
    }
  }
  return projects;
}

// ─── Category Scorers ──────────────────────────────────────────────────────────

function scoreStructure(text) {
  let score = 3;
  const issues = [];
  const recs = [];

  const hasContact_ = hasSection(text, 'contact') || extractEmails(text).length > 0;
  const hasExp = hasSection(text, 'experience');
  const hasEdu = hasSection(text, 'education');
  const hasSkills = hasSection(text, 'skills');
  const hasSummary = hasSection(text, 'summary');
  const hasProjects = hasSection(text, 'projects');
  const hasCerts = hasSection(text, 'certifications');

  if (hasContact_) score += 1; else { issues.push('Missing contact information section'); recs.push('Add name, email, phone, LinkedIn, and GitHub at the top'); }
  if (hasSummary) score += 1; else { issues.push('No professional summary found'); recs.push('Add a 3-4 line professional summary at the top'); }
  if (hasExp) score += 2; else { issues.push('No work experience section found'); recs.push('Add a clearly labeled Work Experience section'); }
  if (hasEdu) score += 1; else { issues.push('No education section found'); recs.push('Add your educational background'); }
  if (hasSkills) score += 1; else { issues.push('No skills section found'); recs.push('Add a dedicated Skills section with technical and soft skills'); }
  if (hasProjects || hasCerts) score += 1;

  return { score: clamp(score), issues, recs };
}

function scoreATS(text) {
  let score = 3;
  const issues = [];
  const recs = [];

  // Contact info
  const emails = extractEmails(text);
  const phones = extractPhones(text);
  if (emails.length) score += 1; else { issues.push('No email address found'); recs.push('Add your email address prominently'); }
  if (phones.length) score += 0.5; else { issues.push('No phone number found'); recs.push('Add your phone number'); }

  // Standard section headings
  const standardSections = ['experience','education','skills'].filter(s => hasSection(text, s));
  if (standardSections.length === 3) score += 2; else { issues.push('Missing standard section headings (Experience, Education, Skills)'); recs.push('Use clear, standard headings that ATS can parse'); }

  // No tables/columns (heuristic: consistent line lengths)
  const lines = extractLines(text);
  const avgLen = lines.reduce((a, b) => a + b.length, 0) / (lines.length || 1);
  if (avgLen < 200) score += 1;

  // Keyword density
  const techFound = TECH_SKILLS_DB.filter(s => text.toLowerCase().includes(s));
  if (techFound.length >= 8) score += 1.5; else if (techFound.length >= 4) score += 0.5; else { issues.push('Low keyword density — ATS may not rank this resume'); recs.push('Add more industry-specific keywords from job descriptions'); }

  // No special characters in headings
  const hasProblematicChars = /[│┌┐└┘├┤┬┴┼═╔╗╚╝]/.test(text);
  if (!hasProblematicChars) score += 0.5; else { issues.push('Special table/box characters detected — ATS cannot parse these'); recs.push('Remove all table borders and box-drawing characters'); }

  // File format note
  recs.push('Save resume as PDF with selectable text (not scanned image)');
  recs.push('Avoid headers/footers and multi-column layouts for ATS compatibility');

  return { score: clamp(score), issues, recs };
}

function scoreSummary(text) {
  const lower = text.toLowerCase();
  let score = 0;
  const recs = [];

  const hasSummary = hasSection(text, 'summary');
  if (!hasSummary) {
    return { score: 0, recs: ['Add a 3–4 line professional summary with your role, years of experience, key skills, and value proposition'], summaryText: '' };
  }

  // Extract summary block
  const summaryIdx = lower.search(/\b(summary|profile|objective|about)\b/);
  const summaryBlock = summaryIdx >= 0 ? text.slice(summaryIdx, summaryIdx + 600) : '';

  score += 3; // has section
  if (summaryBlock.length > 100) score += 2;
  if (summaryBlock.length > 250) score += 1;
  if (/\d+[\+]?\s*years?/i.test(summaryBlock)) score += 1; else recs.push('Include years of experience in your summary');
  if (TECH_SKILLS_DB.some(s => summaryBlock.toLowerCase().includes(s))) score += 1; else recs.push('Mention 2-3 key technical skills in your summary');
  if (/\b(seeking|looking|open to|available)\b/i.test(summaryBlock)) score += 0.5;
  if (/\b(impact|delivered|achieved|led|built)\b/i.test(summaryBlock)) score += 1.5; else recs.push('Add an achievement or measurable impact to your summary');

  return { score: clamp(score), recs, summaryText: summaryBlock };
}

function scoreExperience(text) {
  let score = 0;
  const recs = [];

  if (!hasSection(text, 'experience')) {
    return { score: 0, recs: ['Add a Work Experience section with your job history'] };
  }

  const bullets = extractBullets(text);
  const expBlocks = extractExperienceBlocks(text);

  score += 2; // has section
  if (expBlocks.length >= 1) score += 2;
  if (expBlocks.length >= 3) score += 1;

  // Action verbs
  const lowerText = text.toLowerCase();
  const verbsFound = ACTION_VERBS.filter(v => lowerText.includes(v));
  if (verbsFound.length >= 8) score += 2;
  else if (verbsFound.length >= 4) score += 1;
  else recs.push(`Use strong action verbs: ${ACTION_VERBS.slice(0, 6).join(', ')}, etc.`);

  // Filler phrases
  const fillerCount = FILLER_PHRASES.filter(p => lowerText.includes(p)).length;
  if (fillerCount === 0) score += 1;
  else recs.push(`Remove weak phrases like "responsible for", "worked on", "helped with" — replace with action verbs`);

  // Metrics
  if (hasMetrics(text)) score += 2;
  else recs.push('Add quantified achievements (%, $, users, time saved) — e.g., "Reduced load time by 40%"');

  // Dates
  if (/\b(20\d{2}|19\d{2})\b/.test(text)) score += 0;
  else recs.push('Include dates (month/year) for each role');

  return { score: clamp(score), recs, verbsFound, fillerCount, expBlocks };
}

function scoreAchievements(text) {
  let score = 0;
  const recs = [];

  if (hasMetrics(text)) {
    score += 5;
    const metricCount = (text.match(/\d+[\+%x]|\$[\d,]+/g) || []).length;
    if (metricCount >= 4) score += 3;
    else if (metricCount >= 2) score += 2;
    else { score += 1; recs.push('Add more quantified metrics — aim for at least 4–5 numbers in your experience bullets'); }
  } else {
    recs.push('Add measurable outcomes to your experience bullets (%, $, number of users, time saved)');
    recs.push('Examples: "Reduced deployment time by 60%", "Served 10K+ users", "Increased revenue by $200K"');
  }

  const powerWordCount = POWER_WORDS.filter(w => text.toLowerCase().includes(w)).length;
  if (powerWordCount >= 3) score += 2;
  else { score += 1; recs.push(`Use impactful power words: ${POWER_WORDS.slice(0, 5).join(', ')}`); }

  return { score: clamp(score), recs };
}

function scoreTechSkills(text) {
  const lower = text.toLowerCase();
  let score = 0;
  const recs = [];

  if (!hasSection(text, 'skills')) {
    return { score: 0, recs: ['Add a dedicated Skills section'], existing: [], missing: [] };
  }

  const found = TECH_SKILLS_DB.filter(s => lower.includes(s));
  const missing = TECH_SKILLS_DB.filter(s => !lower.includes(s)).slice(0, 8);

  score += 2;
  if (found.length >= 5) score += 2;
  if (found.length >= 10) score += 2;
  if (found.length >= 15) score += 2;
  if (found.length >= 20) score += 1;
  if (found.length < 5) recs.push('Add more technical skills — recruiters scan skills sections first');

  return { score: clamp(score), recs, existing: found, missing };
}

function scoreSoftSkills(text) {
  const lower = text.toLowerCase();
  let score = 0;
  const recs = [];

  const found = SOFT_SKILLS_DB.filter(s => lower.includes(s));
  if (found.length >= 3) score += 4;
  else if (found.length >= 1) score += 2;
  else recs.push(`Add soft skills: ${SOFT_SKILLS_DB.slice(0, 5).join(', ')}`);

  // Leadership signals
  if (/\b(led|managed|mentored|supervised|coached)\b/i.test(text)) score += 3;
  else recs.push('Demonstrate leadership by mentioning team size, mentoring, or project ownership');

  if (found.length >= 2) score += 2;
  if (found.length < 2) recs.push('Mention soft skills in your summary or experience bullets contextually');

  return { score: clamp(score), recs, found };
}

function scoreEducation(text) {
  let score = 0;
  const recs = [];

  if (!hasSection(text, 'education')) {
    return { score: 0, recs: ['Add an Education section with your degree, institution, and year'] };
  }

  score += 3;
  const hasDegree = /\b(bachelor|master|phd|b\.tech|m\.tech|b\.e\.|m\.e\.|b\.sc|m\.sc|mba|bca|mca|diploma)\b/i.test(text);
  if (hasDegree) score += 2; else recs.push('Clearly state your degree (e.g., Bachelor of Technology)');

  const hasYear = /\b(20\d{2}|19\d{2})\b/.test(text);
  if (hasYear) score += 2; else recs.push('Include graduation year');

  const hasInstitution = /\b(university|college|institute|school|iit|nit|bits)\b/i.test(text);
  if (hasInstitution) score += 2; else recs.push('Include the institution name');

  const hasGPA = /\b(gpa|cgpa|percentage|grade)\b/i.test(text);
  if (hasGPA) score += 1;

  return { score: clamp(score), recs };
}

function scoreCertifications(text) {
  let score = 0;
  const recs = [];
  const lower = text.toLowerCase();

  if (!hasSection(text, 'certifications')) {
    recs.push('Add a Certifications section to boost ATS score and recruiter confidence');
  } else {
    score += 4;
  }

  const highValueFound = [...HIGH_VALUE_CERTS.tech, ...HIGH_VALUE_CERTS.data, ...HIGH_VALUE_CERTS.business]
    .filter(c => lower.includes(c.toLowerCase()));

  if (highValueFound.length >= 2) score += 4;
  else if (highValueFound.length === 1) score += 2;
  else recs.push('Add industry-recognized certifications (AWS, GCP, PMP, Scrum, CKAD)');

  score += Math.min(2, highValueFound.length);

  return { score: clamp(score), recs, found: highValueFound };
}

function scoreProjects(text) {
  let score = 0;
  const recs = [];

  const hasProjectSection = hasSection(text, 'projects');
  if (!hasProjectSection) {
    recs.push('Add a Projects section — it significantly boosts recruiter appeal for tech roles');
    return { score: 0, recs, projects: [] };
  }

  score += 3;
  const projects = extractProjectBlocks(text);

  if (projects.length >= 2) score += 2;
  if (projects.length >= 3) score += 1;

  const hasGitHub = /github\.com/i.test(text);
  if (hasGitHub) score += 2; else recs.push('Add GitHub links to your projects');

  const hasLiveDemo = /live|demo|deployed|production|app\./i.test(text);
  if (hasLiveDemo) score += 1; else recs.push('Include live demo links where available');

  const hasTechStack = projects.some(p => TECH_SKILLS_DB.some(s => p.toLowerCase().includes(s)));
  if (hasTechStack) score += 1; else recs.push('Mention the tech stack used in each project');

  return { score: clamp(score), recs, projects };
}

function scoreKeywords(text, jdText = '') {
  const lower = text.toLowerCase();
  const jdLower = jdText.toLowerCase();
  let score = 0;
  const recs = [];

  const foundTech = TECH_SKILLS_DB.filter(s => lower.includes(s));
  const foundSoft = SOFT_SKILLS_DB.filter(s => lower.includes(s));
  const allFound = [...foundTech, ...foundSoft];

  score += Math.min(5, allFound.length * 0.4);

  let jdKeywords = [];
  let missingFromJD = [];
  let coverage = 0;

  if (jdText) {
    jdKeywords = [...TECH_SKILLS_DB, ...SOFT_SKILLS_DB].filter(s => jdLower.includes(s));
    missingFromJD = jdKeywords.filter(s => !lower.includes(s));
    coverage = jdKeywords.length ? Math.round(((jdKeywords.length - missingFromJD.length) / jdKeywords.length) * 100) : 0;
    score += Math.min(5, coverage / 20);
    if (missingFromJD.length > 3) recs.push(`Add these JD keywords: ${missingFromJD.slice(0, 5).join(', ')}`);
  } else {
    score += 2;
    recs.push('Tailor your resume keywords to match each job description');
  }

  return {
    score: clamp(score), recs,
    existing: allFound,
    missing: missingFromJD.slice(0, 10),
    jdKeywords,
    coverage,
  };
}

function scoreReadability(text) {
  let score = 5;
  const recs = [];
  const lines = extractLines(text);

  // Average line length
  const avgLen = lines.reduce((a, b) => a + b.length, 0) / (lines.length || 1);
  if (avgLen > 180) { score -= 2; recs.push('Lines are too long — break them into shorter bullet points'); }
  if (avgLen < 20) { score -= 1; recs.push('Lines may be too short — provide more context in bullets'); }

  // All caps sections (good for headings)
  const allCapsLines = lines.filter(l => l === l.toUpperCase() && l.length > 3);
  if (allCapsLines.length > 0) score += 1;

  // Bullet usage
  const bulletLines = extractBullets(text);
  if (bulletLines.length >= 5) score += 2;
  else { score -= 1; recs.push('Use bullet points in your experience section for readability'); }

  // Length check
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 150) { score -= 2; recs.push('Resume is too short — aim for 400–700 words for most roles'); }
  if (wordCount > 900) { score -= 1; recs.push('Resume may be too long — keep to 1–2 pages (400–700 words)'); }

  return { score: clamp(score), recs, wordCount };
}

function scoreBranding(text) {
  let score = 2;
  const recs = [];

  const hasLinkedIn = /linkedin\.com/i.test(text);
  const hasGitHub = /github\.com/i.test(text);
  const hasPortfolio = /portfolio|personal site|website/i.test(text);

  if (hasLinkedIn) score += 2; else recs.push('Add your LinkedIn profile URL');
  if (hasGitHub) score += 2; else recs.push('Add your GitHub profile URL');
  if (hasPortfolio) score += 1; else recs.push('Add a portfolio or personal website link');

  const hasConsistentRole = /\b(senior|junior|lead|principal|staff)\b/i.test(text);
  if (hasConsistentRole) score += 1;

  const hasPowerSummary = POWER_WORDS.some(w => text.toLowerCase().includes(w));
  if (hasPowerSummary) score += 2; else recs.push('Use power words in your summary and experience to build a strong brand voice');

  return { score: clamp(score), recs };
}

function scoreRecruiterAppeal(text) {
  let score = 3;
  const recs = [];

  // Strong opening
  const hasSummary = hasSection(text, 'summary');
  if (hasSummary) score += 2; else recs.push('Start with a strong professional summary to hook the recruiter');

  // Relevant skills
  const techCount = countMatches(text, TECH_SKILLS_DB);
  if (techCount >= 8) score += 2; else score += 1;

  // Achievements
  if (hasMetrics(text)) score += 2; else recs.push('Add metrics — recruiters spend only 6–10 seconds on a resume');

  // Clear contact
  const emails = extractEmails(text);
  if (emails.length) score += 1;

  return { score: clamp(score), recs };
}

// ─── Job Match Analysis ────────────────────────────────────────────────────────

function analyzeJobMatch(resumeText, jdText, jobTitle = '') {
  if (!jdText) return null;

  const resumeLower = resumeText.toLowerCase();
  const jdLower = jdText.toLowerCase();

  // Skill match
  const jdTechSkills = TECH_SKILLS_DB.filter(s => jdLower.includes(s));
  const matchedSkills = jdTechSkills.filter(s => resumeLower.includes(s));
  const skillMatch = jdTechSkills.length ? Math.round((matchedSkills.length / jdTechSkills.length) * 100) : 50;

  // Keyword match
  const allJdKw = [...TECH_SKILLS_DB, ...SOFT_SKILLS_DB, ...ACTION_VERBS].filter(k => jdLower.includes(k));
  const matchedKw = allJdKw.filter(k => resumeLower.includes(k));
  const keywordMatch = allJdKw.length ? Math.round((matchedKw.length / allJdKw.length) * 100) : 50;

  // Experience match (heuristic)
  const jdYearsMatch = jdText.match(/(\d+)\+?\s*years?/i);
  const resumeYearsMatch = resumeText.match(/(\d+)\+?\s*years?/i);
  const jdYears = jdYearsMatch ? parseInt(jdYearsMatch[1]) : 0;
  const resumeYears = resumeYearsMatch ? parseInt(resumeYearsMatch[1]) : 0;
  const experienceMatch = jdYears > 0 ? Math.min(100, Math.round((resumeYears / jdYears) * 100)) : 70;

  // Education match
  const jdNeedsDegree = /\b(bachelor|master|phd|degree|b\.tech|mba)\b/i.test(jdText);
  const resumeHasDegree = /\b(bachelor|master|phd|degree|b\.tech|mba)\b/i.test(resumeText);
  const educationMatch = jdNeedsDegree ? (resumeHasDegree ? 90 : 40) : 80;

  // Industry match (title similarity)
  const jdTitleWords = jobTitle.toLowerCase().split(/\s+/);
  const industryMatch = jdTitleWords.some(w => w.length > 3 && resumeLower.includes(w)) ? 85 : 60;

  // Responsibilities match
  const jdVerbs = ACTION_VERBS.filter(v => jdLower.includes(v));
  const matchedVerbs = jdVerbs.filter(v => resumeLower.includes(v));
  const responsibilityMatch = jdVerbs.length ? Math.round((matchedVerbs.length / jdVerbs.length) * 100) : 60;

  const overall = Math.round((skillMatch * 0.30 + keywordMatch * 0.25 + experienceMatch * 0.20 + educationMatch * 0.10 + industryMatch * 0.10 + responsibilityMatch * 0.05));

  const missingSkills = jdTechSkills.filter(s => !resumeLower.includes(s));
  const missingKeywords = allJdKw.filter(k => !resumeLower.includes(k)).slice(0, 8);

  return {
    overall: clamp100(overall),
    skillMatch: clamp100(skillMatch),
    experienceMatch: clamp100(experienceMatch),
    educationMatch: clamp100(educationMatch),
    keywordMatch: clamp100(keywordMatch),
    industryMatch: clamp100(industryMatch),
    responsibilityMatch: clamp100(responsibilityMatch),
    missingSkills,
    missingKeywords,
    matchedSkills,
  };
}

// ─── Quick Wins Generator ──────────────────────────────────────────────────────

function generateQuickWins(analysis, hasJD) {
  const wins = [];

  if (!extractEmails(analysis._raw).length) wins.push('Add your email address to the contact section');
  if (!hasSection(analysis._raw, 'summary')) wins.push('Add a 3-line professional summary at the top');
  if (!hasMetrics(analysis._raw)) wins.push('Add at least 2 quantified achievements (%, $, users, time saved)');
  if (analysis.structure.issues.includes('No LinkedIn URL found') || !(/linkedin/i.test(analysis._raw))) wins.push('Add your LinkedIn profile URL');
  if (!(/github/i.test(analysis._raw))) wins.push('Add your GitHub profile URL');
  if (analysis.techSkills.existing.length < 8) wins.push(`Add more technical skills (missing: ${analysis.techSkills.missing.slice(0, 3).join(', ')})`);
  if (FILLER_PHRASES.some(p => analysis._raw.toLowerCase().includes(p))) wins.push('Replace "responsible for" / "worked on" with action verbs like "Developed", "Engineered", "Led"');
  if (!hasSection(analysis._raw, 'projects')) wins.push('Add 2-3 projects with tech stack, GitHub links, and impact');
  if (!hasSection(analysis._raw, 'certifications')) wins.push('Add a Certifications section (AWS, Google Cloud, Scrum, etc.)');
  if (analysis.readability.wordCount < 200) wins.push('Expand your resume content — aim for 400–600 words');
  if (hasJD) wins.push('Add job-description-specific keywords to increase ATS match score');
  wins.push('Use consistent formatting: same font, bullet style, and date format throughout');

  return wins.slice(0, 10);
}

// ─── Summary Rewrite ───────────────────────────────────────────────────────────

function rewriteSummary(text, jobTitle = '') {
  const lines = extractLines(text);
  const techSkills = TECH_SKILLS_DB.filter(s => text.toLowerCase().includes(s)).slice(0, 4);
  const yearsMatch = text.match(/(\d+)\+?\s*years?/i);
  const years = yearsMatch ? yearsMatch[1] : 'several';
  const roleHint = jobTitle || lines.find(l => /(engineer|developer|manager|analyst|lead|architect)/i.test(l) && l.length < 80) || 'Software Professional';

  return `Results-driven ${roleHint} with ${years}+ years of experience building scalable, production-grade systems. Proven expertise in ${techSkills.slice(0, 3).join(', ') || 'modern technologies'} with a track record of delivering impactful solutions and measurable results. Strong collaborator with a passion for clean code, continuous learning, and driving engineering excellence. Seeking opportunities to leverage technical depth and leadership skills to solve real-world challenges.`;
}

// ─── Recruiter Perspective ─────────────────────────────────────────────────────

function recruiterPerspective(overallScore, atsScore, analysis) {
  const confidence = Math.round((overallScore + atsScore) / 2);
  const wouldShortlist = overallScore >= 60;

  let reason = '';
  if (overallScore >= 80) reason = 'Strong resume with clear experience, quantified achievements, and good keyword coverage. Would prioritize for screening.';
  else if (overallScore >= 65) reason = 'Decent resume with solid experience. Missing some elements (metrics, keywords) that would make it stand out. Would consider for screening.';
  else if (overallScore >= 50) reason = 'Average resume. Lacks quantified achievements and keyword optimization. Would review only if candidate pool is thin.';
  else reason = 'Below-average resume. Missing critical sections, metrics, and keywords. Needs significant improvement before submission.';

  const concerns = [];
  if (!hasMetrics(analysis._raw)) concerns.push('No quantified achievements');
  if (analysis.techSkills.existing.length < 5) concerns.push('Limited technical skill coverage');
  if (!hasSection(analysis._raw, 'summary')) concerns.push('No professional summary');
  if (!(/linkedin/i.test(analysis._raw))) concerns.push('No LinkedIn profile');

  return { wouldShortlist, confidence: clamp100(confidence), reason, concerns };
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export function reviewResume(resumeText = '', jobTitle = '', jdText = '') {
  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error('Resume text is too short to analyze. Please provide more content.');
  }

  const text = resumeText;

  // Score all categories
  const structure = scoreStructure(text);
  const atsResult = scoreATS(text);
  const summaryResult = scoreSummary(text);
  const experienceResult = scoreExperience(text);
  const achievements = scoreAchievements(text);
  const techSkills = scoreTechSkills(text);
  const softSkills = scoreSoftSkills(text);
  const education = scoreEducation(text);
  const certifications = scoreCertifications(text);
  const projects = scoreProjects(text);
  const keywords = scoreKeywords(text, jdText);
  const readability = scoreReadability(text);
  const branding = scoreBranding(text);
  const recruiterAppeal = scoreRecruiterAppeal(text);

  // Store raw for helpers
  const _analysis = { _raw: text, structure, techSkills, readability };

  // Compute aggregate scores
  const categoryScores = {
    structure: Math.round(structure.score * 10),
    ats: Math.round(atsResult.score * 10),
    summary: Math.round(summaryResult.score * 10),
    experience: Math.round(experienceResult.score * 10),
    achievements: Math.round(achievements.score * 10),
    technicalSkills: Math.round(techSkills.score * 10),
    softSkills: Math.round(softSkills.score * 10),
    education: Math.round(education.score * 10),
    certifications: Math.round(certifications.score * 10),
    projects: Math.round(projects.score * 10),
    keywords: Math.round(keywords.score * 10),
    readability: Math.round(readability.score * 10),
    branding: Math.round(branding.score * 10),
    recruiterAppeal: Math.round(recruiterAppeal.score * 10),
  };

  const allScores = Object.values(categoryScores);
  const overallScore = clamp100(Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length));
  const atsScore = clamp100(Math.round((categoryScores.ats + categoryScores.keywords + categoryScores.structure) / 3));
  const recruiterScore = clamp100(Math.round((categoryScores.recruiterAppeal + categoryScores.branding + categoryScores.achievements + categoryScores.experience) / 4));

  // Job match
  const jobMatch = analyzeJobMatch(text, jdText, jobTitle);

  // Strengths
  const strengths = [];
  if (experienceResult.score >= 7) strengths.push('Strong work experience section with clear roles and responsibilities');
  if (achievements.score >= 6) strengths.push('Good use of quantified achievements demonstrating measurable impact');
  if (techSkills.existing.length >= 10) strengths.push(`Broad technical skill coverage: ${techSkills.existing.slice(0, 5).join(', ')}`);
  if (certifications.found?.length >= 1) strengths.push(`Industry certifications add credibility: ${certifications.found.join(', ')}`);
  if (hasSection(text, 'projects')) strengths.push('Projects section demonstrates practical application of skills');
  if (/github\.com/i.test(text)) strengths.push('GitHub profile link boosts credibility for technical roles');
  if (softSkills.found?.length >= 3) strengths.push('Soft skills like leadership and collaboration are well represented');
  if (readability.score >= 7) strengths.push('Clear, readable format with good use of bullet points');

  // Weaknesses
  const weaknesses = [
    ...structure.issues,
    ...(!hasMetrics(text) ? ['No quantified achievements — all experience bullets lack measurable outcomes'] : []),
    ...(!(/linkedin/i.test(text)) ? ['LinkedIn profile URL missing'] : []),
    ...(!(/github/i.test(text)) ? ['GitHub profile URL missing'] : []),
    ...achievements.recs.slice(0, 2),
  ].slice(0, 8);

  // Missing sections
  const missingSections = [];
  if (!hasSection(text, 'summary')) missingSections.push('Professional Summary');
  if (!hasSection(text, 'projects')) missingSections.push('Projects');
  if (!hasSection(text, 'certifications')) missingSections.push('Certifications');
  if (extractEmails(text).length === 0) missingSections.push('Contact Information');
  if (!hasSection(text, 'achievements')) missingSections.push('Achievements/Awards');

  // Experience analysis per role
  const expBlocks = experienceResult.expBlocks || [];
  const experienceAnalysis = expBlocks.map(block => {
    const hasActionVerb = ACTION_VERBS.some(v => block.title.toLowerCase().includes(v) || (block.bullets || []).some(b => b.toLowerCase().includes(v)));
    const hasMetric = (block.bullets || []).some(b => hasMetrics(b));
    const roleScore = clamp100(
      50 +
      (hasActionVerb ? 15 : 0) +
      (hasMetric ? 20 : 0) +
      ((block.bullets?.length || 0) >= 3 ? 15 : 0)
    );
    const recs = [];
    if (!hasMetric) recs.push('Add quantified metrics (%, $, users, improvement) to this role');
    if (!hasActionVerb) recs.push('Start each bullet with a strong action verb');
    if (!block.bullets?.length) recs.push('Add 3–5 bullet points describing your key responsibilities and achievements');
    return { role: block.title.slice(0, 80), score: roleScore, recommendations: recs };
  });

  // Projects analysis
  const projectsAnalysis = (projects.projects || []).map((p, i) => ({
    name: `Project ${i + 1}`,
    description: p.slice(0, 100),
    score: 60 + (TECH_SKILLS_DB.some(s => p.toLowerCase().includes(s)) ? 20 : 0),
    recommendations: [
      'Add GitHub/live demo link',
      'Mention tech stack used',
      'Quantify impact (users, performance, stars)',
    ],
  }));

  // Education
  const educationAnalysis = [{
    degree: 'Detected from resume',
    score: education.score * 10,
    recommendations: education.recs,
  }];

  // Cert recommendations
  const certRecs = [
    'AWS Certified Developer Associate — Highly valued for backend/cloud roles',
    'Google Cloud Professional Developer — Great for GCP-focused teams',
    'Certified Kubernetes Administrator (CKA) — Essential for DevOps roles',
    'Scrum Master Certification — Valuable for lead/management positions',
    'MongoDB Associate Developer Certification — Useful for Node.js/MERN roles',
  ];

  // Quick wins & priority plan
  const quickWins = generateQuickWins(_analysis, !!jdText);
  const allRecs = [
    ...structure.recs, ...atsResult.recs, ...summaryResult.recs,
    ...experienceResult.recs, ...achievements.recs, ...techSkills.recs,
    ...branding.recs, ...projects.recs, ...certifications.recs,
  ];
  const priorityPlan = {
    high: allRecs.filter(r => r.includes('summary') || r.includes('metric') || r.includes('action verb') || r.includes('keyword') || r.includes('email')).slice(0, 4),
    medium: allRecs.filter(r => r.includes('LinkedIn') || r.includes('GitHub') || r.includes('project') || r.includes('certif')).slice(0, 4),
    low: allRecs.filter(r => r.includes('font') || r.includes('format') || r.includes('post') || r.includes('update') || r.includes('power word')).slice(0, 3),
  };

  const recruiter = recruiterPerspective(overallScore, atsScore, _analysis);
  const grade = getGrade(overallScore);

  const summary = `This resume scores ${overallScore}/100 with a grade of ${grade}. ${recruiter.reason} ${overallScore >= 70 ? 'The profile shows good technical depth' : 'Key improvements needed include adding metrics, a professional summary, and optimizing keywords'}. ATS compatibility score is ${atsScore}/100 — ${atsScore >= 70 ? 'good for automated screening' : 'may be filtered before reaching a recruiter'}.`;

  return {
    overallScore,
    atsScore,
    recruiterScore,
    jobMatchScore: jobMatch?.overall ?? null,
    grade,
    summary,
    categoryScores,
    strengths: strengths.slice(0, 6),
    weaknesses: weaknesses.slice(0, 6),
    missingSections,
    atsAnalysis: {
      issues: atsResult.issues,
      recommendations: atsResult.recs,
    },
    keywordAnalysis: {
      coveragePercentage: keywords.coverage,
      existingKeywords: keywords.existing.slice(0, 20),
      missingKeywords: keywords.missing,
      recommendedKeywords: TECH_SKILLS_DB.slice(0, 12),
    },
    experienceAnalysis: experienceAnalysis.slice(0, 5),
    summaryRewrite: rewriteSummary(text, jobTitle),
    skillsAnalysis: {
      existing: techSkills.existing,
      missing: techSkills.missing,
      recommended: TECH_SKILLS_DB.filter(s => !techSkills.existing.includes(s)).slice(0, 10),
    },
    projectsAnalysis,
    educationAnalysis,
    certificationRecommendations: certRecs,
    jobMatchAnalysis: jobMatch ? {
      skillMatch: jobMatch.skillMatch,
      experienceMatch: jobMatch.experienceMatch,
      educationMatch: jobMatch.educationMatch,
      keywordMatch: jobMatch.keywordMatch,
      industryMatch: jobMatch.industryMatch,
      responsibilityMatch: jobMatch.responsibilityMatch,
      missingSkills: jobMatch.missingSkills,
      missingKeywords: jobMatch.missingKeywords,
      matchedSkills: jobMatch.matchedSkills,
    } : null,
    quickWins,
    priorityPlan,
    recruiterPerspective: {
      wouldShortlist: recruiter.wouldShortlist,
      confidence: recruiter.confidence,
      reason: recruiter.reason,
      concerns: recruiter.concerns,
    },
    finalRecommendation: overallScore >= 80
      ? 'This resume is strong. Focus on tailoring it to each specific job description by adding relevant keywords from the JD.'
      : overallScore >= 60
      ? 'Good foundation. Add quantified achievements, optimize keywords, and complete missing sections to significantly boost your score.'
      : 'This resume needs significant improvement. Start with adding a professional summary, quantifying achievements, and building a complete skills section.',
  };
}
