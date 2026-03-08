

## Plan: Receivables Filter + Partial Payment Expiry Logic

### 1. Filter receivables to only show users with balance > 0
**File**: `src/pages/admin/ReceivablesScreen.tsx`

- After computing `sorted`, filter out users where `balance <= 0`
- Only users with outstanding balance appear in the list
- Update the empty state message accordingly

### 2. Expired partially-paid bookings owe nothing beyond what was paid
**File**: `src/lib/booking-utils.ts`

Change `baseFee()` logic: when a booking is `expired` and was partially paid, the base fee should equal only the prorated amount for coverage days used (i.e., `totalPaid`). The user consumed exactly the days their payment covered, so no additional balance is owed.

Specifically:
- If `status === 'expired'` and `isPartiallyPaid(b)`: `baseFee = totalPaid(b)` (they used exactly what they paid for)
- This makes `remaining(b) === 0` for expired partial-pay bookings automatically
- Fully unpaid expired bookings: baseFee stays at full rate (they used the slot without paying)
- Fully paid bookings: no change needed

### 3. Coverage-based expiry already works
The `checkExpired` in AppContext already uses `coverageEndDate(b)` for paid bookings, which calculates the end date based on days covered by payment. When that date passes, the booking expires and the slot re-opens via `get_occupied_slots()` (which only returns `active` bookings). No change needed here.

### Files changed

| File | Change |
|---|---|
| `src/lib/booking-utils.ts` | `baseFee()` returns `totalPaid(b)` for expired partially-paid bookings |
| `src/pages/admin/ReceivablesScreen.tsx` | Filter out users with zero balance |

