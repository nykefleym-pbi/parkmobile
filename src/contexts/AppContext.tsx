import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppConfig, Booking, Car, RegisteredUser, UserProfile, Location } from '@/lib/types';
import { loadAppConfig } from '@/lib/supabase-data';
import { applyTheme } from '@/lib/themes';
import { autoPrefix, today } from '@/lib/helpers';
import { remaining, hasPaid, coverageEndDate } from '@/lib/booking-utils';

interface AppState {
  loading: boolean;
  config: AppConfig;
  configDbId: string | null;
  currentUser: RegisteredUser | null;
  isAdmin: boolean;
  adminToken: string | null;
  profile: UserProfile;
  cars: Car[];
  bookings: Booking[];
  globalBookings: Booking[];
  registeredUsers: RegisteredUser[];
  occupiedSlots: string[];
  screen: string;
  activeTab: string;
  setScreen: (s: string) => void;
  setActiveTab: (t: string) => void;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  setConfigDbId: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<RegisteredUser | null>>;
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  setAdminToken: React.Dispatch<React.SetStateAction<string | null>>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  setCars: React.Dispatch<React.SetStateAction<Car[]>>;
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  setGlobalBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  setRegisteredUsers: React.Dispatch<React.SetStateAction<RegisteredUser[]>>;
  setOccupiedSlots: React.Dispatch<React.SetStateAction<string[]>>;
  buildLocs: () => Location[];
  checkExpired: () => void;
  getUserPayable: () => number;
  logout: () => void;
}

const defaultProfile: UserProfile = { name: '', email: '', phone: '', blklot: '', restype: 'Resident', avatar: null, memberSince: null };

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AppConfig>({
    subdiv: 'Camella Terra Alta', theme: 'green', logo: null, appName: 'CTA-ParkAssist',
    hoa: { phone: '', email: '', hours: '' }, spaces: [],
  });
  const [configDbId, setConfigDbId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<RegisteredUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [cars, setCars] = useState<Car[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [globalBookings, setGlobalBookings] = useState<Booking[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [screen, setScreen] = useState('splash');
  const [activeTab, setActiveTab] = useState('search');

  useEffect(() => {
    async function init() {
      const { config: cfg, configDbId: cid } = await loadAppConfig();
      setConfig(cfg);
      setConfigDbId(cid);
      applyTheme(cfg.theme);
      setLoading(false);
      setTimeout(() => setScreen('login'), 1800);
    }
    init();
  }, []);

  const buildLocs = useCallback((): Location[] => {
    return config.spaces.map(sp => {
      const pfx = autoPrefix(sp.name);
      return {
        name: sp.name, addr: sp.addr || '', total: sp.slots, rate: sp.rate, prefix: pfx, dbId: sp.id,
        spots: Array.from({ length: sp.slots }, (_, i) => ({ id: pfx + '-' + String(i + 1).padStart(2, '0'), ok: true })),
      };
    });
  }, [config.spaces]);

  const checkExpired = useCallback(() => {
    const now = today();
    setGlobalBookings(prev => prev.map(b => {
      if (b.status !== 'active') return b;
      const effEnd = hasPaid(b) ? coverageEndDate(b) : b.endDate;
      const ed = typeof effEnd === 'string' ? new Date(effEnd + 'T00:00:00') : effEnd;
      if (now >= ed) return { ...b, status: 'expired' };
      return b;
    }));
  }, []);

  const getUserPayable = useCallback(() => {
    return bookings.reduce((s, b) =>
      (b.status === 'active' || b.status === 'expired' || b.status === 'cancelled') ? s + remaining(b) : s, 0);
  }, [bookings]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAdmin(false);
    setAdminToken(null);
    setBookings([]);
    setCars([]);
    setProfile(defaultProfile);
    setGlobalBookings([]);
    setOccupiedSlots([]);
    setScreen('login');
    setActiveTab('search');
  }, []);

  return (
    <AppContext.Provider value={{
      loading, config, configDbId, currentUser, isAdmin, adminToken, profile, cars, bookings,
      globalBookings, registeredUsers, occupiedSlots, screen, activeTab,
      setScreen, setActiveTab, setConfig, setConfigDbId, setCurrentUser, setIsAdmin,
      setAdminToken, setProfile, setCars, setBookings, setGlobalBookings, setRegisteredUsers,
      setOccupiedSlots, buildLocs, checkExpired, getUserPayable, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
