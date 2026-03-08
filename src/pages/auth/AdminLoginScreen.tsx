import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/lib/types';

export default function AdminLoginScreen() {
  const { setIsAdmin, setActiveTab, setScreen, setAdminToken, setAdminInviteCode, setAdminId, setGlobalBookings, config, reloadConfig } = useApp();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function doAdminLogin() {
    if (!user || !pass) { setError('Please enter username and password.'); return; }
    setLoading(true);
    setError('');

    try {
      const { data: loginData, error: loginErr } = await supabase.functions.invoke('admin-login', {
        body: { username: user, password: pass },
      });

      if (loginErr || loginData?.error) {
        setError(loginData?.error || 'Invalid admin credentials.');
        setLoading(false);
        return;
      }

      const { token, admin } = loginData;
      const adminId = admin.id;

      // Fetch admin data via edge function
      const { data: adminData, error: dataErr } = await supabase.functions.invoke('admin-data', {
        body: { token },
      });

      if (dataErr || adminData?.error) {
        setError('Failed to load admin data.');
        setLoading(false);
        return;
      }

      // Process bookings with payments and penalties
      const { bookings: bks, payments: pmts, penalties: pens } = adminData;
      const globalBookings: Booking[] = (bks || []).map((b: any) => {
        const bkPmts = (pmts || []).filter((p: any) => p.booking_id === b.id).map((p: any) => ({
          amount: +p.amount, method: p.method, date: p.transaction_date,
          receipt: p.receipt_number || '', receiptIssued: p.receipt_issued || false, dbId: p.id,
        }));
        const pen = (pens || []).find((p: any) => p.booking_id === b.id);
        return {
          dbId: b.id, id: b.booking_code, slotId: b.slot_id, locName: b.space_name,
          startDate: b.start_date, endDate: b.end_date, status: b.status,
          cancelledDate: b.cancelled_date,
          car: { name: b.vehicle_name, plate: b.vehicle_plate, color: b.vehicle_color || 'White' },
          userName: b.user_name, userEmail: b.user_email, userBlklot: b.user_block_lot || '',
          rate: +b.rate, userId: b.user_id, vehicleId: b.vehicle_id,
          payments: bkPmts,
          penalty: pen ? { days: pen.overstay_days, amount: +pen.amount, date: pen.applied_date, notes: pen.notes || '', dbId: pen.id } : null,
        };
      });

      setAdminToken(token);
      setAdminId(adminId);
      setAdminInviteCode(admin.invite_code || null);
      setGlobalBookings(globalBookings);
      setIsAdmin(true);

      // Reload config scoped to this admin
      await reloadConfig(adminId);

      setActiveTab('dashboard');
      setScreen('home');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

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
        <div className="pa-community">Admin Portal</div>
        <h1>Admin <span className="pa-serif">login</span></h1>
        <p>Authorized personnel only</p>
      </div>
      {error && <div className="pa-auth-error">{error}</div>}
      <div className="pa-f-group"><label className="pa-f-label">Admin Username</label><input className="pa-f-input" placeholder="Username" value={user} onChange={e => setUser(e.target.value)} /></div>
      <div className="pa-f-group"><label className="pa-f-label">Password</label><input className="pa-f-input" type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAdminLogin()} /></div>
      <button className="pa-auth-btn" onClick={doAdminLogin} disabled={loading}>
        {loading ? 'Logging in...' : 'Admin Login'}
      </button>
      <div className="pa-auth-link"><a onClick={() => setScreen('login')}>← Back to User Login</a></div>
    </div>
  );
}
