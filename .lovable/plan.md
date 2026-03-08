

## Problem

The booking freeze has two causes:

### 1. `vehicle_id` is NOT NULL in the database
Line 34 in `SpotsScreen.tsx`: `vehicle_id: car.dbId || undefined`. When a non-primary vehicle's `dbId` is null/undefined, this sends `undefined`, which violates the NOT NULL constraint on `vehicle_id`. The Supabase insert **fails silently** because the code ignores the error (`{ data: res }` — never checks `error`). After the failed insert, `setBookings` and `setOccupiedSlots` update local state, but the setTimeout to navigate may be disrupted by cascading re-renders from those state updates.

### 2. No error handling in `confirmBooking`
If the insert fails, there's no feedback and the app gets stuck in the "Confirmed" state with no navigation.

### 3. `buildLocs()` called raw every render
Line 11: `const locs = buildLocs();` creates a new array on every re-render of SpotsScreen, causing unnecessary work during the post-booking state updates.

## Plan

### File: `src/pages/user/SpotsScreen.tsx`

1. **Memoize `locs`** — wrap `buildLocs()` in `useMemo` like Index.tsx does
2. **Add try/catch with error handling** to `confirmBooking` — show toast on failure, reset `confirmed` state
3. **Fix `vehicle_id`** — ensure it's always a valid UUID. If `car.dbId` is null, the car hasn't been saved to DB yet; handle this edge case by either skipping the insert or looking up the vehicle first
4. **Check Supabase error response** — destructure `{ data, error }` and handle error before proceeding with local state updates

| File | Changes |
|---|---|
| `src/pages/user/SpotsScreen.tsx` | Memoize `locs`; add try/catch + error handling; fix `vehicle_id` null issue; add toast import for error feedback |

