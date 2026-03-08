import { supabase } from '@/integrations/supabase/client';
import { AppConfig } from './types';

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

export async function saveConfigToDb(configDbId: string | null, config: AppConfig) {
  if (!configDbId) return;
  await supabase.from('app_config').update({
    subdiv_name: config.subdiv, app_name: config.appName, theme: config.theme,
    logo_url: config.logo, hoa_phone: config.hoa.phone, hoa_email: config.hoa.email, hoa_hours: config.hoa.hours,
  }).eq('id', configDbId);
}
