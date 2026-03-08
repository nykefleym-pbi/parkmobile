import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPasswordPage() {
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Check if we have a recovery session from the URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setValidSession(true);
    }
    // Also check via session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
    });
  }, []);

  async function doUpdate() {
    if (!pass || !confirm) { setError('Please fill in both fields.'); return; }
    if (pass.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (pass !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.updateUser({ password: pass });
    if (err) { setError(err.message); }
    else { setDone(true); }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="pa-auth-screen" style={{ minHeight: '100vh', justifyContent: 'center' }}>
        <div className="pa-auth-header">
          <h1>Password <span className="pa-serif">updated!</span></h1>
          <p>Your password has been reset successfully.</p>
        </div>
        <a href="/" className="pa-auth-btn" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>Back to App</a>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="pa-auth-screen" style={{ minHeight: '100vh', justifyContent: 'center' }}>
        <div className="pa-auth-header">
          <h1>Invalid <span className="pa-serif">link</span></h1>
          <p>This reset link is invalid or has expired. Please request a new one.</p>
        </div>
        <a href="/" className="pa-auth-btn" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>Back to App</a>
      </div>
    );
  }

  return (
    <div className="pa-auth-screen" style={{ minHeight: '100vh', justifyContent: 'center' }}>
      <div className="pa-auth-header">
        <h1>Set new <span className="pa-serif">password</span></h1>
        <p>Enter your new password below</p>
      </div>
      {error && <div className="pa-auth-error">{error}</div>}
      <div className="pa-f-group">
        <label className="pa-f-label">New Password</label>
        <input className="pa-f-input" type="password" placeholder="Min 6 characters" value={pass} onChange={e => setPass(e.target.value)} />
      </div>
      <div className="pa-f-group">
        <label className="pa-f-label">Confirm Password</label>
        <input className="pa-f-input" type="password" placeholder="Re-enter password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && doUpdate()} />
      </div>
      <button className="pa-auth-btn" onClick={doUpdate} disabled={loading}>
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </div>
  );
}
