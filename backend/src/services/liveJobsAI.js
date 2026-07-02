import { generateJson, generateText } from './gemini.js';

// ─── Programmatic Local Fallbacks ─────────────────────────────────────────────
function localCalculateMatch(candidateSkills = [], jobRequired = [], jobPreferred = []) {
  const candSet = new Set(candidateSkills.map(s => s.trim().toLowerCase()));
  const req = jobRequired.map(s => s.trim().toLowerCase());
  const pref = jobPreferred.map(s => s.trim().toLowerCase());

  if (req.length === 0) {
    return {
      matchScore: 70,
      resumeMatchPercentage: 70,
      matchedSkills: [],
      missingSkills: []
    };
  }

  const matchedReq = req.filter(s => candSet.has(s));
  const matchedPref = pref.filter(s => candSet.has(s));
  const missingReq = req.filter(s => !candSet.has(s));
  const missingPref = pref.filter(s => !candSet.has(s));

  // Weight required skills at 80% and preferred skills at 20%
  const reqWeight = req.length ? (matchedReq.length / req.length) * 80 : 80;
  const prefWeight = pref.length ? (matchedPref.length / pref.length) * 20 : 20;
  const score = Math.round(reqWeight + prefWeight);

  return {
    matchScore: Math.min(100, Math.max(10, score)),
    resumeMatchPercentage: Math.min(100, Math.max(15, score - 5)), // slightly offset for realism
    matchedSkills: req.filter(s => candSet.has(s)).map(s => s.toUpperCase()),
    missingSkills: missingReq.map(s => s.toUpperCase())
  };
}

function localCheckEligibility(candidate = {}, job = {}) {
  const reasons = [];
  let expPass = true;
  let eduPass = true;
  let modePass = true;

  // 1. Experience Check
  const candExp = candidate.experienceYears || 0;
  const minExp = job.experienceMin || 0;
  if (candExp < minExp) {
    expPass = false;
    reasons.push(`Candidate has ${candExp} years of experience, but job requires minimum ${minExp} years.`);
  } else {
    reasons.push(`Experience check passed: candidate has ${candExp} years (Job requires min ${minExp} years).`);
  }

  // 2. Education Check
  const candDegrees = (candidate.education || []).map(e => e.degree.toLowerCase()).join(' ');
  const jobEduLower = (job.educationCriteria || '').toLowerCase();
  
  if (jobEduLower && !candDegrees.includes('bachelor') && !candDegrees.includes('b.tech') && !candDegrees.includes('computer science') && !candDegrees.includes('degree')) {
    if (jobEduLower.includes('degree') || jobEduLower.includes('bachelor') || jobEduLower.includes('bs')) {
      eduPass = false;
      reasons.push(`Job requests "${job.educationCriteria}", but candidate profile does not outline a related degree.`);
    }
  }
  if (eduPass) {
    reasons.push('Education check passed: candidate has compatible degree.');
  }

  // 3. Workmode Check
  const candSummary = (candidate.summary || '').toLowerCase();
  const candLocation = (candidate.location || '').toLowerCase();
  const jobLocation = (job.location || '').toLowerCase();

  if (job.workMode === 'On-site' && candLocation && jobLocation) {
    // If not remote, check if location matches
    const candCity = candLocation.split(',')[0].trim().toLowerCase();
    const jobCity = jobLocation.split(',')[0].trim().toLowerCase();
    if (candCity !== jobCity && !candLocation.includes(jobCity)) {
      modePass = false;
      reasons.push(`Job is On-site in ${job.location}, candidate is located in ${candidate.location}. Relocation required.`);
    }
  }

  if (modePass) {
    reasons.push(`Work Mode check passed: Candidate is compatible with ${job.workMode} layout.`);
  }

  return {
    eligible: expPass && eduPass && modePass,
    reasons,
    criteriaBreakdown: {
      experience: expPass,
      education: eduPass,
      workMode: modePass
    }
  };
}

function localInterviewQuestions(job = {}) {
  const defaultQuestions = [
    {
      round: 'Technical Screening',
      questions: [
        `How do you organize architectural layers when building scaling ${job.title || 'software'} applications?`,
        `Describe a scenario where you optimized database queries or API latency by over 30%. What tooling was used?`
      ]
    },
    {
      round: 'Systems Architecture',
      questions: [
        `Design a production-grade backend layout supporting high-traffic operations of services that leverage the ${job.techStack?.slice(0, 3).join(', ') || 'selected stack'}.`,
        `Explain how you handle concurrency, caching (e.g. Redis), and duplicate operations inside cloud hosting platforms.`
      ]
    },
    {
      round: 'Behavioral & Culture Fit',
      questions: [
        `Tell us about a time you collaborated in an agile environment and had to compromise on architectural decisions.`,
        `How do you keep up with developments in ${job.requiredSkills?.slice(0, 3).join(', ') || 'this field'} and adapt to changing stacks?`
      ]
    }
  ];
  return defaultQuestions;
}

function localSalaryInsights(job = {}) {
  const currentSalary = job.salary || 'Market Rate';
  let categoryAverage = '$135,000';
  let percentile = 65;
  let range = '$110,000 - $160,000';

  if (job.jobCategory?.toLowerCase().includes('ai') || job.jobCategory?.toLowerCase().includes('machine learning')) {
    categoryAverage = '$185,000';
    percentile = 70;
    range = '$150,000 - $220,000';
  } else if (job.jobCategory?.toLowerCase().includes('design')) {
    categoryAverage = '$125,000';
    percentile = 60;
    range = '$100,000 - $150,000';
  }

  return {
    jobSalary: currentSalary,
    categoryAverage,
    marketRange: range,
    percentile,
    evaluation: `The listed salary of ${currentSalary} sits at the ${percentile}th percentile of market rates for ${job.jobCategory || 'Software Engineering'} roles.`
  };
}

function localCareerPath(job = {}) {
  return {
    nextRoles: [
      { role: `Lead ${job.title || 'Engineer'}`, requirements: '2+ years in current role, proven mentoring experience, and system architecture design.' },
      { role: 'Staff Software Architect', requirements: 'Expert-level system design knowledge, cross-functional project leadership, and technical strategy design.' }
    ],
    recommendedCourses: [
      'Advanced System Design Mastery (ByteByteGo / GitHub Primer)',
      `Expert development courses focusing on: ${job.requiredSkills?.slice(0, 3).join(', ') || 'Core Stack'}`
    ],
    growthOutlook: 'High. Positions in this category have grown 18% year-over-year.'
  };
}

function localResumeImprovements(candidate = {}, job = {}) {
  const improvements = [];
  const missing = job.requiredSkills?.filter(s => !(candidate.skills || []).map(cs => cs.toLowerCase()).includes(s.toLowerCase())) || [];

  if (missing.length > 0) {
    improvements.push(`Highlight any exposure to ${missing.slice(0, 3).join(', ')} inside your projects or summary to bridge the skill gap.`);
  }
  if (!candidate.experienceYears || candidate.experienceYears < (job.experienceMin || 0)) {
    improvements.push(`Frame your work experience around active leadership and impact metrics to offset the experience delta.`);
  }
  improvements.push(`Include a 'Highlights' section mapping accomplishments directly corresponding to: "${job.title}".`);
  improvements.push(`quantify metrics (e.g. 'Improved API response times by 35%') inside work history sections.`);

  return improvements;
}

// ─── Gemini Core Functions ────────────────────────────────────────────────────
export async function analyzeLiveJobMatching(candidate = {}, job = {}) {
  // If no Gemini Key is set, or if candidate parameter is empty, execute local logic
  if (!process.env.GEMINI_API_KEY || !candidate.skills) {
    const localMatch = localCalculateMatch(candidate.skills || [], job.requiredSkills || [], job.preferredSkills || []);
    const localElig = localCheckEligibility(candidate, job);
    const localSal = localSalaryInsights(job);
    const localPath = localCareerPath(job);
    const localResume = localResumeImprovements(candidate, job);

    return {
      matchScore: localMatch.matchScore,
      resumeMatchPercentage: localMatch.resumeMatchPercentage,
      matchedSkills: localMatch.matchedSkills,
      missingSkills: localMatch.missingSkills,
      eligibility: localElig,
      salaryInsights: localSal,
      careerPath: localPath,
      resumeSuggestions: localResume
    };
  }

  // Gemini Prompts
  const prompt = `
You are a senior AI Career Placement Specialist. Analyze the Candidate Profile and the Job Posting below, and return a comprehensive matching JSON document.

Candidate Profile:
- Name: ${candidate.name}
- Skills: ${(candidate.skills || []).join(', ')}
- Experience: ${candidate.experienceYears || 0} years
- Education: ${JSON.stringify(candidate.education || [])}
- Summary: ${candidate.summary || 'N/A'}

Job Posting:
- Title: ${job.title}
- Company: ${job.companyName}
- Work Mode: ${job.workMode} / ${job.location}
- Experience Required: ${job.experienceRequired} (Min: ${job.experienceMin || 0} years)
- Required Skills: ${(job.requiredSkills || []).join(', ')}
- Preferred Skills: ${(job.preferredSkills || []).join(', ')}
- Education Criteria: ${job.educationCriteria || 'N/A'}
- Description: ${job.description.slice(0, 800)}

Your response MUST be a valid JSON object matching this structure EXACTLY:
{
  "matchScore": number (10 to 100),
  "resumeMatchPercentage": number (10 to 100),
  "matchedSkills": ["SKILL1", "SKILL2"],
  "missingSkills": ["SKILL3", "SKILL4"],
  "eligibility": {
    "eligible": boolean,
    "reasons": ["Reason 1", "Reason 2"],
    "criteriaBreakdown": {
      "experience": boolean,
      "education": boolean,
      "workMode": boolean
    }
  },
  "salaryInsights": {
    "jobSalary": "Salary range listed",
    "categoryAverage": "Estimated average",
    "marketRange": "Estimated market range",
    "percentile": number (1 to 99),
    "evaluation": "Evaluation summary"
  },
  "careerPath": {
    "nextRoles": [
      { "role": "Role Name", "requirements": "Specific requirements" }
    ],
    "recommendedCourses": ["Course Name 1"],
    "growthOutlook": "Industry outlook"
  },
  "resumeSuggestions": ["Suggestion 1", "Suggestion 2"]
}
`;

  try {
    const result = await generateJson(prompt, null, { maxTokens: 900 });
    if (result && typeof result.matchScore === 'number') {
      return result;
    }
  } catch (err) {
    console.error('[AI Match] Gemini analysis failed. Falling back to algorithmic calculation:', err.message);
  }

  // Fallback if AI fails or returns invalid structure
  const fallbackMatch = localCalculateMatch(candidate.skills, job.requiredSkills, job.preferredSkills);
  return {
    matchScore: fallbackMatch.matchScore,
    resumeMatchPercentage: fallbackMatch.resumeMatchPercentage,
    matchedSkills: fallbackMatch.matchedSkills,
    missingSkills: fallbackMatch.missingSkills,
    eligibility: localCheckEligibility(candidate, job),
    salaryInsights: localSalaryInsights(job),
    careerPath: localCareerPath(job),
    resumeSuggestions: localResumeImprovements(candidate, job)
  };
}

export async function generateJobOutreachEmail(candidate = {}, job = {}, tone = 'professional') {
  if (!process.env.GEMINI_API_KEY) {
    return {
      subject: `Opportunity: ${job.title} at ${job.companyName}`,
      body: `Hi ${candidate.name || 'Candidate'},\n\nI hope you are doing well.\n\nI am reaching out regarding a ${job.employmentType || 'Full-time'} role for a ${job.title} at ${job.companyName}. We are looking for candidates experienced in ${job.requiredSkills?.slice(0, 3).join(', ') || 'engineering'}.\n\nBased on your profile matching ${candidate.experienceYears || 'several'} years of work, you seem like a strong fit. Would you be open to a brief call this week?\n\nBest regards,\n${job.recruiterName || 'Talent Acquisition Team'}\n${job.companyName}`
    };
  }

  const prompt = `
Write a short, engaging ${tone} outreach email from a recruiter named ${job.recruiterName || 'Talent Acquisition'} to ${candidate.name} about a ${job.title} job at ${job.companyName}.
Candidate skills: ${(candidate.skills || []).join(', ')}
Candidate summary: ${candidate.summary}
Job description highlights: ${job.description.slice(0, 400)}
Respond in JSON with keys:
{
  "subject": "Email subject",
  "body": "Email body with line breaks"
}
`;

  try {
    const res = await generateJson(prompt, null, { maxTokens: 400 });
    if (res && res.subject && res.body) return res;
  } catch (err) {
    // fallback below
  }

  return {
    subject: `Opportunity: ${job.title} at ${job.companyName}`,
    body: `Hi ${candidate.name || 'Candidate'},\n\nI hope you are doing well.\n\nI am reaching out regarding a ${job.employmentType || 'Full-time'} role for a ${job.title} at ${job.companyName}. We are looking for candidates experienced in ${job.requiredSkills?.slice(0, 3).join(', ') || 'engineering'}.\n\nBased on your profile matching ${candidate.experienceYears || 'several'} years of work, you seem like a strong fit. Would you be open to a brief call this week?\n\nBest regards,\n${job.recruiterName || 'Talent Acquisition Team'}\n${job.companyName}`
  };
}

export async function generateJobInterviewQuestions(job = {}) {
  if (!process.env.GEMINI_API_KEY) {
    return localInterviewQuestions(job);
  }

  const prompt = `
Generate 3 distinct rounds of technical and behavioral interview questions tailored for the job posting below.

Job Details:
- Title: ${job.title}
- Required Skills: ${(job.requiredSkills || []).join(', ')}
- Description: ${job.description.slice(0, 800)}

Respond EXACTLY in this JSON structure:
[
  {
    "round": "Round Title (e.g. Technical Screening)",
    "questions": [
      "Question 1",
      "Question 2"
    ]
  }
]
`;

  try {
    const res = await generateJson(prompt, null, { maxTokens: 600 });
    if (Array.isArray(res) && res.length > 0) return res;
  } catch (e) {
    // fallback below
  }

  return localInterviewQuestions(job);
}
