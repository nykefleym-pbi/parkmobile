

## Problem Analysis

### Root Cause: Admin has no Supabase auth session
The admin logs in via a custom token system (edge function `admin-login`), NOT via Supabase auth. The client-side `supabase` instance has **no authenticated session** for the admin. When the admin records a payment or penalty, `TicketsScreen` calls `supabase.from('payments').insert(...)` directly — but since there's no Supabase auth session, the request runs as `anon` role. The RLS INSERT policies require `authenticated` role, so **all admin inserts silently fail**. This is why the payments and penalties tables are empty.

### `booking_summary` is a VIEW, not a table
It's a database view (read-only) that joins bookings with payments/penalties for convenient querying. It does NOT duplicate data — it derives from the `bookings` table. No action needed.

## Plan

### 1. Create an `admin-action` edge function
Route admin payment and penalty inserts through a new edge function that:
- Accepts the admin token + action type (payment or penalty) + data
- Verifies the admin token (same pattern as `admin-data`)
- Uses the service role key to insert into `payments` or `penalties` tables, bypassing RLS
- Returns the inserted record

### 2. Update `TicketsScreen.tsx` to use the edge function
Replace direct `supabase.from('payments').insert(...)` and `supabase.from('penalties').insert(...)` calls with `supabase.functions.invoke('admin-action', { body: { token, action, data } })`.

### 3. Add real-time subscriptions in `AppContext.tsx`
Subscribe to `payments` and `penalties` tables using Supabase Realtime so that when admin records a payment/penalty, it immediately reflects on the user's view without re-login. Also subscribe to `bookings` for status changes.

### Files changed

| File | Change |
|---|---|
| `supabase/functions/admin-action/index.ts` | New edge function for admin payment/penalty inserts using service role |
| `src/pages/admin/TicketsScreen.tsx` | Use `admin-action` edge function instead of direct inserts |
| `src/contexts/AppContext.tsx` | Add Supabase Realtime subscriptions for payments, penalties, bookings |

