/**
 * LinkedIn Profile Analysis Engine
 * Full 15-step AI career coach analysis
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const MARKET_SKILLS = [
  'react', 'node.js', 'typescript', 'javascript', 'python', 'aws', 'docker',
  'kubernetes', 'mongodb', 'postgresql', 'redis', 'graphql', 'rest api',
  'ci/cd', 'git', 'linux', 'terraform', 'azure', 'gcp', 'machine learning',
  'ai', 'llm', 'langchain', 'fastapi', 'nestjs', 'next.js', 'vue', 'angular',
  'system design', 'microservices', 'devops', 'agile', 'scrum', 'sql',
  'data engineering', 'spark', 'kafka', 'elasticsearch', 'figma', 'tailwind',
];

const ACTION_VERBS = [
  'developed', 'built', 'engineered', 'designed', 'launched', 'led', 'managed',
  'architected', 'optimized', 'deployed', 'implemented', 'delivered', 'created',
  'improved', 'reduced', 'increased', 'scaled', 'mentored', 'collaborated',
  'automated', 'integrated', 'migrated', 'refactored', 'streamlined', 'spearheaded',
];

const INDUSTRY_KEYWORDS = [
  'full stack', 'backend', 'frontend', 'cloud', 'saas', 'b2b', 'b2c', 'startup',
  'enterprise', 'agile', 'product', 'platform', 'api', 'open source', 'remote',
  'cross-functional', 'high-traffic', 'distributed', 'real-time', 'scalable',
];

const WEIGHTS = {
  completeness: 0.20,
  headline: 0.10,
  about: 0.15,
  experience: 0.20,
  skills: 0.15,
  ats: 0.10,
  branding: 0.05,
  visibility: 0.05,
};

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseProfileText(text = '') {
  const lower = text.toLowerCase();
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  // Extract name (first non-empty line that looks like a name)
  const name = lines.find(l => /^[A-Z][a-z]+ [A-Z][a-z]+/.test(l)) || '';

  // Extract headline (line with pipe separators or role keywords)
  const headlineLine = lines.find(l =>
    /\|/.test(l) ||
    /(engineer|developer|designer|manager|analyst|scientist|consultant|architect)/i.test(l)
  ) || '';

  // Extract location
  const locationLine = lines.find(l =>
    /(india|usa|uk|remote|bangalore|mumbai|delhi|hyderabad|pune|chennai|new york|london|san francisco)/i.test(l)
  ) || '';

  // Extract about section (paragraph with 3+ sentences)
  let about = '';
  for (const line of lines) {
    if (line.length > 150 && line.split('.').length >= 2) {
      about = line;
      break;
    }
  }

  // Extract skills
  const skillsFound = MARKET_SKILLS.filter(s => lower.includes(s));

  // Count experience entries (job titles pattern)
  const experienceMatches = lines.filter(l =>
    /(engineer|developer|manager|analyst|intern|lead|director|vp|architect|consultant)/i.test(l) &&
    l.length < 80
  );

  // Count education entries
  const educationMatches = lines.filter(l =>
    /(university|college|institute|bachelor|master|mba|phd|b\.?tech|m\.?tech|b\.?e\.|bsc|msc)/i.test(l)
  );

  // Count certifications
  const certMatches = lines.filter(l =>
    /(certified|certification|certificate|aws|azure|gcp|pmp|scrum|cka|ckad)/i.test(l)
  );

  // Count recommendations
  const recMatch = lower.match(/(\d+)\s+recommendation/);
  const recommendations = recMatch ? parseInt(recMatch[1]) : 0;

  // Check for various sections
  const hasPhoto = /photo|profile\s*picture|avatar/i.test(lower);
  const hasBanner = /banner|background/i.test(lower);
  const hasProjects = /(project|built|launched|open.source|github)/i.test(lower);
  const hasCertifications = certMatches.length > 0;
  const hasRecommendations = recommendations > 0;

  // Extract keyword density
  const keywordDensity = {};
  for (const skill of MARKET_SKILLS) {
    const regex = new RegExp(skill.replace(/[.+]/g, '\\$&'), 'gi');
    const matches = (text.match(regex) || []).length;
    if (matches > 0) keywordDensity[skill] = matches;
  }

  // Extract action verb usage
  const actionVerbsUsed = ACTION_VERBS.filter(v => lower.includes(v));

  // Check for metrics/numbers in experience
  const hasMetrics = /\d+[\+%x]|\$[\d,]+|[\d,]+\s*(users|customers|revenue|leads|requests|transactions)/i.test(text);

  return {
    name,
    headline: headlineLine,
    location: locationLine,
    about,
    skills: skillsFound,
    experience: experienceMatches.slice(0, 6),
    education: educationMatches.slice(0, 3),
    certifications: certMatches.slice(0, 5),
    recommendations,
    hasPhoto,
    hasBanner,
    hasProjects,
    hasCertifications,
    hasRecommendations,
    keywordDensity,
    actionVerbsUsed,
    hasMetrics,
    rawText: text,
  };
}

// ─── Scoring Functions ────────────────────────────────────────────────────────

function scoreCompleteness(profile) {
  const checks = [
    { label: 'Photo', pass: profile.hasPhoto || profile.name.length > 0 },
    { label: 'Banner', pass: profile.hasBanner },
    { label: 'Headline', pass: profile.headline.length > 5 },
    { label: 'About', pass: profile.about.length > 50 },
    { label: 'Experience', pass: profile.experience.length > 0 },
    { label: 'Education', pass: profile.education.length > 0 },
    { label: 'Skills', pass: profile.skills.length >= 5 },
    { label: 'Projects', pass: profile.hasProjects },
    { label: 'Certifications', pass: profile.hasCertifications },
    { label: 'Recommendations', pass: profile.hasRecommendations },
  ];

  const passed = checks.filter(c => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);

  return { score, checks };
}

function scoreHeadline(profile) {
  const headline = profile.headline || '';
  let score = 30; // base
  const suggestions = [];

  if (headline.length >= 10) score += 15;
  if (headline.length >= 40) score += 10;
  if (headline.length > 120) { score -= 10; suggestions.push('Headline is too long — keep it under 120 chars.'); }

  const hasRole = /(engineer|developer|designer|manager|analyst|architect|lead)/i.test(headline);
  if (hasRole) score += 15; else suggestions.push('Add your job title/role to the headline.');

  const hasPipe = /\|/.test(headline);
  if (hasPipe) score += 10; else suggestions.push('Use | separators to list key skills (e.g. React | Node.js | AWS).');

  const keywordsInHeadline = MARKET_SKILLS.filter(s => headline.toLowerCase().includes(s));
  score += Math.min(20, keywordsInHeadline.length * 5);
  if (keywordsInHeadline.length < 3) suggestions.push('Add 3+ tech keywords to your headline for ATS visibility.');

  score = Math.min(100, Math.max(0, score));

  // AI-style headline suggestion
  const topSkills = profile.skills.slice(0, 5).map(s =>
    s.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  );
  const roleGuess = hasRole ? headline.match(/([\w\s]*(?:engineer|developer|designer|manager|analyst|architect|lead)[\w\s]*)/i)?.[0]?.trim() : 'Full Stack Developer';
  const suggestedHeadline = `${roleGuess || 'Software Engineer'} | ${topSkills.join(' | ')}${profile.hasProjects ? ' | Open Source Contributor' : ''}`;

  return { score: Math.min(100, score), suggestions, suggestedHeadline };
}

function scoreAbout(profile) {
  const about = profile.about || profile.rawText.slice(0, 500);
  let score = 20;
  const suggestions = [];

  if (about.length > 100) score += 15;
  if (about.length > 300) score += 10;
  if (about.length > 600) score += 5;

  const hasAchievements = /\d+[\+%]|achieved|delivered|built|launched|led/i.test(about);
  if (hasAchievements) score += 15; else suggestions.push('Add quantified achievements to your About section.');

  const hasKeywords = profile.skills.filter(s => about.toLowerCase().includes(s)).length >= 3;
  if (hasKeywords) score += 10; else suggestions.push('Include your top 3-5 technical skills in the About section.');

  const hasCTA = /connect|reach out|contact|open to|looking for|available/i.test(about);
  if (hasCTA) score += 10; else suggestions.push('Add a clear call-to-action at the end (e.g., "Open to new opportunities — let\'s connect!")');

  const hasStory = about.split('.').length >= 4;
  if (hasStory) score += 15; else suggestions.push('Tell your professional story in 4+ sentences for better engagement.');

  score = Math.min(100, Math.max(0, score));

  const name = profile.name || 'I';
  const skillsStr = profile.skills.slice(0, 3).join(', ') || 'full-stack development';
  const aboutRewrites = {
    professional: `${name} is a results-driven software professional with expertise in ${skillsStr}. With a strong foundation in building scalable systems, ${name.split(' ')[0] || 'I'} has consistently delivered impactful products across diverse domains. Passionate about clean code, collaborative engineering, and continuous learning. Open to exciting opportunities — let's connect!`,
    recruiterFriendly: `🚀 ${profile.skills.slice(0, 2).join(' + ')} Specialist | ${profile.experience.length}+ Roles | Proven Deliverer\n\nKey strengths:\n✅ ${skillsStr}\n✅ Fast learner with collaborative mindset\n✅ Track record of shipping production-grade systems\n\n📩 Reach out if you're hiring or want to collaborate!`,
    technical: `Engineer focused on ${skillsStr}. I build robust, production-ready systems with emphasis on performance, scalability, and maintainability. Experienced across the full software lifecycle — from architecture and development to deployment and monitoring. Let's build something great together.`,
  };

  return { score, suggestions, aboutRewrites };
}

function scoreExperience(profile) {
  let score = 20;
  const suggestions = [];

  if (profile.experience.length >= 1) score += 20;
  if (profile.experience.length >= 3) score += 15;

  if (profile.actionVerbsUsed.length >= 5) score += 15; else suggestions.push(`Use strong action verbs: ${ACTION_VERBS.slice(0, 6).join(', ')}.`);
  if (profile.hasMetrics) score += 20; else suggestions.push('Add numbers/metrics to your experience (e.g., "Improved load time by 40%").');

  score = Math.min(100, Math.max(0, score));

  // Generate enhanced bullet example
  const enhancedBullets = [
    {
      before: 'Worked on web application.',
      after: 'Engineered and deployed a React-based web platform serving 2,500+ active users, reducing load time by 38% through lazy loading and CDN optimization.',
    },
    {
      before: 'Did backend development.',
      after: 'Architected a Node.js microservices backend handling 50K+ daily API requests with 99.9% uptime, leveraging Redis caching and MongoDB Atlas.',
    },
    {
      before: 'Worked in a team.',
      after: 'Collaborated with a cross-functional team of 8 engineers in an agile sprint cycle, delivering 3 major product features on schedule and under budget.',
    },
  ];

  return { score, suggestions, enhancedBullets };
}

function scoreSkills(profile) {
  const currentSkills = profile.skills;
  const demandSkills = MARKET_SKILLS.slice(0, 20);
  const missing = demandSkills.filter(s => !currentSkills.includes(s)).slice(0, 8);
  const matched = demandSkills.filter(s => currentSkills.includes(s));

  let score = Math.min(100, Math.round((matched.length / demandSkills.length) * 100) + 20);
  const suggestions = [];

  if (currentSkills.length < 5) { score -= 20; suggestions.push('Add at least 10 skills to your profile.'); }
  if (missing.length > 5) suggestions.push(`Consider adding in-demand skills: ${missing.slice(0, 4).join(', ')}.`);

  return {
    score: Math.min(100, Math.max(0, score)),
    currentSkills,
    missingMarketSkills: missing,
    matchedMarketSkills: matched,
    suggestions,
  };
}

function scoreATS(profile) {
  let score = 30;
  const suggestions = [];

  const keywordCount = Object.keys(profile.keywordDensity).length;
  score += Math.min(30, keywordCount * 3);

  if (profile.actionVerbsUsed.length >= 3) score += 15; else suggestions.push('Use more action verbs in your experience bullets.');

  const industryHits = INDUSTRY_KEYWORDS.filter(k => profile.rawText.toLowerCase().includes(k));
  score += Math.min(25, industryHits.length * 5);
  if (industryHits.length < 3) suggestions.push('Include industry terms like: ' + INDUSTRY_KEYWORDS.slice(0, 4).join(', ') + '.');

  score = Math.min(100, Math.max(0, score));

  return { score, keywordDensity: profile.keywordDensity, suggestions, actionVerbsUsed: profile.actionVerbsUsed };
}

function scoreBranding(profile) {
  let score = 30;
  const suggestions = [];

  if (profile.hasProjects) score += 20; else suggestions.push('Add featured projects with GitHub/live links to strengthen your brand.');
  if (profile.hasCertifications) score += 15; else suggestions.push('Add relevant certifications (AWS, GCP, Scrum, etc.).');
  if (profile.hasRecommendations) score += 20; else suggestions.push('Request LinkedIn recommendations from colleagues or managers.');
  if (profile.skills.length >= 10) score += 15; else suggestions.push('Build a comprehensive skills section with 10+ skills.');

  return { score: Math.min(100, Math.max(0, score)), suggestions };
}

function scoreVisibility(profile, headlineScore, skillsScore, completenessScore) {
  const score = Math.round(
    headlineScore * 0.25 +
    skillsScore * 0.20 +
    completenessScore * 0.20 +
    (profile.hasRecommendations ? 15 : 0) +
    (profile.hasProjects ? 10 : 0) +
    (profile.actionVerbsUsed.length >= 5 ? 10 : 5)
  );

  return Math.min(100, Math.max(0, score));
}

// ─── Skill Gap Analysis ───────────────────────────────────────────────────────

function analyzeSkillGap(profile, targetRole = '') {
  const roleMap = {
    'full stack developer': ['react', 'node.js', 'mongodb', 'aws', 'docker', 'typescript', 'redis', 'graphql', 'ci/cd', 'system design'],
    'frontend developer': ['react', 'typescript', 'next.js', 'figma', 'tailwind', 'vue', 'angular', 'graphql', 'testing'],
    'backend developer': ['node.js', 'python', 'postgresql', 'redis', 'docker', 'kubernetes', 'aws', 'microservices', 'ci/cd'],
    'devops engineer': ['docker', 'kubernetes', 'aws', 'terraform', 'ci/cd', 'linux', 'git', 'monitoring', 'ansible'],
    'data engineer': ['python', 'spark', 'kafka', 'sql', 'aws', 'data engineering', 'mongodb', 'elasticsearch'],
    'ml engineer': ['python', 'machine learning', 'ai', 'tensorflow', 'docker', 'aws', 'data engineering', 'llm'],
    'software engineer': ['javascript', 'python', 'system design', 'aws', 'docker', 'sql', 'git', 'agile'],
  };

  const normalizedRole = targetRole.toLowerCase().trim();
  const requiredSkills = Object.entries(roleMap).find(([role]) => normalizedRole.includes(role))?.[1]
    || roleMap['software engineer'];

  const currentSkills = profile.skills;
  const missing = requiredSkills.filter(s => !currentSkills.includes(s.toLowerCase()));
  const matched = requiredSkills.filter(s => currentSkills.includes(s.toLowerCase()));
  const readiness = Math.round((matched.length / requiredSkills.length) * 100);

  return {
    targetRole: targetRole || 'Software Engineer',
    requiredSkills,
    currentSkills,
    missingSkills: missing,
    matchedSkills: matched,
    readinessScore: readiness,
    learningPath: missing.slice(0, 4).map(skill => ({
      skill,
      resources: getResourcesForSkill(skill),
    })),
  };
}

function getResourcesForSkill(skill) {
  const resources = {
    'docker': ['Docker Official Docs', 'Docker for Beginners (freeCodeCamp)', 'Play with Docker'],
    'kubernetes': ['Kubernetes.io Docs', 'CKA Course (KodeKloud)', 'Kubernetes in Action (book)'],
    'aws': ['AWS Free Tier', 'AWS Skill Builder', 'Cloud Practitioner Cert'],
    'ci/cd': ['GitHub Actions Docs', 'GitLab CI Tutorial', 'Jenkins Pipeline'],
    'redis': ['Redis University (free)', 'Redis Docs', 'Redis with Node.js tutorial'],
    'graphql': ['GraphQL.org', 'Apollo Client Docs', 'The Road to GraphQL (book)'],
    'typescript': ['TypeScript Handbook', 'Execute Program (TS)', 'Matt Pocock TS tutorials'],
    'system design': ['System Design Primer (GitHub)', 'Grokking System Design', 'ByteByteGo'],
    'machine learning': ['fast.ai', 'Andrew Ng ML Course (Coursera)', 'Kaggle Learn'],
  };
  return resources[skill] || [`Search "${skill} tutorial" on YouTube`, `${skill} official documentation`, `freeCodeCamp ${skill} course`];
}

// ─── Keyword Density ──────────────────────────────────────────────────────────

function analyzeKeywordDensity(profile) {
  const density = profile.keywordDensity;
  const suggestions = [];

  const highPriority = ['ai', 'machine learning', 'aws', 'docker', 'typescript']
    .filter(k => !density[k] || density[k] < 2);

  if (highPriority.length > 0) {
    suggestions.push(`Mention these high-demand keywords at least twice: ${highPriority.join(', ')}.`);
  }

  const topKeywords = Object.entries(density)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  const missingHighValue = MARKET_SKILLS
    .filter(s => !density[s])
    .slice(0, 6);

  return { topKeywords, missingHighValue, suggestions };
}

// ─── Content Suggestions ──────────────────────────────────────────────────────

function generateContentSuggestions(profile) {
  const skills = profile.skills.slice(0, 2).join(' and ') || 'software development';
  const role = profile.experience[0] || 'Software Engineer';

  return {
    weeklyPosts: [
      `🔥 Just shipped a new feature using ${skills}! Here's what I learned about performance optimization... #${profile.skills[0]?.replace(/\s/g, '') || 'dev'} #softwareengineering`,
      `💡 3 things I wish I knew before starting my ${role} journey:\n1. Read the docs first\n2. Build in public\n3. Network actively\n\n#career #developer`,
      `🚀 Open to new opportunities! I specialize in ${skills}. DM me or check the link in my bio. #hiring #tech #opentowork`,
    ],
    connectionMessage: `Hi [Name], I came across your profile and noticed we both work in ${skills}. I'd love to connect and learn from your experience at [Company]. Looking forward to being in your network!`,
    networkingMessage: `Hi [Name], I attended your talk on [Topic] and found it incredibly insightful, especially the part about [specific point]. I'm currently building [Project] and would love to share ideas. Would you be open to a quick 15-minute call?`,
    featuredSection: [
      '📌 Pin your best GitHub project with a live demo link',
      '📌 Add a portfolio website or personal blog',
      '📌 Pin an article you wrote about a technical challenge',
      '📌 Add your best hackathon project',
    ],
  };
}

// ─── Optimization Plan ────────────────────────────────────────────────────────

function generateOptimizationPlan(scores) {
  const high = [];
  const medium = [];
  const low = [];

  if (scores.headline < 60) high.push('Rewrite headline with role + 3-5 tech keywords separated by |');
  if (scores.about < 60) high.push('Expand About section with achievements, keywords, and a clear CTA');
  if (scores.skills.score < 60) high.push(`Add missing in-demand skills: ${scores.skills.missingMarketSkills.slice(0, 3).join(', ')}`);
  if (!scores.completeness.checks.find(c => c.label === 'Photo')?.pass) high.push('Add a professional profile photo');
  if (scores.ats < 70) high.push('Optimize experience bullets with action verbs + quantified metrics');

  if (scores.completeness.score < 80) medium.push('Complete all profile sections to 100% completeness');
  if (!scores.completeness.checks.find(c => c.label === 'Certifications')?.pass) medium.push('Add 1-2 relevant certifications (AWS, Scrum, etc.)');
  if (!scores.completeness.checks.find(c => c.label === 'Recommendations')?.pass) medium.push('Request 2+ recommendations from colleagues or managers');
  if (!scores.completeness.checks.find(c => c.label === 'Projects')?.pass) medium.push('Add featured projects with GitHub and live demo links');

  low.push('Publish one technical LinkedIn post per week');
  if (!scores.completeness.checks.find(c => c.label === 'Banner')?.pass) low.push('Add a custom profile banner (use Canva — free)');
  low.push('Update your profile every month with new achievements');
  low.push('Engage with posts in your niche to boost algorithmic visibility');

  return { high, medium, low };
}

// ─── Final Score ──────────────────────────────────────────────────────────────

function getFinalRating(score) {
  if (score >= 90) return { stars: 5, label: 'Excellent', color: '#22c55e' };
  if (score >= 75) return { stars: 4, label: 'Good', color: '#84cc16' };
  if (score >= 60) return { stars: 3, label: 'Average', color: '#eab308' };
  if (score >= 40) return { stars: 2, label: 'Needs Work', color: '#f97316' };
  return { stars: 1, label: 'Poor', color: '#ef4444' };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function analyzeLinkedInProfileFull(profileUrl = '', profileText = '', targetRole = '') {
  const textToAnalyze = profileText || `LinkedIn Profile URL: ${profileUrl}`;
  const profile = parseProfileText(textToAnalyze);

  const completeness = scoreCompleteness(profile);
  const headlineResult = scoreHeadline(profile);
  const aboutResult = scoreAbout(profile);
  const experienceResult = scoreExperience(profile);
  const skillsResult = scoreSkills(profile);
  const atsResult = scoreATS(profile);
  const brandingResult = scoreBranding(profile);
  const visibilityScore = scoreVisibility(profile, headlineResult.score, skillsResult.score, completeness.score);
  const skillGap = analyzeSkillGap(profile, targetRole);
  const keywordAnalysis = analyzeKeywordDensity(profile);
  const contentSuggestions = generateContentSuggestions(profile);

  const scores = {
    completeness,
    headline: headlineResult.score,
    about: aboutResult.score,
    experience: experienceResult.score,
    skills: skillsResult,
    ats: atsResult.score,
    branding: brandingResult.score,
    visibility: visibilityScore,
  };

  const overall = Math.round(
    completeness.score * WEIGHTS.completeness +
    headlineResult.score * WEIGHTS.headline +
    aboutResult.score * WEIGHTS.about +
    experienceResult.score * WEIGHTS.experience +
    skillsResult.score * WEIGHTS.skills +
    atsResult.score * WEIGHTS.ats +
    brandingResult.score * WEIGHTS.branding +
    visibilityScore * WEIGHTS.visibility
  );

  const rating = getFinalRating(overall);
  const optimizationPlan = generateOptimizationPlan(scores);

  return {
    overall,
    rating,
    profileUrl,
    parsedProfile: {
      name: profile.name,
      headline: profile.headline,
      location: profile.location,
      skillsFound: profile.skills,
      experienceCount: profile.experience.length,
      educationCount: profile.education.length,
      certCount: profile.certifications.length,
      recommendations: profile.recommendations,
    },
    scores: {
      completeness: { score: completeness.score, checks: completeness.checks },
      headline: { score: headlineResult.score, suggestions: headlineResult.suggestions, suggestedHeadline: headlineResult.suggestedHeadline },
      about: { score: aboutResult.score, suggestions: aboutResult.suggestions, rewrites: aboutResult.aboutRewrites },
      experience: { score: experienceResult.score, suggestions: experienceResult.suggestions, enhancedBullets: experienceResult.enhancedBullets },
      skills: { score: skillsResult.score, current: skillsResult.currentSkills, missing: skillsResult.missingMarketSkills, matched: skillsResult.matchedMarketSkills, suggestions: skillsResult.suggestions },
      ats: { score: atsResult.score, keywordDensity: atsResult.keywordDensity, suggestions: atsResult.suggestions, actionVerbs: atsResult.actionVerbsUsed },
      branding: { score: brandingResult.score, suggestions: brandingResult.suggestions },
      visibility: { score: visibilityScore },
    },
    skillGap,
    keywordAnalysis,
    contentSuggestions,
    optimizationPlan,
  };
}

// ─── LinkedIn Profile Extractor ───────────────────────────────────────────────
// Extracts username from URL and builds a realistic demo profile for hackathon.
// Real scraping requires Apify/LinkedIn API (blocked by ToS without permission).

function usernameFromUrl(url = '') {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match ? match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'LinkedIn User';
}

// Seed-based deterministic number so same URL always gives same results
function seededRand(seed, min, max) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const r = Math.abs(h) / 2147483647;
  return Math.floor(r * (max - min + 1)) + min;
}

const DEMO_ROLES = [
  'Full Stack Developer', 'Software Engineer', 'Backend Developer',
  'Frontend Developer', 'DevOps Engineer', 'Data Engineer', 'ML Engineer',
];
const DEMO_COMPANIES = ['TechCorp', 'StartupXYZ', 'InnovateLabs', 'CodeWorks', 'DevHouse', 'CloudBridge', 'DataFlow'];
const DEMO_LOCATIONS = ['Bangalore, India', 'Mumbai, India', 'Delhi, India', 'Hyderabad, India', 'Pune, India', 'Remote'];
const DEMO_SKILL_SETS = [
  ['React', 'Node.js', 'MongoDB', 'JavaScript', 'TypeScript', 'AWS', 'Docker', 'Git', 'REST API', 'Express', 'GraphQL', 'Redis'],
  ['Python', 'FastAPI', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'Redis', 'CI/CD', 'Linux', 'TensorFlow', 'Kafka'],
  ['Vue.js', 'NestJS', 'MySQL', 'TypeScript', 'Azure', 'Docker', 'Git', 'Figma', 'Tailwind', 'GraphQL', 'REST API'],
  ['React', 'Next.js', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Terraform', 'Docker', 'Kubernetes', 'CI/CD', 'Redis'],
];
const DEMO_CERTS = [
  ['AWS Certified Developer Associate', 'Google Cloud Professional Developer'],
  ['Microsoft Azure Fundamentals', 'Kubernetes Administrator (CKA)'],
  ['AWS Solutions Architect', 'Scrum Master Certified'],
  ['Google Cloud Associate Engineer', 'Docker Certified Associate'],
];

export function extractLinkedInProfile(profileUrl = '') {
  const seed = profileUrl.toLowerCase();
  const name = usernameFromUrl(profileUrl);
  const roleIdx = seededRand(seed + 'role', 0, DEMO_ROLES.length - 1);
  const role = DEMO_ROLES[roleIdx];
  const locIdx = seededRand(seed + 'loc', 0, DEMO_LOCATIONS.length - 1);
  const location = DEMO_LOCATIONS[locIdx];
  const skillSetIdx = seededRand(seed + 'skills', 0, DEMO_SKILL_SETS.length - 1);
  const skills = DEMO_SKILL_SETS[skillSetIdx];
  const certIdx = seededRand(seed + 'cert', 0, DEMO_CERTS.length - 1);
  const certs = DEMO_CERTS[certIdx];
  const company1 = DEMO_COMPANIES[seededRand(seed + 'c1', 0, DEMO_COMPANIES.length - 1)];
  const company2 = DEMO_COMPANIES[seededRand(seed + 'c2', 0, DEMO_COMPANIES.length - 1)];
  const expYears = seededRand(seed + 'yrs', 2, 8);
  const users = seededRand(seed + 'users', 800, 8000);
  const perf = seededRand(seed + 'perf', 25, 55);
  const teamSize = seededRand(seed + 'team', 3, 12);

  const topSkills = skills.slice(0, 5).join(' | ');
  const headline = `${role} | ${topSkills}`;
  const aboutText = `${name} is a results-driven ${role.toLowerCase()} with ${expYears}+ years of experience building scalable, production-grade applications. Has successfully led cross-functional teams and delivered systems used by ${users.toLocaleString()}+ users. Achieved a ${perf}% improvement in performance through systematic optimization. Passionate about clean code, cloud-native architectures, and continuous learning. Open to exciting opportunities — let's connect!`;
  const currentYear = new Date().getFullYear();

  const profileText = [
    name,
    headline,
    location,
    '',
    aboutText,
    '',
    'Experience',
    `Senior ${role} at ${company1} (${currentYear - 3}-Present)`,
    `Developed and deployed production applications serving ${users.toLocaleString()}+ active users`,
    `Architected microservices handling 50K+ daily requests with 99.9% uptime`,
    `Led a team of ${teamSize} engineers in agile sprint cycles`,
    `Reduced API response time by ${perf}% through caching and optimization`,
    '',
    `${role} at ${company2} (${currentYear - expYears}-${currentYear - 3})`,
    `Built REST APIs and frontend interfaces from scratch`,
    `Implemented CI/CD pipelines reducing deployment time by 60%`,
    `Collaborated with product and design teams to deliver features on time`,
    '',
    'Education',
    'Bachelor of Technology - Computer Science',
    `National Institute of Technology, ${currentYear - expYears - 4}`,
    '',
    'Skills',
    skills.join(', '),
    '',
    'Certifications',
    ...certs,
    '',
    '3 recommendations',
  ].join('\n');

  return {
    extractedText: profileText,
    preview: {
      name,
      headline,
      location,
      role,
      skills,
      experience: [
        { title: `Senior ${role}`, company: company1, duration: `${currentYear - 3}–Present` },
        { title: role, company: company2, duration: `${currentYear - expYears}–${currentYear - 3}` },
      ],
      education: [{ degree: 'B.Tech Computer Science', institution: `National Institute of Technology` }],
      certifications: certs,
      about: aboutText,
    },
  };
}
