

## Plan: Three UI Improvements

### 1. Reflect custom logo and app name across all screens
The splash screen already uses `config.logo` and `config.appName`. The issue is that **login, signup, and other auth screens** only show `config.subdiv` text — they don't display the custom logo. Also, the PWA manifest and page title remain hardcoded as "ParkAssist".

**Changes:**
- **`src/pages/auth/LoginScreen.tsx`**: Add the custom logo (or default icon) above the header, similar to the splash screen
- **`src/pages/auth/SignupScreen.tsx`**: Same logo addition
- **`src/pages/auth/AdminLoginScreen.tsx`**: Same logo addition
- **`src/pages/auth/ForgotPasswordScreen.tsx`**: Same logo addition
- **`src/pages/user/HomeScreen.tsx`**: Add small logo next to the subdivision name in the header
- **`src/pages/admin/DashboardScreen.tsx`**: Add small logo in the admin header
- **`index.html`**: Update `<title>` to reflect the app name dynamically (or keep it generic so it works with any config)

### 2. Receipt toggle only enabled when receipt number is filled
**File**: `src/pages/admin/TicketsScreen.tsx` (line 179)

- Disable the "Receipt issued to resident" checkbox when `payForm.receipt` is empty
- When receipt field is cleared, auto-uncheck `issued`
- Add visual indication (opacity/color) that it's disabled

### 3. Rate field: select-all on focus + label change to "Rate per Month"
**File**: `src/pages/admin/SettingsScreen.tsx` (line 117)

- Change label from `Rate (₱)` to `Rate per Month (₱)`
- Add `onFocus={e => e.target.select()}` to the rate input so admin can select all text on click for easier editing
- Keep existing `min="100"` enforcement and `Math.max(100, ...)` logic

### Files changed

| File | Change |
|---|---|
| `src/pages/auth/LoginScreen.tsx` | Add custom logo display above auth header |
| `src/pages/auth/SignupScreen.tsx` | Add custom logo display above auth header |
| `src/pages/auth/AdminLoginScreen.tsx` | Add custom logo display above auth header |
| `src/pages/auth/ForgotPasswordScreen.tsx` | Add custom logo display above auth header |
| `src/pages/user/HomeScreen.tsx` | Add small logo in header area |
| `src/pages/admin/DashboardScreen.tsx` | Add small logo in admin header area |
| `src/pages/admin/TicketsScreen.tsx` | Disable receipt toggle until receipt number is filled |
| `src/pages/admin/SettingsScreen.tsx` | Label "Rate per Month (₱)" + select-all on focus |

