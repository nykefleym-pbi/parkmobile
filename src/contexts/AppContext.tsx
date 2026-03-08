import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppConfig, Booking, Car, RegisteredUser, UserProfile, Location } from '@/lib/types';
import { loadAppConfig } from '@/lib/supabase-data';
import { applyTheme } from '@/lib/themes';
import { autoPrefix, today } from '@/lib/helpers';
import { remaining, hasPaid, coverageEndDate } from '@/lib/booking-utils';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AppState {
  loading: boolean;
  config: AppConfig;
  configDbId: string | null;
  currentUser: RegisteredUser | null;
  authUser: User | null;
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
  loadUserData: (userId: string) => Promise<void>;
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
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [cars, setCars] = useState<Car[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [globalBookings, setGlobalBookings] = useState<Booking[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [screen, setScreen] = useState('splash');
  const [activeTab, setActiveTab] = useState('search');

  const loadUserData = useCallback(async (userId: string) => {
    // Load profile
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (prof) {
      setProfile({
        name: prof.name, email: prof.email, phone: prof.phone || '',
        blklot: prof.block_lot || '', restype: prof.residence_type || 'Resident',
        avatar: prof.avatar_url, memberSince: prof.created_at,
      });
      setCurrentUser({
        dbId: userId, name: prof.name, email: prof.email, phone: prof.phone || '',
        pass: '', blklot: prof.block_lot || '', restype: prof.residence_type || 'Resident',
        avatar: prof.avatar_url, memberSince: prof.created_at, cars: [], bookings: [],
      });
    }

    // Load vehicles, bookings, payments, penalties in parallel
    const [vehRes, bkRes, pmRes, penRes, occRes] = await Promise.all([
      supabase.from('vehicles').select('*').eq('user_id', userId),
      supabase.from('bookings').select('*').eq('user_id', userId),
      supabase.from('payments').select('*'),
      supabase.from('penalties').select('*'),
      supabase.rpc('get_occupied_slots'),
    ]);

    const uCars: Car[] = (vehRes.data || []).map((v: any) => ({
      name: v.name, plate: v.plate, color: v.color || 'White',
      primary: v.is_primary || false, dbId: v.id,
    }));
    setCars(uCars);

    const bookingIds = (bkRes.data || []).map((b: any) => b.id);
    const payments = (pmRes.data || []).filter((p: any) => bookingIds.includes(p.booking_id));
    const penalties = (penRes.data || []).filter((p: any) => bookingIds.includes(p.booking_id));

    const userBookings: Booking[] = (bkRes.data || []).map((b: any) => {
      const bkPmts = payments.filter((p: any) => p.booking_id === b.id).map((p: any) => ({
        amount: +p.amount, method: p.method, date: p.transaction_date,
        receipt: p.receipt_number || '', receiptIssued: p.receipt_issued || false, dbId: p.id,
      }));
      const pen = penalties.find((p: any) => p.booking_id === b.id);
      return {
        dbId: b.id, id: b.booking_code, slotId: b.slot_id, locName: b.space_name,
        startDate: b.start_date, endDate: b.end_date, status: b.status,
        cancelledDate: b.cancelled_date,
        car: { name: b.vehicle_name, plate: b.vehicle_plate, color: b.vehicle_color || 'White' },
        userName: b.user_name, userEmail: b.user_email, userBlklot: b.user_block_lot || '',
        rate: +b.rate, userId: b.user_id, vehicleId: b.vehicle_id,
        payments: bkPmts,
        penalty: pen ? { days: pen.overstay_days, amount: +pen.amount, date: pen.applied_date, notes: pen.notes || '', dbId: pen.id } : null,
      };
    });
    setBookings(userBookings);
    setOccupiedSlots((occRes.data || []).map((b: any) => b.slot_id));
  }, []);

  // Real-time subscriptions for payments, penalties, bookings
  useEffect(() => {
    if (!authUser) return;
    const userId = authUser.id;

    const channel = supabase.channel('user-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, (payload) => {
        const p = payload.new as any;
        setBookings(prev => prev.map(b => {
          if (b.dbId !== p.booking_id) return b;
          // Avoid duplicates
          if (b.payments.some(pm => pm.dbId === p.id)) return b;
          return { ...b, payments: [...b.payments, { amount: +p.amount, method: p.method, date: p.transaction_date, receipt: p.receipt_number || '', receiptIssued: p.receipt_issued || false, dbId: p.id }] };
        }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'penalties' }, (payload) => {
        const p = payload.new as any;
        setBookings(prev => prev.map(b => {
          if (b.dbId !== p.booking_id) return b;
          if (b.penalty) return b;
          return { ...b, penalty: { days: p.overstay_days, amount: +p.amount, date: p.applied_date, notes: p.notes || '', dbId: p.id } };
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authUser]);

  useEffect(() => {
    async function init() {
      const { config: cfg, configDbId: cid } = await loadAppConfig();
      setConfig(cfg);
      setConfigDbId(cid);
      applyTheme(cfg.theme);

      // Set up auth listener BEFORE checking session
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          // Block unverified email users
          if (!session.user.email_confirmed_at) {
            await supabase.auth.signOut();
            setAuthUser(null);
            setScreen('login');
            return;
          }
          setAuthUser(session.user);
          if (screen === 'splash' || screen === 'login' || screen === 'signup') {
            await loadUserData(session.user.id);
            const { data: prof } = await supabase.from('profiles').select('phone, block_lot').eq('id', session.user.id).single();
            const hasProfile = prof && prof.phone && prof.block_lot;
            if (!hasProfile) {
              // Check if metadata has the fields (email signup stores them there)
              const meta = session.user.user_metadata;
              if (meta?.phone && meta?.block_lot) {
                // Auto-populate profile from metadata
                await supabase.from('profiles').update({
                  phone: meta.phone,
                  block_lot: meta.block_lot,
                  residence_type: meta.residence_type || 'Resident',
                }).eq('id', session.user.id);

                // Check if vehicle already exists, if not insert from metadata
                const { data: existingVehicles } = await supabase.from('vehicles').select('id').eq('user_id', session.user.id);
                if ((!existingVehicles || existingVehicles.length === 0) && meta.car_name && meta.car_plate) {
                  await supabase.from('vehicles').insert({
                    user_id: session.user.id,
                    name: meta.car_name,
                    plate: meta.car_plate,
                    color: meta.car_color || 'White',
                    is_primary: true,
                  });
                }

                await loadUserData(session.user.id);
                setActiveTab('search');
                setScreen('home');
              } else {
                setScreen('complete-profile');
              }
            } else {
              setActiveTab('search');
              setScreen('home');
            }
          }
        } else {
          setAuthUser(null);
          if (!isAdmin) {
            setScreen('login');
          }
        }
      });

      // Check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && session.user.email_confirmed_at) {
        setAuthUser(session.user);
        await loadUserData(session.user.id);
        const { data: prof } = await supabase.from('profiles').select('phone, block_lot').eq('id', session.user.id).single();
        const hasProfile = prof && prof.phone && prof.block_lot;
        setLoading(false);
        if (!hasProfile) {
          const meta = session.user.user_metadata;
          if (meta?.phone && meta?.block_lot) {
            await supabase.from('profiles').update({
              phone: meta.phone,
              block_lot: meta.block_lot,
              residence_type: meta.residence_type || 'Resident',
            }).eq('id', session.user.id);

            const { data: existingVehicles } = await supabase.from('vehicles').select('id').eq('user_id', session.user.id);
            if ((!existingVehicles || existingVehicles.length === 0) && meta.car_name && meta.car_plate) {
              await supabase.from('vehicles').insert({
                user_id: session.user.id,
                name: meta.car_name,
                plate: meta.car_plate,
                color: meta.car_color || 'White',
                is_primary: true,
              });
            }

            await loadUserData(session.user.id);
            setActiveTab('search');
            setScreen('home');
          } else {
            setScreen('complete-profile');
          }
        } else {
          setActiveTab('search');
          setScreen('home');
        }
      } else {
        setLoading(false);
        setTimeout(() => setScreen('login'), 1800);
      }

      return () => subscription.unsubscribe();
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
    const expireMapper = (b: Booking) => {
      if (b.status !== 'active') return b;
      const effEnd = hasPaid(b) ? coverageEndDate(b) : b.endDate;
      const ed = typeof effEnd === 'string' ? new Date(effEnd + 'T00:00:00') : effEnd;
      if (now >= ed) return { ...b, status: 'expired' };
      return b;
    };
    setGlobalBookings(prev => {
      const next = prev.map(expireMapper);
      return next.some((b, i) => b !== prev[i]) ? next : prev;
    });
    setBookings(prev => {
      const next = prev.map(expireMapper);
      return next.some((b, i) => b !== prev[i]) ? next : prev;
    });
  }, []);

  const getUserPayable = useCallback(() => {
    return bookings.reduce((s, b) =>
      (b.status === 'active' || b.status === 'expired' || b.status === 'cancelled') ? s + remaining(b) : s, 0);
  }, [bookings]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
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

  const contextValue = useMemo(() => ({
    loading, config, configDbId, currentUser, authUser, isAdmin, adminToken, profile, cars, bookings,
    globalBookings, registeredUsers, occupiedSlots, screen, activeTab,
    setScreen, setActiveTab, setConfig, setConfigDbId, setCurrentUser, setIsAdmin,
    setAdminToken, setProfile, setCars, setBookings, setGlobalBookings, setRegisteredUsers,
    setOccupiedSlots, buildLocs, checkExpired, getUserPayable, logout, loadUserData,
  }), [loading, config, configDbId, currentUser, authUser, isAdmin, adminToken, profile, cars, bookings,
    globalBookings, registeredUsers, occupiedSlots, screen, activeTab,
    buildLocs, checkExpired, getUserPayable, logout, loadUserData]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
