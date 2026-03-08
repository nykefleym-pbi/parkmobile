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
      <div className="pa-auth-link" style={{ marginBottom: 20 }}>
        Already have an account? <a onClick={() => setScreen('login')}>Log In</a>
      </div>
    </div>
  );
}
