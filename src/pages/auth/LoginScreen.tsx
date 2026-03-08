import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';

export default function LoginScreen() {
  const { registeredUsers, globalBookings, setCurrentUser, setProfile, setCars, setBookings, setActiveTab, setScreen, config } = useApp();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  function doLogin() {
    const user = registeredUsers.find(u => u.email === email && u.pass === pass);
    if (!user) { setError('Invalid email or password.'); return; }
    setError('');
    setCurrentUser(user);
    setProfile({
      name: user.name, email: user.email, phone: user.phone, blklot: user.blklot,
      restype: user.restype, avatar: user.avatar, memberSince: user.memberSince,
    });
    setCars(user.cars.map(c => ({ ...c })));
    setBookings(globalBookings.filter(b => b.userId === user.dbId));
    setActiveTab('search');
    setScreen('home');
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
      <button className="pa-auth-btn" onClick={doLogin}>Log In</button>
      <div className="pa-auth-link">
        Don't have an account? <a onClick={() => setScreen('signup')}>Sign Up</a>
      </div>
      <div className="pa-auth-divider"><span>or</span></div>
      <button className="pa-auth-btn outline" onClick={() => setScreen('admin-login')}>🔒 Admin Login</button>
    </div>
  );
}
