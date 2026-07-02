import { FormEvent, useEffect, useState } from 'react';
import { api, Candidate } from '../api/client';
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

export default function MultilingualPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateId, setCandidateId] = useState('');
  const [detectResult, setDetectResult] = useState<Record<string, any> | null>(null);
  const [translateText, setTranslateText] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [translateResult, setTranslateResult] = useState<{ translated_text?: string; notes?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/candidates').then(({ data }) => {
      const list: Candidate[] = data || [];
      setCandidates(list);
      // Auto-select the candidate whose name/email matches the logged-in user
      const matched = findMatchingCandidate(list, user);
      if (matched) setCandidateId(matched._id);
    }).catch(() => {});
  }, [user]);

  const handleDetect = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/i18n/detect', { candidateId });
      setDetectResult(data);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/i18n/translate', {
        text: translateText,
        targetLanguage: targetLang,
      });
      setTranslateResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Multilingual Support</h1>
        <p>Detect resume language and translate content for cross-language candidate matching.</p>
      </div>

      <div className="grid-2">
        <form className="card" onSubmit={handleDetect}>
          <h3 style={{ marginTop: 0 }}>Language Detection</h3>
          <div className="form-group">
            <label>Candidate</label>
            <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} required>
              {!candidateId && <option value="">Select candidate</option>}
              {candidates
                .filter((c) => {
                  const matched = findMatchingCandidate(candidates, user);
                  return matched ? c._id === matched._id : true;
                })
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.language ? `(${c.language})` : ''}
                  </option>
                ))}
            </select>
            {user && candidates.find(c => c._id === candidateId && findMatchingCandidate([c], user)) && (
              <span style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                ✅ Logged in as {candidates.find(c => c._id === candidateId)?.name}
              </span>
            )}
          </div>
          <button type="submit" disabled={loading}>Detect Language</button>

          {detectResult && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 8 }}>
              <p style={{ margin: 0 }}>
                <strong>{detectResult.language_name as string}</strong> ({detectResult.language as string})
              </p>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.875rem' }}>
                Confidence: {((detectResult.confidence as number) * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </form>

        <form className="card" onSubmit={handleTranslate}>
          <h3 style={{ marginTop: 0 }}>Translate Text</h3>
          <div className="form-group">
            <label>Text to translate</label>
            <textarea
              rows={4}
              value={translateText}
              onChange={(e) => setTranslateText(e.target.value)}
              placeholder="Paste resume excerpt or job description..."
              required
            />
          </div>
          <div className="form-group">
            <label>Target language</label>
            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="hi">Hindi</option>
              <option value="zh">Chinese</option>
              <option value="ar">Arabic</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          <button type="submit" disabled={loading}>Translate</button>

          {translateResult && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 8 }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{translateResult.translated_text as string}</p>
              {translateResult.notes && (
                <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)', fontSize: '0.875rem' }}>
                  {translateResult.notes as string}
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
