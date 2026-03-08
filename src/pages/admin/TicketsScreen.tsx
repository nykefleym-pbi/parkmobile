import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { fmtDate, today, isoDate, formatPeso, addDays } from '@/lib/helpers';
import { baseFee, penaltyAmt, totalOwed, totalPaid, remaining, isFullyPaid, isPartiallyPaid, hasPaid, coverageDays, coverageEndDate, bkDaily } from '@/lib/booking-utils';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function TicketsScreen() {
  const { globalBookings, setGlobalBookings, checkExpired, logout, adminToken } = useApp();
  const [filter, setFilter] = useState('all');
  const [payTarget, setPayTarget] = useState<string | null>(null);
  const [penTarget, setPenTarget] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'GCash', date: isoDate(today()), receipt: '', issued: false });
  const [penForm, setPenForm] = useState({ days: '', notes: '' });

  checkExpired();
  const filters = ['all', 'unpaid', 'partial', 'paid', 'penalized', 'active', 'expired', 'cancelled'];

  let list = globalBookings.slice().reverse();
  if (filter === 'unpaid') list = list.filter(b => !totalPaid(b) && remaining(b) > 0);
  else if (filter === 'partial') list = list.filter(b => isPartiallyPaid(b));
  else if (filter === 'paid') list = list.filter(b => isFullyPaid(b));
  else if (filter === 'penalized') list = list.filter(b => b.penalty);
  else if (filter !== 'all') list = list.filter(b => b.status === filter);

  const payBk = payTarget ? globalBookings.find(b => b.id === payTarget) : null;
  const penBk = penTarget ? globalBookings.find(b => b.id === penTarget) : null;

  async function confirmPayment() {
    if (!payBk) return;
    const amt = parseFloat(payForm.amount) || 0;
    if (amt <= 0) { alert('Enter a valid amount.'); return; }
    const rem = remaining(payBk);
    if (amt > rem) { alert(`Amount exceeds balance of ₱${rem.toLocaleString()}.`); return; }

    const insertData = {
      booking_id: payBk.dbId, amount: amt, method: payForm.method,
      transaction_date: payForm.date, receipt_number: payForm.receipt || null, receipt_issued: payForm.issued,
    };

    const { data: res, error } = await supabase.functions.invoke('admin-action', {
      body: { token: adminToken, action: 'insert_payment', data: insertData },
    });

    if (error || res?.error) {
      toast.error(res?.error || 'Failed to record payment');
      return;
    }

    setGlobalBookings(prev => prev.map(b => b.id === payTarget ? {
      ...b, payments: [...b.payments, { amount: amt, method: payForm.method, date: payForm.date, receipt: payForm.receipt, receiptIssued: payForm.issued }]
    } : b));
    setPayTarget(null);
    toast.success('Payment recorded');
  }

  async function confirmPenalty() {
    if (!penBk || penBk.penalty) return;
    const days = parseInt(penForm.days) || 0;
    if (days <= 0) { alert('Enter at least 1 day.'); return; }
    const amt = Math.round(days * bkDaily(penBk) * 100) / 100;
    const dt = isoDate(today());

    const insertData = {
      booking_id: penBk.dbId, overstay_days: days, amount: amt,
      applied_date: dt, notes: penForm.notes || null,
    };

    const { data: res, error } = await supabase.functions.invoke('admin-action', {
      body: { token: adminToken, action: 'insert_penalty', data: insertData },
    });

    if (error || res?.error) {
      toast.error(res?.error || 'Failed to apply penalty');
      return;
    }

    setGlobalBookings(prev => prev.map(b => b.id === penTarget ? {
      ...b, penalty: { days, amount: amt, date: dt, notes: penForm.notes }
    } : b));
    setPenTarget(null);
    toast.success('Penalty applied');
  }

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar"><button className="pa-logout-btn" onClick={logout}><LogOut size={14} /> Logout</button></div>
      <div className="pa-hdr pa-fu"><div className="pa-community">Admin</div><h1>All <span className="pa-serif">tickets</span></h1></div>

      <div className="pa-filter-tabs">
        {filters.map(f => (
          <button key={f} className={`pa-filter-tab ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {!list.length ? (
        <div className="pa-empty"><div className="pa-ico">📋</div><h3>No tickets</h3><p>No tickets match this filter.</p></div>
      ) : list.map((bk, i) => {
        const fee = baseFee(bk), pen = penaltyAmt(bk), owed = totalOwed(bk), tp = totalPaid(bk), rem = remaining(bk);
        const full = isFullyPaid(bk), part = isPartiallyPaid(bk);
        const statusCls = full ? 'paid' : part ? 'partial' : 'unpaid';
        const statusLbl = full ? 'Paid' : part ? `Partial (₱${rem.toLocaleString()} left)` : 'Unpaid';

        return (
          <div key={bk.id} className={`pa-admin-ticket pa-fu pa-d${Math.min(i + 1, 5)}`}>
            <div className="pa-at-top">
              <div className="pa-at-slot">{bk.slotId}{pen > 0 ? ' ⚠' : ''}</div>
              <div className={`pa-at-status ${statusCls}`}>{statusLbl}</div>
            </div>
            <div className="pa-at-row"><span>Resident</span><strong>{bk.userName}</strong></div>
            <div className="pa-at-row"><span>Block/Lot</span><strong>{bk.userBlklot}</strong></div>
            <div className="pa-at-row"><span>Vehicle</span><strong>{bk.car.name} · {bk.car.plate}</strong></div>
            <div className="pa-at-row"><span>{bk.locName}</span><strong>{fmtDate(bk.startDate)} — {fmtDate(bk.endDate)}</strong></div>
            <div className="pa-at-row"><span>Base Fee</span><strong>{formatPeso(fee)}</strong></div>
            {pen > 0 && bk.penalty && <>
              <div className="pa-at-row"><span>Penalty ({bk.penalty.days}d overstay)</span><strong style={{ color: '#EF6C00' }}>{formatPeso(pen)}</strong></div>
              <div className="pa-at-row"><span>Parked until</span><strong style={{ color: 'var(--pa-red)' }}>{fmtDate(addDays(bk.endDate, bk.penalty.days))}</strong></div>
            </>}
            <div className="pa-at-row"><span>Total Owed</span><strong>{formatPeso(owed)}</strong></div>
            <div className="pa-at-row"><span>Paid</span><strong style={{ color: full ? 'var(--pa-grn)' : tp > 0 ? '#EF6C00' : 'var(--pa-tx2)' }}>{formatPeso(tp)}</strong></div>
            {bk.status === 'active' && hasPaid(bk) && !full && !bk.penalty && (
              <div className="pa-at-row"><span>Coverage</span><strong>{coverageDays(bk)} days (until {fmtDate(coverageEndDate(bk))})</strong></div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {!full ? (
                <button className="pa-admin-action-btn green" onClick={e => { e.stopPropagation(); setPayForm({ amount: String(rem), method: 'GCash', date: isoDate(today()), receipt: '', issued: false }); setPayTarget(bk.id); }}>
                  + Payment
                </button>
              ) : <div className="pa-admin-action-settled">✓ Settled</div>}
              {!bk.penalty ? (
                <button className="pa-admin-action-btn orange" onClick={e => { e.stopPropagation(); setPenForm({ days: '', notes: '' }); setPenTarget(bk.id); }}>
                  ⚠ Penalty
                </button>
              ) : <div className="pa-admin-action-penalty">⚠ {bk.penalty.days}d penalty</div>}
            </div>
          </div>
        );
      })}

      {/* Payment Modal */}
      {payTarget && payBk && (
        <div className="pa-modal-bg show" onClick={() => setPayTarget(null)}>
          <div className="pa-modal" onClick={e => e.stopPropagation()}>
            <h3>Record Payment</h3>
            <p><strong>{payBk.slotId}</strong> · {payBk.userName}<br />
              Owed: {formatPeso(totalOwed(payBk))} · Paid: {formatPeso(totalPaid(payBk))} · <strong style={{ color: 'var(--pa-red)' }}>Bal: {formatPeso(remaining(payBk))}</strong></p>
            {payBk.payments.length > 0 && (
              <div style={{ background: 'var(--pa-soft)', borderRadius: 'var(--pa-rs)', padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--pa-tx2)', marginBottom: 8 }}>Payment History</div>
                {payBk.payments.map((p, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{p.method} · {p.date}</span><strong>{formatPeso(+p.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
            <div className="pa-f-group"><label className="pa-f-label">Amount Paid (₱) — max: {formatPeso(remaining(payBk))}</label><input className="pa-f-input" type="number" max={remaining(payBk)} value={payForm.amount} onChange={e => { const v = Math.min(parseFloat(e.target.value) || 0, remaining(payBk)); setPayForm(p => ({ ...p, amount: v > 0 ? String(v) : e.target.value })); }} /></div>
            <div className="pa-f-group">
              <label className="pa-f-label">Payment Method</label>
              <select className="pa-f-select" value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}>
                <option>GCash</option><option>Cash</option><option>Bank Transfer</option><option>BDO</option><option>Maya</option><option>Check</option>
              </select>
            </div>
            <div className="pa-f-group"><label className="pa-f-label">Transaction Date</label><input className="pa-f-input" type="date" value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div className="pa-f-group"><label className="pa-f-label">Receipt Number</label><input className="pa-f-input" placeholder="e.g. RCT-2026-001" value={payForm.receipt} onChange={e => setPayForm(p => ({ ...p, receipt: e.target.value }))} /></div>
            <label className="pa-f-check"><input type="checkbox" checked={payForm.issued} onChange={e => setPayForm(p => ({ ...p, issued: e.target.checked }))} /><div className="pa-ck" />Receipt issued to resident</label>
            <div className="pa-modal-btns">
              <button className="pa-m-cancel" onClick={() => setPayTarget(null)}>Cancel</button>
              <button className="pa-m-confirm" style={{ background: 'var(--pa-grn)' }} onClick={confirmPayment}>Confirm Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Modal */}
      {penTarget && penBk && (
        <div className="pa-modal-bg show" onClick={() => setPenTarget(null)}>
          <div className="pa-modal" onClick={e => e.stopPropagation()}>
            <h3>Apply Overstay Penalty</h3>
            <p><strong>{penBk.slotId}</strong> · {penBk.userName}<br />
              Booking: {fmtDate(penBk.startDate)} — {fmtDate(penBk.endDate)}<br />
              Daily rate: {formatPeso(bkDaily(penBk))}/day</p>
            <div className="pa-f-group"><label className="pa-f-label">Overstay Days</label><input className="pa-f-input" type="number" min="1" placeholder="e.g. 4" value={penForm.days} onChange={e => setPenForm(p => ({ ...p, days: e.target.value }))} /></div>
            {parseInt(penForm.days) > 0 && (
              <div style={{ background: 'var(--pa-soft)', borderRadius: 'var(--pa-rs)', padding: 12, marginBottom: 16, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--pa-tx2)' }}>Overstay</span>
                  <strong>{penForm.days} day{parseInt(penForm.days) > 1 ? 's' : ''} (until {fmtDate(addDays(penBk.endDate, parseInt(penForm.days)))})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--pa-tx2)' }}>Penalty ({penForm.days} × {formatPeso(bkDaily(penBk))})</span>
                  <strong style={{ color: '#EF6C00' }}>{formatPeso(Math.round(parseInt(penForm.days) * bkDaily(penBk) * 100) / 100)}</strong>
                </div>
              </div>
            )}
            <div className="pa-f-group"><label className="pa-f-label">Notes (optional)</label><input className="pa-f-input" placeholder="e.g. Car still parked after expiry" value={penForm.notes} onChange={e => setPenForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <div className="pa-modal-btns">
              <button className="pa-m-cancel" onClick={() => setPenTarget(null)}>Cancel</button>
              <button className="pa-m-confirm" style={{ background: '#EF6C00' }} onClick={confirmPenalty}>Apply Penalty</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
