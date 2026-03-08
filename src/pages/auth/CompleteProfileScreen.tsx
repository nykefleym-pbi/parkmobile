import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

export default function CompleteProfileScreen() {
  const { authUser, config, loadUserData, setActiveTab, setScreen } = useApp();
  const [form, setForm] = useState({ phone: '', blklot: '', restype: 'Resident', car: '', plate: '', color: 'White' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function doSave() {
    const { phone, blklot, restype, car, plate, color } = form;
    if (!phone || !blklot || !car || !plate) { setError('Please fill in all required fields.'); return; }

    setLoading(true);
    setError('');

    try {
      const userId = authUser!.id;

      await supabase.from('profiles').update({
        phone, block_lot: blklot, residence_type: restype,
      }).eq('id', userId);

      await supabase.from('vehicles').insert({
        user_id: userId, name: car, plate, color: color || 'White', is_primary: true,
      });

      await loadUserData(userId);
      setActiveTab('search');
      setScreen('home');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pa-auth-screen" style={{ paddingTop: 70, paddingBottom: 40 }}>
      <div className="pa-auth-header">
        <div className="pa-community">{config.subdiv}</div>
        <h1>Complete your <span className="pa-serif">profile</span></h1>
        <p>Add your details to start booking parking spots</p>
      </div>
      {error && <div className="pa-auth-error">{error}</div>}
      <div className="pa-f-group"><label className="pa-f-label">Mobile Number</label><input className="pa-f-input" placeholder="+63 917 123 5678" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
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
      <button className="pa-auth-btn" onClick={doSave} disabled={loading}>
        {loading ? 'Saving...' : 'Complete Setup'}
      </button>
    </div>
  );
}
