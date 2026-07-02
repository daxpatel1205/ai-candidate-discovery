import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await forgotPassword(email);
      const devOtp = data?.devOtp;
      if (devOtp) {
        setOtp(devOtp);
        setSuccess(`[Development Mode] Reset code sent! Auto-filled: ${devOtp}`);
      } else {
        setSuccess('A 6-digit password reset code has been sent to your email.');
      }
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send password reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters long');
    }

    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      setSuccess('Password updated successfully! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed. Please verify the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo" style={{ margin: '0 auto', fontSize: '1.4rem' }}>
            {step === 1 ? '🔑' : '🔒'}
          </div>
          <h2>Reset Password</h2>
          <p>
            {step === 1
              ? 'Enter your email to receive a reset code'
              : 'Enter the code and set your new password'}
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
          {[1, 2].map((s) => (
            <div key={s} style={{
              height: 4,
              width: 48,
              borderRadius: 99,
              background: s <= step ? 'linear-gradient(90deg, #6366F1, #22D3EE)' : 'var(--border)',
              transition: 'background 0.3s ease',
            }} />
          ))}
        </div>

        {error && (
          <div className="alert error" role="alert" style={{ marginBottom: '1.25rem' }}>
            <span>⚠</span> {error}
          </div>
        )}

        {success && (
          <div className="alert success" role="status" style={{ marginBottom: '1.25rem' }}>
            <span>✓</span> {success}
          </div>
        )}

        {step === 1 ? (
          <form className="auth-form" onSubmit={handleRequestOtp}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="fp-email">Email Address</label>
              <input
                id="fp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                required
              />
            </div>
            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? <><span className="spinner" />Sending…</> : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="fp-otp">6-Digit Reset Code</label>
              <input
                id="fp-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="otp-input"
                autoComplete="one-time-code"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="fp-newpass">New Password</label>
              <input
                id="fp-newpass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="fp-confirm">Confirm New Password</label>
              <input
                id="fp-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || otp.length !== 6}
              aria-busy={loading}
            >
              {loading ? <><span className="spinner" />Updating…</> : 'Save New Password'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Back to <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
