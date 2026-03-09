

## Plan: Code Optimization, Refactoring, and Security Fixes

### Security Issues Found (Critical)

**1. XSS via `dangerouslySetInnerHTML` in SplashScreen (line 39)**
`config.appName` is rendered with `dangerouslySetInnerHTML`. If an admin sets a malicious app name, it executes arbitrary JavaScript for all users. Replace with plain text rendering.

**2. Bookings RLS allows users to set arbitrary rates, statuses, and dates**
Users can INSERT bookings with `rate = 0` or UPDATE bookings to change `status`, `end_date`, `rate`, etc. Fix by:
- Moving booking creation to an edge function (or restricting INSERT columns via a DB function)
- Restricting UPDATE policy to only allow `status = 'cancelled'` and `cancelled_date` changes

**3. `booking_summary` view has no RLS / is SECURITY DEFINER**
Exposes all user data (emails, plates, block/lot) to any caller. Fix by altering the view to `security_invoker = true` and adding a SELECT policy restricting to `user_id = auth.uid()`.

**4. `admins` table has RLS enabled but no policies**
Not a real issue since admins table is only accessed via edge functions with service role key, but should be noted.

**5. Leaked password protection disabled**
Enable in Supabase dashboard (Auth > Settings).

### Performance Optimizations

**6. Duplicate profile check in AppContext init**
Lines 196-229 (onAuthStateChange) and lines 240-276 (getSession check) contain identical duplicated profile-completion logic. Extract into a shared `handleAuthenticatedUser(user)` function to reduce code and avoid double-fetching on initial load.

**7. `checkExpired()` called during render in TicketsScreen (line 18)**
`checkExpired()` is called directly in the render body (not in useEffect), causing state updates during render. Move to `useEffect` like DashboardScreen does.

**8. `RegisteredUser.pass` field is unused**
The `pass` field in the `RegisteredUser` type is always set to `''`. Remove it from the type and the assignment in AppContext.

**9. Unnecessary `registeredUsers` state**
`registeredUsers` state and setter are declared but never populated or used anywhere. Remove from context.

**10. Double `loadUserData` call on login**
In `LoginScreen.doLogin()`, `loadUserData` is called, then `onAuthStateChange` fires and calls `loadUserData` again. The login screen should just call `signInWithPassword` and let `onAuthStateChange` handle the rest.

### File Changes

| File | Changes |
|---|---|
| `src/components/SplashScreen.tsx` | Replace `dangerouslySetInnerHTML` with text content |
| `src/contexts/AppContext.tsx` | Extract shared auth handler; remove `registeredUsers` state; remove `pass` from RegisteredUser usage |
| `src/lib/types.ts` | Remove `pass` from `RegisteredUser` |
| `src/pages/admin/TicketsScreen.tsx` | Move `checkExpired()` into `useEffect` |
| `src/pages/auth/LoginScreen.tsx` | Remove redundant `loadUserData`/`setScreen` calls (let onAuthStateChange handle) |
| **DB migration** | Restrict bookings INSERT/UPDATE RLS; fix `booking_summary` view security; create server-side booking insert function |
| `supabase/functions/` | Create `create-booking` edge function for secure booking creation |

### Database Migration SQL

```sql
-- 1. Fix booking_summary view to use security invoker
ALTER VIEW public.booking_summary SET (security_invoker = true);

-- 2. Add RLS policy on booking_summary for authenticated users
CREATE POLICY "Users can read own booking summaries"
ON public.booking_summary FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 3. Restrict bookings UPDATE to only allow cancellation
DROP POLICY "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can cancel own bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'active')
WITH CHECK (status = 'cancelled' AND cancelled_date IS NOT NULL);

-- 4. Drop direct INSERT policy (will use edge function instead)
DROP POLICY "Users can insert own bookings" ON public.bookings;
```

### New Edge Function: `create-booking`
Handles secure booking creation server-side, validating:
- User owns the vehicle
- Slot is not already occupied
- Rate matches the space rate (prevents rate manipulation)
- Sets `admin_id` from user's profile

This replaces the direct client-side `supabase.from('bookings').insert()` in SpotsScreen.

