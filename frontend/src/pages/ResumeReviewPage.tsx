import { FormEvent, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { reviewResume, ResumeReview, api } from '../api/client';

// ─── Shared UI ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 110, color = '#6366f1' }: { score: number; size?: number; color?: string }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}/>
    </svg>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color?: string }) {
  const c = color || (score >= 70 ? '#4ade80' : score >= 50 ? '#facc15' : '#f87171');
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem', marginBottom:'0.28rem' }}>
        <span style={{ color:'rgba(255,255,255,0.72)', fontWeight:500 }}>{label}</span>
        <span style={{ color: c, fontWeight:700 }}>{score}/100</span>
      </div>
      <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${score}%`, background:`linear-gradient(90deg,${c},${c}bb)`, borderRadius:99, transition:'width 1s ease' }}/>
      </div>
    </div>
  );
}

function Tag({ label, variant='skill' }: { label: string; variant?: 'skill'|'missing'|'matched'|'warn' }) {
  const c:{[k:string]:[string,string]} = {
    skill:['rgba(99,102,241,.15)','#818cf8'], missing:['rgba(239,68,68,.12)','#f87171'],
    matched:['rgba(34,197,94,.12)','#4ade80'], warn:['rgba(234,179,8,.12)','#facc15'],
  };
  const [bg, fg] = c[variant] || c.skill;
  return <span style={{ display:'inline-block', padding:'0.17rem 0.58rem', borderRadius:99, background:bg, color:fg, fontSize:'0.75rem', fontWeight:600, margin:'0.17rem' }}>{label}</span>;
}

function Card({ children, glow }: { children: React.ReactNode; glow?: string }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.035)', borderRadius:'1rem', padding:'1.4rem', border:'1px solid rgba(255,255,255,0.07)', boxShadow: glow ? `0 0 40px -12px ${glow}` : 'none' }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1.1rem' }}>
      <span style={{ fontSize:'1.1rem' }}>{icon}</span>
      <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:700, color:'#fff' }}>{title}</h3>
    </div>
  );
}

function PriorityBlock({ items, level }: { items: string[]; level: 'high'|'medium'|'low' }) {
  if (!items?.length) return null;
  const cfg = {
    high: { icon:'🔴', color:'#f87171', bg:'rgba(239,68,68,.08)', border:'rgba(239,68,68,.2)', label:'High Priority' },
    medium: { icon:'🟡', color:'#facc15', bg:'rgba(234,179,8,.08)', border:'rgba(234,179,8,.2)', label:'Medium Priority' },
    low: { icon:'🟢', color:'#4ade80', bg:'rgba(34,197,94,.08)', border:'rgba(34,197,94,.2)', label:'Low Priority' },
  }[level];
  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:'0.75rem', padding:'1rem', marginBottom:'0.85rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'0.6rem' }}>
        <span>{cfg.icon}</span><span style={{ fontWeight:700, color:cfg.color, fontSize:'0.85rem' }}>{cfg.label}</span>
      </div>
      <ul style={{ margin:0, paddingLeft:'1.15rem' }}>
        {items.map((item,i) => <li key={i} style={{ color:'rgba(255,255,255,0.72)', fontSize:'0.82rem', marginBottom:'0.32rem', lineHeight:1.5 }}>{item}</li>)}
      </ul>
    </div>
  );
}

const sc = (s: number) => s >= 70 ? '#4ade80' : s >= 50 ? '#facc15' : '#f87171';

const CAT_LABELS: Record<string, string> = {
  structure:'Structure', ats:'ATS', summary:'Summary', experience:'Experience',
  achievements:'Achievements', technicalSkills:'Tech Skills', softSkills:'Soft Skills',
  education:'Education', certifications:'Certifications', projects:'Projects',
  keywords:'Keywords', readability:'Readability', branding:'Branding', recruiterAppeal:'Recruiter Appeal',
};

const TABS = [
  { id:'overview', label:'📊 Overview' }, { id:'ats', label:'🤖 ATS' },
  { id:'experience', label:'💼 Experience' }, { id:'skills', label:'🛠 Skills' },
  { id:'keywords', label:'🔑 Keywords' }, { id:'summary', label:'📝 Summary' },
  { id:'projects', label:'🚀 Projects' }, { id:'certifications', label:'🏆 Certs' },
  { id:'jobmatch', label:'🎯 Job Match' }, { id:'recruiter', label:'👔 Recruiter' },
  { id:'quickwins', label:'⚡ Quick Wins' }, { id:'plan', label:'📋 Action Plan' },
];

// ─── Grade Badge ───────────────────────────────────────────────────────────────

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    'A+':'#4ade80', 'A':'#86efac', 'B+':'#facc15', 'B':'#fbbf24', 'C+':'#fb923c', 'C':'#f87171', 'D':'#ef4444',
  };
  const color = colors[grade] || '#818cf8';
  return (
    <div style={{
      width:72, height:72, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
      background:`radial-gradient(circle,${color}30,${color}10)`,
      border:`2px solid ${color}60`, flexShrink:0,
    }}>
      <span style={{ fontSize:'1.7rem', fontWeight:900, color }}>{grade}</span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ResumeReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [resumeText, setResumeText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [review, setReview] = useState<ResumeReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedKey, setCopiedKey] = useState('');
  const [showJD, setShowJD] = useState(false);

  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (location.state?.resumeText) {
      setResumeText(location.state.resumeText);
      setInputMode('paste');
      // Clean up navigation state so refreshing the page doesn't re-apply or persist it
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const triggerAnalysis = async (text: string) => {
    setError('');
    setLoading(true);
    setReview(null);
    try {
      const result = await reviewResume(text.trim(), jobTitle.trim() || undefined, jobDescription.trim() || undefined);
      setReview(result);
      setActiveTab('overview');
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Analysis failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const acceptedExtensions = /\.(pdf|docx|doc|txt|png|jpe?g|tif|tiff)$/i;
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/tiff',
    ];

    if (!allowedTypes.includes(selectedFile.type) && !acceptedExtensions.test(selectedFile.name)) {
      setError('Unsupported file type. Please upload a PDF, DOCX, DOC, TXT, PNG, JPG, or TIFF resume.');
      setFile(null);
      return;
    }

    setError('');
    setFile(selectedFile);
  };

  const handleFileUpload = async (fileToUpload: File) => {
    setUploading(true);
    setError('');
    setReview(null);

    const formData = new FormData();
    formData.append('resumes', fileToUpload);

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.uploads && data.uploads.length > 0) {
        const extractedText = data.uploads[0].resume?.rawText || '';
        if (extractedText) {
          setResumeText(extractedText);
          await triggerAnalysis(extractedText);
        } else {
          setError('Could not extract text from the resume. Please try pasting the text instead.');
        }
      } else {
        setError('Upload succeeded but no parse data was returned.');
      }
    } catch (err: any) {
      console.error('File upload failed:', err);
      const serverMsg = err?.response?.data?.error || err?.response?.data?.message;
      setError(serverMsg || err?.message || 'Failed to upload and parse file.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (inputMode === 'upload') {
      if (!file) {
        setError('Please select or drag a resume file first.');
        return;
      }
      await handleFileUpload(file);
    } else {
      if (!resumeText.trim() || resumeText.trim().length < 50) {
        setError('Please paste your resume text (minimum 50 characters).');
        return;
      }
      await triggerAnalysis(resumeText);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.8rem' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'0.45rem', background:'rgba(99,102,241,.13)', borderRadius:99, padding:'0.28rem 0.9rem', fontSize:'0.78rem', color:'#818cf8', fontWeight:600, marginBottom:'0.8rem', border:'1px solid rgba(99,102,241,.28)' }}>
          <span>🧠</span> AI Resume Coach · 14-Category Analysis
        </div>
        <h1 style={{ fontSize:'2rem', fontWeight:800, margin:'0 0 0.4rem', background:'linear-gradient(135deg,#fff 40%,#818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Resume Reviewer & ATS Optimizer
        </h1>
        <p style={{ color:'rgba(255,255,255,.45)', margin:0, fontSize:'0.9rem' }}>
          Expert-level resume analysis — ATS score, recruiter perspective, skill gap, quick wins &amp; priority action plan
        </p>
      </div>

      {/* ── Input Form ── */}
      <Card>
        {/* Input Mode Toggle Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            style={{
              background: inputMode === 'upload' ? 'rgba(99,102,241,0.12)' : 'transparent',
              border: '1px solid ' + (inputMode === 'upload' ? 'rgba(99,102,241,0.3)' : 'transparent'),
              color: inputMode === 'upload' ? '#818cf8' : 'rgba(255,255,255,0.5)',
              padding: '0.45rem 1.1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              transition: 'all 0.15s'
            }}
          >
            📁 Upload Resume File
          </button>
          <button
            type="button"
            onClick={() => setInputMode('paste')}
            style={{
              background: inputMode === 'paste' ? 'rgba(99,102,241,0.12)' : 'transparent',
              border: '1px solid ' + (inputMode === 'paste' ? 'rgba(99,102,241,0.3)' : 'transparent'),
              color: inputMode === 'paste' ? '#818cf8' : 'rgba(255,255,255,0.5)',
              padding: '0.45rem 1.1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              transition: 'all 0.15s'
            }}
          >
            📝 Paste Resume Text
          </button>
        </div>

        {inputMode === 'upload' ? (
          /* File Upload Tab View */
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="file"
              id="resume-file-input"
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.tiff,.tif"
              style={{ display: 'none' }}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              style={{
                border: '2px dashed ' + (dragOver ? '#818cf8' : 'rgba(255,255,255,0.12)'),
                background: dragOver ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.01)',
                borderRadius: 12,
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: dragOver ? '0 0 20px rgba(99,102,241,0.15)' : 'none'
              }}
              onClick={() => document.getElementById('resume-file-input')?.click()}
            >
              <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>
                {uploading || loading ? '⚙️' : '📥'}
              </div>
              <p style={{ margin: 0, fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                {uploading ? 'Uploading and parsing resume...' : loading ? 'Analyzing resume text...' : 'Drag & drop your resume file here or click to browse'}
              </p>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                Supports PDF, DOCX, DOC, TXT, PNG, JPG, TIFF
              </p>
            </div>
            
            {file && (
              <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                <span>📄</span>
                <strong>{file.name}</strong>
                <span>•</span>
                <span>{(file.size / 1024).toFixed(1)} KB</span>
                {(uploading || loading) && (
                  <span style={{ color: '#818cf8', fontWeight: 600, animation: 'spin 1.5s linear infinite', marginLeft: 'auto' }}>
                    ⟳ Processing...
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Paste Text Tab View */
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ display:'block', marginBottom:'0.4rem', fontSize:'0.83rem', color:'rgba(255,255,255,.6)', fontWeight:600 }}>
              📄 Paste your resume text <span style={{ color:'#818cf8' }}>← Required</span>
            </label>
            <textarea
              id="resume-text-input"
              rows={10}
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              placeholder="Paste your full resume here — name, contact, summary, work experience, education, skills, projects, certifications...&#10;&#10;The more complete your resume text, the more accurate the analysis."
              style={{ width:'100%', boxSizing:'border-box', resize:'vertical', fontFamily:'monospace', fontSize:'0.82rem' }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems: 'center', marginTop:'0.25rem' }}>
              {resumeText && (
                <button
                  type="button"
                  onClick={() => setResumeText('')}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0, fontSize: '0.72rem' }}
                >
                  Clear text
                </button>
              )}
              <span style={{ fontSize:'0.72rem', color: resumeText.trim().length < 50 ? '#f87171' : '#4ade80', marginLeft: 'auto' }}>
                {resumeText.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
          </div>
        )}

        {/* Target Job Title & Description (Shared) */}
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
            <div>
              <label style={{ display:'block', marginBottom:'0.35rem', fontSize:'0.83rem', color:'rgba(255,255,255,.55)', fontWeight:600 }}>
                🎯 Target Job Title <span style={{ color:'rgba(255,255,255,.3)', fontWeight:400 }}>(optional)</span>
              </label>
              <input
                id="job-title-input"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g. Full Stack Engineer, Product Manager"
                style={{ width:'100%', boxSizing:'border-box' }}
              />
            </div>
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowJD(!showJD)}
                style={{ background:'rgba(99,102,241,.12)', border:'1px solid rgba(99,102,241,.3)', color:'#818cf8', padding:'0.5rem 1rem', borderRadius:'0.55rem', cursor:'pointer', fontWeight:600, fontSize:'0.82rem' }}
              >
                {showJD ? '▲ Hide' : '+ Add'} Job Description {review?.jobMatchScore !== undefined && review?.jobMatchScore !== null ? '✓' : '(for match %)'}
              </button>
            </div>
          </div>

          {showJD && (
            <div style={{ marginBottom:'1rem' }}>
              <label style={{ display:'block', marginBottom:'0.35rem', fontSize:'0.83rem', color:'rgba(255,255,255,.55)', fontWeight:600 }}>
                📋 Job Description <span style={{ color:'rgba(255,255,255,.3)', fontWeight:400 }}>(enables Job Match % scoring)</span>
              </label>
              <textarea
                id="job-description-input"
                rows={5}
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here to get a Job Match % score and missing keyword analysis..."
                style={{ width:'100%', boxSizing:'border-box', resize:'vertical', fontSize:'0.82rem' }}
              />
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
            <button
              id="analyze-resume-btn"
              type="submit"
              disabled={loading || uploading || (inputMode === 'upload' && !file) || (inputMode === 'paste' && !resumeText.trim())}
              style={{
                background: (loading || uploading) ? 'rgba(99,102,241,.35)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border:'none', color:'#fff', padding:'0.7rem 2rem', borderRadius:'0.6rem',
                fontWeight:700, fontSize:'0.9rem', cursor: (loading || uploading) ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', gap:'0.5rem',
                boxShadow:'0 3px 16px rgba(99,102,241,.35)',
              }}
            >
              {loading || uploading ? <><span style={{ display:'inline-block', animation:'spin 1s linear infinite' }}>⟳</span> Processing…</> : <><span>🧠</span> {inputMode === 'upload' ? 'Upload and Analyze' : 'Analyze Resume'}</>}
            </button>
            {error && <p style={{ color:'#f87171', margin:0, fontSize:'0.83rem' }}>⚠ {error}</p>}
          </div>
        </form>
      </Card>

      {/* ── Results ── */}
      {review && (
        <div style={{ marginTop:'2rem' }}>

          {/* ── Hero Score Bar ── */}
          <div style={{
            background:'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.13))',
            borderRadius:'1.2rem', padding:'1.8rem 2rem', marginBottom:'1.5rem',
            border:'1px solid rgba(99,102,241,.3)',
          }}>
            <div style={{ display:'flex', gap:'2rem', alignItems:'center', flexWrap:'wrap' }}>

              {/* Ring */}
              <div style={{ position:'relative', width:110, height:110, flexShrink:0 }}>
                <ScoreRing score={review.overallScore} color={sc(review.overallScore)} />
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
                  <span style={{ fontSize:'1.9rem', fontWeight:900, color:sc(review.overallScore), lineHeight:1 }}>{review.overallScore}</span>
                  <span style={{ fontSize:'0.58rem', color:'rgba(255,255,255,.3)', textTransform:'uppercase' }}>/ 100</span>
                </div>
              </div>

              {/* Grade */}
              <GradeBadge grade={review.grade} />

              {/* Sub-scores */}
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.5rem', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'1.5rem', fontWeight:800, color:'#fff' }}>Resume Score</span>
                  <span style={{ background: review.recruiterPerspective.wouldShortlist ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.12)', color: review.recruiterPerspective.wouldShortlist ? '#4ade80' : '#f87171', borderRadius:99, padding:'0.18rem 0.75rem', fontSize:'0.8rem', fontWeight:700 }}>
                    {review.recruiterPerspective.wouldShortlist ? '✓ Would Shortlist' : '✗ Needs Improvement'}
                  </span>
                </div>
                <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
                  {[
                    { label:'ATS', score:review.atsScore },
                    { label:'Recruiter', score:review.recruiterScore },
                    ...(review.jobMatchScore !== null ? [{ label:'Job Match', score:review.jobMatchScore! }] : []),
                    { label:'Confidence', score:review.recruiterPerspective.confidence },
                  ].map(({ label, score }) => (
                    <div key={label} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'1.3rem', fontWeight:800, color:sc(score) }}>{score}</div>
                      <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setReview(null)}
                style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.4)', padding:'0.35rem 0.8rem', borderRadius:'0.5rem', cursor:'pointer', fontSize:'0.75rem', alignSelf:'flex-start' }}
              >✕ Reset</button>
            </div>

            {/* Summary */}
            <p style={{ margin:'1rem 0 0', color:'rgba(255,255,255,.6)', fontSize:'0.85rem', lineHeight:1.65, borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:'1rem' }}>
              {review.summary}
            </p>
          </div>

          {/* ── Find Live Jobs CTA ── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem', marginBottom:'1.2rem', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
              <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.4)' }}>
                Want to apply with this resume?
              </span>
            </div>
            <button
              id="find-live-jobs-btn"
              type="button"
              onClick={() => {
                const searchQuery = jobTitle.trim() || '';
                const path = searchQuery
                  ? `/live-jobs?search=${encodeURIComponent(searchQuery)}`
                  : '/live-jobs';
                navigate(path);
              }}
              style={{
                display:'inline-flex', alignItems:'center', gap:'0.5rem',
                background:'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(220,38,38,0.15))',
                border:'1px solid rgba(239,68,68,0.4)', color:'#f87171',
                padding:'0.6rem 1.4rem', borderRadius:'0.65rem',
                fontWeight:700, fontSize:'0.85rem', cursor:'pointer',
                transition:'all 0.2s', boxShadow:'0 2px 16px rgba(239,68,68,0.15)',
                animation:'none',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,rgba(239,68,68,0.35),rgba(220,38,38,0.25))';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(220,38,38,0.15))';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'#f87171', animation:'livePulseRR 1.6s ease-in-out infinite' }} />
              <style>{`@keyframes livePulseRR { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.7)} }`}</style>
              Find Live Jobs{jobTitle.trim() ? ` for “${jobTitle.trim()}”` : ''}
            </button>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display:'flex', gap:'0.22rem', flexWrap:'wrap', marginBottom:'1.3rem', background:'rgba(255,255,255,.02)', borderRadius:'0.75rem', padding:'0.3rem', border:'1px solid rgba(255,255,255,.05)' }}>
            {TABS.map(tab => (
              <button key={tab.id} id={`tab-${tab.id}`} onClick={() => setActiveTab(tab.id)} style={{
                background: activeTab===tab.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                border:'none', color: activeTab===tab.id ? '#fff' : 'rgba(255,255,255,.38)',
                padding:'0.38rem 0.7rem', borderRadius:'0.48rem', cursor:'pointer',
                fontWeight: activeTab===tab.id ? 700 : 500, fontSize:'0.75rem', transition:'all .13s',
                boxShadow: activeTab===tab.id ? '0 2px 10px rgba(99,102,241,.4)' : 'none',
              }}>{tab.label}</button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {activeTab==='overview' && (
            <div style={{ display:'grid', gap:'1rem' }}>
              <Card>
                <SectionTitle icon="📊" title="Category Scores" />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 2rem' }}>
                  {Object.entries(review.categoryScores).map(([key, val]) => (
                    <ScoreBar key={key} label={CAT_LABELS[key] || key} score={val} />
                  ))}
                </div>
              </Card>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <Card>
                  <SectionTitle icon="💪" title="Strengths" />
                  {review.strengths.length ? review.strengths.map((s,i) => (
                    <div key={i} style={{ display:'flex', gap:'0.5rem', marginBottom:'0.5rem', fontSize:'0.83rem', color:'rgba(255,255,255,.75)' }}>
                      <span style={{ color:'#4ade80', flexShrink:0 }}>✓</span>{s}
                    </div>
                  )) : <p style={{ color:'rgba(255,255,255,.3)', fontSize:'0.83rem' }}>Add more content to identify strengths.</p>}
                </Card>
                <Card>
                  <SectionTitle icon="⚠" title="Weaknesses" />
                  {review.weaknesses.length ? review.weaknesses.map((w,i) => (
                    <div key={i} style={{ display:'flex', gap:'0.5rem', marginBottom:'0.5rem', fontSize:'0.83rem', color:'rgba(255,255,255,.75)' }}>
                      <span style={{ color:'#f87171', flexShrink:0 }}>✗</span>{w}
                    </div>
                  )) : <p style={{ color:'rgba(255,255,255,.3)', fontSize:'0.83rem' }}>No major weaknesses detected.</p>}
                </Card>
              </div>
              {review.missingSections.length > 0 && (
                <Card>
                  <SectionTitle icon="❌" title="Missing Sections" />
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
                    {review.missingSections.map(s => <Tag key={s} label={s} variant="missing" />)}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── ATS ── */}
          {activeTab==='ats' && (
            <div style={{ display:'grid', gap:'1rem' }}>
              <Card>
                <SectionTitle icon="🤖" title="ATS Compatibility Analysis" />
                <div style={{ display:'flex', gap:'2rem', alignItems:'center', flexWrap:'wrap', marginBottom:'1.4rem' }}>
                  <div style={{ position:'relative', width:95, height:95, flexShrink:0 }}>
                    <ScoreRing score={review.atsScore} size={95} color={sc(review.atsScore)} />
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:'1.4rem', fontWeight:900, color:sc(review.atsScore) }}>{review.atsScore}</span>
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:'#fff', marginBottom:'0.4rem' }}>
                      {review.atsScore >= 70 ? '✅ ATS-Friendly Resume' : review.atsScore >= 50 ? '⚠ Partially ATS Compatible' : '❌ Likely Filtered by ATS'}
                    </div>
                    <p style={{ color:'rgba(255,255,255,.5)', fontSize:'0.83rem', margin:0, lineHeight:1.6 }}>
                      {review.atsScore >= 70 ? 'Your resume should pass most ATS filters. Focus on keyword optimization for each specific job.' : 'Your resume may be filtered before reaching a recruiter. Address the issues below to improve ATS compatibility.'}
                    </p>
                  </div>
                </div>
                {review.atsAnalysis.issues.length > 0 && (
                  <div style={{ marginBottom:'1.2rem' }}>
                    <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#f87171', marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'.04em' }}>Issues Found</div>
                    {review.atsAnalysis.issues.map((issue,i) => (
                      <div key={i} style={{ display:'flex', gap:'0.45rem', marginBottom:'0.35rem', fontSize:'0.83rem', color:'rgba(255,255,255,.7)' }}>
                        <span style={{ color:'#f87171', flexShrink:0 }}>⚠</span>{issue}
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#4ade80', marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'.04em' }}>Recommendations</div>
                  {review.atsAnalysis.recommendations.map((rec,i) => (
                    <div key={i} style={{ display:'flex', gap:'0.45rem', marginBottom:'0.35rem', fontSize:'0.83rem', color:'rgba(255,255,255,.7)' }}>
                      <span style={{ color:'#4ade80', flexShrink:0 }}>→</span>{rec}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── EXPERIENCE ── */}
          {activeTab==='experience' && (
            <div style={{ display:'grid', gap:'1rem' }}>
              {review.experienceAnalysis.length > 0 ? review.experienceAnalysis.map((exp, i) => (
                <Card key={i}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'1rem', marginBottom:'0.75rem' }}>
                    <div style={{ position:'relative', width:70, height:70, flexShrink:0 }}>
                      <ScoreRing score={exp.score} size={70} color={sc(exp.score)} />
                      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontSize:'1rem', fontWeight:900, color:sc(exp.score) }}>{exp.score}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight:700, color:'#fff', marginBottom:'0.2rem', fontSize:'0.9rem' }}>{exp.role}</div>
                      <span style={{ background: exp.score>=70 ? 'rgba(34,197,94,.12)' : 'rgba(234,179,8,.12)', color: exp.score>=70 ? '#4ade80' : '#facc15', borderRadius:99, padding:'0.15rem 0.6rem', fontSize:'0.72rem', fontWeight:700 }}>
                        {exp.score >= 70 ? 'Strong' : exp.score >= 50 ? 'Adequate' : 'Needs Improvement'}
                      </span>
                    </div>
                  </div>
                  {exp.recommendations.length > 0 && (
                    <div>
                      {exp.recommendations.map((r,j) => (
                        <div key={j} style={{ display:'flex', gap:'0.4rem', marginBottom:'0.3rem', fontSize:'0.82rem', color:'rgba(255,255,255,.65)' }}>
                          <span style={{ color:'#facc15', flexShrink:0 }}>→</span>{r}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )) : (
                <Card>
                  <SectionTitle icon="💼" title="Experience" />
                  <p style={{ color:'rgba(255,255,255,.35)', fontSize:'0.85rem' }}>No distinct experience blocks detected. Make sure your experience section has clear job titles and company names.</p>
                </Card>
              )}
            </div>
          )}

          {/* ── SKILLS ── */}
          {activeTab==='skills' && (
            <div style={{ display:'grid', gap:'1rem' }}>
              <Card>
                <SectionTitle icon="🛠" title="Technical Skills Analysis" />
                <ScoreBar label="Technical Skills Score" score={review.categoryScores.technicalSkills} />
                <ScoreBar label="Soft Skills Score" score={review.categoryScores.softSkills} />
              </Card>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <Card>
                  <SectionTitle icon="✅" title={`Detected Skills (${review.skillsAnalysis.existing.length})`} />
                  <div style={{ maxHeight:220, overflowY:'auto' }}>
                    {review.skillsAnalysis.existing.length ? review.skillsAnalysis.existing.map(s => <Tag key={s} label={s} variant="matched" />) : <p style={{ color:'rgba(255,255,255,.3)', fontSize:'0.83rem' }}>No tech skills detected. Add a Skills section.</p>}
                  </div>
                </Card>
                <Card>
                  <SectionTitle icon="📌" title="Add These Skills" />
                  <div style={{ maxHeight:220, overflowY:'auto' }}>
                    {review.skillsAnalysis.missing.map(s => <Tag key={s} label={s} variant="missing" />)}
                  </div>
                </Card>
              </div>
              <Card>
                <SectionTitle icon="⭐" title="Recommended High-Value Skills" />
                {review.skillsAnalysis.recommended.map(s => <Tag key={s} label={s} variant="skill" />)}
              </Card>
            </div>
          )}

          {/* ── KEYWORDS ── */}
          {activeTab==='keywords' && (
            <div style={{ display:'grid', gap:'1rem' }}>
              <Card>
                <SectionTitle icon="🔑" title="Keyword Coverage" />
                {review.jobMatchScore !== null ? (
                  <>
                    <ScoreBar label="JD Keyword Coverage" score={review.keywordAnalysis.coveragePercentage} />
                    <p style={{ color:'rgba(255,255,255,.45)', fontSize:'0.82rem', margin:'0 0 1rem' }}>Keywords found in your resume that match the job description:</p>
                  </>
                ) : (
                  <p style={{ color:'rgba(255,255,255,.45)', fontSize:'0.82rem', margin:'0 0 1rem' }}>Add a job description to see JD-specific keyword coverage. Showing general tech keywords:</p>
                )}
                {review.keywordAnalysis.existingKeywords.map(k => <Tag key={k} label={k} variant="matched" />)}
              </Card>
              <Card>
                <SectionTitle icon="⚠" title="Missing Keywords" />
                {review.keywordAnalysis.missingKeywords.length ? (
                  <>{review.keywordAnalysis.missingKeywords.map(k => <Tag key={k} label={k} variant="missing" />)}</>
                ) : (
                  <p style={{ color:'rgba(255,255,255,.35)', fontSize:'0.83rem' }}>Add a job description to see missing JD-specific keywords.</p>
                )}
              </Card>
              <Card>
                <SectionTitle icon="💡" title="Recommended Keywords to Add" />
                {review.keywordAnalysis.recommendedKeywords.map(k => <Tag key={k} label={k} variant="warn" />)}
              </Card>
            </div>
          )}

          {/* ── SUMMARY ── */}
          {activeTab==='summary' && (
            <div style={{ display:'grid', gap:'1rem' }}>
              <Card>
                <SectionTitle icon="📝" title="Professional Summary Score" />
                <ScoreBar label="Summary Quality" score={review.categoryScores.summary} />
              </Card>
              <Card>
                <SectionTitle icon="✨" title="AI-Rewritten Professional Summary" />
                <p style={{ color:'rgba(255,255,255,.45)', fontSize:'0.8rem', margin:'0 0 0.8rem' }}>
                  Based on information extracted from your resume — edit as needed before using:
                </p>
                <div style={{ background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.2)', borderRadius:'0.7rem', padding:'1rem', color:'rgba(255,255,255,.85)', fontSize:'0.875rem', lineHeight:1.75, marginBottom:'0.75rem', whiteSpace:'pre-wrap' }}>
                  {review.summaryRewrite}
                </div>
                <button
                  onClick={() => copy(review.summaryRewrite, 'summary')}
                  style={{ background:'rgba(99,102,241,.18)', border:'none', color:'#818cf8', padding:'0.3rem 0.8rem', borderRadius:99, cursor:'pointer', fontSize:'0.76rem', fontWeight:600 }}
                >
                  {copiedKey==='summary' ? '✓ Copied!' : '📋 Copy Summary'}
                </button>
              </Card>
            </div>
          )}

          {/* ── PROJECTS ── */}
          {activeTab==='projects' && (
            <div style={{ display:'grid', gap:'1rem' }}>
              {review.projectsAnalysis.length ? review.projectsAnalysis.map((p, i) => (
                <Card key={i}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.6rem' }}>
                    <span style={{ fontSize:'1.1rem' }}>🚀</span>
                    <span style={{ fontWeight:700, color:'#fff', fontSize:'0.9rem' }}>{p.name}</span>
                    <span style={{ marginLeft:'auto', background:sc(p.score)+'20', color:sc(p.score), borderRadius:99, padding:'0.15rem 0.6rem', fontSize:'0.72rem', fontWeight:700 }}>{p.score}/100</span>
                  </div>
                  {p.description && <p style={{ color:'rgba(255,255,255,.6)', fontSize:'0.82rem', margin:'0 0 0.75rem' }}>{p.description}</p>}
                  {p.recommendations.map((r,j) => (
                    <div key={j} style={{ display:'flex', gap:'0.4rem', marginBottom:'0.3rem', fontSize:'0.82rem', color:'rgba(255,255,255,.65)' }}>
                      <span style={{ color:'#818cf8', flexShrink:0 }}>→</span>{r}
                    </div>
                  ))}
                </Card>
              )) : (
                <Card>
                  <SectionTitle icon="🚀" title="Projects" />
                  <p style={{ color:'rgba(255,255,255,.35)', fontSize:'0.85rem' }}>No projects section detected. Adding 2–3 projects significantly boosts recruiter appeal and ATS score.</p>
                  <div style={{ marginTop:'1rem' }}>
                    {['Add a Projects section with 2–3 real projects', 'Include project name, tech stack, description, and impact', 'Add GitHub and live demo links for each project', 'Quantify impact — e.g., "500+ GitHub stars", "1K+ users"'].map((tip,i) => (
                      <div key={i} style={{ display:'flex', gap:'0.4rem', marginBottom:'0.35rem', fontSize:'0.82rem', color:'rgba(255,255,255,.65)' }}>
                        <span style={{ color:'#818cf8', flexShrink:0 }}>→</span>{tip}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── CERTIFICATIONS ── */}
          {activeTab==='certifications' && (
            <div style={{ display:'grid', gap:'1rem' }}>
              <Card>
                <SectionTitle icon="🏆" title="Certifications Score" />
                <ScoreBar label="Certifications" score={review.categoryScores.certifications} />
              </Card>
              <Card>
                <SectionTitle icon="💡" title="Recommended Certifications" />
                <p style={{ color:'rgba(255,255,255,.4)', fontSize:'0.82rem', margin:'0 0 1rem' }}>High-value certifications that strengthen your profile:</p>
                {review.certificationRecommendations.map((cert, i) => {
                  const parts = cert.split(' — ');
                  return (
                    <div key={i} style={{ background:'rgba(255,255,255,.04)', borderRadius:'0.6rem', padding:'0.75rem 0.9rem', marginBottom:'0.55rem', border:'1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ fontWeight:700, color:'#818cf8', marginBottom:'0.2rem', fontSize:'0.85rem' }}>🏅 {parts[0]}</div>
                      {parts[1] && <div style={{ color:'rgba(255,255,255,.5)', fontSize:'0.78rem' }}>{parts[1]}</div>}
                    </div>
                  );
                })}
              </Card>
            </div>
          )}

          {/* ── JOB MATCH ── */}
          {activeTab==='jobmatch' && (
            review.jobMatchAnalysis ? (
              <div style={{ display:'grid', gap:'1rem' }}>
                <Card>
                  <SectionTitle icon="🎯" title="Job Match Analysis" />
                  <div style={{ display:'flex', alignItems:'center', gap:'2rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
                    <div style={{ position:'relative', width:100, height:100, flexShrink:0 }}>
                      <ScoreRing score={review.jobMatchScore!} size={100} color={sc(review.jobMatchScore!)} />
                      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
                        <span style={{ fontSize:'1.5rem', fontWeight:900, color:sc(review.jobMatchScore!) }}>{review.jobMatchScore}%</span>
                        <span style={{ fontSize:'0.58rem', color:'rgba(255,255,255,.3)' }}>match</span>
                      </div>
                    </div>
                    <div style={{ flex:1 }}>
                      <ScoreBar label="Skill Match" score={review.jobMatchAnalysis.skillMatch} />
                      <ScoreBar label="Experience Match" score={review.jobMatchAnalysis.experienceMatch} />
                      <ScoreBar label="Education Match" score={review.jobMatchAnalysis.educationMatch} />
                      <ScoreBar label="Keyword Match" score={review.jobMatchAnalysis.keywordMatch} />
                      <ScoreBar label="Industry Match" score={review.jobMatchAnalysis.industryMatch} />
                      <ScoreBar label="Responsibility Match" score={review.jobMatchAnalysis.responsibilityMatch} />
                    </div>
                  </div>
                </Card>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <Card>
                    <SectionTitle icon="✅" title="Matched Skills" />
                    {review.jobMatchAnalysis.matchedSkills.map(s => <Tag key={s} label={s} variant="matched" />)}
                  </Card>
                  <Card>
                    <SectionTitle icon="❌" title="Missing Skills (from JD)" />
                    {review.jobMatchAnalysis.missingSkills.length ? review.jobMatchAnalysis.missingSkills.map(s => <Tag key={s} label={s} variant="missing" />) : <p style={{ color:'rgba(255,255,255,.3)', fontSize:'0.83rem' }}>All required skills matched! 🎉</p>}
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <SectionTitle icon="🎯" title="Job Match Analysis" />
                <div style={{ textAlign:'center', padding:'2rem', color:'rgba(255,255,255,.35)' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>📋</div>
                  <p>Add a job description to unlock Job Match % scoring.</p>
                  <button onClick={() => { setShowJD(true); setReview(null); }} style={{ background:'rgba(99,102,241,.2)', border:'1px solid rgba(99,102,241,.35)', color:'#818cf8', padding:'0.5rem 1.2rem', borderRadius:'0.5rem', cursor:'pointer', fontWeight:600, marginTop:'0.5rem', fontSize:'0.83rem' }}>
                    + Add Job Description
                  </button>
                </div>
              </Card>
            )
          )}

          {/* ── RECRUITER ── */}
          {activeTab==='recruiter' && (
            <div style={{ display:'grid', gap:'1rem' }}>
              <Card glow={review.recruiterPerspective.wouldShortlist ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.2)'}>
                <SectionTitle icon="👔" title="Recruiter Perspective" />
                <div style={{ display:'flex', gap:'1.5rem', alignItems:'flex-start', flexWrap:'wrap' }}>
                  <div style={{
                    flexShrink:0, padding:'1rem 1.5rem', borderRadius:'0.85rem', textAlign:'center',
                    background: review.recruiterPerspective.wouldShortlist ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.1)',
                    border: `1px solid ${review.recruiterPerspective.wouldShortlist ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.25)'}`,
                  }}>
                    <div style={{ fontSize:'2.5rem', marginBottom:'0.3rem' }}>{review.recruiterPerspective.wouldShortlist ? '✅' : '❌'}</div>
                    <div style={{ fontWeight:700, color: review.recruiterPerspective.wouldShortlist ? '#4ade80' : '#f87171', fontSize:'0.85rem' }}>
                      {review.recruiterPerspective.wouldShortlist ? 'Would Shortlist' : 'Would Not Shortlist'}
                    </div>
                    <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#818cf8', marginTop:'0.5rem' }}>{review.recruiterPerspective.confidence}%</div>
                    <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,.35)' }}>Confidence</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:'rgba(255,255,255,.7)', fontSize:'0.875rem', lineHeight:1.7, margin:'0 0 1rem' }}>{review.recruiterPerspective.reason}</p>
                    {review.recruiterPerspective.concerns?.length > 0 && (
                      <div>
                        <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#facc15', marginBottom:'0.5rem', textTransform:'uppercase' }}>Main Concerns</div>
                        {review.recruiterPerspective.concerns.map((c,i) => (
                          <div key={i} style={{ display:'flex', gap:'0.4rem', marginBottom:'0.3rem', fontSize:'0.82rem', color:'rgba(255,255,255,.65)' }}>
                            <span style={{ color:'#facc15', flexShrink:0 }}>⚠</span>{c}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
              <Card>
                <SectionTitle icon="🏁" title="Final Recommendation" />
                <p style={{ color:'rgba(255,255,255,.78)', fontSize:'0.875rem', lineHeight:1.7, margin:0 }}>{review.finalRecommendation}</p>
              </Card>
            </div>
          )}

          {/* ── QUICK WINS ── */}
          {activeTab==='quickwins' && (
            <Card>
              <SectionTitle icon="⚡" title="Top 10 Quick Wins (Under 30 min each)" />
              <p style={{ color:'rgba(255,255,255,.4)', fontSize:'0.82rem', margin:'0 0 1.2rem' }}>Implement these immediately to significantly boost your resume score:</p>
              <div style={{ display:'grid', gap:'0.6rem' }}>
                {review.quickWins.map((win, i) => (
                  <div key={i} style={{ display:'flex', gap:'0.75rem', alignItems:'flex-start', background:'rgba(255,255,255,.04)', borderRadius:'0.65rem', padding:'0.75rem 1rem', border:'1px solid rgba(255,255,255,.06)' }}>
                    <span style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', borderRadius:'50%', width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.72rem', flexShrink:0 }}>{i+1}</span>
                    <span style={{ color:'rgba(255,255,255,.78)', fontSize:'0.845rem', lineHeight:1.55 }}>{win}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── ACTION PLAN ── */}
          {activeTab==='plan' && (
            <Card glow="rgba(99,102,241,.15)">
              <SectionTitle icon="📋" title="Priority Action Plan" />
              <p style={{ color:'rgba(255,255,255,.4)', fontSize:'0.82rem', margin:'0 0 1.3rem' }}>Organized by impact and urgency:</p>
              <PriorityBlock items={review.priorityPlan.high} level="high" />
              <PriorityBlock items={review.priorityPlan.medium} level="medium" />
              <PriorityBlock items={review.priorityPlan.low} level="low" />
              <div style={{ background:'rgba(99,102,241,.1)', borderRadius:'0.75rem', padding:'1rem', border:'1px solid rgba(99,102,241,.25)', marginTop:'0.5rem' }}>
                <div style={{ fontWeight:700, color:'#818cf8', marginBottom:'0.4rem', fontSize:'0.875rem' }}>🎯 Final Recommendation</div>
                <p style={{ color:'rgba(255,255,255,.7)', fontSize:'0.83rem', lineHeight:1.65, margin:0 }}>{review.finalRecommendation}</p>
              </div>
            </Card>
          )}

        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
