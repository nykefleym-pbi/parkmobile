

## Problem Analysis

Three distinct issues:

### Issue 1: Prorated fee not retained after cancellation
The `TicketScreen` (line 50) displays `bk.rate` (the full monthly rate) instead of using `baseFee(bk)` which calculates the prorated amount for cancelled bookings. When a user views the ticket after cancellation, it still shows the full monthly fee.

### Issue 2: Payment status incorrectly shows "Paid"
In `booking-utils.ts`, `isFullyPaid(b)` returns `totalPaid(b) >= totalOwed(b)`. When a booking has 0 payments and fee > 0, this is `0 >= fee` = false — correct. However, in `BookingsScreen.tsx` line 68-69, the "Paid" badge and "Partial" badge logic only checks amounts, not whether the booking is cancelled. The real issue: `TicketScreen` doesn't show any payment status at all — and the BookingsScreen badge logic is actually correct. The confusion is that the **TicketScreen** doesn't show the prorated total, making it look "settled" when it isn't. Additionally, when fee display is wrong in TicketScreen, it misleads about the payment state.

### Issue 3: Available slots not updating in Search tab
`HomeScreen.tsx` uses `globalBookings` to count available slots, but `globalBookings` is **only populated during admin login**. For regular users, it's always empty — so all slots always show as available. It should use `occupiedSlots` from context, which IS populated from the database during `loadUserData`.

## Plan

### 1. Fix `HomeScreen.tsx` — Use `occupiedSlots` instead of `globalBookings`
- Change `getAvail` to use `occupiedSlots` (which is loaded from DB) instead of `globalBookings.filter(b => b.status === 'active')`
- Also memoize `locs` with `useMemo`

### 2. Fix `TicketScreen.tsx` — Show prorated fee and payment status
- Import `baseFee`, `remaining`, `isFullyPaid` from booking-utils
- Display `baseFee(bk)` instead of `bk.rate` for the total
- Add a payment status indicator (Unpaid/Paid) on the ticket
- Handle cancelled booking display properly (show "Cancelled" status, prorated fee breakdown)

### 3. Fix `BookingsScreen.tsx` — Ensure cancelled bookings show as unpaid
- The badge logic on line 68-69 already works correctly (`isFullyPaid` returns false when 0 paid and fee > 0), but add explicit "Unpaid" badge for cancelled bookings with remaining balance > 0 to make the status clearer

### Files changed

| File | Change |
|---|---|
| `src/pages/user/HomeScreen.tsx` | Use `occupiedSlots` for available slot count; memoize `locs` |
| `src/pages/user/TicketScreen.tsx` | Show `baseFee(bk)` instead of `bk.rate`; add payment status indicator |
| `src/pages/user/BookingsScreen.tsx` | Add explicit "Unpaid" badge for bookings with remaining balance |

