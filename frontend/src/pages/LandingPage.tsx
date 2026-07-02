import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

// Mock candidates for the interactive dashboard preview
interface MockCandidate {
  id: string;
  name: string;
  role: string;
  atsScore: number;
  heatScore: number;
  experience: string;
  matchStatus: 'High' | 'Medium' | 'Low';
  avatarColor: string;
  skills: string[];
  fraudScore: number;
  fraudRisk: 'low' | 'medium' | 'high';
  fraudFlags: { type: string; severity: 'low' | 'medium' | 'high'; message: string }[];
  recommendations: string[];
  interviewQuestions: string[];
  detectedLanguage: string;
  translationNote: string;
}

const mockCandidates: MockCandidate[] = [
  {
    id: '1',
    name: 'Jane Cooper',
    role: 'Senior React Developer',
    atsScore: 96,
    heatScore: 92,
    experience: '6 Years',
    matchStatus: 'High',
    avatarColor: '#6366f1',
    skills: ['React', 'TypeScript', 'Next.js', 'Redux', 'TailwindCSS'],
    fraudScore: 12,
    fraudRisk: 'low',
    fraudFlags: [],
    recommendations: [
      'Proceed with standard technical verification.',
      'No critical discrepancies found in career history.'
    ],
    interviewQuestions: [
      'Describe a complex state-management issue you solved using Redux or React Context.',
      'How do you optimize Next.js pages for Core Web Vitals?'
    ],
    detectedLanguage: 'Spanish',
    translationNote: 'Auto-translated resume contents from Spanish to English.'
  },
  {
    id: '2',
    name: 'Alex Rivera',
    role: 'AI Research Engineer',
    atsScore: 91,
    heatScore: 88,
    experience: '3 Years',
    matchStatus: 'High',
    avatarColor: '#10b981',
    skills: ['Python', 'PyTorch', 'LLMs', 'Transformers', 'HuggingFace'],
    fraudScore: 8,
    fraudRisk: 'low',
    fraudFlags: [],
    recommendations: [
      'Proceed with standard technical screening.',
      'Profile verified with LinkedIn import.'
    ],
    interviewQuestions: [
      'What is your approach to fine-tuning LLMs with limited computation resources?',
      'Explain the difference between self-attention and cross-attention in transformers.'
    ],
    detectedLanguage: 'English',
    translationNote: 'Original document uploaded in English.'
  },
  {
    id: '3',
    name: 'Sarah Jenkins',
    role: 'Full Stack Engineer',
    atsScore: 78,
    heatScore: 75,
    experience: '4 Years',
    matchStatus: 'Medium',
    avatarColor: '#f59e0b',
    skills: ['Node.js', 'React', 'MongoDB', 'AWS', 'Docker'],
    fraudScore: 45,
    fraudRisk: 'medium',
    fraudFlags: [
      {
        type: 'inconsistent_timeline',
        severity: 'medium',
        message: 'Concurrent full-time jobs listed between March 2024 - Dec 2024.'
      }
    ],
    recommendations: [
      'Ask candidate to clarify overlapping employment timeline during the initial screen.'
    ],
    interviewQuestions: [
      'How do you scale MongoDB write operations for high-throughput apps?',
      'Describe how you have set up Docker-based microservices in AWS.'
    ],
    detectedLanguage: 'French',
    translationNote: 'Auto-translated resume contents from French to English.'
  },
  {
    id: '4',
    name: 'Marcus Chen',
    role: 'DevOps & Cloud Architect',
    atsScore: 84,
    heatScore: 82,
    experience: '8 Years',
    matchStatus: 'High',
    avatarColor: '#8b5cf6',
    skills: ['Kubernetes', 'Terraform', 'CI/CD', 'AWS', 'Docker'],
    fraudScore: 78,
    fraudRisk: 'high',
    fraudFlags: [
      {
        type: 'skill_inflation',
        severity: 'high',
        message: 'Claimed AWS Certified Solutions Architect Professional certificate lacks verification link.'
      },
      {
        type: 'generic_content',
        severity: 'medium',
        message: 'High similarity index to boilerplate DevOps resume templates.'
      }
    ],
    recommendations: [
      'Manually verify AWS certifications.',
      'Conduct an in-depth live technical challenge to verify core Kubernetes knowledge.'
    ],
    interviewQuestions: [
      'Explain how you manage state across multi-region Kubernetes deployments.',
      'How do you ensure zero-downtime database migrations in a CI/CD pipeline?'
    ],
    detectedLanguage: 'English',
    translationNote: 'Original document uploaded in English.'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedCandidate, setSelectedCandidate] = useState<MockCandidate>(mockCandidates[0]);
  const [activeTab, setActiveTab] = useState<'overview' | 'fraud' | 'interview' | 'translation'>('overview');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoDate, setDemoDate] = useState('');
  const [demoTime, setDemoTime] = useState('');
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleBookDemo = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setShowDemoModal(false);
      setDemoSubmitted(false);
      setDemoName('');
      setDemoEmail('');
      setDemoDate('');
      setDemoTime('');
      alert('Demo successfully requested! Our team will contact you shortly.');
    }, 1500);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="lp-container">
      {/* ─── Sticky Navigation Bar ─── */}
      <nav className="lp-navbar">
        <div className="lp-nav-content">
          <div className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="lp-logo-icon">⚡</span>
            <span className="lp-logo-text">AI Candidate Discovery</span>
          </div>
          <div className="lp-nav-links">
            <button className="lp-link-btn" onClick={() => scrollToSection('features')}>Features</button>
            <button className="lp-link-btn" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button className="lp-link-btn" onClick={() => scrollToSection('faq')}>FAQ</button>
          </div>
          <div className="lp-nav-actions">
            <button className="lp-btn-login" onClick={() => navigate('/login')}>Login</button>
            <button className="lp-btn-primary lp-nav-cta" onClick={() => navigate('/register')}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <header className="lp-hero">
        <div className="lp-hero-grid">
          <div className="lp-hero-text">
            <div className="lp-badge lp-hero-badge">✨ AI-Powered Candidate Discovery</div>
            <h1 className="lp-title">Hire Smarter <br /><span className="lp-highlight">AI Candidate Discovery</span></h1>
            <p className="lp-subtitle">
              Instantly aggregate, rank, and match top talent from across the web. Parse resumes with advanced AI, analyze skills gaps, detect fraud, and generate interview outreach in seconds.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-btn-primary lp-hero-cta" onClick={() => navigate('/register')}>
                Upload Resume
              </button>
              <button className="lp-btn-secondary" onClick={() => setShowDemoModal(true)}>
                Book Demo
              </button>
            </div>
          </div>

          {/* Hero Dashboard Mockup Card */}
          <div className="lp-hero-mockup">
            <div className="lp-mockup-frame">
              <div className="lp-mockup-header">
                <div className="lp-dots"><span /><span /><span /></div>
                <div className="lp-mockup-title">Workspace - Active Match</div>
              </div>
              <div className="lp-mockup-body">
                <div className="lp-mockup-card">
                  <div className="lp-m-header">
                    <div className="lp-m-avatar" style={{ backgroundColor: '#6366f1' }}>JL</div>
                    <div>
                      <h4>Jordan Lee</h4>
                      <p>Senior Full Stack Engineer</p>
                    </div>
                    <span className="lp-m-score">94%</span>
                  </div>
                  <div className="lp-m-meta">
                    <span>📍 SF, CA</span>
                    <span>💰 $180k - $220k</span>
                  </div>
                  <div className="lp-m-skills">
                    <span>React</span>
                    <span>Node.js</span>
                    <span>System Design</span>
                    <span>AWS</span>
                  </div>
                  <div className="lp-m-ai-box">
                    <div className="lp-m-ai-title">🤖 AI Eligibility Verdict</div>
                    <p>Highly qualified for lead architect roles. Strongly aligned on tech stack. Suggestions: Verify system design architecture experience.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Trusted By Section ─── */}
      <section className="lp-trusted">
        <p className="lp-section-subtitle">TRUSTED BY TECH LEADERS WORLDWIDE</p>
        <div className="lp-trusted-logos">
          <div className="lp-logo-item">Stripe</div>
          <div className="lp-logo-item">Vercel</div>
          <div className="lp-logo-item">Cognition</div>
          <div className="lp-logo-item">Google</div>
          <div className="lp-logo-item">GitHub</div>
        </div>
      </section>

      {/* ─── Feature Grid Section ─── */}
      <section id="features" className="lp-features">
        <div className="lp-section-header">
          <span className="lp-section-pre">FEATURES</span>
          <h2 className="lp-section-title">Everything You Need to Hire Faster</h2>
          <p className="lp-section-desc">Accelerate your recruitment workflow with powerful AI integrations designed to discover the absolute best candidate match.</p>
        </div>

        <div className="lp-feature-grid">
          <div className="lp-feature-card">
            <div className="lp-feature-icon">📄</div>
            <h3>AI Resume Ingestion</h3>
            <p>Extract structured details, experience, education, and skills from any PDF/Word resume instantly, featuring advanced OCR for scanned documents via Tesseract.js.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon">💼</div>
            <h3>LinkedIn Profile Analyst</h3>
            <p>Import, parse, and analyze LinkedIn profiles side-by-side with resumes to cross-verify career achievements, job titles, and employment history.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon">🎤</div>
            <h3>Gemini Interview Prep</h3>
            <p>Generate highly customized, role-tailored technical, behavioral, and situational screening sheets with adaptive follow-up questions powered by Gemini.</p>
          </div>
        </div>
      </section>

      {/* ─── How It Works Timeline ─── */}
      <section id="how-it-works" className="lp-how">
        <div className="lp-section-header">
          <span className="lp-section-pre">TIMELINE</span>
          <h2 className="lp-section-title">Streamlined Hiring Pipeline</h2>
          <p className="lp-section-desc">Go from a raw resume file to an scheduled, verified interview process in 4 simple steps.</p>
        </div>

        <div className="lp-timeline">
          <div className="lp-timeline-line"></div>
          <div className="lp-timeline-step">
            <div className="lp-step-num">1</div>
            <h3>Semantic Search</h3>
            <p>Query candidate pools using natural language to locate specific profiles.</p>
          </div>
          <div className="lp-timeline-step">
            <div className="lp-step-num">2</div>
            <h3>AI Fraud Detection</h3>
            <p>Detect inconsistencies, skill inflation, and calculate risk scoring.</p>
          </div>
          <div className="lp-timeline-step">
            <div className="lp-step-num">3</div>
            <h3>Candidate Ranking</h3>
            <p>Get instant matching scores and detailed skill alignment reports.</p>
          </div>
          <div className="lp-timeline-step">
            <div className="lp-step-num">4</div>
            <h3>Multilingual Support</h3>
            <p>Automatically translate resumes and execute cross-language job matching.</p>
          </div>
        </div>
      </section>

      {/* ─── Interactive AI Dashboard Preview ─── */}
      <section className="lp-preview">
        <div className="lp-section-header">
          <span className="lp-section-pre">LIVE PREVIEW</span>
          <h2 className="lp-section-title">Explore the AI Dashboard</h2>
          <p className="lp-section-desc">Click on different candidates in the list to see how our AI updates the match scores, ATS charts, and compatibility assessments in real-time.</p>
        </div>

        <div className="lp-preview-container">
          {/* Candidates list panel */}
          <div className="lp-preview-sidebar">
            <h4>Candidates</h4>
            <div className="lp-preview-list">
              {mockCandidates.map((c) => (
                <div
                  key={c.id}
                  className={`lp-preview-item ${selectedCandidate.id === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedCandidate(c)}
                >
                  <div className="lp-prev-avatar" style={{ backgroundColor: c.avatarColor }}>
                    {c.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="lp-prev-info">
                    <strong>{c.name}</strong>
                    <span>{c.role}</span>
                  </div>
                  <span className={`lp-prev-badge ${c.matchStatus.toLowerCase()}`}>{c.atsScore}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Detail Mockup Panel */}
          <div className="lp-preview-detail">
            <div className="lp-preview-detail-header">
              <div className="lp-prev-avatar-large" style={{ backgroundColor: selectedCandidate.avatarColor }}>
                {selectedCandidate.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="lp-prev-detail-title">
                <h3>{selectedCandidate.name}</h3>
                <p>{selectedCandidate.role} • {selectedCandidate.experience} Exp</p>
              </div>
              <div className="lp-prev-detail-match" style={{ color: selectedCandidate.atsScore >= 90 ? '#4ade80' : selectedCandidate.atsScore >= 80 ? '#fbbf24' : '#fb7185' }}>
                {selectedCandidate.atsScore}% Match
              </div>
            </div>

            {/* Interactive Preview Tabs */}
            <div className="lp-preview-tabs">
              <button
                className={`lp-preview-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                📊 Overview
              </button>
              <button
                className={`lp-preview-tab ${activeTab === 'fraud' ? 'active' : ''}`}
                onClick={() => setActiveTab('fraud')}
              >
                🛡️ AI Fraud Risk
              </button>
              <button
                className={`lp-preview-tab ${activeTab === 'interview' ? 'active' : ''}`}
                onClick={() => setActiveTab('interview')}
              >
                🎤 Interview Prep
              </button>
              <button
                className={`lp-preview-tab ${activeTab === 'translation' ? 'active' : ''}`}
                onClick={() => setActiveTab('translation')}
              >
                🌐 Multilingual
              </button>
            </div>

            {/* Conditional Tab Rendering */}
            {activeTab === 'overview' && (
              <div className="lp-tab-content active animate-fade-in">
                {/* Simulated Charts */}
                <div className="lp-preview-charts">
                  <div className="lp-chart-card">
                    <h5>ATS Score Weight</h5>
                    <div className="lp-bar-chart">
                      <div className="lp-bar-row">
                        <span>Skills</span>
                        <div className="lp-bar-track">
                          <div className="lp-bar-fill" style={{ width: `${selectedCandidate.atsScore - 5}%` }}></div>
                        </div>
                      </div>
                      <div className="lp-bar-row">
                        <span>Experience</span>
                        <div className="lp-bar-track">
                          <div className="lp-bar-fill" style={{ width: `${selectedCandidate.heatScore - 2}%`, backgroundColor: '#10b981' }}></div>
                        </div>
                      </div>
                      <div className="lp-bar-row">
                        <span>Education</span>
                        <div className="lp-bar-track">
                          <div className="lp-bar-fill" style={{ width: '85%', backgroundColor: '#f59e0b' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lp-chart-card">
                    <h5>Candidate Alignment Gauge</h5>
                    <div className="lp-donut-chart">
                      <svg width="100" height="100" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="transparent" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke={selectedCandidate.atsScore >= 90 ? '#6366f1' : selectedCandidate.atsScore >= 80 ? '#10b981' : '#f59e0b'}
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - selectedCandidate.atsScore / 100)}`}
                          transform="rotate(-90 50 50)"
                        />
                        <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="bold">
                          {selectedCandidate.heatScore}%
                        </text>
                      </svg>
                      <span>Heat Index Score</span>
                    </div>
                  </div>
                </div>

                {/* Key Skills */}
                <div className="lp-preview-skills">
                  <h5>Extracted Technical Stack</h5>
                  <div className="lp-skills-list">
                    {selectedCandidate.skills.map((skill) => (
                      <span key={skill} className="lp-skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fraud' && (
              <div className="lp-tab-content active animate-fade-in">
                <div className="lp-fraud-summary-card">
                  <div className="lp-fraud-score-box">
                    <span className="lp-fraud-score-num">{selectedCandidate.fraudScore}</span>
                    <span className="lp-fraud-score-label">Risk Score</span>
                  </div>
                  <div className="lp-fraud-risk-badge-container">
                    <span className={`lp-fraud-badge risk-${selectedCandidate.fraudRisk}`}>
                      {selectedCandidate.fraudRisk.toUpperCase()} RISK
                    </span>
                    <p className="lp-fraud-text">
                      {selectedCandidate.fraudRisk === 'low'
                        ? 'Candidate verification successfully completed. Background matches history.'
                        : selectedCandidate.fraudRisk === 'medium'
                        ? 'Minor inconsistencies flagged. Recommended to verify details.'
                        : 'Significant abnormalities detected. Extreme caution advised.'}
                    </p>
                  </div>
                </div>

                <div className="lp-fraud-flags-section">
                  <h5>Timeline & Credential Flags</h5>
                  {selectedCandidate.fraudFlags.length === 0 ? (
                    <div className="lp-fraud-empty">✓ No timeline gaps or skill inflation discrepancies detected.</div>
                  ) : (
                    <div className="lp-fraud-flags-list">
                      {selectedCandidate.fraudFlags.map((flag, idx) => (
                        <div key={idx} className={`lp-fraud-flag-item severity-${flag.severity}`}>
                          <span className="lp-flag-tag">{flag.type.replace('_', ' ').toUpperCase()}</span>
                          <p>{flag.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lp-fraud-recs-section">
                  <h5>Recruiter Action Recommendations</h5>
                  <ul className="lp-fraud-recs-list">
                    {selectedCandidate.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'interview' && (
              <div className="lp-tab-content active animate-fade-in">
                <div className="lp-interview-header-card">
                  🤖 Tailored Interview Generator
                  <p>AI-synthesized based on role requirements and parsed resume credentials.</p>
                </div>
                <div className="lp-interview-questions-list">
                  {selectedCandidate.interviewQuestions.map((q, idx) => (
                    <div key={idx} className="lp-interview-q-card">
                      <div className="lp-q-num">Q{idx + 1}</div>
                      <div className="lp-q-body">
                        <p className="lp-q-text">{q}</p>
                        <span className="lp-q-meta">🎯 Target: Verification of core hands-on competency.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'translation' && (
              <div className="lp-tab-content active animate-fade-in">
                <div className="lp-translation-grid">
                  <div className="lp-trans-col">
                    <h5>Detected Language</h5>
                    <span className="lp-lang-badge">🌐 {selectedCandidate.detectedLanguage}</span>
                  </div>
                  <div className="lp-trans-col">
                    <h5>Translation Status</h5>
                    <p className="lp-trans-status-text">{selectedCandidate.translationNote}</p>
                  </div>
                </div>

                <div className="lp-trans-preview-box">
                  <div className="lp-trans-preview-header">
                    <span>Cross-Language Job Alignment Summary</span>
                    <span className="lp-badge-live">Live Match</span>
                  </div>
                  <p className="lp-trans-preview-desc">
                    {selectedCandidate.detectedLanguage !== 'English' ? (
                      <>
                        <strong>Original:</strong> Resume parsed in {selectedCandidate.detectedLanguage} and matched using semantic multilingual embedding vector space. <br />
                        <strong>Translated Context:</strong> "Candidate possesses {selectedCandidate.experience} of engineering capability, heavily focusing on {selectedCandidate.skills.slice(0, 3).join(', ')}. Strong capability to work on distributed teams."
                      </>
                    ) : (
                      <>
                        <strong>English Context:</strong> Resume parsed originally in English. Matched against regional requirements. Candidate possesses {selectedCandidate.experience} of engineering experience, focusing on {selectedCandidate.skills.slice(0, 3).join(', ')}.
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="lp-testimonials">
        <div className="lp-section-header">
          <span className="lp-section-pre">TESTIMONIALS</span>
          <h2 className="lp-section-title">What Recruiters Say</h2>
        </div>

        <div className="lp-testimonials-grid">
          <div className="lp-testimonial-card">
            <p className="lp-testimonial-text">
              "Antigravity AI has completely transformed our engineering recruitment. The AI Match scores are incredibly accurate, saving us dozens of hours filtering resumes."
            </p>
            <div className="lp-testimonial-author">
              <div className="lp-author-avatar">CH</div>
              <div>
                <strong>Carla Henderson</strong>
                <span>VP of HR, CloudSync</span>
              </div>
            </div>
          </div>

          <div className="lp-testimonial-card">
            <p className="lp-testimonial-text">
              "The semantic search capabilities allowed us to find candidates matching obscure technical skill sets in minutes instead of days of boolean search adjustments."
            </p>
            <div className="lp-testimonial-author">
              <div className="lp-author-avatar">AS</div>
              <div>
                <strong>Aria Smith</strong>
                <span>Lead Tech Recruiter, WebFlow</span>
              </div>
            </div>
          </div>

          <div className="lp-testimonial-card">
            <p className="lp-testimonial-text">
              "Being able to generate custom interview questions and draft recruiter outreach emails tailored directly to candidates' resumes has cut our time-to-interview in half."
            </p>
            <div className="lp-testimonial-author">
              <div className="lp-author-avatar">RE</div>
              <div>
                <strong>Rassel Edin</strong>
                <span>Head of Talent, Vercel</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ─── FAQ Accordion Section ─── */}
      <section id="faq" className="lp-faq">
        <div className="lp-section-header">
          <span className="lp-section-pre">FAQ</span>
          <h2 className="lp-section-title">Frequently Asked Questions</h2>
        </div>

        <div className="lp-faq-list">
          {[
            {
              q: "How does the AI matching score work?",
              a: "Our AI matching score utilizes the Gemini API to analyze candidate profiles and compare them with the requirements of the job description. It calculates experience compatibility, core skill matches, and auxiliary skills, returning a percentage representing the overall fit."
            },
            {
              q: "Can I upload multiple resumes at once?",
              a: "Yes! The platform supports bulk resume ingestion. You can drag and drop multiple PDF or Word files, and the background synchronization service parses and indexes them simultaneously."
            },
            {
              q: "Is my candidate data secure?",
              a: "Absolutely. Candidate data is encrypted in transit and at rest. We adhere strictly to data privacy standards and only use verified AI APIs that respect customer privacy and do not train models on your candidate databases."
            },
            {
              q: "Do you support custom selection processes?",
              a: "Yes. Our recruitment dashboard allows configuring custom job criteria, preferred experience levels, and department filters to align matching results with your exact selection process."
            }
          ].map((item, idx) => (
            <div key={idx} className={`lp-faq-item ${activeFaq === idx ? 'active' : ''}`} onClick={() => toggleFaq(idx)}>
              <div className="lp-faq-question">
                <span>{item.q}</span>
                <span className="lp-faq-icon">{activeFaq === idx ? '−' : '+'}</span>
              </div>
              {activeFaq === idx && (
                <div className="lp-faq-answer">
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Final CTA Banner ─── */}
      <section className="lp-final-cta">
        <div className="lp-cta-card">
          <h2>Ready to revolutionize your hiring workflow?</h2>
          <p>Get started today and discover top talent in minutes instead of weeks.</p>
          <button className="lp-btn-primary" onClick={() => navigate('/register')}>Get Started for Free</button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="lp-footer">
        <div className="lp-footer-grid">
          <div className="lp-footer-col">
            <span className="lp-foot-logo">⚡ AI Candidate Discovery</span>
            <p>Next-generation talent aggregation and AI matching for modern, scaling tech organizations.</p>
          </div>
          <div className="lp-footer-col">
            <h5>Features</h5>
            <ul>
              <li><button onClick={() => navigate('/register')}>Resume Ingestion</button></li>
              <li><button onClick={() => navigate('/register')}>AI Outreach</button></li>
              <li><button onClick={() => navigate('/register')}>Skill Benchmarking</button></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h5>Company</h5>
            <ul>
              <li><button onClick={() => scrollToSection('features')}>About Us</button></li>
              <li><button onClick={() => scrollToSection('how-it-works')}>How It Works</button></li>
              <li><button onClick={() => setShowDemoModal(true)}>Contact Sales</button></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h5>Contact</h5>
            <p>Email: contact@candidate-discovery.ai</p>
            <p>Tel: +1 (555) 019-2834</p>
            <div className="lp-socials">
              <span>𝕏</span>
              <span>💼</span>
              <span>🐱</span>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>© {new Date().getFullYear()} AI Candidate Discovery. All rights reserved.</p>
        </div>
      </footer>

      {/* ─── Interactive Booking Modal ─── */}
      {showDemoModal && (
        <div className="lp-modal-overlay" onClick={() => setShowDemoModal(false)}>
          <div className="lp-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="lp-modal-close" onClick={() => setShowDemoModal(false)}>✕</button>
            <h3>Schedule a Live Demo</h3>
            <p>Choose a convenient time, and one of our AI recruitment specialists will walk you through the platform capabilities.</p>
            <form onSubmit={handleBookDemo}>
              <div className="lp-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  disabled={demoSubmitted}
                />
              </div>
              <div className="lp-form-group">
                <label>Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="jane@company.com"
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  disabled={demoSubmitted}
                />
              </div>
              <div className="lp-form-row">
                <div className="lp-form-group">
                  <label>Select Date</label>
                  <input
                    type="date"
                    required
                    value={demoDate}
                    onChange={(e) => setDemoDate(e.target.value)}
                    disabled={demoSubmitted}
                  />
                </div>
                <div className="lp-form-group">
                  <label>Select Time</label>
                  <input
                    type="time"
                    required
                    value={demoTime}
                    onChange={(e) => setDemoTime(e.target.value)}
                    disabled={demoSubmitted}
                  />
                </div>
              </div>
              <button type="submit" className="lp-btn-primary lp-modal-submit" disabled={demoSubmitted}>
                {demoSubmitted ? 'Scheduling...' : 'Confirm Call Slot'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
