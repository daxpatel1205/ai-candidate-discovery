import { useEffect, useState } from 'react';
import { api, Candidate, FraudAnalysis } from '../api/client';
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

export default function FraudPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [highRisk, setHighRisk] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [analysis, setAnalysis] = useState<FraudAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/candidates').then(({ data }) => {
      const list: Candidate[] = data || [];
      setCandidates(list);
      // Auto-select the candidate whose name/email matches the logged-in user
      const matched = findMatchingCandidate(list, user);
      if (matched) setSelectedId(matched._id);
    }).catch(() => {});
    api.get('/fraud/candidates/high-risk').then(({ data }) => setHighRisk(data)).catch(() => {});
  }, [user]);

  const runAnalysis = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const { data } = await api.post('/fraud/analyze', { candidateId: selectedId });
      setAnalysis(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Fraud Detection</h1>
        <p>Detect timeline inconsistencies, skill inflation, generic content, and suspicious patterns.</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Analyze Candidate</h3>
          <div className="form-group">
            <label>Select candidate</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {!selectedId && <option value="">Choose...</option>}
              {candidates
                .filter((c) => {
                  const matched = findMatchingCandidate(candidates, user);
                  return matched ? c._id === matched._id : true;
                })
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.fraudScore != null ? `(score: ${c.fraudScore})` : ''}
                  </option>
                ))}
            </select>
            {user && candidates.find(c => c._id === selectedId && findMatchingCandidate([c], user)) && (
              <span style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                ✅ Logged in as {candidates.find(c => c._id === selectedId)?.name}
              </span>
            )}
          </div>
          <button onClick={runAnalysis} disabled={loading || !selectedId}>
            {loading ? 'Analyzing...' : 'Run Fraud Analysis'}
          </button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>High-Risk Candidates ({highRisk.length})</h3>
          {highRisk.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No high-risk candidates yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {highRisk.map((c) => (
                <li key={c._id} style={{ marginBottom: '0.35rem' }}>
                  {c.name} — <span className={`badge ${c.fraudScore! >= 70 ? 'high' : 'medium'}`}>{c.fraudScore}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {analysis && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Risk Score: {analysis.risk_score}/100</h3>
            <span className={`badge ${analysis.risk_level}`}>{analysis.risk_level} risk</span>
          </div>

          {analysis.flags.length > 0 && (
            <>
              <h4>Flags</h4>
              {analysis.flags.map((f, i) => (
                <div key={i} style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: 8, marginBottom: '0.5rem' }}>
                  <span className={`badge ${f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low'}`}>
                    {f.type}
                  </span>
                  <p style={{ margin: '0.5rem 0 0' }}>{f.message}</p>
                </div>
              ))}
            </>
          )}

          <h4>Recommendations</h4>
          <ul>
            {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
