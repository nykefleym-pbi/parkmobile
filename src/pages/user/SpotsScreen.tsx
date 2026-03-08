import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { isoDate, today, addDays } from '@/lib/helpers';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SpotsScreenProps { locIdx: number; highlightSlot?: string; }

export default function SpotsScreen({ locIdx, highlightSlot }: SpotsScreenProps) {
  const { buildLocs, occupiedSlots, setOccupiedSlots, bookings, cars, profile, authUser, setBookings, setScreen, config } = useApp();
  const locs = useMemo(() => buildLocs(), [config.spaces, buildLocs]);
  const loc = locs[locIdx];
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [selCarIdx, setSelCarIdx] = useState(() => { const i = cars.findIndex(c => c.primary); return i >= 0 ? i : 0; });
  const [confirmed, setConfirmed] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  const bookedIds = occupiedSlots;
  const myIds = useMemo(() => bookings.filter(b => b.status === 'active').map(b => b.slotId), [bookings]);
  const bookedPlates = useMemo(() => bookings.filter(b => b.status === 'active').map(b => b.car.plate), [bookings]);
  const availCars = useMemo(() => cars.filter(c => !bookedPlates.includes(c.plate)), [cars, bookedPlates]);

  if (!loc) return null;

  async function confirmBooking() {
    if (!selectedSpot || !availCars.length || !authUser || confirmed) return;
    const car = availCars[selCarIdx >= availCars.length ? 0 : selCarIdx];

    if (!car.dbId) {
      toast.error('Vehicle not synced. Please go to Profile and re-save it.');
      return;
    }

    setConfirmed(true);
    try {
      const s = isoDate(today()), e = isoDate(addDays(today(), 30));
      const code = 'BK-' + Date.now();

      const { data: res, error } = await supabase.from('bookings').insert({
        booking_code: code, user_id: authUser.id, space_name: loc.name, slot_id: selectedSpot,
        vehicle_id: car.dbId, vehicle_name: car.name, vehicle_plate: car.plate,
        vehicle_color: car.color, rate: loc.rate, status: 'active', start_date: s, end_date: e,
        user_name: profile.name, user_email: profile.email, user_block_lot: profile.blklot,
      }).select();

      if (error) throw error;

      const dbId = res && res.length ? res[0].id : null;
      const bk = {
        dbId, id: code, slotId: selectedSpot, locName: loc.name, startDate: s, endDate: e,
        status: 'active', cancelledDate: null, car: { name: car.name, plate: car.plate, color: car.color },
        userName: profile.name, userEmail: profile.email, userBlklot: profile.blklot,
        rate: loc.rate, userId: authUser.id, payments: [], penalty: null,
      };
      setBookings(prev => [...prev, bk]);
      setOccupiedSlots(prev => [...prev, selectedSpot]);
      setBooking(bk);
      setTimeout(() => setScreen('ticket'), 1100);
    } catch (err: any) {
      setConfirmed(false);
      toast.error(err?.message || 'Booking failed. Could not complete your reservation.');
    }
  }

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar" />
      <div style={{ padding: '0 24px 14px' }}>
        <button className="pa-back pa-fu" onClick={() => setScreen('home')}>
          <ArrowLeft size={18} /> Back
        </button>
      </div>
      <div className="pa-hdr pa-fu pa-d1" style={{ paddingTop: 0 }}>
        <h1>{loc.name}</h1>
        <p>{loc.addr} · {loc.total} slots</p>
      </div>
      <div className="pa-info-card pa-fu pa-d2">
        <div className="pa-ic-label">Monthly Rate</div>
        <div className="pa-ic-val">₱{loc.rate.toLocaleString()} <small>/month (30 days)</small></div>
      </div>
      <div className="pa-legend pa-fu pa-d2">
        <div className="pa-leg-i"><div className="pa-leg-d a" />Available</div>
        <div className="pa-leg-i"><div className="pa-leg-d s" />Selected</div>
        <div className="pa-leg-i"><div className="pa-leg-d o" />Occupied</div>
      </div>
      <div className="pa-sgrid">
        {loc.spots.map((s, i) => {
          const sel = selectedSpot === s.id;
          const isB = bookedIds.includes(s.id);
          const isM = myIds.includes(s.id);
          const isHL = highlightSlot === s.id;
          let cls = 'pa-scell pa-fu';
          if (isHL) cls += ' hl';
          else if (isM) cls += ' mine';
          else if (isB) cls += ' tk';
          else if (sel) cls += ' sel';
          const canClick = !isB && !isHL && !isM;
          return (
            <div key={s.id} className={cls} style={{ animationDelay: `${0.025 * i}s` }}
              onClick={() => canClick && setSelectedSpot(sel ? null : s.id)}>
              <div className="pa-sc-id">{s.id.split('-')[1]}</div>
              <div className="pa-sc-status">{isHL ? 'Your Slot' : isM ? 'Yours' : isB ? 'Occupied' : sel ? 'Selected' : 'Open'}</div>
            </div>
          );
        })}
      </div>
      {selectedSpot && (
        <>
          <div className="pa-car-sel pa-fu pa-d3">
            <div className="pa-cs-label">Select Vehicle</div>
            {!availCars.length ? (
              <div style={{ fontSize: 13, color: 'var(--pa-tx2)', padding: '8px 0' }}>All vehicles are currently booked.</div>
            ) : availCars.map((c, i) => (
              <div key={i} className={`pa-car-opt ${i === selCarIdx ? 'on' : ''}`} onClick={() => setSelCarIdx(i)}>
                <div className="pa-co-radio" />
                <div className="pa-co-info">
                  <div className="pa-co-name">{c.name}</div>
                  <div className="pa-co-plate">{c.plate} · {c.color}</div>
                </div>
                {c.primary && <div className="pa-co-badge">Primary</div>}
              </div>
            ))}
          </div>
          <div className="pa-reserve-inline">
            <button className={`pa-bbk ${confirmed ? 'cfm' : ''}`} disabled={!availCars.length || confirmed} onClick={confirmBooking}>
              {confirmed ? <><Check size={20} /> Confirmed</> : `Reserve ${selectedSpot} · ₱${loc.rate.toLocaleString()}/mo`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
