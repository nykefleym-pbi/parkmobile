

## Plan: Update Fallback Defaults + PWA Instructions

### 1. Update fallback defaults in `src/lib/supabase-data.ts`

Change the hardcoded defaults (lines 5-12) to generic placeholders:

| Field | Current | New |
|---|---|---|
| `subdiv` | `'Camella Terra Alta'` | `'Your Subdivision'` |
| `appName` | `'CTA-ParkAssist'` | `'ParkAssist'` |
| `hoa.phone` | `'+63 917 000 1234'` | `'[mobile number]'` |
| `hoa.email` | `'admin@camellaterralta.com'` | `'[email address]'` |
| `hoa.hours` | `'Mon–Sat, 8AM–5PM'` | `'[availability]'` |
| `spaces[0]` | `Open Space 3, Near Block 1...`, 15 slots | `Parking Space 1, [parking space address]`, 10 slots, 1500 |
| `spaces[1]` | `Open Space 5, Between Block 14...`, 15 slots | `Parking Space 2, [parking space address]`, 10 slots, 1500 |

Also update the empty-string fallback on line 30 for hoa fields — when DB returns empty strings, use the placeholder defaults instead:
```
phone: c.hoa_phone || '[mobile number]'
email: c.hoa_email || '[email address]'
hours: c.hoa_hours || '[availability]'
```

### 2. Update admin-login edge function defaults

Update the auto-init defaults in `supabase/functions/admin-login/index.ts` (lines 122-137) to match:
- `hoa_phone: ''`, `hoa_email: ''`, `hoa_hours: ''` (keep empty — the frontend fallback handles display)
- Default spaces: `Parking Space 1` / `Parking Space 2`, address `[parking space address]`, slots 10, rate 1500

### 3. PWA Status

PWA is already fully configured via `vite-plugin-pwa` in `vite.config.ts` with:
- Auto-update service worker (`registerType: "autoUpdate"`)
- Web app manifest (name, icons 192px + 512px, standalone display, portrait orientation)
- Workbox caching for all static assets
- OAuth callback exclusion in navigateFallback

No code changes needed for PWA. I'll provide usage instructions in my response after implementation.

### Files Changed

| File | Change |
|---|---|
| `src/lib/supabase-data.ts` | Update all fallback defaults to generic placeholders |
| `supabase/functions/admin-login/index.ts` | Update default spaces to match new naming/slots |

