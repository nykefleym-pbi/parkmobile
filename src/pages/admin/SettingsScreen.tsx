import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { saveConfigToDb } from '@/lib/supabase-data';
import { applyTheme, THEMES } from '@/lib/themes';
import { autoPrefix } from '@/lib/helpers';
import { LogOut } from 'lucide-react';

export default function SettingsScreen() {
  const { config, setConfig, configDbId, logout } = useApp();

  function updateConfig(partial: Partial<typeof config>) {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      saveConfigToDb(configDbId, next);
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
      if (sp.id) supabase.from('spaces').update({ name: sp.name, address: sp.addr, slots: sp.slots, rate: sp.rate }).eq('id', sp.id);
      const next = { ...prev, spaces };
      saveConfigToDb(configDbId, next);
      return next;
    });
  }

  async function addSpace() {
    const n = config.spaces.length + 1;
    const { data: res } = await supabase.from('spaces').insert({ name: 'Space ' + n, address: 'New parking area', slots: 10, rate: 1500, sort_order: n }).select();
    const dbId = res && res.length ? res[0].id : undefined;
    setConfig(prev => ({ ...prev, spaces: [...prev.spaces, { id: dbId, name: 'Space ' + n, addr: 'New parking area', slots: 10, rate: 1500 }] }));
  }

  async function removeSpace(idx: number) {
    if (config.spaces.length <= 1) { alert('Need at least one space.'); return; }
    const sp = config.spaces[idx];
    if (sp.id) await supabase.from('spaces').delete().eq('id', sp.id);
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

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar"><button className="pa-logout-btn" onClick={logout}><LogOut size={14} /> Logout</button></div>
      <div className="pa-hdr pa-fu"><div className="pa-community">Admin</div><h1>Settings</h1></div>
      <div style={{ padding: '0 24px' }}>
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

        <div className="pa-slbl pa-fu pa-d3" style={{ padding: 0, marginBottom: 10, marginTop: 20 }}>HOA Contact Details</div>
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
