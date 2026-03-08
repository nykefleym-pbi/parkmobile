

## Plan: Google OAuth Fix, Splash Screen Config, and Security Remediations

### 1. Google OAuth — Provider Not Enabled

The error `"Unsupported provider: provider is not enabled"` means Google OAuth is not configured in the Supabase dashboard. **This is not a code issue — it requires dashboard configuration.**

**Action required from you:**
1. Go to [Supabase Auth Providers](https://supabase.com/dashboard/project/qdwihdmhlebiyvdezoyl/auth/providers)
2. Enable Google provider
3. Add your Google OAuth Client ID and Client Secret (from Google Cloud Console)
4. Set the redirect URL shown in Supabase into your Google OAuth app's "Authorized redirect URLs"

**If you don't plan to use Google login**, I'll remove the "Continue with Google" button from both Login and Signup screens to avoid confusing users.

### 2. Splash Screen — Use Config from Supabase

The splash screen already reads `config.logo` and `config.appName`. The issue is **timing**: the splash shows immediately while `loadAppConfig()` is still fetching from Supabase, so it renders with hardcoded defaults.

**Fix**: In `AppContext.tsx`, load the config **before** showing the splash, or pass the loaded config to the splash once available. Specifically, delay the splash render until `loadAppConfig()` resolves, so `config.logo` and `config.appName` are populated when the splash appears.

### 3. Security Fixes

#### 3a. Drop permissive INSERT policies on payments & penalties
These tables allow any authenticated user to insert records for any booking. Since inserts only happen via the `admin-action` edge function (which uses the service role key, bypassing RLS), we can safely drop these policies.

**SQL migration:**
```sql
DROP POLICY "Authenticated can insert payments" ON public.payments;
DROP POLICY "Authenticated can insert penalties" ON public.penalties;
```

#### 3b. Move admin settings writes to edge function
`SettingsScreen.tsx` writes directly to `app_config` and `spaces` using the anon client, guarded only by client-side `isAdmin`. Fix: add `update_config` and `update_space` / `add_space` / `delete_space` actions to the `admin-action` edge function (which verifies the HMAC admin token server-side). Then restrict RLS on `app_config` and `spaces` to deny client writes.

**SQL migration:**
```sql
-- Remove the overly permissive ALL policies
DROP POLICY "Allow all config" ON public.app_config;
DROP POLICY "Allow all spaces" ON public.spaces;

-- Keep read-only for everyone
-- "Public read config" and "Public read spaces" already exist
```

**Edge function changes** (`admin-action/index.ts`): Add actions `update_config`, `update_space`, `add_space`, `delete_space` — all behind the existing admin token verification.

**Frontend changes** (`SettingsScreen.tsx`, `supabase-data.ts`): Route all writes through `supabase.functions.invoke('admin-action', ...)` with the admin token.

#### 3c. Upgrade admin password hashing to PBKDF2
Replace SHA-256 with PBKDF2-HMAC-SHA256 (310,000 iterations) in `admin-login/index.ts`. Add auto-migration: on successful login with old hash, re-hash with PBKDF2.

#### 3d. Delete dead edge functions
Delete `auth-login` and `auth-signup` — they reference a dropped `users` table and serve no purpose. Remove their entries from `supabase/config.toml`.

#### 3e. RLS on admins table
The `admins` table has RLS enabled but no policies. Since it's only accessed via edge functions (service role key), this is fine, but we should confirm no client-side code reads it directly. No change needed.

### Files changed

| File | Change |
|---|---|
| `src/contexts/AppContext.tsx` | Load config before rendering splash so logo/name are visible |
| `src/pages/auth/LoginScreen.tsx` | Remove Google button (or keep if user enables provider) |
| `src/pages/auth/SignupScreen.tsx` | Same as above |
| `supabase/functions/admin-action/index.ts` | Add settings write actions (update_config, update_space, add_space, delete_space) |
| `supabase/functions/admin-login/index.ts` | Upgrade to PBKDF2 hashing with auto-migration |
| `src/pages/admin/SettingsScreen.tsx` | Route writes through admin-action edge function |
| `src/lib/supabase-data.ts` | Update `saveConfigToDb` to use edge function |
| `supabase/functions/auth-login/index.ts` | Delete (dead code) |
| `supabase/functions/auth-signup/index.ts` | Delete (dead code) |
| `supabase/config.toml` | Remove auth-login and auth-signup entries |
| SQL migration | Drop permissive INSERT policies on payments/penalties; drop ALL policies on app_config/spaces |

