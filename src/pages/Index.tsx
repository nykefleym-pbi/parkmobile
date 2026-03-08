import { useMemo } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import SplashScreen from '@/components/SplashScreen';
import BottomTabBar from '@/components/BottomTabBar';
import LoginScreen from '@/pages/auth/LoginScreen';
import SignupScreen from '@/pages/auth/SignupScreen';
import AdminLoginScreen from '@/pages/auth/AdminLoginScreen';
import ForgotPasswordScreen from '@/pages/auth/ForgotPasswordScreen';
import CompleteProfileScreen from '@/pages/auth/CompleteProfileScreen';
import HomeScreen from '@/pages/user/HomeScreen';
import SpotsScreen from '@/pages/user/SpotsScreen';
import TicketScreen from '@/pages/user/TicketScreen';
import BookingsScreen from '@/pages/user/BookingsScreen';
import ProfileScreen from '@/pages/user/ProfileScreen';
import HelpScreen from '@/pages/user/HelpScreen';
import DashboardScreen from '@/pages/admin/DashboardScreen';
import TicketsScreen from '@/pages/admin/TicketsScreen';
import ReceivablesScreen from '@/pages/admin/ReceivablesScreen';
import SettingsScreen from '@/pages/admin/SettingsScreen';

function AppShell() {
  const { screen, activeTab, isAdmin, buildLocs } = useApp();
  const locs = buildLocs();

  const showTabs = !['splash', 'login', 'signup', 'admin-login', 'ticket', 'help'].includes(screen)
    && !screen.startsWith('spots') && !screen.startsWith('spots-view');

  const content = useMemo(() => {
    if (screen === 'splash') return <SplashScreen />;
    if (screen === 'login') return <LoginScreen />;
    if (screen === 'signup') return <SignupScreen />;
    if (screen === 'admin-login') return <AdminLoginScreen />;
    if (screen === 'ticket') return <TicketScreen />;
    if (screen === 'help') return <HelpScreen />;

    if (screen.startsWith('spots:')) {
      const idx = parseInt(screen.split(':')[1]);
      return <SpotsScreen locIdx={idx} />;
    }
    if (screen.startsWith('spots-view:')) {
      const parts = screen.split(':');
      const locName = parts[1];
      const slotId = parts[2];
      const idx = locs.findIndex(l => l.name === locName);
      return idx >= 0 ? <SpotsScreen locIdx={idx} highlightSlot={slotId} /> : <HomeScreen />;
    }

    if (screen === 'home') {
      if (isAdmin) {
        if (activeTab === 'dashboard') return <DashboardScreen />;
        if (activeTab === 'tickets') return <TicketsScreen />;
        if (activeTab === 'users') return <ReceivablesScreen />;
        if (activeTab === 'settings') return <SettingsScreen />;
        return <DashboardScreen />;
      }
      if (activeTab === 'search') return <HomeScreen />;
      if (activeTab === 'bookings') return <BookingsScreen />;
      if (activeTab === 'profile') return <ProfileScreen />;
      return <HomeScreen />;
    }

    return <HomeScreen />;
  }, [screen, activeTab, isAdmin, locs]);

  return (
    <div className="pa-phone-wrapper">
      <div className="pa-phone">
        <div className="pa-phone-notch" />
        <div className={`pa-screen ${showTabs ? 'with-tabs' : ''}`}>
          {content}
        </div>
        {showTabs && <BottomTabBar />}
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
