

# ParkAssist React App — Implementation Plan

The user has approved the previous high-level plan. This is the detailed implementation breakdown for converting the 663-line HTML prototype into a React app.

## Architecture

### File Structure
```text
src/
├── lib/
│   ├── themes.ts          # 8 color themes + applyTheme()
│   ├── helpers.ts          # Date utils, formatting, initials
│   ├── types.ts            # TypeScript interfaces
│   ├── booking-utils.ts    # Fee/payment/penalty calculations
│   └── supabase-data.ts    # Data loading/CRUD via Supabase
├── contexts/
│   └── AppContext.tsx       # Global state (user, bookings, config, etc.)
├── components/
│   ├── BottomTabBar.tsx     # User/Admin tab navigation
│   ├── SplashScreen.tsx     # Animated splash
│   ├── PhoneFrame.tsx       # Optional phone frame wrapper
│   └── modals/
│       ├── CancelBookingModal.tsx
│       ├── CarModal.tsx
│       ├── ProfileEditModal.tsx
│       ├── PaymentModal.tsx
│       └── PenaltyModal.tsx
├── pages/
│   ├── Index.tsx            # Main app entry (splash → auth → app)
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   ├── SignupScreen.tsx
│   │   └── AdminLoginScreen.tsx
│   ├── user/
│   │   ├── HomeScreen.tsx       # Location list
│   │   ├── SpotsScreen.tsx      # Slot grid + car selector
│   │   ├── TicketScreen.tsx     # QR code booking pass
│   │   ├── BookingsScreen.tsx   # All user bookings
│   │   ├── ProfileScreen.tsx    # Profile + vehicles
│   │   └── HelpScreen.tsx       # FAQ + HOA contact
│   └── admin/
│       ├── DashboardScreen.tsx  # Stats + charts
│       ├── TicketsScreen.tsx    # Filter tabs + ticket management
│       ├── ReceivablesScreen.tsx # Top balances
│       └── SettingsScreen.tsx   # Theme, branding, spaces
└── index.css                # Custom CSS matching prototype styles
```

### State Management
- Single `AppContext` holding: `config`, `currentUser`, `isAdmin`, `bookings`, `globalBookings`, `cars`, `profile`, `registeredUsers`
- All Supabase operations in `supabase-data.ts`
- No Supabase Auth (app uses custom `users`/`admins` tables as in the prototype)

### Styling
- Custom CSS variables (`--pa-acc`, `--pa-grn`, etc.) applied to `:root`
- DM Sans + Instrument Serif via Google Fonts
- Mobile-first layout with the same class names adapted to Tailwind + custom CSS
- Phone frame wrapper for desktop viewing

### Key Implementation Details
1. **No database changes needed** — all tables already exist with correct schema
2. **Auth is custom** — password stored as plaintext in `users.password_hash` (matching prototype behavior)
3. **Theme system** — CSS variables set dynamically, persisted to `app_config` table
4. **QR codes** — Generated via `api.qrserver.com` (same as prototype)
5. **Bar charts** — Simple CSS bar charts (no recharts needed, matching prototype)

### Implementation Order
1. Theme system, types, utils, booking calculations
2. AppContext with Supabase data loading
3. Splash + Auth screens
4. Bottom tab bar + screen routing
5. User screens (Home → Spots → Ticket → Bookings → Profile → Help)
6. All modals
7. Admin screens (Dashboard → Tickets → Receivables → Settings)
8. Final CSS polish + animations

