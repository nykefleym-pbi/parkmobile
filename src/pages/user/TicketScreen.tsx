import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { fmtDate, formatPeso } from '@/lib/helpers';
import { baseFee, penaltyAmt, totalOwed, totalPaid, remaining, isFullyPaid, isPartiallyPaid } from '@/lib/booking-utils';
import { Check, ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';

export default function TicketScreen() {
  const { bookings, setActiveTab, setScreen } = useApp();
  const bk = bookings[bookings.length - 1];
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    if (!bk) return;
    const payload = JSON.stringify({ v: 1, id: bk.id, slot: bk.slotId });
    QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1A1A18', light: '#FFFFFF' },
    }).then(setQrSrc).catch(() => setQrSrc(''));
  }, [bk]);

  if (!bk) return null;

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar" style={{ justifyContent: 'space-between' }}>
        <button className="pa-back pa-fu" onClick={() => { setActiveTab('search'); setScreen('home'); }}>
          <ArrowLeft size={18} /> Home
        </button>
        <button
          className="pa-tk-link"
          onClick={() => { setActiveTab('bookings'); setScreen('home'); }}
        >
          My Bookings →
        </button>
      </div>
      <div className="pa-tc">
        <div className="pa-tk-top-row pa-pop" style={{ justifyContent: 'center' }}>
          <div className="pa-sc-chk">
            <Check size={22} stroke="var(--pa-grn)" strokeWidth={2.5} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600 }}>Booking confirmed</p>
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
            {penaltyAmt(bk) > 0 && bk.penalty && (
              <div className="pa-tkr">
                <div className="pa-tkf"><label>Penalty ({bk.penalty.days}d)</label><p style={{ color: '#EF6C00' }}>{formatPeso(penaltyAmt(bk))}</p></div>
                <div className="pa-tkf" style={{ textAlign: 'right' }}><label>Total Owed</label><p style={{ color: 'var(--pa-red)' }}>{formatPeso(totalOwed(bk))}</p></div>
              </div>
            )}
            {totalPaid(bk) > 0 && (
              <div className="pa-tkr">
                <div className="pa-tkf"><label>Paid</label><p style={{ color: 'var(--pa-grn)' }}>{formatPeso(totalPaid(bk))}</p></div>
                <div className="pa-tkf" style={{ textAlign: 'right' }}><label>Balance</label><p style={{ color: remaining(bk) > 0 ? 'var(--pa-red)' : 'var(--pa-grn)' }}>{formatPeso(remaining(bk))}</p></div>
              </div>
            )}
            <div className="pa-tkr">
              <div className="pa-tkf"><label>Total</label><p>{formatPeso(baseFee(bk))}</p></div>
              <div className="pa-tkf" style={{ textAlign: 'right' }}><label>Status</label><p style={{ color: isFullyPaid(bk) ? 'var(--pa-grn)' : isPartiallyPaid(bk) ? '#EF6C00' : 'var(--pa-red)' }}>{isFullyPaid(bk) ? 'Paid' : isPartiallyPaid(bk) ? 'Partial' : 'Unpaid'}</p></div>
            </div>
            <div className="pa-qr-wrap">
              {qrSrc ? (
                <img src={qrSrc} width={160} height={160} style={{ borderRadius: 12 }} alt="Booking QR" />
              ) : (
                <div style={{ width: 160, height: 160, borderRadius: 12, background: 'var(--pa-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--pa-tx2)', margin: '0 auto' }}>
                  Generating…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
