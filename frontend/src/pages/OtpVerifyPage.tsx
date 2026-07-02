import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OtpVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendOtp } = useAuth();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Resend countdown state
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      setError('Invalid request. Email is missing.');
    }
  }, [location]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await verifyEmail(email, otp);
      setSuccess('Verification successful! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setError('');
    setSuccess('');
    try {
      await resendOtp(email);
      setSuccess('A new verification code has been sent to your email.');
      setTimer(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Resend failed. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo" style={{ margin: '0 auto', fontSize: '1.4rem' }}>✉</div>
          <h2>Verify Email</h2>
          <p>We sent a 6-digit code to your inbox</p>
          {email && <p className="email-highlight">{email}</p>}
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

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="otp-input">6-Digit Verification Code</label>
            <input
              id="otp-input"
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

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || otp.length !== 6}
            aria-busy={loading}
          >
            {loading ? <><span className="spinner" />Verifying…</> : 'Verify Code'}
          </button>
        </form>

        <p className="auth-footer">
          Didn't receive the email?{' '}
          {canResend ? (
            <button type="button" className="auth-link" onClick={handleResend}>
              Resend Code
            </button>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>Resend in {timer}s</span>
          )}
        </p>
      </div>
    </div>
  );
}
