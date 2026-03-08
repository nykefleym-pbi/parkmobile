import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

export default function LoginScreen() {
  const { setScreen, config, loadUserData, setActiveTab } = useApp();
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
        await loadUserData(data.user.id);
        setActiveTab('search');
        setScreen('home');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pa-auth-screen">
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
        Don't have an account? <a onClick={() => setScreen('signup')}>Sign Up</a>
      </div>
      <div className="pa-auth-divider"><span>or</span></div>
      <button className="pa-auth-btn outline" onClick={() => setScreen('admin-login')}>🔒 Admin Login</button>
    </div>
  );
}
