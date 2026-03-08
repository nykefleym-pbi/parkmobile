import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { fmtDate, today, isoDate, formatPeso } from '@/lib/helpers';
import { baseFee, penaltyAmt, totalOwed, totalPaid, remaining, isFullyPaid, isPartiallyPaid, hasPaid, coverageDays, coverageEndDate, bkDaily } from '@/lib/booking-utils';
import { addDays } from '@/lib/helpers';
import { LogOut } from 'lucide-react';
import { Booking } from '@/lib/types';

export default function BookingsScreen() {
  const { config, bookings, setBookings, setGlobalBookings, checkExpired, getUserPayable, logout, setScreen } = useApp();
  const [cancelId, setCancelId] = useState<string | null>(null);

  checkExpired();
  const userBal = getUserPayable();

  async function executeCancellation() {
    if (!cancelId) return;
    const bk = bookings.find(b => b.id === cancelId);
    if (!bk || hasPaid(bk)) return;
    const cd = isoDate(today());
    const update = (b: Booking) => b.id === cancelId ? { ...b, status: 'cancelled', cancelledDate: cd } : b;
    setBookings(prev => prev.map(update));
    setGlobalBookings(prev => prev.map(update));
    if (bk.dbId) await supabase.from('bookings').update({ status: 'cancelled', cancelled_date: cd }).eq('id', bk.dbId);
    setCancelId(null);
  }

  const cancelBk = cancelId ? bookings.find(b => b.id === cancelId) : null;

  if (!bookings.length) {
    return (
      <div className="pa-screen-content">
        <div className="pa-sbar"><button className="pa-logout-btn" onClick={logout}><LogOut size={14} /> Logout</button></div>
        <div className="pa-hdr pa-fu"><div className="pa-community">{config.subdiv}</div><h1>My <span className="pa-serif">bookings</span></h1></div>
        <div className="pa-empty pa-fu pa-d1"><div className="pa-ico">🅿️</div><h3>No bookings yet</h3><p>Reserve a parking spot to get started.</p></div>
      </div>
    );
  }

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar"><button className="pa-logout-btn" onClick={logout}><LogOut size={14} /> Logout</button></div>
      <div className="pa-hdr pa-fu"><div className="pa-community">{config.subdiv}</div><h1>My <span className="pa-serif">bookings</span></h1></div>

      <div className="pa-payable-card pa-fu pa-d1">
        <div className="pa-py-label">Outstanding Balance</div>
        <div className="pa-py-val">{formatPeso(userBal)}</div>
        <div className="pa-py-sub">
          {[bookings.filter(b => b.status === 'active').length && bookings.filter(b => b.status === 'active').length + ' active',
            bookings.filter(b => b.status === 'expired').length && bookings.filter(b => b.status === 'expired').length + ' expired',
            bookings.filter(b => b.status === 'cancelled').length && bookings.filter(b => b.status === 'cancelled').length + ' cancelled',
          ].filter(Boolean).join(' + ')}
        </div>
      </div>

      {bookings.slice().reverse().map((bk, i) => {
        const fee = baseFee(bk), pen = penaltyAmt(bk), owed = totalOwed(bk), tp = totalPaid(bk), rem = remaining(bk);
        const full = isFullyPaid(bk), part = isPartiallyPaid(bk), paid = hasPaid(bk);
        const isA = bk.status === 'active', isE = bk.status === 'expired', isC = bk.status === 'cancelled';
        const canCancel = isA && !paid;

        return (
          <div key={bk.id} className={`pa-bk-card pa-fu pa-d${Math.min(i + 2, 5)}`}>
            <div className="pa-bk-top">
              <div className="pa-bk-slot">{bk.slotId}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {pen > 0 && <div className="pa-bk-badge" style={{ background: '#EF6C00' }}>Penalty</div>}
                {full && <div className="pa-bk-badge paid">Paid</div>}
                {part && <div className="pa-bk-badge partial">Partial</div>}
                <div className={`pa-bk-badge ${bk.status}`}>{isA ? 'Active' : isE ? 'Expired' : 'Cancelled'}</div>
              </div>
            </div>
            <div className="pa-bk-body">
              <div className="pa-bk-row"><div><div className="pa-bk-lbl">Location</div><div className="pa-bk-val">{bk.locName}</div></div></div>
              <div className="pa-bk-row">
                <div><div className="pa-bk-lbl">Vehicle</div><div className="pa-bk-val">{bk.car.name}</div></div>
                <div style={{ textAlign: 'right' }}><div className="pa-bk-lbl">Plate</div><div className="pa-bk-val">{bk.car.plate}</div></div>
              </div>
              <div className="pa-bk-row">
                <div><div className="pa-bk-lbl">Start</div><div className="pa-bk-val">{fmtDate(bk.startDate)}</div></div>
                <div style={{ textAlign: 'right' }}>
                  <div className="pa-bk-lbl">{isA ? 'Expires' : isE ? 'Expired' : 'Cancelled'}</div>
                  <div className="pa-bk-val">{fmtDate(isA ? bk.endDate : isE ? bk.endDate : bk.cancelledDate!)}</div>
                </div>
              </div>
              <div className="pa-bk-row">
                <div><div className="pa-bk-lbl">Fee{pen > 0 ? ' + Penalty' : ''}</div><div className="pa-bk-val">{formatPeso(owed)}</div></div>
                <div style={{ textAlign: 'right' }}>
                  <div className="pa-bk-lbl">Balance</div>
                  <div className="pa-bk-val" style={{ color: rem > 0 ? 'var(--pa-red)' : 'var(--pa-grn)' }}>{formatPeso(rem)}</div>
                </div>
              </div>

              {pen > 0 && bk.penalty && (
                <div className="pa-penalty-warn">
                  <div style={{ fontWeight: 700, color: 'var(--pa-red)', marginBottom: 4 }}>⚠ Overstay Penalty</div>
                  <div style={{ color: 'var(--pa-tx2)' }}>{bk.penalty.days} day{bk.penalty.days > 1 ? 's' : ''} × {formatPeso(bkDaily(bk))}/day = <strong style={{ color: 'var(--pa-red)' }}>{formatPeso(pen)}</strong></div>
                </div>
              )}

              {isA && paid && !full && !bk.penalty && (
                <div className="pa-coverage-warn">
                  Coverage: {coverageDays(bk)} of 30 days (until {fmtDate(coverageEndDate(bk))}). Slot stays reserved until paid days are used.
                </div>
              )}

              {bk.payments && bk.payments.length > 0 && (
                <div className={`pa-receipt-card ${full ? '' : 'partial'}`}>
                  <div className="pa-rc-title">{full ? '✓ Fully Paid' : `⏳ Partial — Bal: ${formatPeso(rem)}`}</div>
                  {bk.payments.map((p, j) => (
                    <div key={j}>
                      <div className="pa-rc-row"><span>Payment {j + 1}</span><span>{formatPeso(+p.amount)}</span></div>
                      <div className="pa-rc-row"><span>{p.method} · {p.date}</span><span>{p.receipt || '—'}{p.receiptIssued ? ' ✓' : ''}</span></div>
                      {j < bk.payments.length - 1 && <div className="pa-rc-divider" />}
                    </div>
                  ))}
                  <div className="pa-rc-divider" />
                  <div className="pa-rc-total"><span>Total Paid</span><span>{formatPeso(tp)} / {formatPeso(owed)}</span></div>
                </div>
              )}
            </div>
            {isA && (
              <div className="pa-bk-actions">
                <button className="pa-bk-btn" onClick={() => setScreen('spots-view:' + bk.locName + ':' + bk.slotId)}>View Space</button>
                {canCancel ? (
                  <button className="pa-bk-btn danger" onClick={() => setCancelId(bk.id)}>Cancel</button>
                ) : (
                  <button className="pa-bk-btn" disabled style={{ opacity: .4, cursor: 'not-allowed' }}>Paid — No Cancel</button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {cancelId && cancelBk && (
        <div className={`pa-modal-bg ${cancelId ? 'show' : ''}`} onClick={() => setCancelId(null)}>
          <div className="pa-modal" onClick={e => e.stopPropagation()}>
            <h3>Cancel Booking?</h3>
            <p>Your fee will be prorated based on days occupied.</p>
            <div className="pa-fee-breakdown">
              <div className="pa-fb-row"><span>Monthly rate</span><span>{formatPeso(cancelBk.rate)}</span></div>
              <div className="pa-fb-row"><span>Days occupied</span><span>{Math.max(1, Math.ceil((today().getTime() - new Date(cancelBk.startDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)))} of 30</span></div>
              <div className="pa-fb-row"><span>Prorated fee</span><span>{formatPeso(Math.round(Math.max(1, Math.ceil((today().getTime() - new Date(cancelBk.startDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))) / 30 * cancelBk.rate * 100) / 100)}</span></div>
            </div>
            <div className="pa-modal-btns">
              <button className="pa-m-cancel" onClick={() => setCancelId(null)}>Keep Booking</button>
              <button className="pa-m-confirm" onClick={executeCancellation}>Cancel Booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
