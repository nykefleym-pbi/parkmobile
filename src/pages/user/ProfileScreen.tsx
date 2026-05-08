import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { getInitials, fmtMonthYear, formatPeso } from '@/lib/helpers';
import { getCarColor } from '@/lib/themes';
import { LogOut, Pencil, ChevronRight } from 'lucide-react';

export default function ProfileScreen() {
  const { config, profile, setProfile, cars, setCars, bookings, authUser, getUserPayable, logout, setScreen } = useApp();
  const [showCarModal, setShowCarModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editCarIdx, setEditCarIdx] = useState(-1);
  const [carForm, setCarForm] = useState({ name: '', plate: '', color: '', primary: false });
  const [profileForm, setProfileForm] = useState({ ...profile });
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [saving, setSaving] = useState(false);

  const tp = useMemo(() => getUserPayable(), [bookings]);
  const rl = { Resident: 'Resident (Owner)', Renter: 'Renter', Others: 'Others' }[profile.restype] || profile.restype;

  function openCarModal(idx: number) {
    setEditCarIdx(idx);
    const c = idx >= 0 ? cars[idx] : { name: '', plate: '', color: '', primary: false };
    setCarForm({ name: c.name, plate: c.plate, color: c.color, primary: c.primary });
    setShowCarModal(true);
  }

  async function saveCar() {
    const { name, plate, color, primary } = carForm;
    toast.error('Please fill in both car name and plate.');
return; }
    if (saving) return;
    setSaving(true);
    try {
      let newCars = [...cars];

      // If marking as primary, clear primary on all others (local + DB)
      if (primary) {
        const dbUpdates = newCars.filter(c => c.primary && c.dbId).map(c =>
          supabase.from('vehicles').update({ is_primary: false }).eq('id', c.dbId!)
        );
        await Promise.all(dbUpdates);
        newCars = newCars.map(c => ({ ...c, primary: false }));
      }

      if (editCarIdx >= 0) {
        newCars[editCarIdx] = { ...newCars[editCarIdx], name, plate, color, primary };
        const c = newCars[editCarIdx];
        if (c.dbId) {
          const { error } = await supabase.from('vehicles').update({ name, plate, color, is_primary: primary }).eq('id', c.dbId);
          if (error) throw error;
        }
      } else {
        const userId = authUser?.id;
        if (!userId) { setSaving(false); return; }
        const isPrimary = primary || !newCars.length;
        const { data: res, error } = await supabase.from('vehicles').insert({
          user_id: userId, name, plate, color: color || 'White', is_primary: isPrimary,
        }).select();
        if (error) throw error;
        const dbId = res && res.length ? res[0].id : null;
        newCars.push({ name, plate, color: color || 'White', primary: isPrimary, dbId });
      }
      if (!newCars.some(c => c.primary) && newCars.length) newCars[0].primary = true;
      setCars(newCars);
      setShowCarModal(false);
    } catch (err: any) {
      toast.error(err?.message || 'Error saving vehicle. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCar(i: number) {
    toast.error('You need at least one registered vehicle.');
return; }
    if (saving) return;
    setSaving(true);
    try {
      const c = cars[i];
      if (c.dbId) {
        const { error } = await supabase.from('vehicles').delete().eq('id', c.dbId);
        if (error) throw error;
      }
      const newCars = cars.filter((_, j) => j !== i);
      if (c.primary && newCars.length) {
        newCars[0].primary = true;
        if (newCars[0].dbId) await supabase.from('vehicles').update({ is_primary: true }).eq('id', newCars[0].dbId);
      }
      setCars(newCars);
    } catch (err: any) {
      toast.error(err?.message || 'Error removing vehicle. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function setPrimary(i: number) {
    if (saving) return;
    setSaving(true);
    try {
      const newCars = cars.map((c, j) => ({ ...c, primary: j === i }));
      setCars(newCars);
      await Promise.all(
        newCars.filter(c => c.dbId).map(c =>
          supabase.from('vehicles').update({ is_primary: c.primary }).eq('id', c.dbId!)
        )
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error setting primary. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setProfile(profileForm);
    const userId = authUser?.id;
    if (userId) {
      await supabase.from('profiles').update({
        name: profileForm.name, email: profileForm.email, phone: profileForm.phone,
        block_lot: profileForm.blklot, residence_type: profileForm.restype, avatar_url: profileForm.avatar,
      }).eq('id', userId);
    }
    setShowProfileModal(false);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = ev => setProfileForm(p => ({ ...p, avatar: ev.target?.result as string }));
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  const av = profile.avatar ? <img src={profile.avatar} alt="" /> : getInitials(profile.name);

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar"><button className="pa-logout-btn" onClick={logout}><LogOut size={14} /> Logout</button></div>
      <div className="pa-hdr pa-fu"><div className="pa-community">{config.subdiv}</div><h1>Profile</h1></div>
      <div style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }} className="pa-fu pa-d1">
          <div className="pa-p-avatar">{av}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-.3px' }}>{profile.name}</div>
            <div style={{ fontSize: 13, color: 'var(--pa-tx2)', marginTop: 2 }}>{profile.email}</div>
            <div className="pa-res-badge">{rl}</div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }} onClick={() => { setProfileForm({ ...profile }); setShowProfileModal(true); }}>
            <Pencil size={18} stroke="var(--pa-tx2)" />
          </button>
        </div>

        <div className="pa-p-section pa-fu pa-d2">Residence</div>
        <div className="pa-p-card pa-fu pa-d2" style={{ border: '1px solid var(--pa-brd)' }}>
          <div className="pa-pc-top"><div className="pa-pc-label">{config.subdiv}</div><div className="pa-pc-badge" style={{ background: 'var(--pa-grn-s)', color: 'var(--pa-grn)' }}>Verified</div></div>
          <div className="pa-pc-sub">{profile.blklot}</div>
        </div>

        <div className="pa-p-section pa-fu pa-d3">Vehicles <button className="pa-ps-btn" onClick={() => openCarModal(-1)}>+ ADD</button></div>
        {cars.map((c, i) => (
          <div key={i} className="pa-p-card pa-fu pa-d3" style={{ border: `3px solid ${getCarColor(c.color)}` }}>
            <div className="pa-pc-top">
              <div className="pa-pc-label">{c.name}</div>
              <div className="pa-pc-badge" style={{ background: c.primary ? 'var(--pa-grn-s)' : 'var(--pa-soft)', color: c.primary ? 'var(--pa-grn)' : 'var(--pa-tx2)' }}>
                {c.primary ? 'Primary' : 'Secondary'}
              </div>
            </div>
            <div className="pa-pc-sub">Plate: {c.plate} · {c.color}</div>
            <div className="pa-pc-actions">
              <button className="pa-pc-act edit" onClick={() => openCarModal(i)}>Edit</button>
              {!c.primary && <button className="pa-pc-act prim" onClick={() => setPrimary(i)}>Set Primary</button>}
              {cars.length > 1 && <button className="pa-pc-act del" onClick={() => deleteCar(i)}>Remove</button>}
            </div>
          </div>
        ))}

        <div className="pa-p-section pa-fu pa-d4">Payable</div>
        <div className="pa-p-card pa-fu pa-d4" style={{ border: '1px solid var(--pa-brd)' }}>
          <div className="pa-pc-top"><div className="pa-pc-label" style={{ fontSize: 22, letterSpacing: '-.5px' }}>{formatPeso(tp)}</div></div>
          <div className="pa-pc-sub">
            {[bookings.filter(b => b.status === 'active').length && bookings.filter(b => b.status === 'active').length + ' active',
              bookings.filter(b => b.status === 'expired').length && bookings.filter(b => b.status === 'expired').length + ' expired',
            ].filter(Boolean).join(' + ') || 'No bookings'}
          </div>
        </div>

        <div className="pa-p-section pa-fu pa-d5">Account</div>
        <div className="pa-prow pa-fu pa-d5"><span>Phone</span><div className="pa-pval">{profile.phone}</div></div>
        <div className="pa-prow pa-fu pa-d5"><span>Block & Lot</span><div className="pa-pval">{profile.blklot}</div></div>
        <div className="pa-prow pa-fu pa-d5"><span>Member Since</span><div className="pa-pval">{profile.memberSince ? fmtMonthYear(profile.memberSince) : '—'}</div></div>
        <div className="pa-prow pa-fu pa-d5" onClick={() => setNotificationsOn(!notificationsOn)}>
          <span>Notifications</span>
          <div className="pa-pval"><div className={`pa-toggle ${notificationsOn ? 'on' : ''}`} /></div>
        </div>
        <div className="pa-prow pa-fu pa-d5" style={{ border: 'none' }} onClick={() => setScreen('help')}>
          <span>Help & Support</span>
          <div className="pa-pval"><ChevronRight size={16} /></div>
        </div>
      </div>

      {/* Car Modal */}
      {showCarModal && (
        <div className="pa-modal-bg show" onClick={() => setShowCarModal(false)}>
          <div className="pa-modal" onClick={e => e.stopPropagation()}>
            <h3>{editCarIdx >= 0 ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
            <p>Register a vehicle to your account.</p>
            <div className="pa-f-group"><label className="pa-f-label">Car Make & Model</label><input className="pa-f-input" value={carForm.name} onChange={e => setCarForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Toyota Vios 2023" /></div>
            <div className="pa-f-row">
              <div className="pa-f-group"><label className="pa-f-label">Plate Number</label><input className="pa-f-input" value={carForm.plate} onChange={e => setCarForm(p => ({ ...p, plate: e.target.value }))} placeholder="e.g. NCR 1234" /></div>
              <div className="pa-f-group"><label className="pa-f-label">Color</label><input className="pa-f-input" value={carForm.color} onChange={e => setCarForm(p => ({ ...p, color: e.target.value }))} placeholder="e.g. White" /></div>
            </div>
            <label className="pa-f-check">
              <input type="checkbox" checked={carForm.primary} onChange={e => setCarForm(p => ({ ...p, primary: e.target.checked }))} />
              <div className="pa-ck" />Set as primary vehicle
            </label>
            <div className="pa-modal-btns">
              <button className="pa-m-cancel" onClick={() => setShowCarModal(false)}>Cancel</button>
              <button className="pa-m-confirm" style={{ background: 'var(--pa-acc)', opacity: saving ? 0.6 : 1 }} onClick={saveCar} disabled={saving}>{saving ? 'Saving...' : 'Save Vehicle'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="pa-modal-bg show" onClick={() => setShowProfileModal(false)}>
          <div className="pa-modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Profile</h3>
            <p>Update your personal information.</p>
            <div className="pa-avatar-edit">
              <div className="pa-av-img">{profileForm.avatar ? <img src={profileForm.avatar} alt="" /> : getInitials(profileForm.name)}</div>
              <label className="pa-av-btn" htmlFor="pm-avatar-input">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
              </label>
              {profileForm.avatar && (
                <button type="button" className="pa-av-btn" style={{ right: -12, left: 'auto', background: '#e53e3e' }} onClick={() => setProfileForm(p => ({ ...p, avatar: '' }))}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              )}
              <input type="file" id="pm-avatar-input" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
            <div className="pa-f-group"><label className="pa-f-label">Full Name</label><input className="pa-f-input" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="pa-f-group"><label className="pa-f-label">Email</label><input className="pa-f-input" type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="pa-f-group"><label className="pa-f-label">Mobile</label><input className="pa-f-input" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="pa-f-group"><label className="pa-f-label">Block & Lot</label><input className="pa-f-input" value={profileForm.blklot} onChange={e => setProfileForm(p => ({ ...p, blklot: e.target.value }))} /></div>
            <div className="pa-f-group">
              <label className="pa-f-label">Residence Type</label>
              <select className="pa-f-select" value={profileForm.restype} onChange={e => setProfileForm(p => ({ ...p, restype: e.target.value }))}>
                <option value="Resident">Resident (Owner)</option><option value="Renter">Renter</option><option value="Others">Others</option>
              </select>
            </div>
            <div className="pa-modal-btns">
              <button className="pa-m-cancel" onClick={() => setShowProfileModal(false)}>Cancel</button>
              <button className="pa-m-confirm" style={{ background: 'var(--pa-acc)' }} onClick={saveProfile}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
