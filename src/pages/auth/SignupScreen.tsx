import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

export default function SignupScreen() {
  const { setScreen, config } = useApp();
  const [form, setForm] = useState({ name: '', email: '', phone: '', pass: '', blklot: '', restype: 'Resident', car: '', plate: '', color: 'White' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function doSignup() {
    const { name, email, phone, pass, blklot, restype, car, plate, color } = form;
    if (!name || !email || !phone || !pass || !blklot || !car || !plate) { setError('Please fill in all required fields.'); return; }
    if (pass.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    setError('');

    try {
      // Sign up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Signup failed. Please try again.');
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      // Update profile with additional details
      await supabase.from('profiles').update({
        phone, block_lot: blklot, residence_type: restype,
      }).eq('id', userId);

      // Insert primary vehicle
      await supabase.from('vehicles').insert({
        user_id: userId, name: car, plate, color: color || 'White', is_primary: true,
      });

      setSuccess(true);
      setTimeout(() => setScreen('login'), 1500);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="pa-auth-screen">
        <div className="pa-auth-header">
          <div className="pa-community">{config.subdiv}</div>
          <h1>Account <span className="pa-serif">created!</span></h1>
          <p>You can now log in with your credentials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pa-auth-screen" style={{ paddingTop: 70, paddingBottom: 40 }}>
      <div className="pa-auth-header">
        <div className="pa-community">{config.subdiv}</div>
        <h1>Create <span className="pa-serif">account</span></h1>
        <p>Register to reserve your parking spot</p>
      </div>
      {error && <div className="pa-auth-error">{error}</div>}
      <div className="pa-f-group"><label className="pa-f-label">Full Name</label><input className="pa-f-input" placeholder="e.g. Juan Dela Cruz" value={form.name} onChange={e => set('name', e.target.value)} /></div>
      <div className="pa-f-group"><label className="pa-f-label">Email Address</label><input className="pa-f-input" type="email" placeholder="you@email.com" value={form.email} onChange={e => set('email', e.target.value)} /></div>
      <div className="pa-f-group"><label className="pa-f-label">Mobile Number</label><input className="pa-f-input" placeholder="+63 917 123 5678" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
      <div className="pa-f-group"><label className="pa-f-label">Password</label><input className="pa-f-input" type="password" placeholder="Min 6 characters" value={form.pass} onChange={e => set('pass', e.target.value)} /></div>
      <div className="pa-auth-section-label">Residence Details</div>
      <div className="pa-f-group"><label className="pa-f-label">Block & Lot</label><input className="pa-f-input" placeholder="e.g. Blk 7, Lot 15" value={form.blklot} onChange={e => set('blklot', e.target.value)} /></div>
      <div className="pa-f-group">
        <label className="pa-f-label">Residence Type</label>
        <select className="pa-f-select" value={form.restype} onChange={e => set('restype', e.target.value)}>
          <option value="Resident">Resident (Owner)</option>
          <option value="Renter">Renter</option>
          <option value="Others">Others</option>
        </select>
      </div>
      <div className="pa-auth-section-label">Primary Vehicle</div>
      <div className="pa-f-group"><label className="pa-f-label">Car Make & Model</label><input className="pa-f-input" placeholder="e.g. Toyota Vios 2023" value={form.car} onChange={e => set('car', e.target.value)} /></div>
      <div className="pa-f-row">
        <div className="pa-f-group"><label className="pa-f-label">Plate Number</label><input className="pa-f-input" placeholder="e.g. NCR 1234" value={form.plate} onChange={e => set('plate', e.target.value)} /></div>
        <div className="pa-f-group"><label className="pa-f-label">Color</label><input className="pa-f-input" placeholder="e.g. White" value={form.color} onChange={e => set('color', e.target.value)} /></div>
      </div>
      <button className="pa-auth-btn" onClick={doSignup} disabled={loading}>
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
      <div className="pa-auth-divider"><span>or</span></div>
      <button className="pa-auth-btn google" onClick={doGoogle} disabled={loading}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Continue with Google
      </button>
      <div className="pa-auth-link" style={{ marginBottom: 20 }}>
        Already have an account? <a onClick={() => setScreen('login')}>Log In</a>
      </div>
    </div>
  );
}
