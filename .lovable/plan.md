

## Plan: Auto-Initialize App Config and Spaces for New Admins

### Problem
When a new admin is manually added to the `admins` table and logs in, they have no `app_config` or `spaces` rows. The Settings screen can't save changes because `configDbId` is null.

### Solution
On admin login, check if an `app_config` row exists for that admin. If not, auto-create one with defaults and create two default parking spaces. This happens in the `admin-login` edge function so the admin immediately has a working configuration.

### Changes

**1. `supabase/functions/admin-login/index.ts`**
After successful authentication (before returning the token), add:
- Query `app_config` for `admin_id = admin.id`
- If no row exists:
  - Insert a new `app_config` row with defaults (subdiv_name = admin.name's subdivision, app_name, theme, hoa contact defaults) linked to `admin_id`
  - Insert two default `spaces` rows (e.g., "Open Space 1" with 15 slots at 1500 rate, "Open Space 2" with 15 slots at 1500 rate) linked to `admin_id`

**2. `src/pages/admin/SettingsScreen.tsx`**
- No changes needed — once `app_config` exists, `configDbId` will be set and `updateConfig` will work as-is.

**3. `src/contexts/AppContext.tsx`**
- No changes needed — `reloadConfig(adminId)` already loads the config after login.

### Default Values for New Admin Config
| Field | Default |
|---|---|
| `subdiv_name` | Admin's `name` field from admins table |
| `app_name` | `'ParkAssist'` |
| `theme` | `'green'` |
| `hoa_phone` | `''` |
| `hoa_email` | `''` |
| `hoa_hours` | `'Mon–Sat, 8AM–5PM'` |

### Default Spaces
| Space | Address | Slots | Rate |
|---|---|---|---|
| Open Space 1 | Parking Area 1 | 15 | 1500 |
| Open Space 2 | Parking Area 2 | 15 | 1500 |

### Files Changed
| File | Change |
|---|---|
| `supabase/functions/admin-login/index.ts` | Auto-create `app_config` + 2 default `spaces` on first login |

