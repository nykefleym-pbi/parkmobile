

## Plan: Multi-Admin System with Invite Codes

### Database Migration

**1. Add `admin_id` column to tables + `invite_code` to admins:**

```sql
-- Add invite_code to admins
ALTER TABLE admins ADD COLUMN invite_code TEXT UNIQUE;

-- Add admin_id to app_config (one-to-one)
ALTER TABLE app_config ADD COLUMN admin_id UUID REFERENCES admins(id) ON DELETE CASCADE;
ALTER TABLE app_config ADD CONSTRAINT app_config_admin_unique UNIQUE (admin_id);

-- Add admin_id to spaces
ALTER TABLE spaces ADD COLUMN admin_id UUID REFERENCES admins(id) ON DELETE CASCADE;

-- Add admin_id to profiles  
ALTER TABLE profiles ADD COLUMN admin_id UUID REFERENCES admins(id) ON DELETE SET NULL;

-- Add admin_id to bookings
ALTER TABLE bookings ADD COLUMN admin_id UUID REFERENCES admins(id) ON DELETE SET NULL;
```

**2. Migrate existing data to current admin:**

```sql
-- Generate invite code for existing admin
UPDATE admins SET invite_code = upper(substr(md5(random()::text), 1, 8));

-- Link all existing data to the first admin
UPDATE app_config SET admin_id = (SELECT id FROM admins LIMIT 1);
UPDATE spaces SET admin_id = (SELECT id FROM admins LIMIT 1);
UPDATE profiles SET admin_id = (SELECT id FROM admins LIMIT 1);
UPDATE bookings SET admin_id = (SELECT id FROM admins LIMIT 1);
```

**3. Update `get_occupied_slots` function** to accept an `admin_id` parameter so it only returns slots for that subdivision.

**4. Update `handle_new_user` trigger** to read `admin_id` from user metadata and store it in the profile.

**5. Update RLS policies:**
- `spaces`: Change public read to filter by `admin_id` — but since users need to see their subdivision's spaces before login context is available, keep public read and filter in app code.
- `app_config`: Same — keep public read, filter in app code.

### New Edge Function: `validate-invite-code`

Takes `{ code }`, queries `admins` table for matching `invite_code`, returns `{ admin_id, subdiv_name }` (by joining `app_config`) or error. Config: `verify_jwt = false`.

### Edge Function Updates

| Function | Change |
|---|---|
| `admin-login` | Return `invite_code` and `admin_id` in response |
| `admin-data` | Filter bookings/payments/penalties by `admin_id` (join bookings on admin_id) |
| `admin-action` | Add `admin_id` when inserting spaces. Add `regenerate_invite_code` action. Validate resource ownership (space/config admin_id matches) |

### Frontend Changes

| File | Change |
|---|---|
| `src/lib/types.ts` | Add `adminId?: string` to `AppConfig` |
| `src/lib/supabase-data.ts` | `loadAppConfig(adminId)` — filter `app_config` and `spaces` by `admin_id` |
| `src/contexts/AppContext.tsx` | Store `adminId` in state. After user login, read `admin_id` from profile, pass to `loadAppConfig`. After admin login, store `adminId` from response. |
| `src/pages/auth/SignupScreen.tsx` | Add "Invite Code" field. Call `validate-invite-code` before signup. Pass `admin_id` in user metadata. Show subdivision name on valid code. |
| `src/pages/auth/AdminLoginScreen.tsx` | Store `adminId` from login response. Pass to config loading. |
| `src/pages/admin/SettingsScreen.tsx` | Add invite code display section with copy and regenerate buttons |

### Data Flow

```text
User signup:
  1. User enters invite code → calls validate-invite-code → gets admin_id + subdiv name
  2. supabase.auth.signUp with admin_id in metadata
  3. handle_new_user trigger stores admin_id in profiles
  4. On login, profile.admin_id → loadAppConfig(adminId) → scoped config/spaces

Admin login:
  1. admin-login returns admin_id
  2. admin-data filters by admin_id
  3. loadAppConfig(adminId) loads that admin's config
```

### Files Changed Summary

- 1 SQL migration (schema + data + trigger + function updates)
- 1 new edge function (`validate-invite-code`)
- 3 edge functions updated (`admin-login`, `admin-data`, `admin-action`)
- `supabase/config.toml` — add validate-invite-code entry
- 6 frontend files updated

