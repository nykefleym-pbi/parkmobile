

## Analysis

The current logic is mostly correct but has two issues:

1. **Cancellation is blocked when user has paid** (line 19 in BookingsScreen: `if (!bk || hasPaid(bk)) return`). This is intentional to prevent cancelling paid bookings, but the UI also blocks cancellation with a "Paid — No Cancel" button. The real issue is about **unpaid cancelled bookings** — the prorated fee IS calculated in `baseFee()` (line 8-10 of booking-utils.ts), but:

2. **`getUserPayable` already includes cancelled bookings** (line 267-269 of AppContext: status === 'cancelled' is included). So cancelled booking fees ARE counted in the outstanding balance.

The actual problem is: **the cancellation modal and booking card don't clearly show that the prorated fee must still be settled**. And `daysBetween` returns 0 if cancelled on the same day as start, making the fee ₱0 — which may not be intended (minimum 1 day should apply).

### Changes needed:

### 1. `src/lib/booking-utils.ts` — Ensure minimum 1 day for prorated fee
- In `baseFee()`, use `Math.max(1, daysBetween(...))` so same-day cancellations still incur at least 1 day's fee.

### 2. `src/pages/user/BookingsScreen.tsx` — Update cancellation flow and UI
- Allow cancellation even if user has partial payments (remove the `hasPaid(bk)` guard in `executeCancellation`). The fee still needs to be settled regardless.
- Update the cancel button logic: allow cancel for active bookings regardless of payment status. The user still owes the prorated amount.
- In the cancellation modal, clearly show the prorated fee and note that it must still be settled.
- On cancelled booking cards, show a "Settlement Required" indicator when balance > 0.

### Files changed

| File | Change |
|---|---|
| `src/lib/booking-utils.ts` | Ensure minimum 1-day prorated fee on cancellation |
| `src/pages/user/BookingsScreen.tsx` | Allow cancellation regardless of payment status; show settlement notice on cancelled bookings with remaining balance |

