import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatPeso, fmtShortMonth, today } from '@/lib/helpers';
import { totalPaid, remaining, penaltyAmt } from '@/lib/booking-utils';

export default function DashboardScreen() {
  const { config, globalBookings, checkExpired, setActiveTab, setScreen } = useApp();
  
  // Run checkExpired in effect instead of render body
  React.useEffect(() => { checkExpired(); }, []);

  const all = globalBookings;
  const act = all.filter(b => b.status === 'active');
  const TS = config.spaces.reduce((s, sp) => s + sp.slots, 0);
  const occupied = act.length, available = TS - occupied;
  const occRate = TS ? Math.round((occupied / TS) * 100) : 0;
  const revenue = all.reduce((s, b) => s + totalPaid(b), 0);
  const unpaidAmt = all.reduce((s, b) => s + remaining(b), 0);
  const unpaidTickets = all.filter(b => remaining(b) > 0);
  const totalPen = all.reduce((s, b) => s + penaltyAmt(b), 0);

  const [period, setPeriod] = useState<'30d' | '90d' | '6m' | 'ytd' | 'all'>('6m');

const { months, mRevenue, mBookings, periodAll } = useMemo(() => {
  const now = today();
  const cutoff = new Date(now);
  if (period === '30d') cutoff.setDate(cutoff.getDate() - 30);
  else if (period === '90d') cutoff.setDate(cutoff.getDate() - 90);
  else if (period === '6m') cutoff.setMonth(cutoff.getMonth() - 6);
  else if (period === 'ytd') cutoff.setMonth(0, 1);
  else cutoff.setFullYear(2000);

  const months: Date[] = [];
  const monthsBack = period === '30d' ? 1 : period === '90d' ? 3 : period === '6m' ? 6 : period === 'ytd' ? now.getMonth() + 1 : 12;
  for (let i = monthsBack - 1; i >= 0; i--) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }

  const periodAll = all.filter(b => new Date(b.startDate + 'T00:00:00') >= cutoff);

  const mRevenue = months.map(m => {
    const y = m.getFullYear(), mo = m.getMonth();
    return all.reduce((s, b) => (b.payments || []).reduce((ps, p) => {
      const pd = new Date(p.date + 'T00:00:00');
      return pd.getFullYear() === y && pd.getMonth() === mo ? ps + (+p.amount) : ps;
    }, s), 0);
  });

  const mBookings = months.map(m => {
    const y = m.getFullYear(), mo = m.getMonth();
    return all.filter(b => {
      const sd = new Date(b.startDate + 'T00:00:00');
      return sd.getFullYear() === y && sd.getMonth() === mo;
    }).length;
  });

  return { months, mRevenue, mBookings, periodAll };
}, [all, period]);

const maxR = Math.max(...mRevenue, 1), maxB = Math.max(...mBookings, 1);
const periodRevenue = periodAll.reduce((s, b) => s + totalPaid(b), 0);
const periodUnpaid = periodAll.reduce((s, b) => s + remaining(b), 0);

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar" style={{ paddingTop: 52, paddingBottom: 10 }} />
      <div className="pa-hdr pa-fu">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          {config.logo ? (
            <img src={config.logo} style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }} alt="Logo" />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--pa-acc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 36 36" fill="none" width={18} height={18}><rect x="6" y="14" width="24" height="16" rx="3" stroke="#fff" strokeWidth="2.5" /><path d="M10 14V10a8 8 0 0116 0v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /><circle cx="18" cy="22" r="2.5" fill="#fff" /></svg>
            </div>
          )}
          <div className="pa-community">Admin Dashboard</div>
        </div>
        <h1>Overview</h1>
      </div>

      <div className="pa-filter-tabs pa-fu pa-d1" style={{ marginBottom: 18, padding: '0 24px' }}>
        {([
          { k: '30d', label: '30 days' },
          { k: '90d', label: '90 days' },
          { k: '6m', label: '6 months' },
          { k: 'ytd', label: 'YTD' },
          { k: 'all', label: 'All time' },
        ] as const).map(p => (
          <button
            key={p.k}
            className={`pa-filter-tab ${period === p.k ? 'on' : ''}`}
            onClick={() => setPeriod(p.k)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="pa-stat-grid pa-fu pa-d1">
        <div className="pa-stat-card"><div className="pa-st-label">Occupied</div><div className="pa-st-val">{occupied} <span className="pa-st-unit">/ {TS}</span></div></div>
        <div className="pa-stat-card"><div className="pa-st-label">Available</div><div className="pa-st-val">{available}</div></div>
        <div className="pa-stat-card">
          <div className="pa-st-label">Occupancy</div><div className="pa-st-val">{occRate}%</div>
          <div style={{ marginTop: 8, height: 6, background: 'var(--pa-soft)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${occRate}%`, background: 'var(--pa-grn)', borderRadius: 3 }} />
          </div>
        </div>
        <div className="pa-stat-card"><div className="pa-st-label">Revenue</div><div className="pa-st-val sm">{formatPeso(periodRevenue, 0)}</div><div className="pa-st-sub">collected</div></div>
        <div className="pa-stat-card"><div className="pa-st-label">Unpaid</div><div className="pa-st-val sm" style={{ color: 'var(--pa-red)' }}>{formatPeso(periodUnpaid, 0)}</div><div className="pa-st-sub">{periodAll.filter(b => remaining(b) > 0).length} tickets</div></div>
        <div className="pa-stat-card"><div className="pa-st-label">Penalties</div><div className="pa-st-val sm" style={{ color: '#EF6C00' }}>{formatPeso(totalPen, 0)}</div><div className="pa-st-sub">{all.filter(b => b.penalty).length} applied</div></div>
      </div>

      <div className="pa-slbl pa-fu pa-d2">Revenue Trend</div>
      <div style={{ padding: '0 24px', marginBottom: 20 }} className="pa-fu pa-d2">
        <div className="pa-chart-card">
          <div className="pa-bar-chart">
            {months.map((m, i) => (
              <div key={i} className="pa-bar-col">
                <div className="pa-bar-val">{mRevenue[i] > 0 ? '₱' + mRevenue[i].toLocaleString() : ''}</div>
                <div className="pa-bar" style={{ height: mRevenue[i] > 0 ? Math.max(Math.round((mRevenue[i] / maxR) * 70), 6) : 3, background: 'var(--pa-grn)' }} />
                <div className="pa-bar-lbl">{fmtShortMonth(m)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pa-slbl pa-fu pa-d3">Bookings Trend</div>
      <div style={{ padding: '0 24px', marginBottom: 20 }} className="pa-fu pa-d3">
        <div className="pa-chart-card">
          <div className="pa-bar-chart">
            {months.map((m, i) => (
              <div key={i} className="pa-bar-col">
                <div className="pa-bar-val">{mBookings[i] || ''}</div>
                <div className="pa-bar" style={{ height: mBookings[i] > 0 ? Math.max(Math.round((mBookings[i] / maxB) * 70), 6) : 3, background: 'var(--pa-acc)' }} />
                <div className="pa-bar-lbl">{fmtShortMonth(m)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pa-slbl pa-fu pa-d4">Receivable by Space</div>
      <div className="pa-stat-grid pa-fu pa-d4">
        {config.spaces.map(sp => {
          const u = all.filter(b => b.locName === sp.name).reduce((s, b) => s + remaining(b), 0);
          const c = all.filter(b => b.locName === sp.name && remaining(b) > 0).length;
          return (
            <div key={sp.name} className="pa-stat-card">
              <div className="pa-st-label">{sp.name}</div>
              <div className="pa-st-val sm">{formatPeso(u, 0)}</div>
              <div className="pa-st-sub">{c} with balance</div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 24px', marginBottom: 12 }} className="pa-fu pa-d5">
        <button className="pa-bbk" style={{ fontSize: 14, padding: 14 }} onClick={() => { setActiveTab('users'); setScreen('home'); }}>View Top Receivables →</button>
      </div>
      <div style={{ padding: '0 24px', marginBottom: 20 }} className="pa-fu pa-d5">
        <button className="pa-bbk" style={{ fontSize: 14, padding: 14, background: 'var(--pa-sf)', color: 'var(--pa-tx)', border: '1.5px solid var(--pa-brd)' }}
          onClick={() => { setActiveTab('tickets'); setScreen('home'); }}>View All Tickets →</button>
      </div>
    </div>
  );
}
