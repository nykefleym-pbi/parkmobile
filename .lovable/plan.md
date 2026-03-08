

## Problem Analysis

Two related issues:

1. **Profile/vehicle data not saved during email signup**: After `supabase.auth.signUp()`, the user has no confirmed session. Since email confirmation is required, the subsequent `profiles.update()` and `vehicles.insert()` calls fail silently because RLS policies require `auth.uid()` to match -- but there's no authenticated session yet.

2. **Email signup users shown "Complete your profile" unnecessarily**: Because the profile data was never saved (point 1), the `phone`/`block_lot` fields are empty, triggering the complete-profile redirect even though the user already provided this info.

## Solution

Store all signup details in Supabase Auth user metadata. Then, on first login after email verification, auto-populate the profile and vehicle from that metadata.

### Changes

**1. `src/pages/auth/SignupScreen.tsx`**
- Move all extra fields (`phone`, `blklot`, `restype`, `car`, `plate`, `color`) into `options.data` in the `signUp()` call
- Remove the direct `profiles.update()` and `vehicles.insert()` calls (they fail anyway)

**2. `src/contexts/AppContext.tsx`**
- After `loadUserData()`, check if profile is missing `phone`/`block_lot`
- If missing, read `authUser.user_metadata` for the signup fields
- If metadata has the values, auto-update `profiles` and insert `vehicles`, then reload user data
- Only redirect to `complete-profile` if metadata also lacks the fields (i.e., Google OAuth users)

**3. `src/pages/auth/CompleteProfileScreen.tsx`**
- No structural changes needed; it remains the fallback for Google OAuth users who genuinely haven't provided these details

### Flow After Fix

- **Email signup**: Data stored in metadata → user verifies email → logs in → metadata auto-applied to profile/vehicles → goes straight to home
- **Google OAuth**: No metadata → profile incomplete → shown complete-profile screen → fills in details → goes to home

