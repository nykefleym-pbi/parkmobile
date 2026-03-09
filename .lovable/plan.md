

## Plan: Fix PWA Caching to Reflect Latest Code

### Problem
The PWA (Progressive Web App) is serving stale cached content because the workbox configuration is missing critical settings to force updates and clean old caches.

### Root Cause
1. **Missing `skipWaiting: true`** — New service worker doesn't immediately activate
2. **Missing `clientsClaim: true`** — New service worker doesn't immediately control existing clients
3. **Missing `cleanupOutdatedCaches: true`** — Old cached versions aren't being removed
4. **API calls being cached** — Supabase/edge function calls may be cached instead of hitting network

### Solution
Update `vite.config.ts` workbox configuration to force immediate updates and proper cache invalidation.

### Changes to `vite.config.ts`

```text
workbox: {
  navigateFallbackDenylist: [/^\/~oauth/],
  globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
+ skipWaiting: true,
+ clientsClaim: true,
+ cleanupOutdatedCaches: true,
+ runtimeCaching: [
+   {
+     urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
+     handler: 'NetworkFirst',
+     options: { cacheName: 'supabase-api', expiration: { maxAgeSeconds: 0 } }
+   },
+   {
+     urlPattern: /^https:\/\/.*\.functions\.supabase\.co\/.*/i,
+     handler: 'NetworkOnly'
+   }
+ ]
}
```

### What Each Setting Does
| Setting | Effect |
|---|---|
| `skipWaiting` | New service worker activates immediately instead of waiting |
| `clientsClaim` | New service worker controls all open tabs immediately |
| `cleanupOutdatedCaches` | Removes old precache versions automatically |
| `runtimeCaching` | Ensures API calls always go to network, never cached |

### Files Changed
| File | Change |
|---|---|
| `vite.config.ts` | Add workbox caching settings for immediate updates |

### After Deployment
Users will need to:
1. Close all tabs/windows of the PWA
2. Reopen the app — the new service worker will auto-install and take over
3. Or: Clear the site data in browser settings if the issue persists

