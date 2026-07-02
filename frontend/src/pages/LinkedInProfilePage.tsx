import { FormEvent, useState } from 'react';
import {
  analyzeLinkedInProfile,
  extractLinkedInProfile,
  ExtractedLinkedInProfile,
  LinkedInProfileAnalysis,
} from '../api/client';

// ─── Reusable UI ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120, color = '#6366f1' }: { score: number; size?: number; color?: string }) {
  const radius = (size - 16) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  );
}

function ScoreBar({ label, score, color = '#6366f1', weight }: { label: string; score: number; color?: string; weight?: string }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.83rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{label}</span>
        <span style={{ display: 'flex', gap: '0.5rem' }}>
          {weight && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>{weight}</span>}
          <span style={{ color, fontWeight: 700 }}>{score}/100</span>
        </span>
      </div>
      <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: `linear-gradient(90deg,${color},${color}bb)`, borderRadius: 99, transition: 'width 1.1s cubic-bezier(.4,0,.2,1)' }} />
      </div>
    </div>
  );
}

function Tag({ label, variant = 'skill' }: { label: string; variant?: 'skill' | 'missing' | 'matched' | 'warn' }) {
  const c = { skill: ['rgba(99,102,241,.15)', '#818cf8'], missing: ['rgba(239,68,68,.12)', '#f87171'], matched: ['rgba(34,197,94,.12)', '#4ade80'], warn: ['rgba(234,179,8,.12)', '#facc15'] }[variant];
  return <span style={{ display: 'inline-block', padding: '0.18rem 0.6rem', borderRadius: 99, background: c[0], color: c[1], fontSize: '0.76rem', fontWeight: 600, margin: '0.18rem 0.18rem 0.18rem 0' }}>{label}</span>;
}

function Card({ children, glow }: { children: React.ReactNode; glow?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.035)', borderRadius: '1rem', padding: '1.4rem', border: '1px solid rgba(255,255,255,0.07)', boxShadow: glow ? `0 0 40px -12px ${glow}` : 'none' }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{title}</h3>
    </div>
  );
}

function PriorityList({ items, priority }: { items: string[]; priority: 'high' | 'medium' | 'low' }) {
  if (!items.length) return null;
  const cfg = { high: ['🔴', '#f87171', 'High Priority'], medium: ['🟡', '#facc15', 'Medium Priority'], low: ['🟢', '#4ade80', 'Low Priority'] }[priority];
  return (
    <div style={{ marginBottom: '1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
        <span>{cfg[0]}</span><span style={{ fontWeight: 700, color: cfg[1], fontSize: '0.875rem' }}>{cfg[2]}</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
        {items.map((item, i) => <li key={i} style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.85rem', marginBottom: '0.35rem', lineHeight: 1.55 }}>{item}</li>)}
      </ul>
    </div>
  );
}

const scoreColor = (s: number) => s >= 80 ? '#4ade80' : s >= 60 ? '#facc15' : '#f87171';

const TABS = [
  { id: 'overview', label: '📊 Overview' }, { id: 'completeness', label: '✅ Complete' },
  { id: 'headline', label: '📝 Headline' }, { id: 'about', label: '💡 About' },
  { id: 'experience', label: '💼 Experience' }, { id: 'skills', label: '🛠 Skills' },
  { id: 'skillgap', label: '🎯 Skill Gap' }, { id: 'keywords', label: '🔑 Keywords' },
  { id: 'content', label: '✍️ Content' }, { id: 'plan', label: '🚀 Action Plan' },
];

// ─── Extracted Profile Preview Card ───────────────────────────────────────────

function ProfilePreviewCard({ preview, onAnalyze, loading }: {
  preview: ExtractedLinkedInProfile['preview'];
  onAnalyze: () => void;
  loading: boolean;
}) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.12))',
      border: '1px solid rgba(99,102,241,.35)', borderRadius: '1.2rem', padding: '1.8rem',
      marginTop: '1.5rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow accent */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(99,102,241,.25),transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.6rem', fontWeight: 800, color: '#fff',
          boxShadow: '0 0 24px rgba(99,102,241,.5)',
        }}>
          {preview.name.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{preview.name}</span>
            <span style={{ background: 'rgba(99,102,241,.25)', color: '#818cf8', borderRadius: 99, padding: '0.15rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(99,102,241,.4)' }}>
              ✓ Extracted
            </span>
          </div>
          <div style={{ color: '#a5b4fc', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>{preview.headline}</div>
          {preview.location && <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '0.8rem', marginBottom: '0.8rem' }}>📍 {preview.location}</div>}

          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 1rem', maxWidth: 560 }}>
            {preview.about.slice(0, 200)}{preview.about.length > 200 ? '…' : ''}
          </p>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {[
              { icon: '💼', label: `${preview.experience.length} Roles` },
              { icon: '🎓', label: `${preview.education.length} Education` },
              { icon: '🛠', label: `${preview.skills.length} Skills` },
              { icon: '🏆', label: `${preview.certifications.length} Certs` },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,.06)', borderRadius: '0.5rem', padding: '0.3rem 0.7rem' }}>
                <span style={{ fontSize: '0.9rem' }}>{icon}</span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Skills preview */}
          <div style={{ marginBottom: '1.2rem' }}>
            {preview.skills.slice(0, 8).map(s => <Tag key={s} label={s} variant="matched" />)}
            {preview.skills.length > 8 && <Tag label={`+${preview.skills.length - 8} more`} variant="skill" />}
          </div>

          {/* Experience preview */}
          <div style={{ marginBottom: '1.2rem' }}>
            {preview.experience.map((exp, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem', fontSize: '0.8rem' }}>
                <span style={{ color: '#818cf8' }}>▸</span>
                <span style={{ color: 'rgba(255,255,255,.75)' }}><strong style={{ color: '#fff' }}>{exp.title}</strong> @ {exp.company} · {exp.duration}</span>
              </div>
            ))}
          </div>

          <button
            id="run-analysis-btn"
            onClick={onAnalyze}
            disabled={loading}
            style={{
              background: loading ? 'rgba(99,102,241,.4)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', color: '#fff', padding: '0.7rem 2rem', borderRadius: '0.6rem',
              fontWeight: 700, fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 4px 20px rgba(99,102,241,.35)',
            }}
          >
            {loading ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Analyzing…</> : <><span>🚀</span> Run Full AI Analysis</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LinkedInProfilePage() {
  const [profileUrl, setProfileUrl] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [extracted, setExtracted] = useState<ExtractedLinkedInProfile | null>(null);
  const [analysis, setAnalysis] = useState<LinkedInProfileAnalysis | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [activeRewrite, setActiveRewrite] = useState<'professional' | 'recruiterFriendly' | 'technical'>('professional');
  const [copiedKey, setCopiedKey] = useState('');

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // Step 1 — Extract profile from URL
  const handleExtract = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!profileUrl.trim() || !profileUrl.includes('linkedin.com/in/')) {
      setError('Please enter a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username)');
      return;
    }
    setExtracting(true);
    setExtracted(null);
    setAnalysis(null);
    try {
      const result = await extractLinkedInProfile(profileUrl.trim());
      setExtracted(result);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to extract profile.';
      setError(msg);
    } finally {
      setExtracting(false);
    }
  };

  // Step 2 — Run full AI analysis
  const handleAnalyze = async () => {
    if (!extracted) return;
    setError('');
    setAnalyzing(true);
    try {
      const result = await analyzeLinkedInProfile(profileUrl.trim(), targetRole.trim() || undefined);
      setAnalysis(result);
      setActiveTab('overview');
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to analyze profile.';
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(99,102,241,.13)', borderRadius: 99, padding: '0.28rem 0.9rem', fontSize: '0.78rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.9rem', border: '1px solid rgba(99,102,241,.28)' }}>
          <span>🤖</span> AI Career Coach Engine · 15-Step Analysis
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.4rem', background: 'linear-gradient(135deg,#fff 40%,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          LinkedIn Profile Analyzer
        </h1>
        <p style={{ color: 'rgba(255,255,255,.45)', margin: 0, fontSize: '0.9rem' }}>
          Paste your LinkedIn URL → AI extracts your profile → Full score, ATS optimization &amp; action plan
        </p>
      </div>

      {/* ── Step 1: URL Input ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
          <span style={{ background: 'rgba(99,102,241,.2)', color: '#818cf8', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>1</span>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>Paste your LinkedIn profile URL</span>
        </div>

        <form onSubmit={handleExtract}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔗</span>
              <input
                id="linkedin-url-input"
                value={profileUrl}
                onChange={e => { setProfileUrl(e.target.value); setExtracted(null); setAnalysis(null); }}
                placeholder="https://www.linkedin.com/in/your-username"
                style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '2.4rem' }}
              />
            </div>
            <input
              id="target-role-input"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              placeholder="Target Role (e.g. Full Stack Dev)"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              id="extract-profile-btn"
              type="submit"
              disabled={extracting}
              style={{
                background: extracting ? 'rgba(99,102,241,.35)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: 'none', color: '#fff', padding: '0.65rem 1.8rem', borderRadius: '0.55rem',
                fontWeight: 700, fontSize: '0.88rem', cursor: extracting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 3px 16px rgba(99,102,241,.3)',
              }}
            >
              {extracting
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Extracting Profile…</>
                : <><span>⚡</span> Extract Profile</>
              }
            </button>
            {error && <p style={{ color: '#f87171', margin: 0, fontSize: '0.85rem' }}>⚠ {error}</p>}
          </div>
        </form>

        {/* Steps hint */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
          {[
            { n: '1', text: 'Paste URL', done: !!profileUrl },
            { n: '2', text: 'Extract Profile', done: !!extracted },
            { n: '3', text: 'Full AI Analysis', done: !!analysis },
          ].map(({ n, text, done }) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.07)',
                color: done ? '#4ade80' : 'rgba(255,255,255,.3)', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
              }}>{done ? '✓' : n}</span>
              <span style={{ fontSize: '0.78rem', color: done ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.3)', fontWeight: done ? 600 : 400 }}>{text}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Step 2: Extracted Profile Preview ── */}
      {extracted && !analysis && (
        <ProfilePreviewCard
          preview={extracted.preview}
          onAnalyze={handleAnalyze}
          loading={analyzing}
        />
      )}

      {/* ── Step 3: Full Analysis Results ── */}
      {analysis && (
        <div style={{ marginTop: '2rem' }}>

          {/* Hero Score */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.14))',
            borderRadius: '1.2rem', padding: '2rem', marginBottom: '1.5rem',
            border: '1px solid rgba(99,102,241,.3)',
            display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap',
          }}>
            <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
              <ScoreRing score={analysis.overall} color={analysis.rating.color} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: analysis.rating.color, lineHeight: 1 }}>{analysis.overall}</div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>/ 100</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>LinkedIn Score</span>
                <span style={{ background: `${analysis.rating.color}20`, color: analysis.rating.color, borderRadius: 99, padding: '0.18rem 0.75rem', fontSize: '0.82rem', fontWeight: 700, border: `1px solid ${analysis.rating.color}40` }}>
                  {'★'.repeat(analysis.rating.stars)}{'☆'.repeat(5 - analysis.rating.stars)} {analysis.rating.label}
                </span>
              </div>
              {analysis.parsedProfile.name && (
                <p style={{ margin: '0 0 0.5rem', color: 'rgba(255,255,255,.65)', fontSize: '0.9rem' }}>
                  <strong style={{ color: '#fff' }}>{analysis.parsedProfile.name}</strong>
                  {analysis.parsedProfile.location && <> · {analysis.parsedProfile.location}</>}
                </p>
              )}
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {[
                  { label: 'ATS', score: analysis.scores.ats.score },
                  { label: 'Visibility', score: analysis.scores.visibility.score },
                  { label: 'Branding', score: analysis.scores.branding.score },
                  { label: 'Skills', score: analysis.scores.skills.score },
                  { label: 'Complete', score: analysis.scores.completeness.score },
                ].map(({ label, score }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: scoreColor(score) }}>{score}</div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setAnalysis(null); setExtracted(null); }}
              style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.5)', padding: '0.4rem 0.9rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', alignSelf: 'flex-start' }}
            >
              ✕ Reset
            </button>
          </div>

          {/* Tab Bar */}
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1.4rem', background: 'rgba(255,255,255,.025)', borderRadius: '0.75rem', padding: '0.35rem', border: '1px solid rgba(255,255,255,.05)' }}>
            {TABS.map(tab => (
              <button key={tab.id} id={`tab-${tab.id}`} onClick={() => setActiveTab(tab.id)} style={{
                background: activeTab === tab.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                border: 'none', color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,.4)',
                padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '0.78rem', transition: 'all .15s',
                boxShadow: activeTab === tab.id ? '0 2px 10px rgba(99,102,241,.4)' : 'none',
              }}>{tab.label}</button>
            ))}
          </div>

          {/* ── Tab: Overview ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Card>
                <SectionTitle icon="📊" title="Weighted Score Breakdown" />
                <ScoreBar label="Profile Completeness" score={analysis.scores.completeness.score} color={scoreColor(analysis.scores.completeness.score)} weight="20%" />
                <ScoreBar label="Headline" score={analysis.scores.headline.score} color={scoreColor(analysis.scores.headline.score)} weight="10%" />
                <ScoreBar label="About Section" score={analysis.scores.about.score} color={scoreColor(analysis.scores.about.score)} weight="15%" />
                <ScoreBar label="Experience" score={analysis.scores.experience.score} color={scoreColor(analysis.scores.experience.score)} weight="20%" />
                <ScoreBar label="Skills" score={analysis.scores.skills.score} color={scoreColor(analysis.scores.skills.score)} weight="15%" />
                <ScoreBar label="ATS Optimization" score={analysis.scores.ats.score} color={scoreColor(analysis.scores.ats.score)} weight="10%" />
                <ScoreBar label="Personal Branding" score={analysis.scores.branding.score} color={scoreColor(analysis.scores.branding.score)} weight="5%" />
                <ScoreBar label="Recruiter Visibility" score={analysis.scores.visibility.score} color={scoreColor(analysis.scores.visibility.score)} weight="5%" />
              </Card>
              <Card>
                <SectionTitle icon="👤" title="Profile Stats" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '0.75rem' }}>
                  {[
                    { label: 'Skills Found', value: analysis.parsedProfile.skillsFound.length },
                    { label: 'Experience', value: analysis.parsedProfile.experienceCount },
                    { label: 'Education', value: analysis.parsedProfile.educationCount },
                    { label: 'Certifications', value: analysis.parsedProfile.certCount },
                    { label: 'Recommendations', value: analysis.parsedProfile.recommendations },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,.04)', borderRadius: '0.6rem', padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#818cf8' }}>{value}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,.4)', marginTop: '0.15rem' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── Tab: Completeness ── */}
          {activeTab === 'completeness' && (
            <Card>
              <SectionTitle icon="✅" title="Profile Completeness" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.65rem', marginBottom: '1.3rem' }}>
                {analysis.scores.completeness.checks.map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: c.pass ? 'rgba(34,197,94,.07)' : 'rgba(239,68,68,.06)', borderRadius: '0.65rem', padding: '0.65rem 0.9rem', border: `1px solid ${c.pass ? 'rgba(34,197,94,.18)' : 'rgba(239,68,68,.13)'}` }}>
                    <span>{c.pass ? '✅' : '❌'}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: c.pass ? '#4ade80' : '#f87171' }}>{c.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(99,102,241,.1)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid rgba(99,102,241,.2)' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#818cf8', marginBottom: '0.2rem' }}>{analysis.scores.completeness.score}%</div>
                <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '0.85rem' }}>{analysis.scores.completeness.checks.filter(c => c.pass).length} of {analysis.scores.completeness.checks.length} sections complete</div>
              </div>
            </Card>
          )}

          {/* ── Tab: Headline ── */}
          {activeTab === 'headline' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Card glow="rgba(99,102,241,.25)">
                <SectionTitle icon="📝" title="Headline Score" />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.4rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                    <ScoreRing score={analysis.scores.headline.score} size={90} color={scoreColor(analysis.scores.headline.score)} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 900, color: scoreColor(analysis.scores.headline.score) }}>{analysis.scores.headline.score}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,.35)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Current Headline</div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.8rem' }}>{analysis.parsedProfile.headline || <em style={{ color: 'rgba(255,255,255,.25)' }}>No headline detected</em>}</div>
                    {analysis.scores.headline.suggestions.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem', fontSize: '0.83rem', color: 'rgba(255,255,255,.65)' }}><span style={{ color: '#facc15', flexShrink: 0 }}>→</span>{s}</div>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '0.7rem', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.4rem' }}>✨ AI-Suggested Headline</div>
                  <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.65rem' }}>{analysis.scores.headline.suggestedHeadline}</div>
                  <button onClick={() => copyText(analysis.scores.headline.suggestedHeadline, 'headline')} style={{ background: 'rgba(34,197,94,.2)', border: 'none', color: '#4ade80', padding: '0.3rem 0.8rem', borderRadius: 99, cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600 }}>
                    {copiedKey === 'headline' ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* ── Tab: About ── */}
          {activeTab === 'about' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Card>
                <SectionTitle icon="💡" title="About Section Score" />
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                  <div style={{ position: 'relative', width: 85, height: 85, flexShrink: 0 }}>
                    <ScoreRing score={analysis.scores.about.score} size={85} color={scoreColor(analysis.scores.about.score)} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: scoreColor(analysis.scores.about.score) }}>{analysis.scores.about.score}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {analysis.scores.about.suggestions.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem', fontSize: '0.83rem', color: 'rgba(255,255,255,.68)' }}><span style={{ color: '#f87171', flexShrink: 0 }}>→</span>{s}</div>
                    ))}
                  </div>
                </div>
              </Card>
              <Card>
                <SectionTitle icon="✍️" title="AI-Rewritten About Section" />
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
                  {(['professional', 'recruiterFriendly', 'technical'] as const).map(k => (
                    <button key={k} onClick={() => setActiveRewrite(k)} style={{ background: activeRewrite === k ? 'rgba(99,102,241,.28)' : 'rgba(255,255,255,.05)', border: `1px solid ${activeRewrite === k ? 'rgba(99,102,241,.5)' : 'rgba(255,255,255,.07)'}`, color: activeRewrite === k ? '#818cf8' : 'rgba(255,255,255,.4)', padding: '0.3rem 0.75rem', borderRadius: 99, cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600 }}>
                      {k === 'recruiterFriendly' ? 'Recruiter-Friendly' : k.charAt(0).toUpperCase() + k.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: '0.6rem', padding: '0.9rem', whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,.78)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '0.65rem' }}>
                  {analysis.scores.about.rewrites[activeRewrite]}
                </div>
                <button onClick={() => copyText(analysis.scores.about.rewrites[activeRewrite], 'about')} style={{ background: 'rgba(99,102,241,.18)', border: 'none', color: '#818cf8', padding: '0.3rem 0.8rem', borderRadius: 99, cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600 }}>
                  {copiedKey === 'about' ? '✓ Copied!' : '📋 Copy Rewrite'}
                </button>
              </Card>
            </div>
          )}

          {/* ── Tab: Experience ── */}
          {activeTab === 'experience' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Card>
                <SectionTitle icon="💼" title="Experience Analysis" />
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                  <div style={{ position: 'relative', width: 85, height: 85, flexShrink: 0 }}>
                    <ScoreRing score={analysis.scores.experience.score} size={85} color={scoreColor(analysis.scores.experience.score)} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: scoreColor(analysis.scores.experience.score) }}>{analysis.scores.experience.score}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {analysis.scores.experience.suggestions.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem', fontSize: '0.83rem', color: 'rgba(255,255,255,.68)' }}><span style={{ color: '#f87171', flexShrink: 0 }}>→</span>{s}</div>
                    ))}
                  </div>
                </div>
              </Card>
              <Card>
                <SectionTitle icon="✨" title="AI-Enhanced Bullet Examples" />
                {analysis.scores.experience.enhancedBullets.map((b, i) => (
                  <div key={i} style={{ marginBottom: '0.9rem', borderRadius: '0.7rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)' }}>
                    <div style={{ padding: '0.65rem 0.9rem', background: 'rgba(239,68,68,.07)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '.05em' }}>Before</span>
                      <p style={{ margin: '0.2rem 0 0', color: 'rgba(255,255,255,.55)', fontSize: '0.83rem' }}>{b.before}</p>
                    </div>
                    <div style={{ padding: '0.65rem 0.9rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.05em' }}>After ✨</span>
                      <p style={{ margin: '0.2rem 0 0', color: '#fff', fontSize: '0.83rem', lineHeight: 1.6 }}>{b.after}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* ── Tab: Skills ── */}
          {activeTab === 'skills' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Card>
                <SectionTitle icon="🛠" title="Skills Analysis" />
                <ScoreBar label="Skills Score" score={analysis.scores.skills.score} color={scoreColor(analysis.scores.skills.score)} />
                {analysis.scores.skills.suggestions.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem', fontSize: '0.83rem', color: 'rgba(255,255,255,.68)' }}><span style={{ color: '#facc15', flexShrink: 0 }}>→</span>{s}</div>
                ))}
              </Card>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Card>
                  <SectionTitle icon="✅" title="Skills You Have" />
                  {analysis.scores.skills.matched.length > 0 ? analysis.scores.skills.matched.map(s => <Tag key={s} label={s} variant="matched" />) : <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '0.83rem' }}>No market skills detected. Add more tech skills to your profile.</p>}
                </Card>
                <Card>
                  <SectionTitle icon="📌" title="Add These Skills" />
                  {analysis.scores.skills.missing.map(s => <Tag key={s} label={s} variant="missing" />)}
                </Card>
              </div>
            </div>
          )}

          {/* ── Tab: Skill Gap ── */}
          {activeTab === 'skillgap' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Card>
                <SectionTitle icon="🎯" title={`Role Readiness — ${analysis.skillGap.targetRole}`} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.4rem' }}>
                  <div style={{ position: 'relative', width: 95, height: 95, flexShrink: 0 }}>
                    <ScoreRing score={analysis.skillGap.readinessScore} size={95} color={scoreColor(analysis.skillGap.readinessScore)} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 900, color: scoreColor(analysis.skillGap.readinessScore) }}>{analysis.skillGap.readinessScore}%</span>
                      <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,.35)' }}>ready</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem', marginBottom: '0.2rem' }}>{analysis.skillGap.matchedSkills.length} / {analysis.skillGap.requiredSkills.length} required skills matched</div>
                    <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '0.83rem' }}>for {analysis.skillGap.targetRole}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.4rem', textTransform: 'uppercase' }}>✓ You Have</div>
                    {analysis.skillGap.matchedSkills.map(s => <Tag key={s} label={s} variant="matched" />)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', marginBottom: '0.4rem', textTransform: 'uppercase' }}>✗ Missing</div>
                    {analysis.skillGap.missingSkills.map(s => <Tag key={s} label={s} variant="missing" />)}
                  </div>
                </div>
              </Card>
              {analysis.skillGap.learningPath.length > 0 && (
                <Card>
                  <SectionTitle icon="📚" title="Learning Path" />
                  {analysis.skillGap.learningPath.map(({ skill, resources }) => (
                    <div key={skill} style={{ marginBottom: '0.9rem', paddingBottom: '0.9rem', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                      <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: '0.35rem', fontSize: '0.875rem' }}>📌 {skill}</div>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                        {resources.map((r, i) => <li key={i} style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.78rem', marginBottom: '0.18rem' }}>{r}</li>)}
                      </ul>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          )}

          {/* ── Tab: Keywords ── */}
          {activeTab === 'keywords' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Card>
                <SectionTitle icon="🔑" title="Keyword Density" />
                {analysis.keywordAnalysis.topKeywords.length > 0 ? (
                  analysis.keywordAnalysis.topKeywords.map(({ keyword, count }) => (
                    <div key={keyword} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '0.45rem' }}>
                      <span style={{ color: '#818cf8', fontWeight: 600, minWidth: 110, fontSize: '0.83rem', textTransform: 'capitalize' }}>{keyword}</span>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, count * 25)}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 99 }} />
                      </div>
                      <span style={{ color: 'rgba(255,255,255,.4)', fontSize: '0.78rem', minWidth: 20, textAlign: 'right' }}>({count})</span>
                    </div>
                  ))
                ) : <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '0.83rem' }}>Keyword density analysis requires profile text content.</p>}
              </Card>
              <Card>
                <SectionTitle icon="⚡" title="Missing High-Value Keywords" />
                {analysis.keywordAnalysis.missingHighValue.map(k => <Tag key={k} label={k} variant="missing" />)}
                {analysis.keywordAnalysis.suggestions.map((s, i) => (
                  <div key={i} style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem', fontSize: '0.83rem', color: 'rgba(255,255,255,.68)' }}><span style={{ color: '#facc15' }}>→</span>{s}</div>
                ))}
              </Card>
            </div>
          )}

          {/* ── Tab: Content ── */}
          {activeTab === 'content' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Card>
                <SectionTitle icon="📱" title="Weekly Post Ideas" />
                {analysis.contentSuggestions.weeklyPosts.map((post, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,.04)', borderRadius: '0.65rem', padding: '0.9rem', marginBottom: '0.65rem', border: '1px solid rgba(255,255,255,.06)' }}>
                    <div style={{ fontSize: '0.68rem', color: '#818cf8', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase' }}>Post {i + 1}</div>
                    <div style={{ color: 'rgba(255,255,255,.78)', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{post}</div>
                    <button onClick={() => copyText(post, `post-${i}`)} style={{ background: 'rgba(99,102,241,.15)', border: 'none', color: '#818cf8', padding: '0.28rem 0.65rem', borderRadius: 99, cursor: 'pointer', fontSize: '0.73rem', fontWeight: 600 }}>
                      {copiedKey === `post-${i}` ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                ))}
              </Card>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Card>
                  <SectionTitle icon="🤝" title="Connection Message" />
                  <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: '0.55rem', padding: '0.7rem', color: 'rgba(255,255,255,.72)', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{analysis.contentSuggestions.connectionMessage}</div>
                  <button onClick={() => copyText(analysis.contentSuggestions.connectionMessage, 'connect')} style={{ background: 'rgba(99,102,241,.15)', border: 'none', color: '#818cf8', padding: '0.28rem 0.65rem', borderRadius: 99, cursor: 'pointer', fontSize: '0.73rem', fontWeight: 600 }}>
                    {copiedKey === 'connect' ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </Card>
                <Card>
                  <SectionTitle icon="🌐" title="Networking Message" />
                  <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: '0.55rem', padding: '0.7rem', color: 'rgba(255,255,255,.72)', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{analysis.contentSuggestions.networkingMessage}</div>
                  <button onClick={() => copyText(analysis.contentSuggestions.networkingMessage, 'network')} style={{ background: 'rgba(99,102,241,.15)', border: 'none', color: '#818cf8', padding: '0.28rem 0.65rem', borderRadius: 99, cursor: 'pointer', fontSize: '0.73rem', fontWeight: 600 }}>
                    {copiedKey === 'network' ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </Card>
              </div>
            </div>
          )}

          {/* ── Tab: Action Plan ── */}
          {activeTab === 'plan' && (
            <Card glow="rgba(99,102,241,.18)">
              <SectionTitle icon="🚀" title="AI Optimization Action Plan" />
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '0.83rem', margin: '0 0 1.3rem' }}>Prioritized actions to maximize your LinkedIn score:</p>
              <PriorityList items={analysis.optimizationPlan.high} priority="high" />
              <PriorityList items={analysis.optimizationPlan.medium} priority="medium" />
              <PriorityList items={analysis.optimizationPlan.low} priority="low" />
            </Card>
          )}

        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
