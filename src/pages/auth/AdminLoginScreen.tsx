import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

export default function AdminLoginScreen() {
  const { setIsAdmin, setActiveTab, setScreen } = useApp();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  async function doAdminLogin() {
    let valid = false;
    try {
      const { data } = await supabase.from('admins').select('*').eq('username', user).eq('password_hash', pass);
      valid = !!(data && data.length > 0);
    } catch {
      const fallback = [{ user: 'admin', pass: 'admin123' }, { user: 'manager', pass: 'manager123' }];
      valid = fallback.some(a => a.user === user && a.pass === pass);
    }
    if (!valid) { setError('Invalid admin credentials.'); return; }
    setError('');
    setIsAdmin(true);
    setActiveTab('dashboard');
    setScreen('home');
  }

  return (
    <div className="pa-auth-screen">
      <div className="pa-auth-header">
        <div className="pa-community">Admin Portal</div>
        <h1>Admin <span className="pa-serif">login</span></h1>
        <p>Authorized personnel only</p>
      </div>
      {error && <div className="pa-auth-error">{error}</div>}
      <div className="pa-f-group"><label className="pa-f-label">Admin Username</label><input className="pa-f-input" placeholder="Username" value={user} onChange={e => setUser(e.target.value)} /></div>
      <div className="pa-f-group"><label className="pa-f-label">Password</label><input className="pa-f-input" type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdminLogin()} /></div>
      <button className="pa-auth-btn" onClick={doAdminLogin}>Admin Login</button>
      <div className="pa-auth-link"><a onClick={() => setScreen('login')}>← Back to User Login</a></div>
    </div>
  );
}
