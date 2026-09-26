# CafeVisitor frontend redesign — design spec

## Context

CafeVisitorFrontend is the UI of a cafeteria loyalty/visit-tracking product. Today the repo is a
Supabase auth starter: Google OAuth via `@supabase/ssr`, a middleware auth gate, a `backendFetch`
wrapper that attaches the bearer token and signs out on 401, and one `/protected` page with a
"Who am I?" button that calls `GET /users/context` and renders a QR code. Everything else is
create-next-app boilerplate (root page, README, metadata).

The product needs two distinct experiences behind one login:

- **Clients** see their personal QR (tap to enlarge for scanning), pending organization
  invitations (accept/reject; an owner invitation triggers org setup), per-cafeteria stamp cards
  with reward badges, and their order history.
- **Organization users** (member/admin/owner of an org) see a cashier dashboard: pick the active
  cafeteria, scan a client QR, look up the customer, add item chips + note, confirm the order, and
  view today's stats. Owners/admins also manage team (invite by email + role, see members and
  pending invites) and cafeterias.

Goal of this branch (`redesigning_app`): build the full UX/UI first against a typed mock API, reusing
the existing auth + `backendFetch` code, so the backend can be plugged in afterwards by swapping one
adapter.

## Decisions taken with the user

| Topic | Decision |
|---|---|
| Dual role | Org users land on the org dashboard but can switch to their personal client view via the avatar menu. Clients with no org see only the client view. |
| Devices | Mobile-first for everything; layouts scale up to desktop (centered max-width container, bottom tab bar). |
| Look | Warm coffee-shop palette (espresso, cream, amber accent), light + dark mode via existing `.dark` class tokens. Brand name **CafeVisitor**, lucide `Coffee` icon as logo placeholder. |
| Data | Typed API layer (`src/lib/api`) with an `Api` interface, an `http` adapter over `backendFetch`, and a `mock` adapter with fixtures + personas, chosen by `NEXT_PUBLIC_USE_MOCKS`. |
| Data flow | Client-side shell: after the middleware auth gate, all authenticated pages are client components using `@tanstack/react-query` hooks over `api`. `/` loads user context and redirects by role. |
| Cafeteria selection | Active org + cafeteria selector in the org header, remembered per device (localStorage). |
| Order metadata | Quick-pick item chips (Coffee, Tea, Pastry, Sandwich, Other) + optional free-text note → `{ items: string[], note?: string }`. |
| Rewards | Stamp-card progress per cafeteria; frontend renders `orderCount / threshold` and `rewardsAvailable` from the API. No redeem flow yet. |
| Org management | Team (members + pending invitations + invite form for owner/admin) and Cafeterias (list + add for owner/admin). Members read-only. |
| Owner onboarding | Two-step wizard: confirm/edit org name → first cafeteria (name, location). |
| Tests | None in this pass. |
| Language | English only, plain strings. |

## Design section 1 — Navigation and screens (approved)

**Shell.** Slim top bar (wordmark + avatar menu) and bottom tab bar on every authenticated screen.
Avatar menu: name/email, view switcher (Client / Organization, only if user has ≥1 org), theme
toggle, sign out.

**Entry.** `/` → loads user context once → no orgs ⇒ `/client`; ≥1 org ⇒ `/org`.

**Client view** — tabs Home, Orders

- `/client` Home: large QR card (avatar + name; tap ⇒ full-screen bright QR dialog) → Pending
  invitations (only when present; Accept / Decline) → Your cafeterias as stamp cards (`7/10`,
  "Reward ready" badge) → last 5 orders.
- `/client/orders`: full history grouped by day, filter by cafeteria, items + note shown.
- Accepting member/admin invite ⇒ toast + Organization view unlocked. Accepting owner invite ⇒
  `/onboarding/[organizationId]`.

**Organization view** — tabs Home, Scan, Stats, Manage

- `/org` Home: tappable active org/cafeteria selector (bottom sheet) → big "Register order" CTA →
  today's tiles (orders today, unique customers, last order) → recent orders.
- `/org/scan`: full-screen camera, framing guide, torch toggle where supported, "Enter code
  manually" fallback. Successful read ⇒ `/org/register/[qrToken]`.
- `/org/register/[qrToken]`: customer avatar/name + stamp progress at the active cafeteria → item
  chips + note → Confirm. Success state: checkmark, updated stamp count, "Scan next" / "Home".
  The client QR encodes `${origin}/org/register/<qrToken>` so a native camera scan lands here too
  (middleware preserves `next` through login).
- `/org/stats`: today / 7 days / 30 days tiles + small bar chart of orders per day.
- `/org/manage`: Team (members with role, pending invitations, Invite button for owner/admin:
  email + role) and Cafeterias (list, Add cafeteria for owner/admin).

**Owner onboarding** `/onboarding/[organizationId]`: step 1 org name (prefilled, editable); step 2
first cafeteria name + location; finish ⇒ `/org` with that cafeteria active.

**Auth**: restyled login card with brand + Google button; error page gets "Back to login";
middleware redirect adds `?next=<original path>`.

## Design section 2 — Architecture

### Folder structure (target)

Verified facts (Next.js 16 docs, npm registry, shadcn docs) that shape the structure:

- Next 16 renamed `middleware.ts` → **`proxy.ts`** with `export async function proxy` (Node runtime
  only; `middleware.ts` is deprecated). Matcher config is unchanged. Codemod available:
  `npx @next/codemod@canary middleware-to-proxy .`
- `params`/`searchParams` are Promises; client pages read them with `use(params)`. Global
  `PageProps<'/org/register/[qrToken]'>` / `LayoutProps<'/…'>` helpers are generated by
  `next dev`/`next build`/`npx next typegen` (already used in `layout.tsx`).
- shadcn **base-nova has no Sonner**; use the Base UI `toast` component (`toast.add(...)`,
  `<Toaster/>` from `@/components/ui/toast`). Base UI uses `render={<Link/>}` instead of `asChild`.
- Scanner: **`@yudiel/react-qr-scanner`** (React 19 peer, active, native BarcodeDetector with
  zxing-wasm fallback — iOS Safari has no native BarcodeDetector). Must be `'use client'` and loaded
  via `next/dynamic(..., { ssr: false })`; camera needs HTTPS on phones
  (`next dev --experimental-https`). Restrict `formats={['qr_code']}`, use `paused` when hidden,
  handle `NotAllowedError` with a permissions hint.
- `next-themes` 0.4.x: `<ThemeProvider attribute="class" defaultTheme="system" enableSystem
  disableTransitionOnChange>` + `<html suppressHydrationWarning>`; matches the existing
  `@custom-variant dark`.
- `@tanstack/react-query` v5: `providers.tsx` with a module-level `getQueryClient()` (fresh on
  server, singleton in browser); `retry: false` on 401/403 so the sign-out redirect isn't retried.
  A `useUserContext()` query with `staleTime: Infinity` replaces a bespoke provider.

```
src/
  proxy.ts                         # renamed from middleware.ts; export proxy; same matcher
  app/
    layout.tsx                     # <html suppressHydrationWarning>, fonts, <Providers>, <Toaster/>,
                                   #   metadata "CafeVisitor", viewport { viewportFit: 'cover' }
    providers.tsx                  # 'use client': ThemeProvider + QueryClientProvider + ApiProvider
    page.tsx                       # "/" role redirect (client component using useUserContext)
    auth/login/page.tsx            # restyled LoginForm
    auth/error/page.tsx            # + Back to login
    auth/oauth/route.ts            # unchanged
    (app)/layout.tsx               # server getClaims() guard (defense in depth) → <AppShell>
    (app)/loading.tsx              # shell skeleton
    (app)/error.tsx, not-found.tsx
    (app)/client/page.tsx          # client home
    (app)/client/orders/page.tsx
    (app)/org/page.tsx             # org home
    (app)/org/scan/page.tsx
    (app)/org/register/[qrToken]/page.tsx
    (app)/org/stats/page.tsx
    (app)/org/manage/page.tsx
    (app)/onboarding/[organizationId]/page.tsx
  components/
    ui/…                           # shadcn additions:
                                   #   npx shadcn@latest add dialog sheet drawer select dropdown-menu input
                                   #     label textarea field badge avatar tabs skeleton toast progress
                                   #     separator alert spinner empty
    shell/  app-shell.tsx, top-bar.tsx, tab-bar.tsx (safe-area padding), avatar-menu.tsx,
            view-switcher.tsx, theme-toggle.tsx (CSS `dark:hidden` icon swap, no mounted state)
    client/ qr-card.tsx (SVG via QRCode.toString), qr-fullscreen-dialog.tsx, invitation-card.tsx,
            stamp-card.tsx, order-list.tsx
    org/    cafeteria-selector.tsx, register-order-cta.tsx, finish-setup-banner.tsx, stat-tile.tsx,
            orders-per-day-chart.tsx (CSS bars), qr-scanner.tsx (next/dynamic ssr:false wrapper around
            @yudiel/react-qr-scanner), manual-token-form.tsx, customer-summary.tsx,
            order-items-form.tsx, members-list.tsx, invite-dialog.tsx, cafeterias-list.tsx,
            add-cafeteria-dialog.tsx
    onboarding/ organization-setup-wizard.tsx
    dev/    mock-persona-switcher.tsx (rendered only when mocks are on)
    brand/  logo.tsx
  lib/
    supabase/{client,server}.ts              # reuse unchanged
    supabase/proxy.ts                        # renamed from middleware.ts; adds ?next=, allow-list /auth/*
    backend/client.ts                        # reuse; fix: throw after 401 redirect; add fetchJson<T>() helper
    safe-next-path.ts                        # reuse
    utils.ts                                 # reuse
    api/
      types.ts        # zod schemas + inferred TS types (runtime-validated in http.ts; doubles as the
                      #   contract to hand to the backend)
      api.ts          # `Api` interface + ApiError
      http.ts         # createHttpApi(): real adapter over backendFetch; only /users/context wired,
                      #   others throw ApiError('not_implemented') with the intended path noted
      mock/fixtures.ts# typed seed data per persona (`satisfies`)
      mock/store.ts   # in-memory mutable state + latency helper
      mock/index.ts   # createMockApi(persona) satisfies Api
      mock/persona.ts # persona type + localStorage helpers
      index.ts        # ApiProvider/useApi(): dynamic `import('./mock')` only when
                      #   process.env.NEXT_PUBLIC_USE_MOCKS === 'true' (mock chunk absent from prod)
    query/keys.ts     # query key factory
    qr.ts             # buildRegisterUrl(origin, token), parseScannedValue(text) — lenient: URL path
                      #   /org/register/:token or bare UUID
    config.ts         # APP_NAME, useMocks flag, ORDER_ITEM_OPTIONS
  hooks/              # React Query hooks: use-user-context (staleTime Infinity), use-my-orders,
                      #   use-stamp-cards, use-respond-to-invitation, use-active-cafeteria
                      #   (useSyncExternalStore, key cv.activeCafeteria.<orgId>, validated vs list),
                      #   use-customer-lookup, use-register-order, use-cafeteria-stats, use-members,
                      #   use-organization-invitations, use-send-invitation, use-cafeterias,
                      #   use-create-cafeteria, use-complete-organization-setup
```

New dependencies: `@tanstack/react-query`, `next-themes`, `@yudiel/react-qr-scanner`, `zod`.

### Domain types (`src/lib/api/types.ts`)

Mirrors the backend tables, camelCased, plus view-model fields the API will compute:

- `User { id, displayName, avatarUrl, email, qrToken }`
- `OrganizationRole = 'owner' | 'admin' | 'member'`
- `Cafeteria { id, organizationId, displayName, location }`
- `Organization { id, displayName, status: 'pending' | 'created', role, cafeterias: Cafeteria[] }`
- `Invitation { id, organization: { id, displayName }, role, sentBy?: { displayName }, expiresAt }`
- `UserContext { user, organizations: Organization[], pendingInvitations: Invitation[] }`
- `Order { id, cafeteria: { id, displayName }, createdAt, items: string[], note?: string, recordedBy?: { displayName } }`
- `StampCard { cafeteria, orderCount, threshold, rewardsAvailable }`
- `CustomerLookup { user: Pick<User,'id'|'displayName'|'avatarUrl'|'email'>, stampCard?: StampCard }`
- `CafeteriaStats { ordersToday, uniqueCustomersToday, lastOrderAt?, ordersPerDay: { date, count }[] }`
- `Member { user: {…}, role }`, `OrganizationInvitation { id, email, role, status, createdAt }`

### `Api` interface (`src/lib/api/api.ts`)

```
getUserContext()                                  → UserContext
listMyOrders({ cafeteriaId? })                    → Order[]
getStampCards()                                   → StampCard[]
respondToInvitation(id, 'accepted' | 'rejected')  → void
lookupCustomer(qrToken)                           → CustomerLookup
registerOrder({ cafeteriaId, qrToken, items, note? }) → Order
getCafeteriaStats(cafeteriaId)                    → CafeteriaStats
listMembers(orgId) / listOrganizationInvitations(orgId) / sendInvitation(orgId, { email, role })
listCafeterias(orgId) / createCafeteria(orgId, { displayName, location })
completeOrganizationSetup(orgId, { displayName, cafeteria: { displayName, location } })
```

Both adapters implement this interface, so TypeScript enforces parity. `http.ts` wires
`GET /users/context` (already exists) and leaves the other paths as clearly-marked placeholders
that throw `NotImplemented` until the backend contract is confirmed.

### Mock adapter

- Personas: `client`, `client-with-invites` (member + owner invites pending), `org-member`,
  `org-admin` (two orgs, several cafeterias). Persona stored in localStorage; floating switcher in
  the corner only when `NEXT_PUBLIC_USE_MOCKS=true`.
- In-memory state so flows feel real: registering an order appends to orders and bumps the stamp
  card; accepting an invite adds the org to the context; completing setup flips status to
  `created` and adds the cafeteria.
- Simulated ~300 ms latency so skeletons are visible.

### Cross-cutting

- **Auth gate**: `src/proxy.ts` → `lib/supabase/proxy.ts` (renamed `updateSession`); add
  `?next=<pathname>` to the login redirect; allow-list `/auth/*` only (drop dead `/login`,
  `/oauth/consent`). `LoginForm` default `next` becomes `/`. `(app)/layout.tsx` also does a
  server-side `getClaims()` guard (same as today's `/protected`).
- **401 handling**: `backendFetch` throws after the sign-out redirect (fixes current fall-through).
  React Query `retry: false` for 401/403.
- **QR**: `qr.ts` encodes `${origin}/org/register/<encodeURIComponent(token)>`, generated client-side
  as SVG; `parseScannedValue` accepts that URL (any origin, so staging codes work in prod) or a bare
  UUID (manual entry).
- **Theme**: `next-themes` `attribute="class"`; warm OKLCH palette replaces neutral tokens in
  `globals.css` (light: cream bg, espresso fg/primary, amber accent; dark: dark-roast bg); fix
  `--font-sans: var(--font-geist-sans)`; fix `text-destructive-500` → `text-destructive`.
- **Active cafeteria**: `useSyncExternalStore` over localStorage, key `cv.activeCafeteria.<orgId>`,
  validated against fetched cafeterias, falls back to the first one. Never read during SSR render.
- **Role gating in UI**: `canManage = role in ('owner','admin')` for the active org; hides Invite /
  Add cafeteria for members.
- **Onboarding trigger**: an org with `status === 'pending'` where the user is `owner` shows a
  "Finish setting up <org>" banner on `/org` linking to `/onboarding/[organizationId]`; accepting an
  owner invite navigates there directly. Onboarding lives inside `(app)` so it is authenticated.
- **Mobile**: `viewport.viewportFit = 'cover'`, bottom tab bar padded with
  `pb-[env(safe-area-inset-bottom)]`.
- **Loading/empty/error**: every page has skeleton, empty-state copy, and an inline error card with
  Retry; `(app)/loading.tsx`, `error.tsx`, `not-found.tsx` added.
- **Prod safety**: `next.config.ts` throws if `NEXT_PUBLIC_USE_MOCKS === 'true'` while
  `VERCEL_ENV === 'production'` (or `NODE_ENV === 'production'` without an explicit override).

