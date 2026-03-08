

## Plan: Four UI Improvements

### 1. Settlement text includes overstay penalty when applicable
**File**: `src/pages/user/BookingsScreen.tsx` (lines 123-128)

Change the settlement warning text from:
> "Prorated fee of ₱300 must still be settled"

To conditionally include penalty:
> "Prorated fee + overstay penalty of ₱300 must still be settled"

Logic: If `pen > 0`, prepend "Prorated fee + overstay penalty fee"; otherwise keep "Prorated fee".

### 2. Block cancellation of paid bookings
**File**: `src/pages/user/BookingsScreen.tsx` (lines 129-134)

- When user clicks "Cancel" on a fully paid booking, show a warning modal instead of the cancellation modal
- Warning text: "Paid bookings can only be cancelled on or after the coverage period has lapsed. This prevents refund complications."
- Add state `warnPaidId` for this warning modal
- The "Cancel" button still appears but triggers the warning instead of `setCancelId`

### 3. Collapsible booking cards (user side)
**File**: `src/pages/user/BookingsScreen.tsx`

- Add `expandedId` state (string | null)
- Each booking card header (slot ID + badges row) becomes a clickable toggle
- The body (`pa-bk-body`), penalty warnings, coverage info, receipt card, and action buttons are hidden unless `expandedId === bk.id`
- Add a chevron indicator on the header row

### 4. Collapsible ticket cards (admin side)
**File**: `src/pages/admin/TicketsScreen.tsx`

- Add `expandedId` state (string | null)
- Each ticket card header (slot ID + status row) becomes a clickable toggle
- The detail rows, payment/penalty buttons are hidden unless expanded
- Add a chevron indicator on the header row

### Files changed

| File | Change |
|---|---|
| `src/pages/user/BookingsScreen.tsx` | Settlement text update, paid booking cancel warning, collapsible cards |
| `src/pages/admin/TicketsScreen.tsx` | Collapsible ticket cards |

