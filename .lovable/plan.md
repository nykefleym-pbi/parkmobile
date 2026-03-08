

## Problem Found

The signup is returning a **500 error**: `"Database error saving new user"`. 

**Root cause**: The `vehicles` table has a foreign key constraint `vehicles_user_id_fkey` that references `public.users(id)` instead of `auth.users(id)`. When the `handle_new_user` trigger tries to insert a vehicle with the auth user's ID, it fails because there's no matching row in the `public.users` table.

The `profiles` table correctly references `auth.users(id)`, but `vehicles` references a separate legacy `public.users` table (which is empty and unused).

## Plan

### 1. Fix the vehicles foreign key (SQL migration)
- Drop the existing `vehicles_user_id_fkey` constraint pointing to `public.users(id)`
- Add a new foreign key constraint pointing to `auth.users(id) ON DELETE CASCADE`

### 2. No code changes needed
The `SignupScreen.tsx` and `AppContext.tsx` code is correct. The trigger function is correct. Only the database FK constraint is wrong.

### 3. Consider cleaning up the legacy `public.users` table
The `public.users` table appears to be a legacy table that's no longer used (0 rows, no SELECT RLS policy). It could be dropped, but that's optional and can be done separately to avoid risk.

### Expected outcome
After fixing the FK, the signup trigger will successfully insert both the profile and vehicle rows, the verification email will be sent, and after confirming, the user will land on the home screen with their profile and vehicle data already populated.

