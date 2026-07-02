import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('recruiter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }

    setLoading(true);
    try {
      await register(name, email, password, role);
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <div className="auth-logo" style={{ margin: '0 auto' }}>CD</div>
          <h2>Create Account</h2>
          <p>Set up your recruiting workspace</p>
        </div>

        {error && (
          <div className="alert error" role="alert" style={{ marginBottom: '1.25rem' }}>
            <span>⚠</span> {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@company.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-role">Workspace Role</label>
            <select id="reg-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="recruiter">Recruiter</option>
              <option value="candidate">Candidate</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? <><span className="spinner" />Creating Account…</> : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
