import { useApp } from '@/contexts/AppContext';
import { Search, CalendarDays, User, LayoutGrid, Settings, Users } from 'lucide-react';

const userTabs = [
  { key: 'search', label: 'Search', Icon: Search },
  { key: 'bookings', label: 'Bookings', Icon: CalendarDays },
  { key: 'profile', label: 'Profile', Icon: User },
];

const adminTabs = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutGrid },
  { key: 'tickets', label: 'Tickets', Icon: CalendarDays },
  { key: 'users', label: 'Receivables', Icon: Users },
  { key: 'settings', label: 'Settings', Icon: Settings },
];

export default function BottomTabBar() {
  const { isAdmin, activeTab, setActiveTab, setScreen } = useApp();
  const tabs = isAdmin ? adminTabs : userTabs;

  return (
    <div className="pa-tbar">
      {tabs.map(t => (
        <button
          key={t.key}
          className={`pa-tbi ${activeTab === t.key ? 'on' : ''}`}
          onClick={() => { setActiveTab(t.key); setScreen('home'); }}
        >
          <t.Icon size={22} strokeWidth={activeTab === t.key ? 2.2 : 1.8} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
