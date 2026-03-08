import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

export default function SignupScreen() {
  const { setScreen, config } = useApp();
  const [form, setForm] = useState({ name: '', email: '', phone: '', pass: '', blklot: '', restype: 'Resident', car: '', plate: '', color: 'White', inviteCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validatedAdmin, setValidatedAdmin] = useState<{ admin_id: string; subdiv_name: string } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function validateInviteCode(code: string) {
    if (!code.trim()) {
      setValidatedAdmin(null);
      return;
    }
    setValidatingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-invite-code', {
        body: { code: code.trim() },
      });
      if (error || data?.error) {
        setValidatedAdmin(null);
      } else {
        setValidatedAdmin(data);
      }
    } catch {
      setValidatedAdmin(null);
    } finally {
      setValidatingCode(false);
    }
  }

  async function doSignup() {
    const { name, email, phone, pass, blklot, restype, car, plate, color, inviteCode } = form;
    if (!inviteCode) { setError('Please enter an invite code from your subdivision admin.'); return; }
    if (!validatedAdmin) { setError('Invalid invite code. Please check and try again.'); return; }
    if (!name || !email || !phone || !pass || !blklot || !car || !plate) { setError('Please fill in all required fields.'); return; }
    if (pass.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            name, phone, block_lot: blklot, residence_type: restype,
            car_name: car, car_plate: plate, car_color: color || 'White',
            admin_id: validatedAdmin.admin_id,
          },
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

      setSuccess(true);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
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
          <div className="pa-community">{validatedAdmin?.subdiv_name || config.subdiv}</div>
          <h1>Verify your <span className="pa-serif">email</span></h1>
          <p>We've sent a verification link to <strong>{form.email}</strong>. Please check your inbox and click the link to activate your account.</p>
        </div>
        <button className="pa-auth-btn outline" onClick={() => setScreen('login')}>Back to Login</button>
      </div>
    );
  }

  return (
    <div className="pa-auth-screen" style={{ paddingTop: 70, paddingBottom: 40 }}>
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
        <div className="pa-community">{validatedAdmin?.subdiv_name || config.subdiv}</div>
        <h1>Create <span className="pa-serif">account</span></h1>
        <p>Register to reserve your parking spot</p>
      </div>
      {error && <div className="pa-auth-error">{error}</div>}
      <div className="pa-f-group">
        <label className="pa-f-label">Invite Code</label>
        <input className="pa-f-input" placeholder="Enter code from your admin" value={form.inviteCode}
          onChange={e => { set('inviteCode', e.target.value); }}
          onBlur={() => validateInviteCode(form.inviteCode)}
          style={{ textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}
        />
        {validatingCode && <div style={{ fontSize: 11, color: 'var(--pa-tx2)', marginTop: 4 }}>Validating...</div>}
        {!validatingCode && form.inviteCode && validatedAdmin && (
          <div style={{ fontSize: 11, color: 'var(--pa-grn, #22c55e)', marginTop: 4, fontWeight: 600 }}>✓ {validatedAdmin.subdiv_name}</div>
        )}
        {!validatingCode && form.inviteCode && !validatedAdmin && (
          <div style={{ fontSize: 11, color: 'var(--pa-red, #ef4444)', marginTop: 4 }}>Invalid invite code</div>
        )}
      </div>
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
