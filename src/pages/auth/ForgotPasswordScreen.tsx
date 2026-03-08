import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

export default function ForgotPasswordScreen() {
  const { setScreen, config } = useApp();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function doReset() {
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (err) { setError(err.message); }
    else { setSent(true); }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="pa-auth-screen">
        <div className="pa-auth-logo-area">
          {config.logo ? (
            <img src={config.logo} style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 14 }} alt="Logo" />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--pa-acc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 36 36" fill="none" width={30} height={30}><rect x="6" y="14" width="24" height="16" rx="3" stroke="#fff" strokeWidth="2.5" /><path d="M10 14V10a8 8 0 0116 0v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /><circle cx="18" cy="22" r="2.5" fill="#fff" /></svg>
            </div>
          )}
        </div>
        <div className="pa-auth-header">
          <div className="pa-community">{config.subdiv}</div>
          <h1>Check your <span className="pa-serif">email</span></h1>
          <p>We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link to reset your password.</p>
        </div>
        <button className="pa-auth-btn outline" onClick={() => setScreen('login')}>Back to Login</button>
      </div>
    );
  }

  return (
    <div className="pa-auth-screen">
      <div className="pa-auth-logo-area">
        {config.logo ? (
          <img src={config.logo} style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 14 }} alt="Logo" />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--pa-acc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 36 36" fill="none" width={30} height={30}><rect x="6" y="14" width="24" height="16" rx="3" stroke="#fff" strokeWidth="2.5" /><path d="M10 14V10a8 8 0 0116 0v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /><circle cx="18" cy="22" r="2.5" fill="#fff" /></svg>
            </div>
        )}
      </div>
      <div className="pa-auth-header">
        <div className="pa-community">{config.subdiv}</div>
        <h1>Forgot <span className="pa-serif">password?</span></h1>
        <p>Enter your email and we'll send you a reset link</p>
      </div>
      {error && <div className="pa-auth-error">{error}</div>}
      <div className="pa-f-group">
        <label className="pa-f-label">Email Address</label>
        <input className="pa-f-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && doReset()} />
      </div>
      <button className="pa-auth-btn" onClick={doReset} disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
      <div className="pa-auth-link">
        Remember your password? <a onClick={() => setScreen('login')}>Log In</a>
      </div>
    </div>
  );
}
