import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

export default function LoginScreen() {
  const { setScreen, config } = useApp();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function doLogin() {
    if (!email || !pass) { setError('Please enter email and password.'); return; }
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email, password: pass,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        if (!data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          setError('Please verify your email address before logging in. Check your inbox for the verification link.');
          setLoading(false);
          return;
        }
        // onAuthStateChange handles loadUserData and navigation
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
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
        <h1>Welcome <span className="pa-serif">back</span></h1>
        <p>Log in to manage your parking</p>
      </div>
      {error && <div className="pa-auth-error">{error}</div>}
      <div className="pa-f-group">
        <label className="pa-f-label">Email Address</label>
        <input className="pa-f-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="pa-f-group">
        <label className="pa-f-label">Password</label>
        <input className="pa-f-input" type="password" placeholder="Enter password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} />
      </div>
      <button className="pa-auth-btn" onClick={doLogin} disabled={loading}>
        {loading ? 'Logging in...' : 'Log In'}
      </button>
      <div className="pa-auth-link">
        <a onClick={() => setScreen('forgot-password')}>Forgot Password?</a>
      </div>
      <div className="pa-auth-link" style={{ marginTop: 8 }}>
        Don't have an account? <a onClick={() => setScreen('signup')}>Sign Up</a>
      </div>
      <button className="pa-auth-btn outline" onClick={() => setScreen('admin-login')}>🔒 Admin Login</button>
    </div>
  );
}
