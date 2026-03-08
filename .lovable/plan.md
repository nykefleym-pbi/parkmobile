

## Analysis

Two issues are causing the freeze and incorrect behavior:

### Freeze cause
**`ProfileScreen` line 17**: `getUserPayable()` is called raw during render. Additionally, `buildLocs()` in `AppShell` (line 23) creates a new array reference every render, which invalidates the `content` useMemo (line 65 depends on `locs`). This means every `setCars` call causes AppContext to re-render → AppShell re-renders → `locs` is a new ref → `content` useMemo recalculates → ProfileScreen remounts (loses modal state) → `getUserPayable()` runs again. The constant remounting during async operations (DB writes in `saveCar`/`setPrimary`) creates the freeze-like behavior.

### CRUD bugs
1. **`saveCar` (add)**: When setting a new car as primary, existing cars are set to `primary: false` in local state but the DB is **never updated** for those cars.
2. **`setPrimary`**: Works correctly for local + DB but is sequential (slow with many cars).
3. **`saveCar` (edit with primary)**: Same DB sync issue as add.

## Plan

### 1. Fix AppShell — memoize `locs`
Wrap `buildLocs()` result in `useMemo` so it returns a stable reference, preventing unnecessary `content` recalculation and ProfileScreen remounting.

### 2. Fix ProfileScreen — memoize `getUserPayable`
Use `useMemo` for `tp` instead of calling `getUserPayable()` raw during render.

### 3. Fix `saveCar` — sync primary flag to DB
When setting a new/edited car as primary, also update the DB for existing cars that lost their primary status (batch the updates).

### 4. Fix `setPrimary` — batch DB updates
Use `Promise.all` instead of sequential `for...await` loop for better performance.

### Files changed

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Memoize `locs` with `useMemo` |
| `src/pages/user/ProfileScreen.tsx` | Memoize `tp` with `useMemo`; fix `saveCar` to sync primary to DB; use `Promise.all` in `setPrimary` |

