import { FormEvent, useEffect, useState } from 'react';
import { api, Job } from '../api/client';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', requiredSkills: '', preferredSkills: '', experienceMin: '', experienceMax: '', location: '', salary: '' });

  useEffect(() => {
    setLoading(true);
    api.get('/jobs')
      .then(({ data }) => setJobs(data))
      .catch(() => setError('Unable to load jobs.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/jobs', {
        title: form.title,
        description: form.description,
        requiredSkills: form.requiredSkills.split(',').map((skill) => skill.trim()).filter(Boolean),
        preferredSkills: form.preferredSkills.split(',').map((skill) => skill.trim()).filter(Boolean),
        experienceMin: Number(form.experienceMin) || 0,
        experienceMax: Number(form.experienceMax) || 0,
        location: form.location,
        salary: form.salary,
      });
      setJobs((prev) => [data, ...prev]);
      setForm({ title: '', description: '', requiredSkills: '', preferredSkills: '', experienceMin: '', experienceMax: '', location: '', salary: '' });
    } catch (err) {
      setError('Unable to create job.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Jobs</h1>
        <p>Manage job postings for candidate matching and ranking.</p>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        <form className="card" onSubmit={handleSubmit}>
          <h3 style={{ marginTop: 0 }}>Create job posting</h3>

          <div className="form-group">
            <label>Title</label>
            <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea rows={4} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} required />
          </div>

          <div className="form-group">
            <label>Required skills</label>
            <input value={form.requiredSkills} onChange={(e) => setForm((prev) => ({ ...prev, requiredSkills: e.target.value }))} placeholder="React, AWS, Docker" />
          </div>

          <div className="form-group">
            <label>Preferred skills</label>
            <input value={form.preferredSkills} onChange={(e) => setForm((prev) => ({ ...prev, preferredSkills: e.target.value }))} placeholder="GraphQL, Kubernetes" />
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label>Experience min</label>
              <input type="number" min={0} value={form.experienceMin} onChange={(e) => setForm((prev) => ({ ...prev, experienceMin: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Experience max</label>
              <input type="number" min={0} value={form.experienceMax} onChange={(e) => setForm((prev) => ({ ...prev, experienceMax: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <input value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Salary</label>
            <input value={form.salary} onChange={(e) => setForm((prev) => ({ ...prev, salary: e.target.value }))} placeholder="$120k - $140k" />
          </div>

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Create job'}</button>
        </form>

        <div className="card" style={{ minHeight: 400 }}>
          <h3 style={{ marginTop: 0 }}>Recent jobs</h3>
          {jobs.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No jobs yet. Create one to begin ranking candidates.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {jobs.map((job) => (
                <div key={job._id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline' }}>
                    <h4 style={{ margin: 0 }}>{job.title}</h4>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{job.location || 'Remote'}</span>
                  </div>
                  <p style={{ margin: '0.5rem 0', color: 'var(--muted)' }}>{job.description.slice(0, 120)}{job.description.length > 120 ? '…' : ''}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {job.requiredSkills?.map((skill) => (
                      <span key={skill} className="badge" style={{ background: 'rgba(91, 147, 255, 0.16)', color: 'var(--accent)' }}>{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
