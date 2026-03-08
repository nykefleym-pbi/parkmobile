

## Plan: Admin Password Change Feature

### Overview
Add a secure password change feature for admins. Admins must provide their current password and set a new one (6-8 digits only). The new password is hashed server-side with PBKDF2.

---

### 1. Edge Function: `supabase/functions/admin-action/index.ts`

**Add password hashing/verification functions** (ported from `admin-login`):
- `hashPasswordPbkdf2` — PBKDF2 with 310,000 iterations
- `verifyPasswordPbkdf2`, `verifyPasswordSha256`, `verifyPassword` — supports all legacy formats + plaintext default passwords

**Add `change_password` action handler** (after `regenerate_invite_code` block):
- Accepts `{ current_password, new_password }`
- Validates `new_password` matches `/^\d{6,8}$/` (6-8 digits only)
- Fetches admin's `password_hash` from DB
- Verifies `current_password` against stored hash using `verifyPassword`
- Hashes `new_password` with `hashPasswordPbkdf2`
- Updates `admins.password_hash` with the new hash
- Returns `{ ok: true }` on success, appropriate error on failure

---

### 2. Frontend: `src/pages/admin/SettingsScreen.tsx`

**Add state variables:**
- `currentPw`, `newPw`, `confirmPw` (strings)
- `changingPw` (boolean), `pwError`, `pwSuccess` (strings)

**Add "Change Password" UI section** between Invite Code and App Theme sections:
- Section label: "Change Password"
- Current Password input (`type="password"`, `inputMode="numeric"`)
- New Password input (6-8 digits, `inputMode="numeric"`, `maxLength={8}`)
- Confirm Password input
- Client-side validation: digits only, 6-8 length, passwords match
- Submit button calling `adminAction('change_password', { current_password: currentPw, new_password: newPw })`
- Success message (green) and error message (red) feedback
- Clears fields on success

---

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/admin-action/index.ts` | Add hashing functions + `change_password` action |
| `src/pages/admin/SettingsScreen.tsx` | Add Change Password UI section |

