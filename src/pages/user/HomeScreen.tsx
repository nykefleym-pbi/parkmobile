import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { LogOut } from 'lucide-react';

export default function HomeScreen() {
  const { config, occupiedSlots, buildLocs, logout, setScreen } = useApp();
  const locs = useMemo(() => buildLocs(), [buildLocs]);

  function getAvail(loc: ReturnType<typeof buildLocs>[0]) {
    return loc.spots.filter(s => s.ok && !occupiedSlots.includes(s.id)).length;
  }

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar">
        <button className="pa-logout-btn" onClick={logout}>
          <LogOut size={14} /> Logout
        </button>
      </div>
      <div className="pa-hdr pa-fu">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          {config.logo ? (
            <img src={config.logo} style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }} alt="Logo" />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--pa-acc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 36 36" fill="none" width={18} height={18}><rect x="6" y="14" width="24" height="16" rx="3" stroke="#fff" strokeWidth="2.5" /><path d="M10 14V10a8 8 0 0116 0v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /><circle cx="18" cy="22" r="2.5" fill="#fff" /></svg>
            </div>
          )}
          <div className="pa-community">{config.subdiv}</div>
        </div>
        <h1>Find your <span className="pa-serif">spot</span></h1>
        <p>Community parking spaces</p>
      </div>
      <div className="pa-slbl pa-fu pa-d1">Available Spaces</div>
      {locs.map((l, i) => {
        const a = getAvail(l);
        return (
          <div key={l.name} className={`pa-lcard pa-fu pa-d${Math.min(i + 2, 5)}`} onClick={() => {
            setScreen('spots:' + i);
          }}>
            <div className="pa-lc-top">
              <div>
                <div className="pa-lc-name">{l.name}</div>
                <div className="pa-lc-addr">{l.addr}</div>
              </div>
              <div className="pa-lc-dist">{l.total} slots</div>
            </div>
            <div className="pa-lc-mi">
              <div className={`pa-dot ${a < 5 ? 'low' : ''}`} />
              {a} available
            </div>
            <div className="pa-fee-tag">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 9.5c0-1.38 1.79-2.5 4-2.5s4 1.12 4 2.5-1.79 2.5-4 2.5-4 1.12-4 2.5 1.79 2.5 4 2.5" />
              </svg>
              ₱{l.rate.toLocaleString()}/month
            </div>
          </div>
        );
      })}
    </div>
  );
}
