import { FormEvent, useEffect, useState, useRef } from 'react';
import { api, Candidate, Job, InterviewQuestion } from '../api/client';
import { useAuth } from '../context/AuthContext';

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

export default function InterviewPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidateId, setCandidateId] = useState('');
  const [jobId, setJobId] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState('en');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [summary, setSummary] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    api.get('/candidates').then(({ data }) => {
      const list: Candidate[] = data || [];
      setCandidates(list);
      // Auto-select the candidate whose name/email matches the logged-in user
      const matched = findMatchingCandidate(list, user);
      if (matched) setCandidateId(matched._id);
    }).catch(() => {});
    api.get('/jobs').then(({ data }) => setJobs(data || [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    // Load available TTS voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const list = window.speechSynthesis.getVoices();
        setVoices(list);
        // Set default English voice if possible
        const defaultVoice = list.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google')) || list.find(v => v.lang.startsWith('en')) || list[0];
        if (defaultVoice) {
          setSelectedVoiceName(defaultVoice.name);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Web Speech STT setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : language === 'hi' ? 'hi-IN' : 'de-DE';

        rec.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          const text = final || interim;
          setAnswers(prev => ({
            ...prev,
            [currentIdx]: text
          }));
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, [language, currentIdx]);

  const speakQuestion = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // stop previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Determine language code
      const langMap: Record<string, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', hi: 'hi-IN', de: 'de-DE' };
      utterance.lang = langMap[language] || 'en-US';

      // Pick selected voice
      if (selectedVoiceName) {
        const found = voices.find(v => v.name === selectedVoiceName);
        if (found) utterance.voice = found;
      }
      
      utterance.rate = 0.95; // slightly slower for professional feel
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const startSimulation = () => {
    if (questions.length > 0) {
      setIsSimulating(true);
      setCurrentIdx(0);
      setAnswers({});
      // Speak the first question automatically
      setTimeout(() => {
        speakQuestion(questions[0].question);
      }, 300);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setTimeout(() => {
        speakQuestion(questions[nextIdx].question);
      }, 200);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIdx > 0) {
      const prevIdx = currentIdx - 1;
      setCurrentIdx(prevIdx);
      setTimeout(() => {
        speakQuestion(questions[prevIdx].question);
      }, 200);
    }
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/interview/generate', {
        candidateId,
        jobId: jobId || undefined,
        difficulty,
        count,
        language,
        topic: topic.trim() || undefined,
        categories: ['technical', 'behavioral', 'situational'],
      });
      setQuestions(data.questions || []);
      setSummary(data.summary || '');
      setDuration(data.recommended_duration_minutes || null);
      setIsSimulating(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1>🎙️ AI Interview Simulator</h1>
        <p>Generate highly tailored questions, and practice with a real interactive voice simulator.</p>
      </div>

      {!isSimulating ? (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Generation Form */}
          <form className="card" onSubmit={handleGenerate} style={{ display: 'grid', gap: '1.25rem' }}>
            <div className="grid-2">
              <div className="form-group">
                <label>Candidate Profile</label>
                <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} required>
                  {!candidateId && <option value="">Select candidate</option>}
                  {candidates
                    .filter((c) => {
                      const matched = findMatchingCandidate(candidates, user);
                      return matched ? c._id === matched._id : true;
                    })
                    .map((c) => (
                      <option key={c._id} value={c._id}>{c.name} ({c.skills?.slice(0, 3).join(', ')})</option>
                    ))}
                </select>
                {user && candidates.find(c => c._id === candidateId && findMatchingCandidate([c], user)) && (
                  <span style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                    ✅ Logged in as {candidates.find(c => c._id === candidateId)?.name}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label>Job Context (optional)</label>
                <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                  <option value="">No specific job</option>
                  {jobs.map((j) => (
                    <option key={j._id} value={j._id}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Target Topic / Tech Stack (e.g. AWS, React, Python)</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. AWS, Node.js, Leadership"
                />
              </div>
              <div className="form-group">
                <label>Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="hi">Hindi</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="form-group">
                <label>Number of Questions</label>
                <input
                  type="number"
                  min={2}
                  max={15}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </div>
            </div>

            {voices.length > 0 && (
              <div className="form-group">
                <label>Interviewer Voice Profile</label>
                <select value={selectedVoiceName} onChange={(e) => setSelectedVoiceName(e.target.value)}>
                  {voices
                    .filter(v => {
                      const langMap: Record<string, string> = { en: 'en', es: 'es', fr: 'fr', hi: 'hi', de: 'de' };
                      return v.lang.startsWith(langMap[language] || 'en');
                    })
                    .map((v) => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                </select>
              </div>
            )}

            <button type="submit" disabled={loading} style={{ padding: '1rem', fontSize: '1rem' }}>
              {loading ? '🧠 Architecting Interview...' : '🚀 Generate Tailored Questions'}
            </button>
          </form>

          {/* Generated Questions List & Simulation Trigger */}
          {questions.length > 0 && (
            <div style={{ display: 'grid', gap: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>📄 Generated Interview Plan</h3>
                  {duration && <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Estimated duration: ~{duration} mins</span>}
                </div>
                <button
                  type="button"
                  onClick={startSimulation}
                  style={{
                    background: 'linear-gradient(135deg, #a855f7, #8b5cf6)',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
                    padding: '0.9rem 1.8rem',
                    fontSize: '0.95rem'
                  }}
                >
                  🎙️ Start Simulated Live Interview
                </button>
              </div>

              {summary && (
                <div className="card" style={{ background: 'rgba(91,147,255,0.06)', border: '1px solid rgba(91,147,255,0.15)' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)' }}><strong>AI Summary:</strong> {summary}</p>
                </div>
              )}

              {questions.map((q, idx) => (
                <div key={q.id || idx} className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>{q.category}</span>
                    <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>{q.difficulty}</span>
                  </div>
                  <p style={{ margin: '0 0 0.8rem 0', fontSize: '1rem', fontWeight: 600 }}>{q.question}</p>
                  {q.evaluation_criteria && q.evaluation_criteria.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      <strong>Criteria:</strong> {q.evaluation_criteria.join(' · ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Simulation Mode */
        <div className="card" style={{ padding: '2.5rem', display: 'grid', gap: '2rem', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 30px 100px rgba(139,92,246,0.15)' }}>
          {/* Progress Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#c084fc' }}>
              Simulated Interview Session
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--muted)' }}>
              Question {currentIdx + 1} of {questions.length}
            </span>
          </div>

          {/* Interactive Interviewer */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #8b5cf6)', display: 'grid', placeItems: 'center', fontSize: '1.4rem' }}>
              👤
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.2rem' }}>
                Interviewer Speaks
              </div>
              <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
                "{questions[currentIdx]?.question}"
              </p>
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => speakQuestion(questions[currentIdx]?.question)}
              title="Repeat question"
              style={{ padding: '0.6rem 0.9rem', fontSize: '0.85rem' }}
            >
              🔊 Repeat
            </button>
          </div>

          {/* Answer Area */}
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>🎙️ Your Answer</span>
              {isListening && <span style={{ color: '#fb7185', animation: 'pulse 1.5s infinite' }}>⬤ Recording Voice...</span>}
            </label>
            
            <textarea
              rows={6}
              value={answers[currentIdx] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [currentIdx]: e.target.value }))}
              placeholder="Record your answer with the microphone below, or type your answer here..."
              style={{ fontSize: '0.95rem', lineHeight: 1.6, padding: '1rem', borderRadius: '16px', background: 'rgba(5, 8, 16, 0.6)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
            />

            {/* Voice Control Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
              {!isListening ? (
                <button
                  type="button"
                  onClick={startListening}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  🎤 Start Speaking
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopListening}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  ⏹ Stop Microphone
                </button>
              )}
            </div>
          </div>

          {/* Follow-ups & Evaluation Hints */}
          {questions[currentIdx]?.evaluation_criteria && (
            <div style={{ background: 'rgba(91, 147, 255, 0.04)', border: '1px solid rgba(91, 147, 255, 0.1)', padding: '1.2rem', borderRadius: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--accent)', marginBottom: '0.5rem' }}>
                💡 Key Evaluation Criteria
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                {questions[currentIdx].evaluation_criteria.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setIsSimulating(false);
              }}
            >
              🚪 Exit Interview
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="secondary"
                disabled={currentIdx === 0}
                onClick={handlePrevQuestion}
              >
                ← Previous Question
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                >
                  Next Question →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                    setIsSimulating(false);
                    alert('🎉 Congratulations! You have completed the simulated interview.');
                  }}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
                >
                  🎉 Complete Interview
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded styles for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.97); }
        }
      `}</style>
    </div>
  );
}
