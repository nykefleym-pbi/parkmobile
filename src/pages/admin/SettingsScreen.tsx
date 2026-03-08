import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { applyTheme, THEMES } from '@/lib/themes';
import { autoPrefix } from '@/lib/helpers';
import { LogOut, Copy, RefreshCw, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function SettingsScreen() {
  const { config, setConfig, configDbId, adminToken, adminInviteCode, setAdminInviteCode, logout } = useApp();
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  async function adminAction(action: string, data: any) {
    const { data: res, error } = await supabase.functions.invoke('admin-action', {
      body: { token: adminToken, action, data },
    });
    if (error) console.error('Admin action error:', error);
    return res;
  }

  function updateConfig(partial: Partial<typeof config>) {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      if (configDbId) {
        adminAction('update_config', {
          id: configDbId,
          subdiv_name: next.subdiv, app_name: next.appName, theme: next.theme,
          logo_url: next.logo, hoa_phone: next.hoa.phone, hoa_email: next.hoa.email, hoa_hours: next.hoa.hours,
        });
      }
      return next;
    });
  }

  function changeTheme(tid: string) {
    applyTheme(tid);
    updateConfig({ theme: tid });
  }

  async function updateSpace(idx: number, field: string, val: any) {
    setConfig(prev => {
      const spaces = [...prev.spaces];
      (spaces[idx] as any)[field] = val;
      const sp = spaces[idx];
      if (sp.id) {
        adminAction('update_space', { id: sp.id, name: sp.name, address: sp.addr, slots: sp.slots, rate: sp.rate });
      }
      return { ...prev, spaces };
    });
  }

  async function addSpace() {
    const n = config.spaces.length + 1;
    const res = await adminAction('add_space', { name: 'Space ' + n, address: 'New parking area', slots: 10, rate: 1500, sort_order: n });
    const dbId = res?.record?.id;
    setConfig(prev => ({ ...prev, spaces: [...prev.spaces, { id: dbId, name: 'Space ' + n, addr: 'New parking area', slots: 10, rate: 1500 }] }));
  }

  async function removeSpace(idx: number) {
    if (config.spaces.length <= 1) { alert('Need at least one space.'); return; }
    const sp = config.spaces[idx];
    if (sp.id) await adminAction('delete_space', { id: sp.id });
    setConfig(prev => ({ ...prev, spaces: prev.spaces.filter((_, i) => i !== idx) }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    const f = e.target.files[0];
    if (!['image/png', 'image/svg+xml'].includes(f.type)) { alert('Only PNG or SVG files.'); return; }
    const r = new FileReader();
    r.onload = ev => updateConfig({ logo: ev.target?.result as string });
    r.readAsDataURL(f);
  }

  async function regenerateInviteCode() {
    setRegenerating(true);
    try {
      const res = await adminAction('regenerate_invite_code', {});
      if (res?.invite_code) {
        setAdminInviteCode(res.invite_code);
      }
    } catch (e) {
      console.error('Failed to regenerate invite code:', e);
    } finally {
      setRegenerating(false);
    }
  }

  function copyInviteCode() {
    if (adminInviteCode) {
      navigator.clipboard.writeText(adminInviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleChangePassword() {
    setPwError('');
    setPwSuccess('');

    if (!currentPw) { setPwError('Enter your current password.'); return; }
    if (!/^\d{6,8}$/.test(newPw)) { setPwError('New password must be 6-8 digits only.'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return; }

    setChangingPw(true);
    try {
      const res = await adminAction('change_password', { current_password: currentPw, new_password: newPw });
      if (res?.ok) {
        setPwSuccess('Password changed successfully!');
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
      } else {
        setPwError(res?.error || 'Failed to change password.');
      }
    } catch {
      setPwError('Server error. Please try again.');
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar"><button className="pa-logout-btn" onClick={logout}><LogOut size={14} /> Logout</button></div>
      <div className="pa-hdr pa-fu"><div className="pa-community">Admin</div><h1>Settings</h1></div>
      <div style={{ padding: '0 24px' }}>

        {/* Invite Code Section */}
        <div className="pa-slbl pa-fu pa-d1" style={{ padding: 0, marginBottom: 10 }}>Invite Code</div>
        <div className="pa-fu pa-d1" style={{ background: 'var(--pa-sf)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--pa-tx2)', marginBottom: 8 }}>Share this code with residents so they can sign up under your subdivision.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              flex: 1, background: 'var(--pa-bg)', borderRadius: 8, padding: '10px 14px',
              fontSize: 18, fontWeight: 700, letterSpacing: 3, textAlign: 'center', fontFamily: 'monospace',
              color: 'var(--pa-tx)'
            }}>
              {adminInviteCode || '—'}
            </div>
            <button onClick={copyInviteCode} title="Copy code"
              style={{ background: 'var(--pa-acc)', color: '#fff', border: 'none', borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Copy size={16} />
            </button>
            <button onClick={regenerateInviteCode} disabled={regenerating} title="Generate new code"
              style={{ background: 'var(--pa-bg)', color: 'var(--pa-tx)', border: '1px solid var(--pa-brd)', borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: regenerating ? 0.5 : 1 }}>
              <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
            </button>
          </div>
          {copied && <div style={{ fontSize: 11, color: 'var(--pa-grn, #22c55e)', marginTop: 6, fontWeight: 600 }}>Copied to clipboard!</div>}
        </div>

        {/* Change Password Section */}
        <div className="pa-slbl pa-fu pa-d1" style={{ padding: 0, marginBottom: 10 }}>Change Password</div>
        <div className="pa-fu pa-d1" style={{ background: 'var(--pa-sf)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--pa-tx2)', marginBottom: 12 }}>
            <Lock size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
            Password must be 6-8 digits only.
          </div>
          <div className="pa-f-group" style={{ marginBottom: 10 }}>
            <label className="pa-f-label">Current Password</label>
            <input className="pa-f-input" type="password" inputMode="numeric" maxLength={8}
              placeholder="Enter current password" value={currentPw}
              onChange={e => { setCurrentPw(e.target.value.replace(/\D/g, '').slice(0, 8)); setPwError(''); setPwSuccess(''); }} />
          </div>
          <div className="pa-f-group" style={{ marginBottom: 10 }}>
            <label className="pa-f-label">New Password</label>
            <input className="pa-f-input" type="password" inputMode="numeric" maxLength={8}
              placeholder="6-8 digits" value={newPw}
              onChange={e => { setNewPw(e.target.value.replace(/\D/g, '').slice(0, 8)); setPwError(''); setPwSuccess(''); }} />
          </div>
          <div className="pa-f-group" style={{ marginBottom: 12 }}>
            <label className="pa-f-label">Confirm New Password</label>
            <input className="pa-f-input" type="password" inputMode="numeric" maxLength={8}
              placeholder="Re-enter new password" value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value.replace(/\D/g, '').slice(0, 8)); setPwError(''); setPwSuccess(''); }} />
          </div>
          {pwError && <div style={{ fontSize: 11, color: 'var(--pa-red, #ef4444)', marginBottom: 8, fontWeight: 600 }}>{pwError}</div>}
          {pwSuccess && <div style={{ fontSize: 11, color: 'var(--pa-grn, #22c55e)', marginBottom: 8, fontWeight: 600 }}>{pwSuccess}</div>}
          <button className="pa-bbk" onClick={handleChangePassword} disabled={changingPw}
            style={{ fontSize: 13, padding: '10px 0', width: '100%', opacity: changingPw ? 0.6 : 1 }}>
            {changingPw ? 'Changing...' : 'Update Password'}
          </button>
        </div>

        <div className="pa-slbl pa-fu pa-d1" style={{ padding: 0, marginBottom: 10 }}>App Theme</div>
        <div className="pa-theme-grid pa-fu pa-d1">
          {Object.entries(THEMES).map(([k, t]) => (
            <div key={k} className={`pa-theme-swatch ${config.theme === k ? 'on' : ''}`}
              style={{ background: t.swatch, color: t.stx }} onClick={() => changeTheme(k)}>
              {t.name}
            </div>
          ))}
        </div>

        <div className="pa-slbl pa-fu pa-d2" style={{ padding: 0, marginBottom: 10, marginTop: 20 }}>Branding</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }} className="pa-fu pa-d2">
          <div style={{ position: 'relative' }}>
            {config.logo ? (
              <img src={config.logo} style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 12 }} alt="Logo" />
            ) : (
              <div style={{ width: 60, height: 60, borderRadius: 12, background: 'var(--pa-acc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 36 36" fill="none" width={30} height={30}><rect x="6" y="14" width="24" height="16" rx="3" stroke="#fff" strokeWidth="2.5" /><path d="M10 14V10a8 8 0 0116 0v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /><circle cx="18" cy="22" r="2.5" fill="#fff" /></svg>
              </div>
            )}
            <label htmlFor="logo-upload" style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: 'var(--pa-acc)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--pa-sf)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
            </label>
            <input type="file" id="logo-upload" accept="image/png,image/svg+xml" style={{ display: 'none' }} onChange={handleLogoUpload} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--pa-tx2)', fontWeight: 600, marginBottom: 4 }}>App Logo</div>
            <div style={{ fontSize: 11, color: 'var(--pa-tx2)' }}>
              PNG or SVG only{config.logo && <> · <a style={{ color: 'var(--pa-red)', cursor: 'pointer', fontWeight: 600 }} onClick={() => updateConfig({ logo: null })}>Remove</a></>}
            </div>
          </div>
        </div>
        <div className="pa-f-group pa-fu pa-d2"><label className="pa-f-label">App Name (Splash)</label><input className="pa-f-input" value={config.appName} onChange={e => updateConfig({ appName: e.target.value })} /></div>
        <div className="pa-f-group pa-fu pa-d2"><label className="pa-f-label">Subdivision Name</label><input className="pa-f-input" value={config.subdiv} onChange={e => updateConfig({ subdiv: e.target.value })} /></div>

        <div className="pa-slbl pa-fu pa-d3" style={{ padding: 0, marginBottom: 10, marginTop: 20 }}>Admin Contact Details</div>
        <div className="pa-f-group pa-fu pa-d3"><label className="pa-f-label">Phone</label><input className="pa-f-input" value={config.hoa.phone} onChange={e => updateConfig({ hoa: { ...config.hoa, phone: e.target.value } })} /></div>
        <div className="pa-f-group pa-fu pa-d3"><label className="pa-f-label">Email</label><input className="pa-f-input" value={config.hoa.email} onChange={e => updateConfig({ hoa: { ...config.hoa, email: e.target.value } })} /></div>
        <div className="pa-f-group pa-fu pa-d3"><label className="pa-f-label">Hours</label><input className="pa-f-input" value={config.hoa.hours} onChange={e => updateConfig({ hoa: { ...config.hoa, hours: e.target.value } })} /></div>

        <div className="pa-slbl pa-fu pa-d4" style={{ padding: 0, marginBottom: 10, marginTop: 20 }}>Parking Spaces</div>
        {config.spaces.map((sp, i) => {
          const pfx = autoPrefix(sp.name);
          return (
            <div key={i} className={`pa-space-cfg pa-fu pa-d${Math.min(i + 4, 5)}`}>
              <div className="pa-sc-hdr">
                <strong>{sp.name} <span style={{ fontSize: 11, color: 'var(--pa-tx2)', fontWeight: 500 }}>({pfx})</span></strong>
                {config.spaces.length > 1 && <button className="pa-sc-del" onClick={() => removeSpace(i)}>Remove</button>}
              </div>
              <div className="pa-f-group"><label className="pa-f-label">Space Name</label><input className="pa-f-input" value={sp.name} onChange={e => updateSpace(i, 'name', e.target.value)} /></div>
              <div className="pa-f-group"><label className="pa-f-label">Address</label><input className="pa-f-input" value={sp.addr} onChange={e => updateSpace(i, 'addr', e.target.value)} /></div>
              <div className="pa-f-row">
                <div className="pa-f-group"><label className="pa-f-label">Slots</label><input className="pa-f-input" type="number" min="1" max="50" value={sp.slots} onChange={e => updateSpace(i, 'slots', Math.max(1, parseInt(e.target.value) || 1))} /></div>
                <div className="pa-f-group"><label className="pa-f-label">Rate per Month (₱)</label><input className="pa-f-input" type="number" min="100" value={sp.rate} onFocus={e => e.target.select()} onChange={e => updateSpace(i, 'rate', Math.max(100, parseInt(e.target.value) || 1500))} /></div>
              </div>
            </div>
          );
        })}
        <button className="pa-bbk pa-fu pa-d5" style={{ fontSize: 14, padding: 14, marginBottom: 20 }} onClick={addSpace}>+ Add New Space</button>
      </div>
    </div>
  );
}
