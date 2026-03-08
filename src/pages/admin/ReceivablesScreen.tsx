import { useApp } from '@/contexts/AppContext';
import { formatPeso } from '@/lib/helpers';
import { totalOwed, totalPaid, remaining, penaltyAmt } from '@/lib/booking-utils';
import { LogOut } from 'lucide-react';

export default function ReceivablesScreen() {
  const { globalBookings, checkExpired, logout } = useApp();
  checkExpired();

  const userMap: Record<string, { name: string; blklot: string; email: string; totalOwedAmt: number; totalPaidAmt: number; penalties: number; count: number }> = {};
  globalBookings.forEach(bk => {
    if (!userMap[bk.userEmail]) userMap[bk.userEmail] = { name: bk.userName, blklot: bk.userBlklot, email: bk.userEmail, totalOwedAmt: 0, totalPaidAmt: 0, penalties: 0, count: 0 };
    userMap[bk.userEmail].totalOwedAmt += totalOwed(bk);
    userMap[bk.userEmail].totalPaidAmt += totalPaid(bk);
    userMap[bk.userEmail].penalties += penaltyAmt(bk);
    userMap[bk.userEmail].count++;
  });

  const sorted = Object.values(userMap).map(u => ({ ...u, balance: u.totalOwedAmt - u.totalPaidAmt })).sort((a, b) => b.balance - a.balance).slice(0, 10);

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar"><button className="pa-logout-btn" onClick={logout}><LogOut size={14} /> Logout</button></div>
      <div className="pa-hdr pa-fu"><div className="pa-community">Admin</div><h1>Top <span className="pa-serif">receivables</span></h1></div>

      {!sorted.length ? (
        <div className="pa-empty"><div className="pa-ico">👤</div><h3>No users</h3><p>No booking data yet.</p></div>
      ) : sorted.map((u, i) => (
        <div key={u.email} className={`pa-admin-ticket pa-fu pa-d${Math.min(i + 1, 5)}`}>
          <div className="pa-at-top">
            <div className="pa-at-slot" style={{ fontSize: 14 }}>{u.name}</div>
            <div className={`pa-at-status ${u.balance > 0 ? 'unpaid' : 'paid'}`}>{u.balance > 0 ? 'Has Balance' : 'Settled'}</div>
          </div>
          <div className="pa-at-row"><span>{u.blklot}</span><strong>{u.email}</strong></div>
          <div className="pa-at-row"><span>Bookings</span><strong>{u.count}</strong></div>
          <div className="pa-at-row"><span>Total Owed</span><strong>{formatPeso(u.totalOwedAmt)}</strong></div>
          {u.penalties > 0 && <div className="pa-at-row"><span>Incl. Penalties</span><strong style={{ color: '#EF6C00' }}>{formatPeso(u.penalties)}</strong></div>}
          <div className="pa-at-row"><span>Total Paid</span><strong style={{ color: 'var(--pa-grn)' }}>{formatPeso(u.totalPaidAmt)}</strong></div>
          <div className="pa-at-row"><span>Balance</span><strong style={{ color: u.balance > 0 ? 'var(--pa-red)' : 'var(--pa-grn)' }}>{formatPeso(u.balance)}</strong></div>
        </div>
      ))}
    </div>
  );
}
