import { useApp } from '@/contexts/AppContext';
import { fmtDate, formatPeso } from '@/lib/helpers';
import { baseFee, remaining, isFullyPaid } from '@/lib/booking-utils';
import { Check } from 'lucide-react';

export default function TicketScreen() {
  const { bookings, profile, setActiveTab, setScreen } = useApp();
  const bk = bookings[bookings.length - 1];
  if (!bk) return null;

  const qrData = encodeURIComponent(
    ['PARKING PASS', 'ID: ' + bk.id, 'Slot: ' + bk.slotId, 'Location: ' + bk.locName,
      'Start: ' + fmtDate(bk.startDate), 'Expires: ' + fmtDate(bk.endDate),
      'Fee: PHP ' + bk.rate, 'Resident: ' + profile.name,
      'Block/Lot: ' + profile.blklot, 'Vehicle: ' + bk.car.name, 'Plate: ' + bk.car.plate,
    ].join('\n')
  );

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar" />
      <div className="pa-tc">
        <div className="pa-tk-top-row pa-pop">
          <div className="pa-sc-chk">
            <Check size={22} stroke="#2D6A4F" strokeWidth={2.5} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>Booking confirmed</p>
          <button className="pa-tk-link" onClick={() => { setActiveTab('bookings'); setScreen('home'); }}>
            My Bookings →
          </button>
        </div>
        <div className="pa-ticket pa-fu pa-d1">
          <div className="pa-tkhd">
            <h2>Parking Pass</h2>
            <div className="pa-sn">{bk.slotId}</div>
          </div>
          <div className="pa-tk-div">
            <div className="pa-tk-notch l" /><div className="pa-tk-notch r" />
          </div>
          <div className="pa-tkbd">
            <div className="pa-tkr"><div className="pa-tkf"><label>Location</label><p>{bk.locName}</p></div></div>
            <div className="pa-tkr">
              <div className="pa-tkf"><label>Start</label><p>{fmtDate(bk.startDate)}</p></div>
              <div className="pa-tkf" style={{ textAlign: 'right' }}><label>Expires</label><p>{fmtDate(bk.endDate)}</p></div>
            </div>
            <div className="pa-tkr">
              <div className="pa-tkf"><label>Vehicle</label><p>{bk.car.name}</p></div>
              <div className="pa-tkf" style={{ textAlign: 'right' }}><label>Plate</label><p>{bk.car.plate}</p></div>
            </div>
            <div className="pa-tkr">
              <div className="pa-tkf"><label>Total</label><p>{formatPeso(baseFee(bk))}</p></div>
              <div className="pa-tkf" style={{ textAlign: 'right' }}><label>Status</label><p style={{ color: isFullyPaid(bk) ? 'var(--pa-grn)' : isPartiallyPaid(bk) ? '#EF6C00' : 'var(--pa-red)' }}>{isFullyPaid(bk) ? 'Paid' : isPartiallyPaid(bk) ? 'Partial' : 'Unpaid'}</p></div>
            </div>
            <div className="pa-qr-wrap">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&format=png&data=${qrData}`}
                width={160} height={160} style={{ borderRadius: 12 }} alt="QR" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
