import { supabase } from '@/integrations/supabase/client';
import { AppConfig, Booking, RegisteredUser, SpaceConfig, Car } from './types';

export async function loadAppConfig(): Promise<{ config: AppConfig; configDbId: string | null }> {
  const defaults: AppConfig = {
    subdiv: 'Camella Terra Alta', theme: 'green', logo: null,
    appName: 'CTA-ParkAssist',
    hoa: { phone: '+63 917 000 1234', email: 'hoa@camellaterralta.com', hours: 'Mon–Sat, 8AM–5PM' },
    spaces: [
      { name: 'Open Space 3', addr: 'Near Block 1, West Wing', slots: 15, rate: 1500 },
      { name: 'Open Space 5', addr: 'Between Block 14 and Block 9', slots: 15, rate: 1500 },
    ],
  };

  try {
    const { data: cfgs } = await supabase.from('app_config').select('*').limit(1);
    let configDbId: string | null = null;
    if (cfgs && cfgs.length) {
      const c = cfgs[0];
      configDbId = c.id;
      defaults.subdiv = c.subdiv_name;
      defaults.appName = c.app_name;
      defaults.theme = c.theme;
      defaults.logo = c.logo_url;
      defaults.hoa = { phone: c.hoa_phone || '', email: c.hoa_email || '', hours: c.hoa_hours || '' };
    }

    const { data: spaces } = await supabase.from('spaces').select('*').order('sort_order');
    if (spaces && spaces.length) {
      defaults.spaces = spaces.map(s => ({ id: s.id, name: s.name, addr: s.address, slots: s.slots, rate: +s.rate }));
    }

    return { config: defaults, configDbId };
  } catch {
    return { config: defaults, configDbId: null };
  }
}

export async function loadAllData(): Promise<{ globalBookings: Booking[]; registeredUsers: RegisteredUser[] }> {
  try {
    const [bkRes, pmRes, penRes, usrRes, vehRes] = await Promise.all([
      supabase.from('bookings').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('penalties').select('*'),
      supabase.from('users').select('*'),
      supabase.from('vehicles').select('*'),
    ]);

    const bks = bkRes.data || [];
    const pmts = pmRes.data || [];
    const pens = penRes.data || [];
    const users = usrRes.data || [];
    const vehs = vehRes.data || [];

    const globalBookings: Booking[] = bks.map(b => {
      const bkPmts = pmts.filter(p => p.booking_id === b.id).map(p => ({
        amount: +p.amount, method: p.method, date: p.transaction_date,
        receipt: p.receipt_number || '', receiptIssued: p.receipt_issued || false, dbId: p.id,
      }));
      const pen = pens.find(p => p.booking_id === b.id);
      return {
        dbId: b.id, id: b.booking_code, slotId: b.slot_id, locName: b.space_name,
        startDate: b.start_date, endDate: b.end_date, status: b.status,
        cancelledDate: b.cancelled_date, car: { name: b.vehicle_name, plate: b.vehicle_plate, color: b.vehicle_color || 'White' },
        userName: b.user_name, userEmail: b.user_email, userBlklot: b.user_block_lot || '',
        rate: +b.rate, userId: b.user_id, vehicleId: b.vehicle_id,
        payments: bkPmts,
        penalty: pen ? { days: pen.overstay_days, amount: +pen.amount, date: pen.applied_date, notes: pen.notes || '', dbId: pen.id } : null,
      };
    });

    const registeredUsers: RegisteredUser[] = users.map(u => {
      const uCars: Car[] = vehs.filter(v => v.user_id === u.id).map(v => ({
        name: v.name, plate: v.plate, color: v.color || 'White', primary: v.is_primary || false, dbId: v.id,
      }));
      return {
        dbId: u.id, name: u.name, email: u.email, phone: u.phone || '', pass: u.password_hash,
        blklot: u.block_lot || '', restype: u.residence_type || 'Resident', avatar: u.avatar_url,
        memberSince: u.created_at, cars: uCars,
        bookings: globalBookings.filter(bk => bk.userId === u.id),
      };
    });

    return { globalBookings, registeredUsers };
  } catch {
    return { globalBookings: [], registeredUsers: [] };
  }
}

export async function saveConfigToDb(configDbId: string | null, config: AppConfig) {
  if (!configDbId) return;
  await supabase.from('app_config').update({
    subdiv_name: config.subdiv, app_name: config.appName, theme: config.theme,
    logo_url: config.logo, hoa_phone: config.hoa.phone, hoa_email: config.hoa.email, hoa_hours: config.hoa.hours,
  }).eq('id', configDbId);
}
