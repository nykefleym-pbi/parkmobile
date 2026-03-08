

## Problem Analysis

The "Add Vehicle" operation fails silently when a user already has vehicles. Two root causes:

1. **No error handling in `saveCar`**: If the Supabase insert fails (network error, RLS issue, etc.), the function silently continues with `dbId: null`, or the `if (!userId) return` guard silently exits without feedback.

2. **Unmemoized context value causes re-renders during async operations**: The `AppContext.Provider` value (line 288) creates a new object on every render. When `saveCar` calls `setCars()`, this triggers a context re-render → ProfileScreen re-renders mid-async-operation. Combined with the lack of a saving/loading guard, rapid re-renders during the DB write chain can cause the freeze.

3. **No double-click protection**: The "Save Vehicle" button can be clicked multiple times while awaiting DB operations, causing parallel state mutations.

## Plan

### 1. Add saving state and error handling to `saveCar` in `ProfileScreen.tsx`
- Add `const [saving, setSaving] = useState(false)` state
- Wrap `saveCar` in try/catch with `setSaving(true/false)`
- Check Supabase response for errors and show them to the user
- Disable the "Save Vehicle" button while `saving` is true
- Apply the same pattern to `deleteCar` and `setPrimary`

### 2. Memoize the context value in `AppContext.tsx`
- Wrap the `value` object in `useMemo` to prevent unnecessary re-renders of all consumers when unrelated state changes

### Files changed

| File | Change |
|---|---|
| `src/pages/user/ProfileScreen.tsx` | Add `saving` state, error handling in `saveCar`/`deleteCar`/`setPrimary`, disable buttons while saving |
| `src/contexts/AppContext.tsx` | Memoize context `value` with `useMemo` |

