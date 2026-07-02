import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await api.post('/auth/refresh-token', { refreshToken });
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        processQueue(null, data.token);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export interface Candidate {
  _id: string;
  name: string;
  email?: string;
  skills: string[];
  experienceYears?: number;
  language?: string;
  fraudScore?: number;
  fraudFlags?: string[];
  summary?: string;
  heatScore?: number;
  tags?: string[];
  shortlisted?: boolean;
  duplicateOf?: string;
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  experienceMin?: number;
  experienceMax?: number;
  location?: string;
  salary?: string;
}

export interface DashboardStats {
  candidates: number;
  jobs: number;
  resumes: number;
  highRiskCandidates: number;
  rankings: number;
  duplicateCandidates?: number;
  averageHeatScore?: number;
}

export interface InterviewQuestion {
  id: number;
  category: string;
  question: string;
  follow_ups: string[];
  evaluation_criteria: string[];
  difficulty: string;
}

export interface FraudAnalysis {
  risk_score: number;
  risk_level: string;
  flags: { type: string; severity: string; message: string }[];
  recommendations: string[];
}

export interface LinkedInCompletenessCheck {
  label: string;
  pass: boolean;
}

export interface LinkedInProfileAnalysis {
  overall: number;
  rating: { stars: number; label: string; color: string };
  profileUrl: string;
  parsedProfile: {
    name: string;
    headline: string;
    location: string;
    skillsFound: string[];
    experienceCount: number;
    educationCount: number;
    certCount: number;
    recommendations: number;
  };
  scores: {
    completeness: { score: number; checks: LinkedInCompletenessCheck[] };
    headline: { score: number; suggestions: string[]; suggestedHeadline: string };
    about: { score: number; suggestions: string[]; rewrites: { professional: string; recruiterFriendly: string; technical: string } };
    experience: { score: number; suggestions: string[]; enhancedBullets: { before: string; after: string }[] };
    skills: { score: number; current: string[]; missing: string[]; matched: string[]; suggestions: string[] };
    ats: { score: number; keywordDensity: Record<string, number>; suggestions: string[]; actionVerbs: string[] };
    branding: { score: number; suggestions: string[] };
    visibility: { score: number };
  };
  skillGap: {
    targetRole: string;
    requiredSkills: string[];
    currentSkills: string[];
    missingSkills: string[];
    matchedSkills: string[];
    readinessScore: number;
    learningPath: { skill: string; resources: string[] }[];
  };
  keywordAnalysis: {
    topKeywords: { keyword: string; count: number }[];
    missingHighValue: string[];
    suggestions: string[];
  };
  contentSuggestions: {
    weeklyPosts: string[];
    connectionMessage: string;
    networkingMessage: string;
    featuredSection: string[];
  };
  optimizationPlan: {
    high: string[];
    medium: string[];
    low: string[];
  };
}

export async function analyzeLinkedInProfile(profileUrl: string, targetRole?: string) {
  const { data } = await api.post('/insights/linkedin-analyze', { profileUrl, targetRole });
  return data as LinkedInProfileAnalysis;
}

export interface ExtractedLinkedInProfile {
  extractedText: string;
  preview: {
    name: string;
    headline: string;
    location: string;
    role: string;
    skills: string[];
    experience: { title: string; company: string; duration: string }[];
    education: { degree: string; institution: string }[];
    certifications: string[];
    about: string;
  };
}

export async function extractLinkedInProfile(profileUrl: string) {
  const { data } = await api.post('/insights/linkedin-extract', { profileUrl });
  return data as ExtractedLinkedInProfile;
}

export interface RecruiterEmailDraft {
  subject: string;
  body: string;
}

export interface SkillGapAnalysis {
  required_skills: string[];
  preferred_skills: string[];
  missing_required: string[];
  matched_preferred: string[];
  readiness_score: number;
  summary: string;
}

export interface ResumeSuggestions {
  suggestions: string;
}

export interface ChatResponse {
  answer: string;
}

export async function generateRecruiterEmail(candidateId: string, jobId?: string, tone = 'professional') {
  const { data } = await api.post('/insights/email', { candidateId, jobId, tone });
  return data as RecruiterEmailDraft;
}

export async function analyzeSkillGap(candidateId: string, jobId?: string, requiredSkills?: string[], preferredSkills?: string[]) {
  const { data } = await api.post('/insights/skill-gap', { candidateId, jobId, requiredSkills, preferredSkills });
  return data as SkillGapAnalysis;
}

export async function getResumeSuggestions(candidateId?: string, resumeId?: string) {
  const { data } = await api.post('/insights/resume-suggestions', { candidateId, resumeId });
  return data as ResumeSuggestions;
}

export async function chatCandidate(candidateId: string, message: string) {
  const { data } = await api.post('/insights/chat', { candidateId, message });
  return data as ChatResponse;
}

// ─── Resume Review ─────────────────────────────────────────────────────────────

export interface ResumeReview {
  overallScore: number;
  atsScore: number;
  recruiterScore: number;
  jobMatchScore: number | null;
  grade: string;
  summary: string;
  categoryScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  missingSections: string[];
  atsAnalysis: { issues: string[]; recommendations: string[] };
  keywordAnalysis: { coveragePercentage: number; existingKeywords: string[]; missingKeywords: string[]; recommendedKeywords: string[] };
  experienceAnalysis: { role: string; score: number; recommendations: string[] }[];
  summaryRewrite: string;
  skillsAnalysis: { existing: string[]; missing: string[]; recommended: string[] };
  projectsAnalysis: { name: string; description: string; score: number; recommendations: string[] }[];
  educationAnalysis: { degree: string; score: number; recommendations: string[] }[];
  certificationRecommendations: string[];
  jobMatchAnalysis: {
    skillMatch: number; experienceMatch: number; educationMatch: number;
    keywordMatch: number; industryMatch: number; responsibilityMatch: number;
    missingSkills: string[]; missingKeywords: string[]; matchedSkills: string[];
  } | null;
  quickWins: string[];
  priorityPlan: { high: string[]; medium: string[]; low: string[] };
  recruiterPerspective: { wouldShortlist: boolean; confidence: number; reason: string; concerns: string[] };
  finalRecommendation: string;
}

export async function reviewResume(resumeText: string, jobTitle?: string, jobDescription?: string) {
  const { data } = await api.post('/resume/review', { resumeText, jobTitle, jobDescription });
  return data as ResumeReview;
}

// ─── Live Jobs ──────────────────────────────────────────────────────────────────

export interface LiveJob {
  _id: string;
  companyName: string;
  companyLogo?: string;
  title: string;
  employmentType?: string;
  department?: string;
  experienceRequired?: string;
  experienceMin?: number;
  experienceMax?: number;
  salary?: string;
  location?: string;
  workMode?: 'Remote' | 'Hybrid' | 'On-site';
  description: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  educationCriteria?: string;
  openingsCount?: number;
  applicationDeadline?: string;
  datePosted?: string;
  lastUpdated?: string;
  jobCategory?: string;
  companyWebsite?: string;
  applyLink?: string;
  recruiterName?: string;
  recruiterContact?: string;
  selectionProcess?: string;
  hiringStages?: string[];
  benefits?: string[];
  visaSponsorship?: boolean;
  sourcePlatform: string;
  sourceId: string;
  techStack?: string[];
  companyOverview?: string;
  // AI-augmented fields (injected by backend when candidateId is provided)
  aiMatchScore?: number;
  resumeMatchPercentage?: number;
  missingSkills?: string[];
  matchedSkills?: string[];
}

export interface LiveJobsListResponse {
  jobs: LiveJob[];
  page: number;
  limit: number;
  totalPages: number;
  totalJobs: number;
}

export interface LiveJobsDashboard {
  totalLiveJobs: number;
  newJobsToday: number;
  trendingSkills: { name: string; count: number }[];
  companiesHiring: number;
  remoteJobs: number;
  internshipCount: number;
  fresherJobs: number;
  savedJobs: number;
  appliedJobs: number;
  recommendedJobs: LiveJob[];
}

export interface JobMatchAnalysis {
  matchScore: number;
  resumeMatchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  eligibility: {
    eligible: boolean;
    reasons: string[];
    criteriaBreakdown: { experience: boolean; education: boolean; workMode: boolean };
  };
  salaryInsights: {
    jobSalary: string;
    categoryAverage: string;
    marketRange: string;
    percentile: number;
    evaluation: string;
  };
  careerPath: {
    nextRoles: { role: string; requirements: string }[];
    recommendedCourses: string[];
    growthOutlook: string;
  };
  resumeSuggestions: string[];
}

export interface InterviewRound {
  round: string;
  questions: string[];
}

export interface ApplicantRanking {
  candidateId: string;
  name: string;
  email?: string;
  experienceYears?: number;
  skills: string[];
  matchScore: number;
  resumeMatchPercentage: number;
  missingSkills: string[];
}

// ─── Live Jobs API Calls ──────────────────────────────────────────────────────

export async function getLiveJobs(params: {
  page?: number;
  limit?: number;
  search?: string;
  company?: string;
  location?: string;
  workMode?: string;
  experience?: string;
  sourcePlatform?: string;
  visaSponsorship?: boolean;
  internship?: boolean;
  freshers?: boolean;
  candidateId?: string;
}) {
  const { data } = await api.get('/live-jobs', { params });
  return data as LiveJobsListResponse;
}

export async function getLiveJobsDashboard(candidateId?: string) {
  const { data } = await api.get('/live-jobs/dashboard', { params: { candidateId } });
  return data as LiveJobsDashboard;
}

export async function getLiveJobById(id: string, candidateId?: string) {
  const { data } = await api.get(`/live-jobs/${id}`, { params: { candidateId } });
  return data as { job: LiveJob; matchAnalysis: JobMatchAnalysis | null };
}

export async function saveLiveJob(id: string) {
  const { data } = await api.post(`/live-jobs/${id}/save`);
  return data as { saved: boolean };
}

export async function applyToLiveJob(id: string) {
  const { data } = await api.post(`/live-jobs/${id}/apply`);
  return data as { applied: boolean; status: string };
}

export async function updateJobApplicationStatus(id: string, status: string) {
  const { data } = await api.post(`/live-jobs/${id}/status`, { status });
  return data as { status: string };
}

export async function toggleJobAlert(id: string) {
  const { data } = await api.post(`/live-jobs/${id}/alert`);
  return data as { alertEnabled: boolean };
}

export async function analyzeLiveJobAI(id: string, candidateId: string) {
  const { data } = await api.post(`/live-jobs/${id}/ai-analyze`, { candidateId });
  return data as JobMatchAnalysis;
}

export async function generateLiveJobOutreachEmail(id: string, candidateId: string, tone = 'professional') {
  const { data } = await api.post(`/live-jobs/${id}/recruiter/email`, { candidateId, tone });
  return data as { subject: string; body: string };
}

export async function generateLiveJobInterviewQuestions(id: string) {
  const { data } = await api.post(`/live-jobs/${id}/recruiter/questions`);
  return data as InterviewRound[];
}

export async function rankApplicantsForJob(id: string) {
  const { data } = await api.get(`/live-jobs/${id}/recruiter/rank-applicants`);
  return data as ApplicantRanking[];
}

export async function triggerLiveJobsSync() {
  const { data } = await api.post('/live-jobs/sync');
  return data as { success: boolean; timestamp: string };
}

