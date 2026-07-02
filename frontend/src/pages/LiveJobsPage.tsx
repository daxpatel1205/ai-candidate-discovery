import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  api,
  LiveJob,
  LiveJobsDashboard,
  JobMatchAnalysis,
  InterviewRound,
  ApplicantRanking,
  getLiveJobs,
  getLiveJobsDashboard,
  getLiveJobById,
  saveLiveJob,
  applyToLiveJob,
  analyzeLiveJobAI,
  generateLiveJobOutreachEmail,
  generateLiveJobInterviewQuestions,
  rankApplicantsForJob,
  triggerLiveJobsSync,
  Candidate,
} from '../api/client';
import './LiveJobsPage.css';

// Robust candidate matching utility
const findMatchingCandidate = (list: Candidate[], user: { name?: string; email?: string } | null) => {
  if (!user || list.length === 0) return null;
  const uEmail = user.email?.toLowerCase().trim();
  const uName = user.name?.toLowerCase().trim();

  // 1. Match by email
  if (uEmail) {
    const matched = list.find(c => c.email?.toLowerCase().trim() === uEmail);
    if (matched) return matched;
  }

  if (!uName) return null;

  // 2. Exact name match
  let matched = list.find(c => c.name?.toLowerCase().trim() === uName);
  if (matched) return matched;

  // 3. Substring name match
  matched = list.find(c => {
    const cLower = c.name?.toLowerCase().trim() || '';
    return cLower.includes(uName) || uName.includes(cLower);
  });
  if (matched) return matched;

  // 4. First name prefix match (e.g. "Dax" matches "Daxkumar")
  matched = list.find(c => {
    const cLower = c.name?.toLowerCase().trim() || '';
    const cFirst = cLower.split(/\s+/)[0];
    const uFirst = uName.split(/\s+/)[0];
    return cFirst.startsWith(uFirst) || uFirst.startsWith(cFirst);
  });
  return matched || null;
};

// ─── Utility helpers ─────────────────────────────────────────────────────────
function timeAgo(date?: string) {
  if (!date) return 'N/A';
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}

function workModeColor(mode?: string) {
  if (mode === 'Remote') return { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' };
  if (mode === 'Hybrid') return { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
  return { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' };
}

function matchScoreColor(score?: number) {
  if (!score) return '#9fb3d2';
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#fbbf24';
  return '#fb7185';
}

function getCompanyInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="ljp-job-card skeleton">
      <div className="skeleton-line w60 h18" />
      <div className="skeleton-line w40 h14 mt8" />
      <div className="skeleton-line w80 h12 mt12" />
      <div className="skeleton-line w50 h12 mt6" />
    </div>
  );
}

// ─── AI Match Badge ───────────────────────────────────────────────────────────
function AiMatchBadge({ score }: { score?: number }) {
  if (!score) return null;
  const color = matchScoreColor(score);
  return (
    <div className="ljp-match-badge" style={{ borderColor: color, color }}>
      <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginRight: 4 }}>
        <circle cx="5" cy="5" r="4" fill={color} opacity="0.3" />
        <circle cx="5" cy="5" r="2" fill={color} />
      </svg>
      {score}% Match
    </div>
  );
}

// ─── Circular Score Ring ──────────────────────────────────────────────────────
function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="ljp-score-ring">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="36" y="40" textAnchor="middle" fill={color} fontSize="14" fontWeight="700">{score}%</text>
      </svg>
      <span className="ljp-score-label">{label}</span>
    </div>
  );
}

// ─── Job Compare Modal ────────────────────────────────────────────────────────

interface CompareModalProps {
  jobA: LiveJob;
  jobB: LiveJob;
  candidateId?: string;
  onClose: () => void;
  onApply: (job: LiveJob) => void;
}

function parseSalaryNum(salary?: string): number {
  if (!salary) return 0;
  const nums = salary.replace(/[^0-9.k]/gi, ' ').trim().split(/\s+/).map(n => {
    const v = parseFloat(n);
    return n.toLowerCase().includes('k') ? v * 1000 : v;
  }).filter(n => !isNaN(n) && n > 0);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function workModeScore(mode?: string): number {
  if (mode === 'Remote') return 3;
  if (mode === 'Hybrid') return 2;
  return 1;
}

function companyTierScore(company: string): number {
  const tier1 = ['google', 'apple', 'microsoft', 'amazon', 'meta', 'stripe', 'openai', 'anthropic', 'deepmind', 'netflix', 'nvidia'];
  const tier2 = ['vercel', 'linear', 'notion', 'figma', 'airbnb', 'uber', 'lyft', 'twilio', 'hashicorp', 'docker', 'atlassian'];
  const name = company.toLowerCase();
  if (tier1.some(t => name.includes(t))) return 10;
  if (tier2.some(t => name.includes(t))) return 7;
  return 5;
}

function daysUntil(date?: string): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  if (diff < 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

interface CmpDim {
  label: string;
  icon: string;
  aVal: string;
  bVal: string;
  aSub?: string;
  bSub?: string;
  aScore: number;
  bScore: number;
  aBarColor?: string;
  bBarColor?: string;
}

function buildCompareDimensions(a: LiveJob, b: LiveJob): CmpDim[] {
  const salA = parseSalaryNum(a.salary);
  const salB = parseSalaryNum(b.salary);
  const wmsA = workModeScore(a.workMode);
  const wmsB = workModeScore(b.workMode);
  const tierA = companyTierScore(a.companyName);
  const tierB = companyTierScore(b.companyName);
  const skillsA = (a.requiredSkills?.length ?? 0) + (a.preferredSkills?.length ?? 0);
  const skillsB = (b.requiredSkills?.length ?? 0) + (b.preferredSkills?.length ?? 0);
  const benefitsA = a.benefits?.length ?? 0;
  const benefitsB = b.benefits?.length ?? 0;
  const deadA = daysUntil(a.applicationDeadline);
  const deadB = daysUntil(b.applicationDeadline);
  const matchA = a.aiMatchScore ?? 0;
  const matchB = b.aiMatchScore ?? 0;
  const expMaxA = a.experienceMax ?? a.experienceMin ?? 0;
  const expMaxB = b.experienceMax ?? b.experienceMin ?? 0;

  return [
    {
      label: 'Salary', icon: '💰',
      aVal: a.salary || 'Not specified',
      bVal: b.salary || 'Not specified',
      aSub: salA ? `Avg ~$${Math.round(salA / 1000)}k` : undefined,
      bSub: salB ? `Avg ~$${Math.round(salB / 1000)}k` : undefined,
      aScore: salA, bScore: salB,
      aBarColor: '#4ade80', bBarColor: '#4ade80',
    },
    {
      label: 'Work Mode', icon: '🏠',
      aVal: a.workMode || 'N/A',
      bVal: b.workMode || 'N/A',
      aScore: wmsA * 33, bScore: wmsB * 33,
    },
    {
      label: 'Location', icon: '📍',
      aVal: a.location || 'Global',
      bVal: b.location || 'Global',
      aScore: wmsA * 33, bScore: wmsB * 33,
    },
    {
      label: 'Experience Fit', icon: '📊',
      aVal: a.experienceRequired || (a.experienceMin != null ? `${a.experienceMin}+ yrs` : 'Any'),
      bVal: b.experienceRequired || (b.experienceMin != null ? `${b.experienceMin}+ yrs` : 'Any'),
      aSub: `Growth ceiling: ${expMaxA} yrs`,
      bSub: `Growth ceiling: ${expMaxB} yrs`,
      aScore: Math.max(0, 100 - (a.experienceMin ?? 0) * 10),
      bScore: Math.max(0, 100 - (b.experienceMin ?? 0) * 10),
    },
    {
      label: 'AI Match', icon: '🤖',
      aVal: matchA ? `${matchA}%` : 'N/A',
      bVal: matchB ? `${matchB}%` : 'N/A',
      aSub: matchA ? (matchA >= 80 ? 'Strong match' : matchA >= 60 ? 'Good match' : 'Partial match') : 'Select candidate',
      bSub: matchB ? (matchB >= 80 ? 'Strong match' : matchB >= 60 ? 'Good match' : 'Partial match') : 'Select candidate',
      aScore: matchA, bScore: matchB,
      aBarColor: matchA >= 80 ? '#4ade80' : matchA >= 60 ? '#fbbf24' : '#fb7185',
      bBarColor: matchB >= 80 ? '#4ade80' : matchB >= 60 ? '#fbbf24' : '#fb7185',
    },
    {
      label: 'Skills Scope', icon: '🛠',
      aVal: `${skillsA} skills`,
      bVal: `${skillsB} skills`,
      aSub: a.requiredSkills?.slice(0, 3).join(', '),
      bSub: b.requiredSkills?.slice(0, 3).join(', '),
      aScore: Math.min(100, skillsA * 10), bScore: Math.min(100, skillsB * 10),
    },
    {
      label: 'Benefits', icon: '🎁',
      aVal: benefitsA ? `${benefitsA} perks` : 'Not listed',
      bVal: benefitsB ? `${benefitsB} perks` : 'Not listed',
      aSub: a.benefits?.slice(0, 2).join(', '),
      bSub: b.benefits?.slice(0, 2).join(', '),
      aScore: Math.min(100, benefitsA * 15), bScore: Math.min(100, benefitsB * 15),
    },
    {
      label: 'Company Tier', icon: '🚀',
      aVal: a.companyName,
      bVal: b.companyName,
      aSub: tierA === 10 ? 'Tier 1 (FAANG+)' : tierA === 7 ? 'Tier 2 (Top Startup)' : 'Growing Company',
      bSub: tierB === 10 ? 'Tier 1 (FAANG+)' : tierB === 7 ? 'Tier 2 (Top Startup)' : 'Growing Company',
      aScore: tierA * 10, bScore: tierB * 10,
    },
    {
      label: 'Apply Urgency', icon: '⏳',
      aVal: deadA == null ? 'Open' : deadA === 0 ? 'Expired' : `${deadA} days left`,
      bVal: deadB == null ? 'Open' : deadB === 0 ? 'Expired' : `${deadB} days left`,
      aScore: deadA == null ? 70 : Math.max(0, Math.min(100, deadA * 3)),
      bScore: deadB == null ? 70 : Math.max(0, Math.min(100, deadB * 3)),
    },
  ];
}

function generateVerdict(dims: CmpDim[], a: LiveJob, b: LiveJob): { winner: 'A' | 'B' | 'TIE'; scoreA: number; scoreB: number; text: string } {
  let scoreA = 0;
  let scoreB = 0;
  dims.forEach(d => {
    if (d.aScore > d.bScore) scoreA++;
    else if (d.bScore > d.aScore) scoreB++;
  });

  const reasons: string[] = [];
  const salA = parseSalaryNum(a.salary);
  const salB = parseSalaryNum(b.salary);
  if (salA > salB && salA > 0) reasons.push(`${a.companyName} offers higher compensation (~$${Math.round(salA / 1000)}k vs ~$${Math.round(salB / 1000)}k)`);
  else if (salB > salA && salB > 0) reasons.push(`${b.companyName} offers higher compensation (~$${Math.round(salB / 1000)}k vs ~$${Math.round(salA / 1000)}k)`);

  if (workModeScore(a.workMode) > workModeScore(b.workMode)) reasons.push(`${a.companyName} is ${a.workMode} (more flexible)`);
  else if (workModeScore(b.workMode) > workModeScore(a.workMode)) reasons.push(`${b.companyName} is ${b.workMode} (more flexible)`);

  const tierA = companyTierScore(a.companyName);
  const tierB = companyTierScore(b.companyName);
  if (tierA > tierB) reasons.push(`${a.companyName} has stronger brand recognition and career trajectory`);
  else if (tierB > tierA) reasons.push(`${b.companyName} has stronger brand recognition and career trajectory`);

  if (a.aiMatchScore && b.aiMatchScore) {
    if (a.aiMatchScore > b.aiMatchScore + 10) reasons.push(`you have a stronger AI match score for ${a.companyName} (${a.aiMatchScore}% vs ${b.aiMatchScore}%)`);
    else if (b.aiMatchScore > a.aiMatchScore + 10) reasons.push(`you have a stronger AI match score for ${b.companyName} (${b.aiMatchScore}% vs ${a.aiMatchScore}%)`);
  }

  const winner: 'A' | 'B' | 'TIE' = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'TIE';
  const winnerJob = winner === 'A' ? a : winner === 'B' ? b : null;
  const loserJob = winner === 'A' ? b : winner === 'B' ? a : null;

  let text = '';
  if (winner === 'TIE') {
    text = `Both offers are very similar in quality (${scoreA}–${scoreB} across ${dims.length} dimensions). Your decision should come down to personal priorities — team culture, growth trajectory, and day-to-day role fit. We'd recommend requesting more details from both recruiters before deciding.`;
  } else {
    const reasonStr = reasons.length > 0 ? ` Notably: ${reasons.slice(0, 2).join('; ')}.` : '';
    text = `We recommend accepting the offer from ${winnerJob!.companyName} (${winnerJob!.title}). It wins ${scoreA > scoreB ? scoreA : scoreB} of ${dims.length} comparison dimensions over ${loserJob!.companyName}.${reasonStr} Consider the team culture and day-to-day responsibilities as your final tiebreakers.`;
  }

  return { winner, scoreA, scoreB, text };
}

function JobCompareModal({ jobA, jobB, onClose, onApply }: CompareModalProps) {
  const dims = buildCompareDimensions(jobA, jobB);
  const verdict = generateVerdict(dims, jobA, jobB);
  const maxSalA = parseSalaryNum(jobA.salary);
  const maxSalB = parseSalaryNum(jobB.salary);
  const maxSal = Math.max(maxSalA, maxSalB, 1);

  return (
    <div className="ljp-compare-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ljp-compare-modal">
        {/* Modal Header */}
        <div className="ljp-cmp-header">
          <h2>⚖️ Job Offer Comparison &amp; Ranking</h2>
          <button className="ljp-cmp-close" onClick={onClose}>✕</button>
        </div>

        {/* Column Headers: Dimension Label | Job A | Job B */}
        <div className="ljp-cmp-col-headers">
          <div className="ljp-cmp-col-label">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Dimension</span>
          </div>
          {/* Job A */}
          <div className="ljp-cmp-col-label">
            <div className="ljp-cmp-job-logo">
              {jobA.companyLogo
                ? <img src={jobA.companyLogo} alt={jobA.companyName} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : getCompanyInitials(jobA.companyName)}
            </div>
            <div>
              <div className="ljp-cmp-job-name">{jobA.title}</div>
              <div className="ljp-cmp-job-company">{jobA.companyName}</div>
            </div>
            {verdict.winner === 'A' && <div className="ljp-cmp-winner-crown">👑</div>}
          </div>
          {/* Job B */}
          <div className="ljp-cmp-col-label">
            <div className="ljp-cmp-job-logo">
              {jobB.companyLogo
                ? <img src={jobB.companyLogo} alt={jobB.companyName} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : getCompanyInitials(jobB.companyName)}
            </div>
            <div>
              <div className="ljp-cmp-job-name">{jobB.title}</div>
              <div className="ljp-cmp-job-company">{jobB.companyName}</div>
            </div>
            {verdict.winner === 'B' && <div className="ljp-cmp-winner-crown">👑</div>}
          </div>
        </div>

        {/* Comparison Rows */}
        <div className="ljp-cmp-rows">
          {dims.map((dim, i) => {
            const aWins = dim.aScore > dim.bScore;
            const bWins = dim.bScore > dim.aScore;
            const maxScore = Math.max(dim.aScore, dim.bScore, 1);
            const isSalary = dim.label === 'Salary';
            const aBar = isSalary ? (maxSalA / maxSal) * 100 : (dim.aScore / maxScore) * 100;
            const bBar = isSalary ? (maxSalB / maxSal) * 100 : (dim.bScore / maxScore) * 100;
            const aColor = dim.aBarColor || (aWins ? '#4ade80' : '#5b93ff');
            const bColor = dim.bBarColor || (bWins ? '#4ade80' : '#5b93ff');
            return (
              <div className="ljp-cmp-row" key={i}>
                <div className="ljp-cmp-dimension">
                  <span>{dim.icon}</span>{dim.label}
                </div>
                {/* Job A Cell */}
                <div className={`ljp-cmp-cell ${aWins ? 'winner' : ''}`}>
                  <div style={{ width: '100%' }}>
                    <span className="ljp-cmp-cell-val">{dim.aVal}</span>
                    {dim.aSub && <span className="ljp-cmp-cell-sub">{dim.aSub}</span>}
                    {dim.aScore > 0 && (
                      <div className="ljp-cmp-score-bar">
                        <div className="ljp-cmp-score-fill" style={{ width: `${aBar}%`, background: aColor }} />
                      </div>
                    )}
                  </div>
                </div>
                {/* Job B Cell */}
                <div className={`ljp-cmp-cell ${bWins ? 'winner' : ''}`}>
                  <div style={{ width: '100%' }}>
                    <span className="ljp-cmp-cell-val">{dim.bVal}</span>
                    {dim.bSub && <span className="ljp-cmp-cell-sub">{dim.bSub}</span>}
                    {dim.bScore > 0 && (
                      <div className="ljp-cmp-score-bar">
                        <div className="ljp-cmp-score-fill" style={{ width: `${bBar}%`, background: bColor }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Verdict */}
        <div className="ljp-cmp-verdict">
          <div className="ljp-cmp-verdict-header">
            🤖 AI Verdict &amp; Recommendation
          </div>
          <div className="ljp-cmp-verdict-winner-tag">
            {verdict.winner === 'TIE'
              ? '🤝 It\'s a Tie!'
              : `🏆 Recommended: ${verdict.winner === 'A' ? jobA.companyName : jobB.companyName}`}
          </div>
          <div className="ljp-cmp-verdict-scores">
            <div className="ljp-cmp-verdict-score-item">
              <div className="ljp-cmp-verdict-score-num" style={{ color: verdict.winner === 'A' ? '#4ade80' : '#fb7185' }}>{verdict.scoreA}</div>
              <div className="ljp-cmp-verdict-score-lbl">{jobA.companyName} wins</div>
            </div>
            <div className="ljp-cmp-verdict-score-item">
              <div className="ljp-cmp-verdict-score-num" style={{ color: '#818cf8' }}>/</div>
              <div className="ljp-cmp-verdict-score-lbl">{dims.length} dimensions</div>
            </div>
            <div className="ljp-cmp-verdict-score-item">
              <div className="ljp-cmp-verdict-score-num" style={{ color: verdict.winner === 'B' ? '#4ade80' : '#fb7185' }}>{verdict.scoreB}</div>
              <div className="ljp-cmp-verdict-score-lbl">{jobB.companyName} wins</div>
            </div>
          </div>
          <p className="ljp-cmp-verdict-text">{verdict.text}</p>
          <div className="ljp-cmp-actions">
            {verdict.winner !== 'B' && jobA.applyLink && (
              <button className="ljp-cmp-apply-btn primary" onClick={() => onApply(jobA)}>
                ✓ Apply to {jobA.companyName}
              </button>
            )}
            {verdict.winner !== 'A' && jobB.applyLink && (
              <button className={`ljp-cmp-apply-btn ${verdict.winner === 'B' ? 'primary' : 'secondary'}`} onClick={() => onApply(jobB)}>
                ✓ Apply to {jobB.companyName}
              </button>
            )}
            {verdict.winner === 'TIE' && (
              <>
                {jobA.applyLink && <button className="ljp-cmp-apply-btn secondary" onClick={() => onApply(jobA)}>Apply to {jobA.companyName}</button>}
                {jobB.applyLink && <button className="ljp-cmp-apply-btn secondary" onClick={() => onApply(jobB)}>Apply to {jobB.companyName}</button>}
              </>
            )}
            <button className="ljp-cmp-apply-btn secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LiveJobsPage() {
  const { user } = useAuth();
  const location = useLocation();
  // Filters
  const [search, setSearch] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [experience, setExperience] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [internship, setInternship] = useState(false);
  const [freshers, setFreshers] = useState(false);
  const [visaSponsorship, setVisaSponsorship] = useState(false);
  const [activeCandidateId, setActiveCandidateId] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Read URL search params on initial mount (e.g. from Resume Review "Find Live Jobs" button)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search') || params.get('title') || '';
    if (searchParam) {
      setSearch(searchParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jobs list
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);

  // Dashboard stats
  const [dashboard, setDashboard] = useState<LiveJobsDashboard | null>(null);

  // Selected job detail panel
  const [selectedJob, setSelectedJob] = useState<LiveJob | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'ai' | 'recruiter'>('overview');
  const [matchAnalysis, setMatchAnalysis] = useState<JobMatchAnalysis | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewRound[] | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [applicants, setApplicants] = useState<ApplicantRanking[] | null>(null);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [outreachEmail, setOutreachEmail] = useState<{ subject: string; body: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Compare & Rank state
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set());
  const [compareJobs, setCompareJobs] = useState<LiveJob[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load candidates for AI matching
  useEffect(() => {
    api.get('/candidates').then(({ data }) => {
      const list: Candidate[] = data || [];
      setCandidates(list);
      // Auto-select the candidate whose name/email matches the logged-in user
      const matched = findMatchingCandidate(list, user);
      if (matched) setActiveCandidateId(matched._id);
    }).catch(() => {});
  }, [user]);

  // Load dashboard stats
  useEffect(() => {
    getLiveJobsDashboard(activeCandidateId || undefined)
      .then(setDashboard)
      .catch(() => {});
  }, [activeCandidateId]);

  // Stable fetch function that accepts explicit page number
  const fetchJobsForPage = useCallback((pageNum: number, reset: boolean) => {
    setLoading(true);
    getLiveJobs({
      page: pageNum,
      limit: 12,
      search: search || undefined,
      workMode: workMode || undefined,
      experience: experience || undefined,
      sourcePlatform: sourcePlatform || undefined,
      internship: internship || undefined,
      freshers: freshers || undefined,
      visaSponsorship: visaSponsorship || undefined,
      candidateId: activeCandidateId || undefined,
    })
      .then(data => {
        setJobs(reset ? data.jobs : prev => [...prev, ...data.jobs]);
        setTotalPages(data.totalPages);
        setTotalJobs(data.totalJobs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, workMode, experience, sourcePlatform, internship, freshers, visaSponsorship, activeCandidateId]);

  // Trigger fetch on filter change (debounced for search) — always resets to page 1
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchJobsForPage(1, true);
    }, 350);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search, workMode, experience, sourcePlatform, internship, freshers, visaSponsorship, activeCandidateId]);

  // Trigger fetch when page increments (Load More) — appends results
  const prevPageRef = useRef(1);
  useEffect(() => {
    if (page > 1 && page !== prevPageRef.current) {
      prevPageRef.current = page;
      fetchJobsForPage(page, false);
    }
    if (page === 1) prevPageRef.current = 1;
  }, [page, fetchJobsForPage]);

  const handleSelectJob = async (job: LiveJob) => {
    setSelectedJob(job);
    setDetailTab('overview');
    setMatchAnalysis(null);
    setInterviewQuestions(null);
    setApplicants(null);
    setOutreachEmail(null);

    if (activeCandidateId) {
      setDetailLoading(true);
      try {
        const { matchAnalysis: ma } = await getLiveJobById(job._id, activeCandidateId);
        setMatchAnalysis(ma);
      } catch (_) {}
      setDetailLoading(false);
    }
  };

  const handleSave = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { saved } = await saveLiveJob(jobId);
      setSavedJobs(prev => {
        const next = new Set(prev);
        if (saved) next.add(jobId); else next.delete(jobId);
        return next;
      });
      if (selectedJob?._id === jobId) {
        setSelectedJob(prev => prev ? { ...prev } : null);
      }
    } catch (_) {}
  };

  const handleRunAIAnalysis = async () => {
    if (!selectedJob || !activeCandidateId) return;
    setAiAnalysisLoading(true);
    try {
      const analysis = await analyzeLiveJobAI(selectedJob._id, activeCandidateId);
      setMatchAnalysis(analysis);
    } catch (_) {}
    setAiAnalysisLoading(false);
  };

  const handleGenerateQuestions = async () => {
    if (!selectedJob) return;
    setQuestionsLoading(true);
    try {
      const qs = await generateLiveJobInterviewQuestions(selectedJob._id);
      setInterviewQuestions(qs);
    } catch (_) {}
    setQuestionsLoading(false);
  };

  const handleRankApplicants = async () => {
    if (!selectedJob) return;
    setApplicantsLoading(true);
    try {
      const ranked = await rankApplicantsForJob(selectedJob._id);
      setApplicants(ranked);
    } catch (_) {}
    setApplicantsLoading(false);
  };

  const handleGenerateEmail = async () => {
    if (!selectedJob || !activeCandidateId) return;
    setEmailLoading(true);
    try {
      const email = await generateLiveJobOutreachEmail(selectedJob._id, activeCandidateId);
      setOutreachEmail(email);
    } catch (_) {}
    setEmailLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      await triggerLiveJobsSync();
      setSyncMsg('✓ Sync complete!');
      fetchJobsForPage(1, true);
    } catch (_) {
      setSyncMsg('⚠ Sync had issues.');
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 4000);
  };

  const handleApply = (job: LiveJob) => {
    if (job.applyLink) window.open(job.applyLink, '_blank', 'noopener,noreferrer');
    applyToLiveJob(job._id).catch(() => {});
  };

  // ─── Compare Mode Handlers ─────────────────────────────────────────────────
  const toggleCompareMode = () => {
    setCompareMode(prev => !prev);
    setCompareSelection(new Set());
    setCompareJobs([]);
    setShowCompareModal(false);
  };

  const handleCompareSelect = (job: LiveJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareSelection(prev => {
      const next = new Set(prev);
      if (next.has(job._id)) {
        next.delete(job._id);
        setCompareJobs(cj => cj.filter(j => j._id !== job._id));
      } else if (next.size < 2) {
        next.add(job._id);
        setCompareJobs(cj => [...cj, job]);
      }
      return next;
    });
  };

  const openCompareModal = () => {
    if (compareSelection.size === 2) setShowCompareModal(true);
  };

  const sources = ['LinkedIn Jobs', 'Greenhouse', 'Ashby', 'Lever', 'Y Combinator Jobs', 'RemoteOK', 'We Work Remotely', 'Government Job Portals'];

  return (
    <div className="ljp-root">
      {/* ─── Top Dashboard Strip ─── */}
      <div className="ljp-dashboard-strip">
        <div className="ljp-stat-card">
          <span className="ljp-stat-icon">💼</span>
          <div>
            <div className="ljp-stat-val">{dashboard?.totalLiveJobs?.toLocaleString() ?? '—'}</div>
            <div className="ljp-stat-lbl">Total Live Jobs</div>
          </div>
        </div>
        <div className="ljp-stat-card accent-green">
          <span className="ljp-stat-icon">🆕</span>
          <div>
            <div className="ljp-stat-val">{dashboard?.newJobsToday ?? '—'}</div>
            <div className="ljp-stat-lbl">New Today</div>
          </div>
        </div>
        <div className="ljp-stat-card accent-blue">
          <span className="ljp-stat-icon">🌍</span>
          <div>
            <div className="ljp-stat-val">{dashboard?.remoteJobs ?? '—'}</div>
            <div className="ljp-stat-lbl">Remote Jobs</div>
          </div>
        </div>
        <div className="ljp-stat-card accent-purple">
          <span className="ljp-stat-icon">🎓</span>
          <div>
            <div className="ljp-stat-val">{dashboard?.internshipCount ?? '—'}</div>
            <div className="ljp-stat-lbl">Internships</div>
          </div>
        </div>
        <div className="ljp-stat-card accent-orange">
          <span className="ljp-stat-icon">🚀</span>
          <div>
            <div className="ljp-stat-val">{dashboard?.fresherJobs ?? '—'}</div>
            <div className="ljp-stat-lbl">Fresher Jobs</div>
          </div>
        </div>
        <div className="ljp-stat-card accent-yellow">
          <span className="ljp-stat-icon">🏢</span>
          <div>
            <div className="ljp-stat-val">{dashboard?.companiesHiring ?? '—'}</div>
            <div className="ljp-stat-lbl">Companies Hiring</div>
          </div>
        </div>
        <div className="ljp-stat-card">
          <span className="ljp-stat-icon">📌</span>
          <div>
            <div className="ljp-stat-val">{dashboard?.savedJobs ?? '—'}</div>
            <div className="ljp-stat-lbl">Saved</div>
          </div>
        </div>
        <div className="ljp-stat-card accent-green">
          <span className="ljp-stat-icon">✉️</span>
          <div>
            <div className="ljp-stat-val">{dashboard?.appliedJobs ?? '—'}</div>
            <div className="ljp-stat-lbl">Applied</div>
          </div>
        </div>
      </div>

      {/* ─── Trending Skills Strip ─── */}
      {dashboard?.trendingSkills && dashboard.trendingSkills.length > 0 && (
        <div className="ljp-trending-strip">
          <span className="ljp-trending-label">🔥 Trending Skills:</span>
          {dashboard.trendingSkills.map(s => (
            <button key={s.name} className="ljp-trend-pill" onClick={() => setSearch(s.name)}>
              {s.name} <span className="ljp-trend-count">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="ljp-body">
        {/* ─── Left Sidebar Filters ─── */}
        <aside className="ljp-sidebar">
          <div className="ljp-sidebar-header">
            <h3>🎯 Filters</h3>
            <button className="ljp-clear-btn" onClick={() => {
              setSearch(''); setWorkMode(''); setExperience('');
              setSourcePlatform(''); setInternship(false); setFreshers(false); setVisaSponsorship(false);
            }}>Clear All</button>
          </div>

          {/* Candidate AI Matching */}
          <div className="ljp-filter-group">
            <label className="ljp-filter-label">
              <span>🤖</span> Active Candidate (AI Match)
            </label>
            <select
              value={activeCandidateId}
              onChange={e => setActiveCandidateId(e.target.value)}
              className="ljp-select"
            >
              {!activeCandidateId && <option value="">No Active Candidate</option>}
              {candidates.map(c => (
                <option key={c._id} value={c._id}>{c.name || c.email || c._id}</option>
              ))}
            </select>
            {user && candidates.find(c => c._id === activeCandidateId && findMatchingCandidate([c], user)) && (
              <span style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                ✅ Logged in as {candidates.find(c => c._id === activeCandidateId)?.name}
              </span>
            )}
            {activeCandidateId && !candidates.find(c => c._id === activeCandidateId && findMatchingCandidate([c], user)) && (
              <p className="ljp-filter-hint">AI Match Scores will appear on all job cards</p>
            )}
          </div>

          {/* Keyword Search */}
          <div className="ljp-filter-group">
            <label className="ljp-filter-label"><span>🔍</span> Keyword</label>
            <div className="ljp-search-wrap">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="React, Python, AWS..."
                className="ljp-search-input"
              />
              {search && (
                <button className="ljp-search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
          </div>

          {/* Work Mode */}
          <div className="ljp-filter-group">
            <label className="ljp-filter-label"><span>🏠</span> Work Mode</label>
            <div className="ljp-radio-group">
              {['', 'Remote', 'Hybrid', 'On-site'].map(m => (
                <button
                  key={m}
                  className={`ljp-radio-btn ${workMode === m ? 'active' : ''}`}
                  onClick={() => setWorkMode(m)}
                >
                  {m || 'Any'}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div className="ljp-filter-group">
            <label className="ljp-filter-label"><span>📊</span> Experience Level</label>
            <div className="ljp-radio-group">
              {[['', 'Any'], ['entry', 'Entry (0-2y)'], ['mid', 'Mid (2-5y)'], ['senior', 'Senior (5y+)']].map(([val, lbl]) => (
                <button
                  key={val}
                  className={`ljp-radio-btn ${experience === val ? 'active' : ''}`}
                  onClick={() => setExperience(val)}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Source Platform */}
          <div className="ljp-filter-group">
            <label className="ljp-filter-label"><span>📡</span> Source Platform</label>
            <select value={sourcePlatform} onChange={e => setSourcePlatform(e.target.value)} className="ljp-select">
              <option value="">All Sources</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Toggle Filters */}
          <div className="ljp-filter-group">
            <label className="ljp-filter-label"><span>⚡</span> Quick Filters</label>
            <div className="ljp-toggle-list">
              <label className="ljp-toggle">
                <input type="checkbox" checked={internship} onChange={e => setInternship(e.target.checked)} />
                <span className="ljp-toggle-track" />
                <span>Internships Only</span>
              </label>
              <label className="ljp-toggle">
                <input type="checkbox" checked={freshers} onChange={e => setFreshers(e.target.checked)} />
                <span className="ljp-toggle-track" />
                <span>Fresher Friendly</span>
              </label>
              <label className="ljp-toggle">
                <input type="checkbox" checked={visaSponsorship} onChange={e => setVisaSponsorship(e.target.checked)} />
                <span className="ljp-toggle-track" />
                <span>Visa Sponsorship</span>
              </label>
            </div>
          </div>

          {/* Sync Button */}
          <div className="ljp-filter-group" style={{ marginTop: 'auto' }}>
            <button
              className="ljp-sync-btn"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <span className="ljp-spinner" />
              ) : '⟳'}
              {syncing ? ' Syncing...' : ' Sync Live Jobs'}
            </button>
            {syncMsg && <p className="ljp-sync-msg">{syncMsg}</p>}
          </div>
        </aside>

        {/* ─── Main Content Area ─── */}
        <div className="ljp-main">
          {/* Header */}
          <div className="ljp-main-header">
            <div>
              <h2 className="ljp-main-title">Live Job Board</h2>
              <p className="ljp-main-sub">{loading ? 'Loading...' : `${totalJobs.toLocaleString()} jobs found`}</p>
            </div>
            <button
              className={`ljp-compare-mode-btn ${compareMode ? 'active' : ''}`}
              onClick={toggleCompareMode}
              title="Select 2 jobs to compare side-by-side"
            >
              ⚖️ {compareMode ? `Compare Mode ON (${compareSelection.size}/2)` : 'Compare Jobs'}
            </button>
          </div>

          {/* Job Cards Grid */}
          <div className="ljp-jobs-grid">
            {loading && jobs.length === 0
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : jobs.map(job => {
                const isSelected = compareSelection.has(job._id);
                const isDisabled = compareMode && compareSelection.size === 2 && !isSelected;
                return (
                  <div
                    key={job._id}
                    className={`ljp-job-card
                      ${selectedJob?._id === job._id && !compareMode ? 'selected' : ''}
                      ${compareMode ? 'compare-mode' : ''}
                      ${isSelected ? 'compare-selected' : ''}
                      ${isDisabled ? 'compare-disabled' : ''}
                    `}
                    onClick={(e) => compareMode ? handleCompareSelect(job, e) : handleSelectJob(job)}
                  >
                    {/* Compare Checkbox Overlay */}
                    {compareMode && (
                      <div className="ljp-compare-check">
                        {isSelected ? '✓' : ''}
                      </div>
                    )}

                    {/* Card Header */}
                    <div className="ljp-card-header">
                      <div className="ljp-company-logo">
                        {job.companyLogo ? (
                          <img
                            src={job.companyLogo}
                            alt={job.companyName}
                            onError={e => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden');
                            }}
                          />
                        ) : null}
                        <span hidden={!!job.companyLogo}>{getCompanyInitials(job.companyName)}</span>
                      </div>
                      <div className="ljp-card-title-area">
                        <h4 className="ljp-card-title">{job.title}</h4>
                        <p className="ljp-card-company">{job.companyName}</p>
                      </div>
                      {!compareMode && (
                        <button
                          className={`ljp-save-btn ${savedJobs.has(job._id) ? 'saved' : ''}`}
                          onClick={e => handleSave(job._id, e)}
                          title={savedJobs.has(job._id) ? 'Unsave job' : 'Save job'}
                        >
                          {savedJobs.has(job._id) ? '🔖' : '🤍'}
                        </button>
                      )}
                    </div>

                    {/* Meta Badges */}
                    <div className="ljp-card-meta">
                      <span className="ljp-badge" style={workModeColor(job.workMode)}>{job.workMode}</span>
                      {job.employmentType && (
                        <span className="ljp-badge" style={{ background: 'rgba(91,147,255,0.15)', color: '#5b93ff' }}>
                          {job.employmentType}
                        </span>
                      )}
                      {job.visaSponsorship && (
                        <span className="ljp-badge" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>✓ Visa</span>
                      )}
                    </div>

                    {/* Location & Salary */}
                    <div className="ljp-card-info">
                      <span>📍 {job.location || 'Global'}</span>
                      {job.salary && <span>💰 {job.salary}</span>}
                    </div>

                    {/* Skills */}
                    <div className="ljp-card-skills">
                      {job.requiredSkills?.slice(0, 4).map(skill => (
                        <span
                          key={skill}
                          className={`ljp-skill-pill ${job.matchedSkills?.includes(skill) ? 'matched' : ''} ${job.missingSkills?.includes(skill) ? 'missing' : ''}`}
                        >
                          {skill}
                        </span>
                      ))}
                      {(job.requiredSkills?.length ?? 0) > 4 && (
                        <span className="ljp-skill-more">+{(job.requiredSkills?.length ?? 0) - 4}</span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="ljp-card-footer">
                      <div className="ljp-card-meta-footer">
                        <span className="ljp-source-tag">{job.sourcePlatform}</span>
                        <span className="ljp-time-ago">{timeAgo(job.datePosted)}</span>
                      </div>
                      {job.aiMatchScore !== undefined && (
                        <AiMatchBadge score={job.aiMatchScore} />
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Load More */}
          {!loading && page < totalPages && (
            <div className="ljp-load-more">
              <button className="ljp-load-more-btn" onClick={() => setPage(p => p + 1)}>
                Load More Jobs ↓
              </button>
            </div>
          )}
          {loading && jobs.length > 0 && (
            <div className="ljp-load-more">
              <span className="ljp-spinner" style={{ width: 24, height: 24 }} />
            </div>
          )}
        </div>

        {/* ─── Right Detail Panel ─── */}
        {selectedJob && (
          <div className="ljp-detail-panel">
            <div className="ljp-detail-inner">
              {/* Detail Header */}
              <div className="ljp-detail-header">
                <div className="ljp-detail-logo">
                  {selectedJob.companyLogo ? (
                    <img src={selectedJob.companyLogo} alt={selectedJob.companyName}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : null}
                  <span>{getCompanyInitials(selectedJob.companyName)}</span>
                </div>
                <button className="ljp-close-btn" onClick={() => setSelectedJob(null)}>✕</button>
              </div>

              <h2 className="ljp-detail-title">{selectedJob.title}</h2>
              <p className="ljp-detail-company">{selectedJob.companyName}</p>

              {/* Meta Badges */}
              <div className="ljp-detail-badges">
                <span className="ljp-badge" style={workModeColor(selectedJob.workMode)}>{selectedJob.workMode}</span>
                {selectedJob.employmentType && (
                  <span className="ljp-badge" style={{ background: 'rgba(91,147,255,0.15)', color: '#5b93ff' }}>
                    {selectedJob.employmentType}
                  </span>
                )}
                {selectedJob.visaSponsorship && (
                  <span className="ljp-badge" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>✓ Visa Sponsorship</span>
                )}
                {selectedJob.openingsCount && (
                  <span className="ljp-badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                    {selectedJob.openingsCount} Opening{selectedJob.openingsCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Quick Info */}
              <div className="ljp-detail-quick-info">
                <div><span>📍</span> {selectedJob.location || 'Global'}</div>
                {selectedJob.salary && <div><span>💰</span> {selectedJob.salary}</div>}
                {selectedJob.experienceRequired && <div><span>📅</span> {selectedJob.experienceRequired}</div>}
                {selectedJob.department && <div><span>🏢</span> {selectedJob.department}</div>}
                {selectedJob.jobCategory && <div><span>🏷️</span> {selectedJob.jobCategory}</div>}
              </div>

              {/* Action Buttons */}
              <div className="ljp-detail-actions">
                <button
                  className="ljp-apply-btn"
                  onClick={() => handleApply(selectedJob)}
                >
                  🚀 Apply Now
                </button>
                <button
                  className={`ljp-save-action ${savedJobs.has(selectedJob._id) ? 'saved' : ''}`}
                  onClick={e => handleSave(selectedJob._id, e)}
                >
                  {savedJobs.has(selectedJob._id) ? '🔖 Saved' : '🤍 Save'}
                </button>
                <button
                  className="ljp-share-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedJob.applyLink || window.location.href);
                    alert('Apply link copied!');
                  }}
                >
                  📤 Share
                </button>
              </div>

              {/* Tabs */}
              <div className="ljp-detail-tabs">
                {(['overview', 'ai', 'recruiter'] as const).map(tab => (
                  <button
                    key={tab}
                    className={`ljp-tab-btn ${detailTab === tab ? 'active' : ''}`}
                    onClick={() => setDetailTab(tab)}
                  >
                    {tab === 'overview' ? '📋 Overview' : tab === 'ai' ? '🤖 AI Analysis' : '👔 Recruiter'}
                  </button>
                ))}
              </div>

              {/* ─── Overview Tab ─── */}
              {detailTab === 'overview' && (
                <div className="ljp-tab-content">
                  {selectedJob.companyOverview && (
                    <section className="ljp-section">
                      <h4>About {selectedJob.companyName}</h4>
                      <p>{selectedJob.companyOverview}</p>
                    </section>
                  )}

                  <section className="ljp-section">
                    <h4>Job Description</h4>
                    <p style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>{selectedJob.description}</p>
                  </section>

                  {selectedJob.requiredSkills?.length > 0 && (
                    <section className="ljp-section">
                      <h4>Required Skills</h4>
                      <div className="ljp-skills-grid">
                        {selectedJob.requiredSkills.map(s => (
                          <span key={s} className="ljp-skill-pill">{s}</span>
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedJob.preferredSkills && selectedJob.preferredSkills.length > 0 && (
                    <section className="ljp-section">
                      <h4>Preferred Skills</h4>
                      <div className="ljp-skills-grid">
                        {selectedJob.preferredSkills.map(s => (
                          <span key={s} className="ljp-skill-pill pref">{s}</span>
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedJob.techStack && selectedJob.techStack.length > 0 && (
                    <section className="ljp-section">
                      <h4>Tech Stack</h4>
                      <div className="ljp-skills-grid">
                        {selectedJob.techStack.map(s => (
                          <span key={s} className="ljp-skill-pill tech">{s}</span>
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedJob.educationCriteria && (
                    <section className="ljp-section">
                      <h4>Education / Eligibility</h4>
                      <p>{selectedJob.educationCriteria}</p>
                    </section>
                  )}

                  {selectedJob.selectionProcess && (
                    <section className="ljp-section">
                      <h4>Selection Process</h4>
                      <p>{selectedJob.selectionProcess}</p>
                    </section>
                  )}

                  {selectedJob.hiringStages && selectedJob.hiringStages.length > 0 && (
                    <section className="ljp-section">
                      <h4>Hiring Stages</h4>
                      <div className="ljp-stages">
                        {selectedJob.hiringStages.map((stage, i) => (
                          <div key={i} className="ljp-stage">
                            <span className="ljp-stage-num">{i + 1}</span>
                            <span>{stage}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                    <section className="ljp-section">
                      <h4>Benefits</h4>
                      <ul className="ljp-benefits-list">
                        {selectedJob.benefits.map((b, i) => <li key={i}>✓ {b}</li>)}
                      </ul>
                    </section>
                  )}

                  <section className="ljp-section">
                    <h4>Source & Links</h4>
                    <p style={{ color: 'var(--muted)' }}>Platform: <strong style={{ color: 'var(--accent)' }}>{selectedJob.sourcePlatform}</strong></p>
                    {selectedJob.recruiterName && <p style={{ color: 'var(--muted)' }}>Recruiter: {selectedJob.recruiterName}</p>}
                    {selectedJob.applicationDeadline && (
                      <p style={{ color: 'var(--muted)' }}>Deadline: {new Date(selectedJob.applicationDeadline).toLocaleDateString()}</p>
                    )}
                    {selectedJob.companyWebsite && (
                      <a href={selectedJob.companyWebsite} target="_blank" rel="noopener noreferrer" className="ljp-ext-link">
                        🌐 Company Website ↗
                      </a>
                    )}
                  </section>
                </div>
              )}

              {/* ─── AI Analysis Tab ─── */}
              {detailTab === 'ai' && (
                <div className="ljp-tab-content">
                  {!activeCandidateId ? (
                    <div className="ljp-ai-placeholder">
                      <div style={{ fontSize: '2.5rem' }}>🤖</div>
                      <p>Select a candidate from the sidebar to run AI matching analysis</p>
                    </div>
                  ) : (
                    <>
                      {!matchAnalysis && (
                        <button
                          className="ljp-analyze-btn"
                          onClick={handleRunAIAnalysis}
                          disabled={aiAnalysisLoading}
                        >
                          {aiAnalysisLoading ? <><span className="ljp-spinner" /> Analyzing...</> : '⚡ Run AI Match Analysis'}
                        </button>
                      )}

                      {detailLoading && (
                        <div className="ljp-ai-loading">
                          <span className="ljp-spinner" style={{ width: 28, height: 28 }} />
                          <p>Running AI analysis...</p>
                        </div>
                      )}

                      {matchAnalysis && (
                        <>
                          {/* Score Rings */}
                          <div className="ljp-score-rings">
                            <ScoreRing score={matchAnalysis.matchScore} label="Match" color={matchScoreColor(matchAnalysis.matchScore)} />
                            <ScoreRing score={matchAnalysis.resumeMatchPercentage} label="Resume" color="#5b93ff" />
                            <ScoreRing score={matchAnalysis.eligibility?.criteriaBreakdown?.experience ? 100 : 45} label="Exp." color={matchAnalysis.eligibility?.criteriaBreakdown?.experience ? '#4ade80' : '#fb7185'} />
                          </div>

                          {/* Matched / Missing Skills */}
                          <section className="ljp-section">
                            <h4>✅ Matched Skills</h4>
                            <div className="ljp-skills-grid">
                              {matchAnalysis.matchedSkills?.length > 0
                                ? matchAnalysis.matchedSkills.map(s => <span key={s} className="ljp-skill-pill matched">{s}</span>)
                                : <span style={{ color: 'var(--muted)' }}>No direct skill matches.</span>}
                            </div>
                          </section>

                          <section className="ljp-section">
                            <h4>❌ Missing Skills</h4>
                            <div className="ljp-skills-grid">
                              {matchAnalysis.missingSkills?.length > 0
                                ? matchAnalysis.missingSkills.map(s => <span key={s} className="ljp-skill-pill missing">{s}</span>)
                                : <span style={{ color: '#4ade80' }}>No missing required skills!</span>}
                            </div>
                          </section>

                          {/* Eligibility */}
                          <section className="ljp-section">
                            <h4>🎯 Eligibility Check</h4>
                            <div className={`ljp-eligibility-banner ${matchAnalysis.eligibility?.eligible ? 'eligible' : 'not-eligible'}`}>
                              {matchAnalysis.eligibility?.eligible ? '✅ Candidate is eligible' : '⚠️ Eligibility concerns found'}
                            </div>
                            <ul className="ljp-reason-list">
                              {matchAnalysis.eligibility?.reasons?.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </section>

                          {/* Salary Insights */}
                          {matchAnalysis.salaryInsights && (
                            <section className="ljp-section">
                              <h4>💰 Salary Insights</h4>
                              <div className="ljp-salary-grid">
                                <div><span className="ljp-salary-label">Job Salary</span><span className="ljp-salary-val">{matchAnalysis.salaryInsights.jobSalary}</span></div>
                                <div><span className="ljp-salary-label">Market Average</span><span className="ljp-salary-val">{matchAnalysis.salaryInsights.categoryAverage}</span></div>
                                <div><span className="ljp-salary-label">Market Range</span><span className="ljp-salary-val">{matchAnalysis.salaryInsights.marketRange}</span></div>
                              </div>
                              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.75rem' }}>{matchAnalysis.salaryInsights.evaluation}</p>
                            </section>
                          )}

                          {/* Career Path */}
                          {matchAnalysis.careerPath && (
                            <section className="ljp-section">
                              <h4>🚀 Career Path</h4>
                              {matchAnalysis.careerPath.nextRoles?.map((role, i) => (
                                <div key={i} className="ljp-career-role">
                                  <strong>{role.role}</strong>
                                  <p>{role.requirements}</p>
                                </div>
                              ))}
                              {matchAnalysis.careerPath.growthOutlook && (
                                <p className="ljp-growth-outlook">📈 {matchAnalysis.careerPath.growthOutlook}</p>
                              )}
                            </section>
                          )}

                          {/* Resume Suggestions */}
                          {matchAnalysis.resumeSuggestions?.length > 0 && (
                            <section className="ljp-section">
                              <h4>📝 Resume Improvement Tips</h4>
                              <ul className="ljp-suggestion-list">
                                {matchAnalysis.resumeSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            </section>
                          )}

                          <button className="ljp-analyze-btn secondary" onClick={handleRunAIAnalysis} disabled={aiAnalysisLoading}>
                            ↺ Re-run Analysis
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ─── Recruiter Tab ─── */}
              {detailTab === 'recruiter' && (
                <div className="ljp-tab-content">
                  {/* Interview Questions */}
                  <section className="ljp-section">
                    <div className="ljp-section-header">
                      <h4>🎤 Interview Questions</h4>
                      <button className="ljp-mini-btn" onClick={handleGenerateQuestions} disabled={questionsLoading}>
                        {questionsLoading ? <><span className="ljp-spinner-sm" /> Generating...</> : '⚡ Generate'}
                      </button>
                    </div>
                    {interviewQuestions && interviewQuestions.map((round, i) => (
                      <div key={i} className="ljp-interview-round">
                        <h5 className="ljp-round-title">{round.round}</h5>
                        <ol className="ljp-question-list">
                          {round.questions.map((q, j) => <li key={j}>{q}</li>)}
                        </ol>
                      </div>
                    ))}
                  </section>

                  {/* Outreach Email */}
                  <section className="ljp-section">
                    <div className="ljp-section-header">
                      <h4>✉️ Outreach Email</h4>
                      <button
                        className="ljp-mini-btn"
                        onClick={handleGenerateEmail}
                        disabled={emailLoading || !activeCandidateId}
                        title={!activeCandidateId ? 'Select a candidate first' : ''}
                      >
                        {emailLoading ? <><span className="ljp-spinner-sm" /> Generating...</> : '⚡ Generate'}
                      </button>
                    </div>
                    {!activeCandidateId && <p className="ljp-filter-hint">Select a candidate from the sidebar first</p>}
                    {outreachEmail && (
                      <div className="ljp-email-box">
                        <div className="ljp-email-subject">Subject: {outreachEmail.subject}</div>
                        <div className="ljp-email-body">{outreachEmail.body}</div>
                        <button
                          className="ljp-copy-btn"
                          onClick={() => navigator.clipboard.writeText(`Subject: ${outreachEmail.subject}\n\n${outreachEmail.body}`)}
                        >
                          📋 Copy Email
                        </button>
                      </div>
                    )}
                  </section>

                  {/* Applicant Rankings */}
                  <section className="ljp-section">
                    <div className="ljp-section-header">
                      <h4>🏆 Rank All Candidates</h4>
                      <button className="ljp-mini-btn" onClick={handleRankApplicants} disabled={applicantsLoading}>
                        {applicantsLoading ? <><span className="ljp-spinner-sm" /> Ranking...</> : '⚡ Rank'}
                      </button>
                    </div>
                    {applicants && (
                      <div className="ljp-applicants-list">
                        {applicants.slice(0, 8).map((a, i) => (
                          <div key={a.candidateId} className="ljp-applicant-row">
                            <span className="ljp-applicant-rank">#{i + 1}</span>
                            <div className="ljp-applicant-info">
                              <strong>{a.name || a.email || 'Unknown'}</strong>
                              <span>{a.skills?.slice(0, 3).join(', ')}</span>
                            </div>
                            <div className="ljp-applicant-score" style={{ color: matchScoreColor(a.matchScore) }}>
                              {a.matchScore}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Floating Compare Action Bar ─── */}
      <div className={`ljp-compare-action-bar ${compareMode && compareSelection.size > 0 ? 'visible' : ''}`}>
        <div className="ljp-compare-bar-jobs">
          {compareJobs[0] && (
            <span className="ljp-compare-bar-pill">📌 {compareJobs[0].title}</span>
          )}
          {compareJobs[0] && compareJobs[1] && (
            <span className="ljp-compare-bar-vs">VS</span>
          )}
          {compareJobs[1] && (
            <span className="ljp-compare-bar-pill">📌 {compareJobs[1].title}</span>
          )}
          {compareSelection.size < 2 && (
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
              Select {2 - compareSelection.size} more job{compareSelection.size === 0 ? 's' : ''} to compare
            </span>
          )}
        </div>
        <button
          className="ljp-compare-go-btn"
          onClick={openCompareModal}
          disabled={compareSelection.size < 2}
          style={{ opacity: compareSelection.size < 2 ? 0.5 : 1 }}
        >
          ⚖️ Compare Now →
        </button>
        <button className="ljp-compare-bar-cancel" onClick={toggleCompareMode}>✕ Cancel</button>
      </div>

      {/* ─── Compare Modal ─── */}
      {showCompareModal && compareJobs.length === 2 && (
        <JobCompareModal
          jobA={compareJobs[0]}
          jobB={compareJobs[1]}
          candidateId={activeCandidateId || undefined}
          onClose={() => setShowCompareModal(false)}
          onApply={handleApply}
        />
      )}
    </div>
  );
}
