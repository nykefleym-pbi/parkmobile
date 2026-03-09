import { supabase } from '@/integrations/supabase/client';
import { AppConfig } from './types';

export async function loadAppConfig(adminId?: string | null): Promise<{ config: AppConfig; configDbId: string | null }> {
  const defaults: AppConfig = {
    subdiv: 'Your Subdivision', theme: 'green', logo: null,
    appName: 'ParkAssist',
    hoa: { phone: '[mobile number]', email: '[email address]', hours: '[availability]' },
    spaces: [
      { name: 'Parking Space 1', addr: '[parking space address]', slots: 10, rate: 1500 },
      { name: 'Parking Space 2', addr: '[parking space address]', slots: 10, rate: 1500 },
    ],
  };

  try {
    let cfgQuery = supabase.from('app_config').select('*').limit(1);
    if (adminId) {
      cfgQuery = supabase.from('app_config').select('*').eq('admin_id', adminId).limit(1);
    }
    const { data: cfgs } = await cfgQuery;
    let configDbId: string | null = null;
    if (cfgs && cfgs.length) {
      const c = cfgs[0];
      configDbId = c.id;
      defaults.subdiv = c.subdiv_name;
      defaults.appName = c.app_name;
      defaults.theme = c.theme;
      defaults.logo = c.logo_url;
      defaults.adminId = (c as any).admin_id || undefined;
      defaults.hoa = { phone: c.hoa_phone || '[mobile number]', email: c.hoa_email || '[email address]', hours: c.hoa_hours || '[availability]' };
    }

    let spacesQuery = supabase.from('spaces').select('*').order('sort_order');
    if (adminId) {
      spacesQuery = supabase.from('spaces').select('*').eq('admin_id', adminId).order('sort_order');
    }
    const { data: spaces } = await spacesQuery;
    if (spaces && spaces.length) {
      defaults.spaces = spaces.map(s => ({ id: s.id, name: s.name, addr: s.address, slots: s.slots, rate: +s.rate }));
    }

    return { config: defaults, configDbId };
  } catch {
    return { config: defaults, configDbId: null };
  }
}
