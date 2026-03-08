

## Problem Analysis

Three issues to fix:

### 1. Occupied slots reset on re-login
The `occupiedSlots` array is loaded in `loadUserData` (line 92) via `supabase.from('bookings').select('slot_id').eq('status', 'active')`. This query uses RLS, and there's a policy "Anon can read active slot ids" that should work. However, there's no dedicated table tracking slot status — slots are derived from active bookings. The real problem: this RLS policy uses `RESTRICTIVE` (all policies in the schema show `Permissive: No`), meaning it requires ALL policies to pass. The user's own booking policy (`user_id = auth.uid()`) and the anon active-slots policy are both RESTRICTIVE, so an authenticated user can only see their OWN active bookings' slot_ids — not all active bookings across all users. This means `occupiedSlots` only contains the current user's slots, not everyone's.

**Fix**: Create a `slot_status` view or add a PERMISSIVE SELECT policy for reading slot_ids of active bookings. The simplest fix: change the "Anon can read active slot ids" policy to PERMISSIVE so it independently grants access to all active booking slot_ids.

Actually, looking more carefully: all the listed policies say `Permissive: No` which means they are RESTRICTIVE. With multiple RESTRICTIVE policies, ALL must pass. So for an authenticated user to SELECT from bookings, both "Users can read own bookings" (user_id = auth.uid()) AND "Anon can read active slot ids" (status = 'active') must pass. This means users can only see their own active bookings — which is wrong for the slot availability use case.

**Solution**: Make the "Anon can read active slot ids" policy PERMISSIVE, or better yet, create a database function (SECURITY DEFINER) that returns all active slot_ids, bypassing RLS.

### 2. Penalties not reflecting on user side
Penalties ARE saved to the `penalties` table (admin TicketsScreen line 56-59) and linked by `booking_id`. They ARE loaded in `loadUserData` (line 91, 103, 110). The issue is the RLS policy on penalties: "Users can read own penalties" is RESTRICTIVE and checks `booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())`. But the bookings policy is also RESTRICTIVE, so the subquery may fail. Actually, the subquery runs in the context of the penalties policy — it queries `bookings` which has its own RLS. Since bookings has a RESTRICTIVE policy requiring `user_id = auth.uid()`, the subquery should work for own bookings. So penalties should load correctly for the user's own bookings.

The real issue might be that after admin adds a penalty, the user's local state is stale. The user needs to reload data. But the user said "after logout and login again" it should work. Let me re-check — actually the `loadUserData` does load penalties. The problem is likely that payments RLS has the same subquery pattern and it works. So penalties should work too.

Wait — looking at `loadUserData` line 90-91: it loads ALL payments and ALL penalties without a user filter, then filters client-side by booking IDs. But the RLS on payments says "Users can read own payments" which restricts to bookings where user_id = auth.uid(). So payments load correctly. Same for penalties. This should work.

The actual issue might be simpler: when admin records a penalty via `confirmPenalty`, it only updates `globalBookings` state (line 61-63) but the user's `bookings` state is separate. When the user logs in fresh, `loadUserData` should pick it up from DB. So if it's not reflecting, either the RLS is blocking it or the data isn't being saved.

Let me focus on the concrete fixes needed:

### 3. Payment not reflecting in user balance
Same pattern — admin records payment to DB and updates `globalBookings`, but user's `bookings` state is separate. On fresh login, `loadUserData` loads from DB. If payments aren't showing, it's likely the RLS issue with the RESTRICTIVE policies.

## Root Cause

The core issue is **RESTRICTIVE RLS policies**. All policies are `Permissive: No` (RESTRICTIVE). With RESTRICTIVE policies, ALL must pass simultaneously. This means:

- For `bookings` SELECT: both "Users can read own bookings" AND "Anon can read active slot ids" must pass. So users can only see their own active bookings (not expired/cancelled ones, and not other users' active slots).
- For `payments` SELECT: "Users can read own payments" uses a subquery on bookings, which itself is restricted. This might work but only for active bookings.
- For `penalties` SELECT: Same issue.

**The fix**: Change these policies to PERMISSIVE so they work as OR conditions instead of AND.

## Plan

### 1. Database migration — Fix RLS policies
- Drop and recreate the bookings SELECT policies as PERMISSIVE:
  - "Users can read own bookings" (PERMISSIVE) — `user_id = auth.uid()`
  - "Anyone can read active slot ids" (PERMISSIVE) — `status = 'active'` for role `anon` only
- Create a SECURITY DEFINER function `get_occupied_slots()` that returns all active booking slot_ids (bypasses RLS entirely)
- Fix payments SELECT policy to PERMISSIVE
- Fix penalties SELECT policy to PERMISSIVE

### 2. Update `loadUserData` in AppContext
- Use the `get_occupied_slots()` RPC function instead of querying bookings for slot_ids
- This ensures all users see all occupied slots regardless of RLS

### 3. No changes needed to TicketScreen/BookingsScreen/ProfileScreen
- The booking-utils functions (`baseFee`, `penaltyAmt`, `totalOwed`, `totalPaid`, `remaining`) already correctly calculate balances including penalties
- Once RLS is fixed, penalties and payments will load from DB correctly on login

### Files changed

| File | Change |
|---|---|
| DB migration | Fix RLS policies to PERMISSIVE; add `get_occupied_slots()` function |
| `src/contexts/AppContext.tsx` | Use `get_occupied_slots()` RPC for occupied slots |

