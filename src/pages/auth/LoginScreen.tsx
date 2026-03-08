import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Booking, Car } from '@/lib/types';

export default function LoginScreen() {
  const { setCurrentUser, setProfile, setCars, setBookings, setOccupiedSlots, setActiveTab, setScreen, config } = useApp();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function doLogin() {
    if (!email || !pass) { setError('Please enter email and password.'); return; }
    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('auth-login', {
        body: { email, password: pass },
      });

      if (fnError || data?.error) {
        setError(data?.error || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      const { user, vehicles, bookings: bks, payments, penalties, occupiedSlots } = data;

      setCurrentUser({
        dbId: user.id, name: user.name, email: user.email, phone: user.phone || '',
        pass: '', blklot: user.block_lot || '', restype: user.residence_type || 'Resident',
        avatar: user.avatar_url, memberSince: user.created_at, cars: [], bookings: [],
      });

      setProfile({
        name: user.name, email: user.email, phone: user.phone || '',
        blklot: user.block_lot || '', restype: user.residence_type || 'Resident',
        avatar: user.avatar_url, memberSince: user.created_at,
      });

      const uCars: Car[] = (vehicles || []).map((v: any) => ({
        name: v.name, plate: v.plate, color: v.color || 'White',
        primary: v.is_primary || false, dbId: v.id,
      }));
      setCars(uCars);

      const userBookings: Booking[] = (bks || []).map((b: any) => {
        const bkPmts = (payments || []).filter((p: any) => p.booking_id === b.id).map((p: any) => ({
          amount: +p.amount, method: p.method, date: p.transaction_date,
          receipt: p.receipt_number || '', receiptIssued: p.receipt_issued || false, dbId: p.id,
        }));
        const pen = (penalties || []).find((p: any) => p.booking_id === b.id);
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
      setBookings(userBookings);
      setOccupiedSlots(occupiedSlots || []);
      setActiveTab('search');
      setScreen('home');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
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
      <button className="pa-auth-btn" onClick={doLogin} disabled={loading}>
        {loading ? 'Logging in...' : 'Log In'}
      </button>
      <div className="pa-auth-link">
        Don't have an account? <a onClick={() => setScreen('signup')}>Sign Up</a>
      </div>
      <div className="pa-auth-divider"><span>or</span></div>
      <button className="pa-auth-btn outline" onClick={() => setScreen('admin-login')}>🔒 Admin Login</button>
    </div>
  );
}
