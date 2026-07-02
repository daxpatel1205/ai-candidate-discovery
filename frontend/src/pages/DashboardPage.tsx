import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, DashboardStats } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const overview = [
    { title: 'Candidates', value: stats?.candidates, accent: 'var(--accent)', icon: '👤' },
    { title: 'Active Jobs', value: stats?.jobs, accent: '#8B5CF6', icon: '💼' },
    { title: 'Resumes', value: stats?.resumes, accent: 'var(--success)', icon: '📄' },
    { title: 'High-Risk', value: stats?.highRiskCandidates, accent: 'var(--warning)', icon: '⚠️' },
    { title: 'Rankings', value: stats?.rankings, accent: '#4F46E5', icon: '🏆' },
    { title: 'Duplicates', value: stats?.duplicateCandidates, accent: 'var(--error)', icon: '🔁' },
    {
      title: 'Avg Heat Score',
      value: stats?.averageHeatScore ? `${stats.averageHeatScore.toFixed(1)}%` : undefined,
      accent: '#10B981',
      icon: '🔥',
    },
  ];

  const workflows = [
    {
      to: '/interview',
      icon: '🎤',
      label: 'Interview Prep',
      desc: 'Role-tailored AI questions + voice simulation',
      gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
    },
    {
      to: '/linkedin',
      icon: '💼',
      label: 'LinkedIn Analysis',
      desc: 'Profile scoring, skill gap & optimization',
      gradient: 'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(99,102,241,0.1))',
    },
    {
      to: '/fraud',
      icon: '🛡️',
      label: 'Resume Intelligence',
      desc: 'Fraud detection & quality risk analysis',
      gradient: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.08))',
    },
    {
      to: '/live-jobs',
      icon: '⚡',
      label: 'Live Job Feed',
      desc: 'Real-time synced jobs with AI match scoring',
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,211,238,0.08))',
    },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Hero Card */}
      <section style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        marginBottom: '1.5rem',
        overflow: 'hidden',
        position: 'relative',
        animation: 'fadeInUp 0.4s ease both',
      }}>
        {/* Aurora glow */}
        <div style={{
          position: 'absolute',
          top: '-40%',
          right: '-10%',
          width: '50%',
          height: '200%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 700, fontSize: 'var(--text-xs)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          AI Candidate Studio
        </p>
        <h1 style={{ margin: '0.75rem 0 0.75rem', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
          Welcome back,{' '}
          <span className="gradient-text">{user?.name?.split(' ')[0] || 'Recruiter'}</span>
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '55ch', fontSize: 'var(--text-base)' }}>
          Discover top talent faster with AI-powered matching, semantic search, and resume intelligence.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Link to="/resume-review" style={{ textDecoration: 'none' }}>
            <button style={{ borderRadius: 'var(--radius-md)', padding: '0.65rem 1.25rem', fontSize: 'var(--text-sm)' }}>
              Upload Resumes
            </button>
          </Link>
          <Link to="/live-jobs" style={{ textDecoration: 'none' }}>
            <button className="secondary" style={{ borderRadius: 'var(--radius-md)', padding: '0.65rem 1.25rem', fontSize: 'var(--text-sm)' }}>
              Browse Live Jobs
            </button>
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        {overview.map((item) =>
          loading ? (
            <div key={item.title} className="card skeleton" style={{ minHeight: 90 }} />
          ) : (
            <div
              key={item.title}
              className="card"
              style={{
                borderLeft: `3px solid ${item.accent}`,
                animation: 'fadeInUp 0.4s ease both',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {item.title}
                </p>
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {item.value ?? '—'}
              </p>
            </div>
          )
        )}
      </div>

      {/* AI Workflows */}
      <section style={{ animation: 'fadeInUp 0.5s 0.1s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>AI Workflows</h2>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              Your most powerful recruiting tools in one place
            </p>
          </div>
        </div>

        <div className="grid-2" style={{ gap: '0.75rem' }}>
          {workflows.map((w) => (
            <Link
              key={w.to}
              to={w.to}
              style={{ textDecoration: 'none' }}
            >
              <div
                className="glass-card"
                style={{
                  background: w.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem',
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '1.3rem',
                  flexShrink: 0,
                }}>
                  {w.icon}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                    {w.label}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                    {w.desc}
                  </p>
                </div>
                <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '1.1rem', flexShrink: 0 }}>→</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
