

## Plan: Fix Vehicle Delete/Edit, Sticky Footer, and HOA → Admin Rename

### 1. Fix Vehicle Deletion (Root Cause Found)

The `bookings` table has a foreign key `bookings_vehicle_id_fkey` referencing `vehicles(id)` with **no ON DELETE action** (defaults to RESTRICT). This means deleting a vehicle that has any bookings fails silently at the database level.

**Fix**: Alter the FK to `ON DELETE SET NULL`, which preserves all booking/ticket data (vehicle name, plate, color are stored inline on the booking row) while allowing the vehicle record to be deleted. The `vehicle_id` column must also be made nullable.

**SQL migration:**
```sql
ALTER TABLE public.bookings ALTER COLUMN vehicle_id DROP NOT NULL;
ALTER TABLE public.bookings DROP CONSTRAINT bookings_vehicle_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
```

No code changes needed — the delete logic in `ProfileScreen.tsx` is already correct; it was just blocked by the FK constraint.

### 2. Fix Vehicle Editing

The edit flow also appears to work in code (the `saveCar` function updates via Supabase). If there's an issue, it's likely the same `saving` state getting stuck after a failed delete. The FK fix above should resolve cascading issues. I'll also add a `toast` success confirmation after save so it's clear edits went through.

### 3. Sticky Bottom Tab Bar on Mobile

The tab bar uses `position: absolute; bottom: 0` inside `.pa-phone`. On mobile (the `@media (max-width: 420px)` breakpoint), the phone is `100vh`. The tab bar should be `position: fixed` on mobile to ensure it never scrolls away.

**CSS change** in the mobile media query:
```css
@media (max-width: 420px) {
  .pa-tbar { position: fixed; bottom: 0; left: 0; right: 0; }
}
```

### 4. Rename "HOA" → "Admin" Everywhere

All occurrences across these files:

| File | Change |
|---|---|
| `src/pages/admin/SettingsScreen.tsx` | "HOA Contact Details" → "Admin Contact Details" |
| `src/pages/user/HelpScreen.tsx` | "Contact HOA Office" → "Contact Admin Office", FAQ text mentioning "HOA" → "admin" |
| `src/lib/supabase-data.ts` | Default text cleanup (cosmetic only, DB column names like `hoa_phone` remain unchanged) |

The database column names (`hoa_phone`, `hoa_email`, `hoa_hours`) will **not** be renamed — they still store admin contact info, and renaming columns would require a migration plus edge function updates for no functional benefit.

### Files changed

| File | Change |
|---|---|
| SQL migration | Alter `bookings.vehicle_id` FK to `ON DELETE SET NULL`, make nullable |
| `src/index.css` | Fix mobile tab bar to `position: fixed` |
| `src/pages/admin/SettingsScreen.tsx` | "HOA" → "Admin" label |
| `src/pages/user/HelpScreen.tsx` | "HOA" → "Admin" in contact section and FAQ text |
| `src/lib/supabase-data.ts` | Default HOA label text cleanup |

