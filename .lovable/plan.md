

## Root Cause: Infinite Re-render Loop

**Line 14 of `BookingsScreen.tsx`** calls `checkExpired()` directly in the component body (during render). `checkExpired()` calls `setGlobalBookings(prev => prev.map(...))`, which triggers a state update, which triggers a re-render, which calls `checkExpired()` again — creating an infinite loop that freezes the app.

## Plan

### 1. Fix `BookingsScreen.tsx` — move side effects out of render
- Remove the bare `checkExpired()` call from the component body
- Move it into a `useEffect` so it only runs once on mount (and when bookings change), not on every render
- `getUserPayable()` is fine as a computed value but should use `useMemo` instead of being called raw during render

### 2. Refactor `checkExpired` in `AppContext.tsx`
- The current `checkExpired` updates `globalBookings` state but the BookingsScreen doesn't even use `globalBookings` — it uses `bookings`. This means `checkExpired` is doing work that doesn't affect the screen but still causes re-renders across the app.
- Update `checkExpired` to also expire the user's own `bookings` state, not just `globalBookings`.

### 3. Minor cleanup
- Remove unused `addDays` import in BookingsScreen
- Remove unused `fee` variable assignment (declared but never read)

### Summary of changes

| File | Change |
|---|---|
| `src/pages/user/BookingsScreen.tsx` | Wrap `checkExpired()` in `useEffect`; use `useMemo` for `userBal`; remove unused imports/vars |
| `src/contexts/AppContext.tsx` | Update `checkExpired` to also expire user `bookings` state |

