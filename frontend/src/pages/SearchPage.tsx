import { FormEvent, useState } from 'react';
import { api } from '../api/client';

type SearchResult = {
  candidate_id: string;
  score: number;
  snippet: string;
  candidate?: { name?: string; skills?: string[] };
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const filters = language ? { language } : {};
      const { data } = await api.post('/search', { query, filters, limit: 20 });
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>AI Candidate Search</h1>
        <p>Use natural language search and instant recommendations to discover top applicants fast.</p>
      </div>

      <section className="glass-card card" style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.45rem' }}>Smart search</h2>
        <p style={{ margin: '0.75rem 0 1.5rem', color: '#A1A1AA' }}>Search by role, skills, location, experience, and AI match criteria.</p>
        <form onSubmit={handleSearch} className="grid-2" style={{ gap: '1rem' }}>
          <div className="form-group">
            <label>Search query</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find React developers with AWS, Docker, Kubernetes, and 5 years experience"
              required
            />
          </div>
          <div className="form-group">
            <label>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="">Any language</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="hi">Hindi</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
            <button type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? 'Searching...' : 'Search candidates'}</button>
            {SpeechRecognition && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  if (!SpeechRecognition) return;
                  const recognition = new SpeechRecognition();
                  recognition.lang = 'en-US';
                  recognition.interimResults = false;
                  recognition.maxAlternatives = 1;
                  setListening(true);
                  recognition.onresult = (event: any) => {
                    const transcript = event.results?.[0]?.[0]?.transcript;
                    if (transcript) setQuery(transcript);
                    setListening(false);
                    recognition.stop();
                  };
                  recognition.onerror = () => setListening(false);
                  recognition.start();
                }}
              >
                {listening ? 'Listening…' : 'Voice search'}
              </button>
            )}
          </div>
        </form>
      </section>

      <div className="grid-2">
        <div className="glass-card card">
          <h3 style={{ marginTop: 0 }}>Suggested prompts</h3>
          <ul style={{ margin: '1rem 0 0', paddingLeft: '1.1rem', color: '#D1D5DB' }}>
            <li>Senior frontend engineer with TypeScript and React</li>
            <li>Backend developer with Node.js, AWS, and microservices</li>
            <li>Product designer with Figma, research, and leadership</li>
          </ul>
        </div>
        <div className="glass-card card">
          <h3 style={{ marginTop: 0 }}>Search tips</h3>
          <p style={{ margin: '1rem 0 0', color: '#D1D5DB' }}>
            Use multi-dimensional filters to narrow down resumes by experience, language, and AI match score. Your next great hire is one query away.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '1.75rem', display: 'grid', gap: '1rem' }}>
        {results.length === 0 ? (
          <div className="glass-card card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ margin: 0, color: '#A1A1AA' }}>No search results yet. Enter a query to explore candidates.</p>
          </div>
        ) : results.map((item) => (
          <div key={item.candidate_id} className="glass-card card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>{item.candidate?.name || 'Candidate profile'}</h3>
                <p style={{ margin: '0.5rem 0 0', color: '#A1A1AA' }}>{item.snippet}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-accent">AI match {Math.round(item.score)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
