

## Plan: Avatar Delete Button + Modal Overlay Fix

### 1. Add "Remove Photo" button in Edit Profile modal

In `ProfileScreen.tsx`, add a delete button next to the camera button in the avatar edit section. When clicked, it clears `profileForm.avatar` to `''`, which makes the avatar fall back to initials. The `saveProfile` function already persists `avatar_url` to the database, so setting it to empty string will clear it.

**File**: `src/pages/user/ProfileScreen.tsx` (lines 231-236)
- Add a red "X" or trash button that appears only when `profileForm.avatar` is set
- On click: `setProfileForm(p => ({ ...p, avatar: '' }))`

### 2. Fix modal overlay not covering full screen

The `.pa-modal-bg` uses `position: absolute` which only covers its parent container, not the full viewport. Content below the fold (below the scroll) is not covered.

**Fix in `src/index.css`** (line 378):
- Change `position: absolute` to `position: fixed` on `.pa-modal-bg`
- Set `z-index` high enough to cover content but below the tab bar (`z-index: 90`, since the tab bar is at `z-index: 100`)

This ensures the overlay covers the entire viewport. The tab bar remains visible and clickable since it has a higher z-index.

### Files changed

| File | Change |
|---|---|
| `src/pages/user/ProfileScreen.tsx` | Add remove-photo button in avatar edit section |
| `src/index.css` | Change `.pa-modal-bg` from `position: absolute` to `position: fixed`, z-index 90 |

