# CafeVisitor App Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the CafeVisitor frontend as a mobile-first, two-surface app (client dashboard and organization/cashier dashboard) running fully against a typed mock API, reusing the existing Supabase Google auth and `backendFetch`.

**Architecture:** Next.js 16 App Router. Auth gate in `src/proxy.ts` (Supabase SSR). All authenticated pages are client components that read data through TanStack React Query hooks over an `Api` interface. Two adapters implement the interface: `http` (over `backendFetch`, only `/user/context` is real today) and `mock` (fixtures + in-memory mutations + personas), selected by `NEXT_PUBLIC_USE_MOCKS`.

**Tech Stack:** Next 16.3.4, React 19.2, TypeScript strict, Tailwind v4, shadcn base-nova on `@base-ui/react` 1.8, lucide-react, `qrcode`, `@tanstack/react-query` 5, `next-themes` 0.4, `@yudiel/react-qr-scanner` 2.6, `zod` 4.

**Spec:** `docs/superpowers/specs/2026-09-22-app-redesign-design.md`

## Global Constraints

- No automated tests in this pass (user decision). Every task verifies with `npm run lint`, `npm run typecheck` and a manual browser check with `NEXT_PUBLIC_USE_MOCKS=true`.
- English copy only, plain strings in components. Product name is the constant `APP_NAME = 'CafeVisitor'`.
- Base UI components use `render={<Component/>}` instead of Radix `asChild`. Class merging is `import { cn } from 'cn'` (already used by `src/components/ui/*`).
- `params` in pages is a Promise; client pages read it with `use(params)`.
- Mobile-first: content column `mx-auto w-full max-w-lg px-4`, bottom tab bar, tap targets ≥ 44px.
- Never read `localStorage` during render on the server; use `useSyncExternalStore` or effects.
- Mock fixtures must never ship in a production bundle: the mock adapter is only loaded through `import('./mock')` behind `process.env.NEXT_PUBLIC_USE_MOCKS === 'true'`.
- Existing files to reuse unchanged: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/app/auth/oauth/route.ts`, `src/lib/safe-next-path.ts`, `src/lib/utils.ts`, `src/components/ui/*`.
- Already done before this plan: `npm install`, new deps installed, shadcn components added (`alert avatar badge dialog drawer dropdown-menu empty field input label progress select separator sheet skeleton spinner tabs textarea toast`). They are untracked; Task 1 commits them.

---

### Task 1: Foundation — proxy rename, theme, providers, config, cleanup

**Files:**
- Rename: `src/middleware.ts` → `src/proxy.ts`
- Rename: `src/lib/supabase/middleware.ts` → `src/lib/supabase/proxy.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/app/providers.tsx`
- Create: `src/lib/config.ts`
- Create: `src/lib/format.ts`
- Create: `src/components/brand/logo.tsx`
- Modify: `next.config.ts`, `package.json` (scripts)
- Create: `.env.example`
- Delete: `src/app/protected/page.tsx`, `src/components/whoami-button.tsx`, `src/app/page.tsx`, `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`

**Interfaces:**
- Produces: `APP_NAME`, `useMocks`, `ORDER_ITEM_OPTIONS` from `@/lib/config`; `formatTime`, `formatDay`, `formatRelative`, `initials` from `@/lib/format`; `<Logo />` from `@/components/brand/logo`; `<Providers>` wraps ThemeProvider + QueryClientProvider (ApiProvider is added in Task 3).

- [ ] **Step 1: Rename proxy files and update the auth redirect**

```bash
git mv src/middleware.ts src/proxy.ts
git mv src/lib/supabase/middleware.ts src/lib/supabase/proxy.ts
```

Write `src/proxy.ts`:

```ts
import { type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm)$).*)'],
}
```

In `src/lib/supabase/proxy.ts`, replace the block from `const { data } = await supabase.auth.getClaims()` through the redirect `}` with:

```ts
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  const { pathname, search } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/auth')

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.search = ''
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/auth/login') {
    const next = request.nextUrl.searchParams.get('next')
    const url = request.nextUrl.clone()
    url.pathname = next && next.startsWith('/') && !next.startsWith('//') ? next.split('?')[0] : '/'
    url.search = next && next.includes('?') ? `?${next.split('?')[1]}` : ''
    return NextResponse.redirect(url)
  }
```

Keep the rest of the file (client creation, comments, `return supabaseResponse`) unchanged.

- [ ] **Step 2: Config, formatting helpers, logo**

`src/lib/config.ts`:

```ts
export const APP_NAME = 'CafeVisitor'

export const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true'

export const ORDER_ITEM_OPTIONS = ['Coffee', 'Tea', 'Pastry', 'Sandwich', 'Other'] as const
export type OrderItemOption = (typeof ORDER_ITEM_OPTIONS)[number]

export const STAMP_THRESHOLD_FALLBACK = 10
```

`src/lib/format.ts`:

```ts
const timeFormatter = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' })
const dayFormatter = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' })
const shortDayFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })

export function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso))
}

export function formatDay(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'
  return dayFormatter.format(date)
}

export function formatShortDay(iso: string) {
  return shortDayFormatter.format(new Date(iso))
}

export function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
```

`src/components/brand/logo.tsx`:

```tsx
import { CoffeeIcon } from 'lucide-react'
import { cn } from 'cn'

import { APP_NAME } from '@/lib/config'

export function Logo({ className, size = 'default' }: { className?: string; size?: 'default' | 'lg' }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', size === 'lg' ? 'text-2xl' : 'text-lg', className)}>
      <span className={cn('inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground', size === 'lg' ? 'size-10' : 'size-7')}>
        <CoffeeIcon className={size === 'lg' ? 'size-6' : 'size-4'} aria-hidden="true" />
      </span>
      {APP_NAME}
    </span>
  )
}
```

- [ ] **Step 3: Warm palette in `globals.css`**

Replace the `--font-sans` line in `@theme inline` with `--font-sans: var(--font-geist-sans);` and add `--color-brand: var(--brand);` and `--color-brand-foreground: var(--brand-foreground);` to the same block. Replace the whole `:root { … }` and `.dark { … }` blocks with:

```css
:root {
  --background: oklch(0.985 0.012 85);
  --foreground: oklch(0.22 0.03 50);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.22 0.03 50);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.22 0.03 50);
  --primary: oklch(0.36 0.06 45);
  --primary-foreground: oklch(0.985 0.012 85);
  --secondary: oklch(0.94 0.025 80);
  --secondary-foreground: oklch(0.3 0.04 48);
  --muted: oklch(0.95 0.02 82);
  --muted-foreground: oklch(0.5 0.03 55);
  --accent: oklch(0.93 0.05 78);
  --accent-foreground: oklch(0.3 0.04 48);
  --brand: oklch(0.75 0.15 70);
  --brand-foreground: oklch(0.22 0.03 50);
  --destructive: oklch(0.55 0.2 27);
  --border: oklch(0.9 0.02 80);
  --input: oklch(0.9 0.02 80);
  --ring: oklch(0.6 0.08 60);
  --chart-1: oklch(0.36 0.06 45);
  --chart-2: oklch(0.55 0.1 60);
  --chart-3: oklch(0.75 0.15 70);
  --chart-4: oklch(0.85 0.08 80);
  --chart-5: oklch(0.65 0.06 50);
  --radius: 0.75rem;
  --sidebar: oklch(0.97 0.015 85);
  --sidebar-foreground: oklch(0.22 0.03 50);
  --sidebar-primary: oklch(0.36 0.06 45);
  --sidebar-primary-foreground: oklch(0.985 0.012 85);
  --sidebar-accent: oklch(0.93 0.05 78);
  --sidebar-accent-foreground: oklch(0.3 0.04 48);
  --sidebar-border: oklch(0.9 0.02 80);
  --sidebar-ring: oklch(0.6 0.08 60);
}

.dark {
  --background: oklch(0.17 0.015 50);
  --foreground: oklch(0.95 0.015 85);
  --card: oklch(0.22 0.02 50);
  --card-foreground: oklch(0.95 0.015 85);
  --popover: oklch(0.22 0.02 50);
  --popover-foreground: oklch(0.95 0.015 85);
  --primary: oklch(0.8 0.1 75);
  --primary-foreground: oklch(0.2 0.03 50);
  --secondary: oklch(0.28 0.025 50);
  --secondary-foreground: oklch(0.95 0.015 85);
  --muted: oklch(0.28 0.025 50);
  --muted-foreground: oklch(0.7 0.02 75);
  --accent: oklch(0.32 0.04 55);
  --accent-foreground: oklch(0.95 0.015 85);
  --brand: oklch(0.78 0.15 70);
  --brand-foreground: oklch(0.2 0.03 50);
  --destructive: oklch(0.7 0.19 22);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.6 0.08 60);
  --chart-1: oklch(0.8 0.1 75);
  --chart-2: oklch(0.65 0.1 60);
  --chart-3: oklch(0.78 0.15 70);
  --chart-4: oklch(0.5 0.06 55);
  --chart-5: oklch(0.85 0.05 80);
  --sidebar: oklch(0.22 0.02 50);
  --sidebar-foreground: oklch(0.95 0.015 85);
  --sidebar-primary: oklch(0.8 0.1 75);
  --sidebar-primary-foreground: oklch(0.2 0.03 50);
  --sidebar-accent: oklch(0.32 0.04 55);
  --sidebar-accent-foreground: oklch(0.95 0.015 85);
  --sidebar-border: oklch(1 0 0 / 12%);
  --sidebar-ring: oklch(0.6 0.08 60);
}
```

Append to `@layer base`:

```css
  .pb-safe {
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }
```

- [ ] **Step 4: Root layout and providers**

`src/app/providers.tsx`:

```tsx
'use client'

import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'

import { Toaster } from '@/components/ui/toast'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
          const status = (error as { status?: number }).status
          if (status === 401 || status === 403 || status === 404) return false
          return failureCount < 2
        },
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (isServer) return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <Toaster>{children}</Toaster>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
```

`src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { APP_NAME } from '@/lib/config'
import { Providers } from './providers'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'Collect stamps at your favorite cafeterias and let staff register your orders with a QR code.',
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f1' },
    { media: '(prefers-color-scheme: dark)', color: '#1f1a17' },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: next.config guard, scripts, env example, cleanup**

`next.config.ts`:

```ts
import type { NextConfig } from 'next'

if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true' && process.env.VERCEL_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_USE_MOCKS must not be enabled in a production deployment')
}

const nextConfig: NextConfig = {
  reactCompiler: true,
}

export default nextConfig
```

Add to `package.json` scripts: `"typecheck": "next typegen && tsc --noEmit"`.

`.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
# Set to "true" to run the UI against in-memory fixtures instead of the backend
NEXT_PUBLIC_USE_MOCKS=true
```

```bash
git rm -q src/app/protected/page.tsx src/components/whoami-button.tsx src/app/page.tsx public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

Also fix `src/components/login-form.tsx` line 53: `text-destructive-500` → `text-destructive` (the form is fully restyled in Task 5, this keeps lint honest now).

- [ ] **Step 6: Verify**

Run: `npm run lint && npm run typecheck`
Expected: both pass (there is no `/` page yet; that is fine for typecheck).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Foundation: proxy rename, warm theme, providers, config, remove boilerplate"
```

---

### Task 2: API contract — zod types, `Api` interface, errors, `backendFetch` fix

**Files:**
- Create: `src/lib/api/types.ts`, `src/lib/api/api.ts`, `src/lib/api/errors.ts`
- Modify: `src/lib/backend/client.ts`

**Interfaces:**
- Produces: every domain type + schema (`userSchema/User`, `cafeteriaSchema/Cafeteria`, `organizationSchema/Organization`, `invitationSchema/Invitation`, `userContextSchema/UserContext`, `orderSchema/Order`, `stampCardSchema/StampCard`, `customerLookupSchema/CustomerLookup`, `registerOrderResultSchema/RegisterOrderResult`, `cafeteriaStatsSchema/CafeteriaStats`, `memberSchema/Member`, `organizationInvitationSchema/OrganizationInvitation`, `OrganizationRole`), the `Api` interface, `ApiError`, and `backendFetch` that throws `ApiError` on 401.

- [ ] **Step 1: Errors**

`src/lib/api/errors.ts`:

```ts
export type ApiErrorCode = 'unauthorized' | 'forbidden' | 'not_found' | 'not_implemented' | 'invalid_response' | 'network' | 'unknown'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status?: number

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function errorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
```

- [ ] **Step 2: Types**

`src/lib/api/types.ts`:

```ts
import { z } from 'zod'

export const organizationRoleSchema = z.enum(['owner', 'admin', 'member'])
export type OrganizationRole = z.infer<typeof organizationRoleSchema>

export const userSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  qrToken: z.string(),
})
export type User = z.infer<typeof userSchema>

export const cafeteriaSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  displayName: z.string(),
  location: z.string(),
})
export type Cafeteria = z.infer<typeof cafeteriaSchema>

export const organizationSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  status: z.enum(['pending', 'created']),
  role: organizationRoleSchema,
  cafeterias: z.array(cafeteriaSchema),
})
export type Organization = z.infer<typeof organizationSchema>

export const invitationSchema = z.object({
  id: z.string(),
  organization: z.object({ id: z.string(), displayName: z.string() }),
  role: organizationRoleSchema,
  sentBy: z.object({ displayName: z.string().nullable() }).nullable(),
  expiresAt: z.string(),
})
export type Invitation = z.infer<typeof invitationSchema>

export const userContextSchema = z.object({
  user: userSchema,
  organizations: z.array(organizationSchema),
  pendingInvitations: z.array(invitationSchema),
})
export type UserContext = z.infer<typeof userContextSchema>

export const orderSchema = z.object({
  id: z.string(),
  cafeteria: z.object({ id: z.string(), displayName: z.string() }),
  createdAt: z.string(),
  items: z.array(z.string()),
  note: z.string().nullable(),
  recordedBy: z.object({ displayName: z.string().nullable() }).nullable(),
})
export type Order = z.infer<typeof orderSchema>

export const stampCardSchema = z.object({
  cafeteria: cafeteriaSchema,
  orderCount: z.number().int().nonnegative(),
  threshold: z.number().int().positive(),
  rewardsAvailable: z.number().int().nonnegative(),
})
export type StampCard = z.infer<typeof stampCardSchema>

export const customerLookupSchema = z.object({
  user: userSchema.pick({ id: true, displayName: true, email: true, avatarUrl: true }),
  stampCard: stampCardSchema.nullable(),
})
export type CustomerLookup = z.infer<typeof customerLookupSchema>

export const registerOrderResultSchema = z.object({
  order: orderSchema,
  stampCard: stampCardSchema,
})
export type RegisterOrderResult = z.infer<typeof registerOrderResultSchema>

export const cafeteriaStatsSchema = z.object({
  ordersToday: z.number().int(),
  uniqueCustomersToday: z.number().int(),
  lastOrderAt: z.string().nullable(),
  ordersLast7Days: z.number().int(),
  ordersLast30Days: z.number().int(),
  ordersPerDay: z.array(z.object({ date: z.string(), count: z.number().int() })),
  recentOrders: z.array(
    orderSchema.extend({ customer: z.object({ displayName: z.string().nullable(), avatarUrl: z.string().nullable() }) })
  ),
})
export type CafeteriaStats = z.infer<typeof cafeteriaStatsSchema>
export type CafeteriaOrder = CafeteriaStats['recentOrders'][number]

export const memberSchema = z.object({
  user: userSchema.pick({ id: true, displayName: true, email: true, avatarUrl: true }),
  role: organizationRoleSchema,
})
export type Member = z.infer<typeof memberSchema>

export const organizationInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: organizationRoleSchema,
  status: z.enum(['pending', 'accepted', 'rejected']),
  createdAt: z.string(),
})
export type OrganizationInvitation = z.infer<typeof organizationInvitationSchema>
```

- [ ] **Step 3: `Api` interface**

`src/lib/api/api.ts`:

```ts
import type {
  Cafeteria,
  CafeteriaStats,
  CustomerLookup,
  Member,
  Order,
  Organization,
  OrganizationInvitation,
  OrganizationRole,
  RegisterOrderResult,
  StampCard,
  UserContext,
} from './types'

export type InvitationDecision = 'accepted' | 'rejected'

export interface RegisterOrderInput {
  cafeteriaId: string
  qrToken: string
  items: string[]
  note?: string
}

export interface CafeteriaInput {
  displayName: string
  location: string
}

export interface Api {
  getUserContext(): Promise<UserContext>
  listMyOrders(params?: { cafeteriaId?: string }): Promise<Order[]>
  getStampCards(): Promise<StampCard[]>
  respondToInvitation(invitationId: string, decision: InvitationDecision): Promise<void>

  lookupCustomer(params: { qrToken: string; cafeteriaId: string }): Promise<CustomerLookup>
  registerOrder(input: RegisterOrderInput): Promise<RegisterOrderResult>
  getCafeteriaStats(cafeteriaId: string): Promise<CafeteriaStats>

  listMembers(organizationId: string): Promise<Member[]>
  listOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]>
  sendInvitation(organizationId: string, params: { email: string; role: OrganizationRole }): Promise<OrganizationInvitation>
  listCafeterias(organizationId: string): Promise<Cafeteria[]>
  createCafeteria(organizationId: string, input: CafeteriaInput): Promise<Cafeteria>
  completeOrganizationSetup(organizationId: string, params: { displayName: string; cafeteria: CafeteriaInput }): Promise<Organization>
}
```

- [ ] **Step 4: Fix `backendFetch`**

Replace `src/lib/backend/client.ts` with:

```ts
import { ApiError } from '@/lib/api/errors'
import { createClient } from '@/lib/supabase/client'

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

export async function backendFetch(path: string, init: RequestInit = {}) {
  if (!backendUrl) {
    throw new ApiError('unknown', 'NEXT_PUBLIC_BACKEND_URL is not configured')
  }

  const supabase = createClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw new ApiError('unauthorized', sessionError.message, 401)
  if (!session?.access_token) throw new ApiError('unauthorized', 'No active session', 401)

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${backendUrl}${path}`, { ...init, headers })
  } catch (error) {
    throw new ApiError('network', error instanceof Error ? error.message : 'Network error')
  }

  if (response.status === 401) {
    await supabase.auth.signOut()
    window.location.replace('/auth/login')
    throw new ApiError('unauthorized', 'Session expired', 401)
  }

  return response
}
```

- [ ] **Step 5: Verify and commit**

Run: `npm run lint && npm run typecheck`
Expected: pass.

```bash
git add src/lib/api src/lib/backend/client.ts
git commit -m "Add typed API contract and harden backendFetch"
```

---

### Task 3: Mock adapter, personas, `ApiProvider`, persona switcher

**Files:**
- Create: `src/lib/api/mock/persona.ts`, `src/lib/api/mock/fixtures.ts`, `src/lib/api/mock/store.ts`, `src/lib/api/mock/index.ts`
- Create: `src/lib/api/index.ts`
- Create: `src/components/dev/mock-persona-switcher.tsx`
- Modify: `src/app/providers.tsx`

**Interfaces:**
- Consumes: `Api`, types, `ApiError` (Task 2); `useMocks` (Task 1).
- Produces: `useApi(): Api` from `@/lib/api`; `<ApiProvider>`; `MOCK_PERSONAS`, `MockPersona`, `readPersona()`, `writePersona()`; mock customer token `MOCK_CUSTOMER_TOKEN`.

- [ ] **Step 1: Personas**

`src/lib/api/mock/persona.ts`:

```ts
export const MOCK_PERSONAS = ['client', 'client-with-invites', 'org-member', 'org-admin'] as const
export type MockPersona = (typeof MOCK_PERSONAS)[number]

export const PERSONA_LABELS: Record<MockPersona, string> = {
  client: 'Client (no organization)',
  'client-with-invites': 'Client with pending invitations',
  'org-member': 'Organization member',
  'org-admin': 'Organization admin + owner',
}

const STORAGE_KEY = 'cv.mockPersona'

export function readPersona(): MockPersona {
  if (typeof window === 'undefined') return 'client'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return (MOCK_PERSONAS as readonly string[]).includes(stored ?? '') ? (stored as MockPersona) : 'client'
}

export function writePersona(persona: MockPersona) {
  window.localStorage.setItem(STORAGE_KEY, persona)
}
```

- [ ] **Step 2: Fixtures**

`src/lib/api/mock/fixtures.ts`:

```ts
import type { Cafeteria, Invitation, Organization, OrganizationInvitation, OrganizationRole, User } from '../types'
import type { MockPersona } from './persona'

export const MOCK_CUSTOMER_TOKEN = '11111111-1111-4111-8111-111111111111'

export interface MockOrderRow {
  id: string
  cafeteriaId: string
  userId: string
  recordedByUserId: string | null
  createdAt: string
  items: string[]
  note: string | null
}

export interface MockState {
  me: User
  users: User[]
  organizations: Array<Omit<Organization, 'role' | 'cafeterias'>>
  memberships: Array<{ userId: string; organizationId: string; role: OrganizationRole }>
  cafeterias: Cafeteria[]
  orders: MockOrderRow[]
  invitations: Array<Invitation & { userId: string; status: 'pending' | 'accepted' | 'rejected' }>
  orgInvitations: Array<OrganizationInvitation & { organizationId: string }>
}

const ORG_NORTHSIDE = 'a0000000-0000-4000-8000-000000000001'
const ORG_BEAN = 'a0000000-0000-4000-8000-000000000002'
const CAF_NORTH_MAIN = 'c0000000-0000-4000-8000-000000000001'
const CAF_NORTH_STATION = 'c0000000-0000-4000-8000-000000000002'
const CAF_BEAN_HARBOR = 'c0000000-0000-4000-8000-000000000003'

const ana: User = {
  id: 'u0000000-0000-4000-8000-000000000001',
  displayName: 'Ana Pérez',
  email: 'ana@example.com',
  avatarUrl: null,
  qrToken: MOCK_CUSTOMER_TOKEN,
}
const luis: User = {
  id: 'u0000000-0000-4000-8000-000000000002',
  displayName: 'Luis Romero',
  email: 'luis@northside.example',
  avatarUrl: null,
  qrToken: '22222222-2222-4222-8222-222222222222',
}
const marta: User = {
  id: 'u0000000-0000-4000-8000-000000000003',
  displayName: 'Marta Ruiz',
  email: 'marta@northside.example',
  avatarUrl: null,
  qrToken: '33333333-3333-4333-8333-333333333333',
}
const diego: User = {
  id: 'u0000000-0000-4000-8000-000000000004',
  displayName: 'Diego Sanz',
  email: 'diego@example.com',
  avatarUrl: null,
  qrToken: '44444444-4444-4444-8444-444444444444',
}

const cafeterias: Cafeteria[] = [
  { id: CAF_NORTH_MAIN, organizationId: ORG_NORTHSIDE, displayName: 'Northside Main', location: '12 Market St' },
  { id: CAF_NORTH_STATION, organizationId: ORG_NORTHSIDE, displayName: 'Northside Station', location: 'Central Station, Hall B' },
  { id: CAF_BEAN_HARBOR, organizationId: ORG_BEAN, displayName: 'Bean & Co Harbor', location: '3 Harbor Walk' },
]

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}
function daysAgo(days: number, hour = 9) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 15, 0, 0)
  return d.toISOString()
}
function daysFromNow(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

let orderSeq = 0
function order(cafeteriaId: string, userId: string, createdAt: string, items: string[], note: string | null = null, recordedByUserId: string | null = luis.id): MockOrderRow {
  orderSeq += 1
  return { id: `o0000000-0000-4000-8000-${String(orderSeq).padStart(12, '0')}`, cafeteriaId, userId, recordedByUserId, createdAt, items, note }
}

function baseOrders(): MockOrderRow[] {
  const rows: MockOrderRow[] = []
  // Ana: 7 stamps at Northside Main, 10 at Bean & Co Harbor (reward ready)
  for (let i = 0; i < 7; i++) rows.push(order(CAF_NORTH_MAIN, ana.id, daysAgo(i * 3 + 1, 8), ['Coffee'], i === 2 ? 'Oat milk' : null))
  for (let i = 0; i < 10; i++) rows.push(order(CAF_BEAN_HARBOR, ana.id, daysAgo(i * 2 + 2, 16), i % 3 === 0 ? ['Coffee', 'Pastry'] : ['Tea']))
  // Today at Northside Main from other customers
  rows.push(order(CAF_NORTH_MAIN, diego.id, hoursAgo(0.5), ['Coffee', 'Sandwich']))
  rows.push(order(CAF_NORTH_MAIN, marta.id, hoursAgo(2), ['Tea']))
  rows.push(order(CAF_NORTH_MAIN, diego.id, hoursAgo(4), ['Coffee']))
  // Spread over the last 30 days at Northside Main
  for (let d = 1; d <= 30; d++) {
    const count = (d * 7) % 5
    for (let i = 0; i < count; i++) rows.push(order(CAF_NORTH_MAIN, i % 2 ? diego.id : marta.id, daysAgo(d, 8 + i), ['Coffee']))
  }
  for (let d = 0; d <= 30; d += 2) rows.push(order(CAF_NORTH_STATION, diego.id, daysAgo(d, 7), ['Coffee', 'Pastry']))
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function buildState(persona: MockPersona): MockState {
  orderSeq = 0
  const organizations = [
    { id: ORG_NORTHSIDE, displayName: 'Northside Roasters', status: 'created' as const },
    { id: ORG_BEAN, displayName: 'Bean & Co', status: 'created' as const },
  ]
  const memberships = [
    { userId: luis.id, organizationId: ORG_NORTHSIDE, role: 'member' as const },
    { userId: marta.id, organizationId: ORG_NORTHSIDE, role: 'admin' as const },
    { userId: marta.id, organizationId: ORG_BEAN, role: 'owner' as const },
  ]
  const orgInvitations = [
    { id: 'i0000000-0000-4000-8000-000000000101', organizationId: ORG_NORTHSIDE, email: 'new.barista@example.com', role: 'member' as const, status: 'pending' as const, createdAt: daysAgo(1) },
  ]
  const base: MockState = {
    me: ana,
    users: [ana, luis, marta, diego],
    organizations,
    memberships,
    cafeterias,
    orders: baseOrders(),
    invitations: [],
    orgInvitations,
  }

  switch (persona) {
    case 'client':
      return base
    case 'client-with-invites': {
      const pendingOrg = { id: 'a0000000-0000-4000-8000-000000000003', displayName: "Ana's Corner Café", status: 'pending' as const }
      return {
        ...base,
        organizations: [...organizations, pendingOrg],
        invitations: [
          { id: 'i0000000-0000-4000-8000-000000000001', userId: ana.id, organization: { id: ORG_NORTHSIDE, displayName: 'Northside Roasters' }, role: 'member', sentBy: { displayName: 'Marta Ruiz' }, expiresAt: daysFromNow(5), status: 'pending' },
          { id: 'i0000000-0000-4000-8000-000000000002', userId: ana.id, organization: { id: pendingOrg.id, displayName: pendingOrg.displayName }, role: 'owner', sentBy: { displayName: 'CafeVisitor team' }, expiresAt: daysFromNow(12), status: 'pending' },
        ],
      }
    }
    case 'org-member':
      return { ...base, me: luis }
    case 'org-admin':
      return { ...base, me: marta }
  }
}
```

- [ ] **Step 3: Store helpers**

`src/lib/api/mock/store.ts`:

```ts
import { STAMP_THRESHOLD_FALLBACK } from '@/lib/config'
import type { Cafeteria, Order, StampCard } from '../types'
import type { MockOrderRow, MockState } from './fixtures'

export const MOCK_LATENCY_MS = 300

export function delay(ms = MOCK_LATENCY_MS) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function uuid() {
  return crypto.randomUUID()
}

export function toOrder(state: MockState, row: MockOrderRow): Order {
  const cafeteria = state.cafeterias.find((c) => c.id === row.cafeteriaId)
  const recorder = state.users.find((u) => u.id === row.recordedByUserId)
  return {
    id: row.id,
    cafeteria: { id: row.cafeteriaId, displayName: cafeteria?.displayName ?? 'Unknown cafeteria' },
    createdAt: row.createdAt,
    items: row.items,
    note: row.note,
    recordedBy: recorder ? { displayName: recorder.displayName } : null,
  }
}

export function stampCardFor(state: MockState, userId: string, cafeteria: Cafeteria): StampCard {
  const orderCount = state.orders.filter((o) => o.userId === userId && o.cafeteriaId === cafeteria.id).length
  return {
    cafeteria,
    orderCount: orderCount % STAMP_THRESHOLD_FALLBACK === 0 && orderCount > 0 ? STAMP_THRESHOLD_FALLBACK : orderCount % STAMP_THRESHOLD_FALLBACK,
    threshold: STAMP_THRESHOLD_FALLBACK,
    rewardsAvailable: Math.floor(orderCount / STAMP_THRESHOLD_FALLBACK),
  }
}

export function startOfDay(d: Date) {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}
```

- [ ] **Step 4: Mock adapter**

`src/lib/api/mock/index.ts`:

```ts
import type { Api } from '../api'
import { ApiError } from '../errors'
import type { CafeteriaStats, Organization, StampCard, UserContext } from '../types'
import { buildState, type MockState } from './fixtures'
import { readPersona, type MockPersona } from './persona'
import { delay, stampCardFor, startOfDay, toOrder, uuid } from './store'

export { MOCK_CUSTOMER_TOKEN } from './fixtures'
export * from './persona'

export function createMockApi(persona: MockPersona = readPersona()): Api {
  const state: MockState = buildState(persona)

  function organizationsFor(userId: string): Organization[] {
    return state.memberships
      .filter((m) => m.userId === userId)
      .map((m) => {
        const org = state.organizations.find((o) => o.id === m.organizationId)
        if (!org) throw new ApiError('not_found', 'Organization not found', 404)
        return { ...org, role: m.role, cafeterias: state.cafeterias.filter((c) => c.organizationId === org.id) }
      })
  }

  function requireOrg(organizationId: string) {
    const org = state.organizations.find((o) => o.id === organizationId)
    if (!org) throw new ApiError('not_found', 'Organization not found', 404)
    return org
  }

  function requireMembership(organizationId: string, roles: Organization['role'][] = ['owner', 'admin', 'member']) {
    const membership = state.memberships.find((m) => m.userId === state.me.id && m.organizationId === organizationId)
    if (!membership || !roles.includes(membership.role)) throw new ApiError('forbidden', 'You do not have access to this organization', 403)
    return membership
  }

  function context(): UserContext {
    return {
      user: state.me,
      organizations: organizationsFor(state.me.id),
      pendingInvitations: state.invitations.filter((i) => i.userId === state.me.id && i.status === 'pending').map(({ userId: _u, status: _s, ...rest }) => rest),
    }
  }

  const api: Api = {
    async getUserContext() {
      await delay()
      return context()
    },

    async listMyOrders(params) {
      await delay()
      return state.orders
        .filter((o) => o.userId === state.me.id && (!params?.cafeteriaId || o.cafeteriaId === params.cafeteriaId))
        .map((o) => toOrder(state, o))
    },

    async getStampCards() {
      await delay()
      const visited = new Set(state.orders.filter((o) => o.userId === state.me.id).map((o) => o.cafeteriaId))
      return state.cafeterias.filter((c) => visited.has(c.id)).map((c) => stampCardFor(state, state.me.id, c))
    },

    async respondToInvitation(invitationId, decision) {
      await delay()
      const invitation = state.invitations.find((i) => i.id === invitationId && i.userId === state.me.id)
      if (!invitation) throw new ApiError('not_found', 'Invitation not found', 404)
      invitation.status = decision
      if (decision === 'accepted') {
        state.memberships.push({ userId: state.me.id, organizationId: invitation.organization.id, role: invitation.role })
      }
    },

    async lookupCustomer({ qrToken, cafeteriaId }) {
      await delay()
      const cafeteria = state.cafeterias.find((c) => c.id === cafeteriaId)
      if (!cafeteria) throw new ApiError('not_found', 'Cafeteria not found', 404)
      requireMembership(cafeteria.organizationId)
      const user = state.users.find((u) => u.qrToken === qrToken)
      if (!user) throw new ApiError('not_found', 'No customer matches this QR code', 404)
      const { id, displayName, email, avatarUrl } = user
      const hasVisited = state.orders.some((o) => o.userId === id && o.cafeteriaId === cafeteriaId)
      return { user: { id, displayName, email, avatarUrl }, stampCard: hasVisited ? stampCardFor(state, id, cafeteria) : null }
    },

    async registerOrder({ cafeteriaId, qrToken, items, note }) {
      await delay(500)
      const cafeteria = state.cafeterias.find((c) => c.id === cafeteriaId)
      if (!cafeteria) throw new ApiError('not_found', 'Cafeteria not found', 404)
      requireMembership(cafeteria.organizationId)
      const user = state.users.find((u) => u.qrToken === qrToken)
      if (!user) throw new ApiError('not_found', 'No customer matches this QR code', 404)
      const row = { id: uuid(), cafeteriaId, userId: user.id, recordedByUserId: state.me.id, createdAt: new Date().toISOString(), items, note: note?.trim() ? note.trim() : null }
      state.orders.unshift(row)
      return { order: toOrder(state, row), stampCard: stampCardFor(state, user.id, cafeteria) }
    },

    async getCafeteriaStats(cafeteriaId) {
      await delay()
      const cafeteria = state.cafeterias.find((c) => c.id === cafeteriaId)
      if (!cafeteria) throw new ApiError('not_found', 'Cafeteria not found', 404)
      requireMembership(cafeteria.organizationId)
      const rows = state.orders.filter((o) => o.cafeteriaId === cafeteriaId)
      const today = startOfDay(new Date())
      const todayRows = rows.filter((o) => new Date(o.createdAt) >= today)
      const since = (days: number) => new Date(today.getTime() - (days - 1) * 86_400_000)
      const ordersPerDay = Array.from({ length: 30 }, (_, i) => {
        const day = new Date(today.getTime() - (29 - i) * 86_400_000)
        const next = new Date(day.getTime() + 86_400_000)
        return { date: day.toISOString(), count: rows.filter((o) => { const t = new Date(o.createdAt); return t >= day && t < next }).length }
      })
      const stats: CafeteriaStats = {
        ordersToday: todayRows.length,
        uniqueCustomersToday: new Set(todayRows.map((o) => o.userId)).size,
        lastOrderAt: rows[0]?.createdAt ?? null,
        ordersLast7Days: rows.filter((o) => new Date(o.createdAt) >= since(7)).length,
        ordersLast30Days: rows.filter((o) => new Date(o.createdAt) >= since(30)).length,
        ordersPerDay,
        recentOrders: rows.slice(0, 10).map((o) => {
          const customer = state.users.find((u) => u.id === o.userId)
          return { ...toOrder(state, o), customer: { displayName: customer?.displayName ?? null, avatarUrl: customer?.avatarUrl ?? null } }
        }),
      }
      return stats
    },

    async listMembers(organizationId) {
      await delay()
      requireOrg(organizationId)
      requireMembership(organizationId)
      return state.memberships
        .filter((m) => m.organizationId === organizationId)
        .map((m) => {
          const user = state.users.find((u) => u.id === m.userId)
          if (!user) throw new ApiError('not_found', 'User not found', 404)
          const { id, displayName, email, avatarUrl } = user
          return { user: { id, displayName, email, avatarUrl }, role: m.role }
        })
    },

    async listOrganizationInvitations(organizationId) {
      await delay()
      requireMembership(organizationId)
      return state.orgInvitations.filter((i) => i.organizationId === organizationId).map(({ organizationId: _o, ...rest }) => rest)
    },

    async sendInvitation(organizationId, { email, role }) {
      await delay(500)
      requireMembership(organizationId, ['owner', 'admin'])
      const invitation = { id: uuid(), organizationId, email: email.trim().toLowerCase(), role, status: 'pending' as const, createdAt: new Date().toISOString() }
      state.orgInvitations.unshift(invitation)
      const { organizationId: _o, ...rest } = invitation
      return rest
    },

    async listCafeterias(organizationId) {
      await delay()
      requireMembership(organizationId)
      return state.cafeterias.filter((c) => c.organizationId === organizationId)
    },

    async createCafeteria(organizationId, { displayName, location }) {
      await delay(500)
      requireMembership(organizationId, ['owner', 'admin'])
      const cafeteria = { id: uuid(), organizationId, displayName: displayName.trim(), location: location.trim() }
      state.cafeterias.push(cafeteria)
      return cafeteria
    },

    async completeOrganizationSetup(organizationId, { displayName, cafeteria }) {
      await delay(600)
      const org = requireOrg(organizationId)
      const membership = requireMembership(organizationId, ['owner'])
      org.displayName = displayName.trim()
      org.status = 'created'
      state.cafeterias.push({ id: uuid(), organizationId, displayName: cafeteria.displayName.trim(), location: cafeteria.location.trim() })
      return { ...org, role: membership.role, cafeterias: state.cafeterias.filter((c) => c.organizationId === organizationId) }
    },
  }

  return api
}

export type { StampCard }
```

- [ ] **Step 5: `ApiProvider` with dynamic mock import**

`src/lib/api/index.ts`:

```tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

import { useMocks } from '@/lib/config'
import type { Api } from './api'
import { createHttpApi } from './http'

export type { Api } from './api'
export * from './types'
export * from './errors'

const ApiContext = createContext<Api | null>(null)

export function ApiProvider({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [api, setApi] = useState<Api | null>(() => (useMocks ? null : createHttpApi()))

  useEffect(() => {
    if (!useMocks) return
    let cancelled = false
    import('./mock').then(({ createMockApi }) => {
      if (!cancelled) setApi(createMockApi())
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!api) return <>{fallback}</>
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
}

export function useApi(): Api {
  const api = useContext(ApiContext)
  if (!api) throw new Error('useApi must be used inside <ApiProvider>')
  return api
}
```

Note: `createHttpApi` is created in Task 4. To keep this task compiling, create a minimal `src/lib/api/http.ts` now:

```ts
import type { Api } from './api'
import { ApiError } from './errors'

const notImplemented = (name: string) => async () => {
  throw new ApiError('not_implemented', `${name} is not connected to the backend yet`)
}

export function createHttpApi(): Api {
  return {
    getUserContext: notImplemented('getUserContext'),
    listMyOrders: notImplemented('listMyOrders'),
    getStampCards: notImplemented('getStampCards'),
    respondToInvitation: notImplemented('respondToInvitation'),
    lookupCustomer: notImplemented('lookupCustomer'),
    registerOrder: notImplemented('registerOrder'),
    getCafeteriaStats: notImplemented('getCafeteriaStats'),
    listMembers: notImplemented('listMembers'),
    listOrganizationInvitations: notImplemented('listOrganizationInvitations'),
    sendInvitation: notImplemented('sendInvitation'),
    listCafeterias: notImplemented('listCafeterias'),
    createCafeteria: notImplemented('createCafeteria'),
    completeOrganizationSetup: notImplemented('completeOrganizationSetup'),
  }
}
```

- [ ] **Step 6: Persona switcher and provider wiring**

`src/components/dev/mock-persona-switcher.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { FlaskConicalIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MOCK_PERSONAS, PERSONA_LABELS, readPersona, writePersona, type MockPersona } from '@/lib/api/mock/persona'

export function MockPersonaSwitcher() {
  const [persona, setPersona] = useState<MockPersona | null>(null)

  useEffect(() => {
    setPersona(readPersona())
  }, [])

  if (!persona) return null

  return (
    <div className="fixed top-2 right-2 z-50 sm:top-auto sm:right-auto sm:bottom-24 sm:left-4">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="Switch mock persona" className="shadow-md" />}>
          <FlaskConicalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Mock persona</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={persona}
            onValueChange={(value) => {
              writePersona(value as MockPersona)
              window.location.assign('/')
            }}
          >
            {MOCK_PERSONAS.map((p) => (
              <DropdownMenuRadioItem key={p} value={p}>
                {PERSONA_LABELS[p]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

Update `src/app/providers.tsx`: import `ApiProvider` from `@/lib/api`, `Spinner` from `@/components/ui/spinner`, `useMocks` from `@/lib/config`, `MockPersonaSwitcher`, and change the JSX to:

```tsx
      <QueryClientProvider client={queryClient}>
        <Toaster>
          <ApiProvider fallback={<div className="flex min-h-svh items-center justify-center"><Spinner className="size-6" /></div>}>
            {children}
            {useMocks ? <MockPersonaSwitcher /> : null}
          </ApiProvider>
        </Toaster>
      </QueryClientProvider>
```

The persona switcher imports only `mock/persona.ts` (a tiny module with no fixtures), and is rendered behind the `useMocks` literal check, so fixtures still stay out of production bundles.

- [ ] **Step 7: Verify and commit**

Run: `npm run lint && npm run typecheck`
Expected: pass.

```bash
git add src/lib/api src/components/dev src/app/providers.tsx
git commit -m "Add mock API adapter with personas and ApiProvider"
```

---

### Task 4: HTTP adapter, query keys, data hooks

**Files:**
- Modify: `src/lib/api/http.ts`
- Create: `src/lib/query/keys.ts`
- Create: `src/hooks/use-user-context.ts`, `src/hooks/use-client-data.ts`, `src/hooks/use-org-data.ts`
- Create: `src/lib/roles.ts`

**Interfaces:**
- Consumes: `useApi`, `Api`, schemas (Tasks 2–3).
- Produces hooks: `useUserContext()`, `useMyOrders(cafeteriaId?)`, `useStampCards()`, `useRespondToInvitation()`, `useCustomerLookup(qrToken, cafeteriaId)`, `useRegisterOrder()`, `useCafeteriaStats(cafeteriaId)`, `useMembers(orgId)`, `useOrganizationInvitations(orgId)`, `useSendInvitation(orgId)`, `useCafeterias(orgId)`, `useCreateCafeteria(orgId)`, `useCompleteOrganizationSetup(orgId)`; helpers `canManage(role)`, `hasOrganizations(ctx)`, `roleLabel(role)`.

- [ ] **Step 1: Real HTTP adapter (only `/user/context` wired)**

Replace `src/lib/api/http.ts`:

```ts
import type { z } from 'zod'

import { backendFetch } from '@/lib/backend/client'
import type { Api } from './api'
import { ApiError } from './errors'
import { userContextSchema } from './types'

async function fetchJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await backendFetch(path, init)
  if (response.status === 403) throw new ApiError('forbidden', 'You do not have permission to do that', 403)
  if (response.status === 404) throw new ApiError('not_found', 'Not found', 404)
  if (!response.ok) throw new ApiError('unknown', `Backend request failed (${response.status})`, response.status)
  const body: unknown = await response.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new ApiError('invalid_response', `Unexpected response from ${path}`)
  return parsed.data
}

// Endpoints other than /user/context do not exist in the backend yet. Each placeholder names
// the intended route so wiring them later is a one-line change to a fetchJson call.
const notImplemented = (name: string, intendedRoute: string) => async () => {
  throw new ApiError('not_implemented', `${name} is not connected yet (planned: ${intendedRoute})`)
}

export function createHttpApi(): Api {
  return {
    getUserContext: () => fetchJson('/user/context', userContextSchema),
    listMyOrders: notImplemented('listMyOrders', 'GET /user/orders?cafeteriaId='),
    getStampCards: notImplemented('getStampCards', 'GET /user/stamp-cards'),
    respondToInvitation: notImplemented('respondToInvitation', 'POST /user/invitations/:id/respond'),
    lookupCustomer: notImplemented('lookupCustomer', 'GET /cafeterias/:cafeteriaId/customers/:qrToken'),
    registerOrder: notImplemented('registerOrder', 'POST /orders'),
    getCafeteriaStats: notImplemented('getCafeteriaStats', 'GET /cafeterias/:id/stats'),
    listMembers: notImplemented('listMembers', 'GET /organizations/:id/members'),
    listOrganizationInvitations: notImplemented('listOrganizationInvitations', 'GET /organizations/:id/invitations'),
    sendInvitation: notImplemented('sendInvitation', 'POST /organizations/:id/invitations'),
    listCafeterias: notImplemented('listCafeterias', 'GET /organizations/:id/cafeterias'),
    createCafeteria: notImplemented('createCafeteria', 'POST /organizations/:id/cafeterias'),
    completeOrganizationSetup: notImplemented('completeOrganizationSetup', 'POST /organizations/:id/setup'),
  }
}
```

- [ ] **Step 2: Query keys and role helpers**

`src/lib/query/keys.ts`:

```ts
export const queryKeys = {
  userContext: ['user-context'] as const,
  myOrders: (cafeteriaId?: string) => ['my-orders', cafeteriaId ?? 'all'] as const,
  stampCards: ['stamp-cards'] as const,
  customer: (qrToken: string, cafeteriaId: string) => ['customer', qrToken, cafeteriaId] as const,
  cafeteriaStats: (cafeteriaId: string) => ['cafeteria-stats', cafeteriaId] as const,
  members: (organizationId: string) => ['members', organizationId] as const,
  organizationInvitations: (organizationId: string) => ['organization-invitations', organizationId] as const,
  cafeterias: (organizationId: string) => ['cafeterias', organizationId] as const,
}
```

`src/lib/roles.ts`:

```ts
import type { OrganizationRole, UserContext } from '@/lib/api/types'

export function canManage(role: OrganizationRole | undefined) {
  return role === 'owner' || role === 'admin'
}

export function hasOrganizations(context: UserContext | undefined) {
  return (context?.organizations.length ?? 0) > 0
}

export function roleLabel(role: OrganizationRole) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}
```

- [ ] **Step 3: Hooks**

`src/hooks/use-user-context.ts`:

```ts
'use client'

import { useQuery } from '@tanstack/react-query'

import { useApi } from '@/lib/api'
import { queryKeys } from '@/lib/query/keys'

export function useUserContext() {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.userContext,
    queryFn: () => api.getUserContext(),
    staleTime: Infinity,
  })
}
```

`src/hooks/use-client-data.ts`:

```ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useApi } from '@/lib/api'
import type { InvitationDecision } from '@/lib/api/api'
import { queryKeys } from '@/lib/query/keys'

export function useMyOrders(cafeteriaId?: string) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.myOrders(cafeteriaId),
    queryFn: () => api.listMyOrders(cafeteriaId ? { cafeteriaId } : undefined),
  })
}

export function useStampCards() {
  const api = useApi()
  return useQuery({ queryKey: queryKeys.stampCards, queryFn: () => api.getStampCards() })
}

export function useRespondToInvitation() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invitationId, decision }: { invitationId: string; decision: InvitationDecision }) =>
      api.respondToInvitation(invitationId, decision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.userContext }),
  })
}
```

`src/hooks/use-org-data.ts`:

```ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useApi } from '@/lib/api'
import type { CafeteriaInput, RegisterOrderInput } from '@/lib/api/api'
import type { OrganizationRole } from '@/lib/api/types'
import { queryKeys } from '@/lib/query/keys'

export function useCustomerLookup(qrToken: string | null, cafeteriaId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.customer(qrToken ?? '', cafeteriaId ?? ''),
    queryFn: () => api.lookupCustomer({ qrToken: qrToken!, cafeteriaId: cafeteriaId! }),
    enabled: Boolean(qrToken && cafeteriaId),
    retry: false,
  })
}

export function useRegisterOrder() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterOrderInput) => api.registerOrder(input),
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cafeteriaStats(input.cafeteriaId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.customer(input.qrToken, input.cafeteriaId) })
    },
  })
}

export function useCafeteriaStats(cafeteriaId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.cafeteriaStats(cafeteriaId ?? ''),
    queryFn: () => api.getCafeteriaStats(cafeteriaId!),
    enabled: Boolean(cafeteriaId),
  })
}

export function useMembers(organizationId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.members(organizationId ?? ''),
    queryFn: () => api.listMembers(organizationId!),
    enabled: Boolean(organizationId),
  })
}

export function useOrganizationInvitations(organizationId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.organizationInvitations(organizationId ?? ''),
    queryFn: () => api.listOrganizationInvitations(organizationId!),
    enabled: Boolean(organizationId),
  })
}

export function useSendInvitation(organizationId: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { email: string; role: OrganizationRole }) => api.sendInvitation(organizationId, params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizationInvitations(organizationId) }),
  })
}

export function useCafeterias(organizationId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.cafeterias(organizationId ?? ''),
    queryFn: () => api.listCafeterias(organizationId!),
    enabled: Boolean(organizationId),
  })
}

export function useCreateCafeteria(organizationId: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CafeteriaInput) => api.createCafeteria(organizationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cafeterias(organizationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.userContext })
    },
  })
}

export function useCompleteOrganizationSetup(organizationId: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { displayName: string; cafeteria: CafeteriaInput }) => api.completeOrganizationSetup(organizationId, params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.userContext }),
  })
}
```

- [ ] **Step 4: Verify and commit**

Run: `npm run lint && npm run typecheck`
Expected: pass.

```bash
git add src/lib/api/http.ts src/lib/query src/lib/roles.ts src/hooks
git commit -m "Add HTTP adapter placeholders, query keys and data hooks"
```

---

### Task 5: Auth screens, app shell, role redirect

**Files:**
- Modify: `src/components/login-form.tsx`, `src/app/auth/login/page.tsx`, `src/app/auth/error/page.tsx`
- Create: `src/components/shell/app-shell.tsx`, `src/components/shell/top-bar.tsx`, `src/components/shell/tab-bar.tsx`, `src/components/shell/avatar-menu.tsx`, `src/components/shell/page-header.tsx`
- Create: `src/components/shared/error-card.tsx`, `src/components/shared/user-avatar.tsx`
- Create: `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`, `src/app/(app)/loading.tsx`, `src/app/(app)/error.tsx`, `src/app/not-found.tsx`
- Keep: `src/components/logout-button.tsx` (used in error states)

**Interfaces:**
- Consumes: `useUserContext`, `hasOrganizations`, `Logo`, `initials`.
- Produces: `<AppShell>` (reads pathname to pick client/org tabs), `<PageHeader title description? action?>`, `<ErrorCard error onRetry?>`, `<UserAvatar user size?>`.

- [ ] **Step 1: Login and error pages**

`src/components/login-form.tsx` — keep the `handleLoginWithGoogle` logic but change the fallback path to `'/'` and replace the JSX with:

```tsx
    <div className={cn('flex flex-col gap-8', className)} {...props}>
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size="lg" />
        <p className="max-w-xs text-sm text-muted-foreground">
          Collect stamps at your favorite cafeterias. Show your QR, let staff register your order, earn rewards.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Use your Google account. Clients and cafeteria staff sign in here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoginWithGoogle} className="flex flex-col gap-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? <Spinner /> : <GoogleMark />}
              {isLoading ? 'Redirecting to Google…' : 'Continue with Google'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
```

Add in the same file a small inline SVG component:

```tsx
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
    </svg>
  )
}
```

Imports needed: `Logo` from `@/components/brand/logo`, `Spinner` from `@/components/ui/spinner`.

`src/app/auth/login/page.tsx` wrapper becomes `className="flex min-h-svh w-full items-center justify-center bg-gradient-to-b from-secondary/60 to-background p-6"` with `max-w-sm` inner div (unchanged otherwise). Add `export const metadata = { title: 'Sign in' }`.

`src/app/auth/error/page.tsx`: add a `CardFooter` with `<Button render={<Link href="/auth/login" />} variant="outline">Back to sign in</Button>` (import `Link` from `next/link`, `Button`, `CardFooter`).

- [ ] **Step 2: Shared components**

`src/components/shared/user-avatar.tsx`:

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'

export function UserAvatar({ name, avatarUrl, size = 'default', className }: { name: string | null; avatarUrl: string | null; size?: 'default' | 'sm' | 'lg'; className?: string }) {
  return (
    <Avatar size={size} className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-secondary font-medium text-secondary-foreground">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
```

`src/components/shared/error-card.tsx`:

```tsx
import { AlertTriangleIcon } from 'lucide-react'

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api/errors'

export function ErrorCard({ error, title = 'Could not load this', onRetry }: { error: unknown; title?: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{errorMessage(error)}</AlertDescription>
      {onRetry ? (
        <AlertAction>
          <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
        </AlertAction>
      ) : null}
    </Alert>
  )
}
```

`src/components/shell/page-header.tsx`:

```tsx
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
```

- [ ] **Step 3: Tab bar, top bar, avatar menu, shell**

`src/components/shell/tab-bar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3Icon, HomeIcon, ReceiptTextIcon, ScanLineIcon, UsersIcon, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'

export type AppView = 'client' | 'org'

const TABS: Record<AppView, Array<{ href: string; label: string; icon: LucideIcon; exact?: boolean }>> = {
  client: [
    { href: '/client', label: 'Home', icon: HomeIcon, exact: true },
    { href: '/client/orders', label: 'Orders', icon: ReceiptTextIcon },
  ],
  org: [
    { href: '/org', label: 'Home', icon: HomeIcon, exact: true },
    { href: '/org/scan', label: 'Scan', icon: ScanLineIcon },
    { href: '/org/stats', label: 'Stats', icon: BarChart3Icon },
    { href: '/org/manage', label: 'Manage', icon: UsersIcon },
  ],
}

export function TabBar({ view }: { view: AppView }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-safe">
      <ul className="mx-auto flex w-full max-w-lg items-stretch">
        {TABS[view].map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className={cn('size-5', active && 'fill-primary/10')} aria-hidden="true" />
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

`src/components/shell/avatar-menu.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { BuildingIcon, LogOutIcon, MoonIcon, SunIcon, UserIcon } from 'lucide-react'

import { UserAvatar } from '@/components/shared/user-avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserContext } from '@/lib/api/types'
import { hasOrganizations } from '@/lib/roles'
import { createClient } from '@/lib/supabase/client'
import type { AppView } from './tab-bar'

export function AvatarMenu({ context, view }: { context: UserContext; view: AppView | null }) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  const signOut = async () => {
    await createClient().auth.signOut()
    router.push('/auth/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu" />}>
        <UserAvatar name={context.user.displayName} avatarUrl={context.user.avatarUrl} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-medium text-foreground">{context.user.displayName ?? 'Your account'}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{context.user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hasOrganizations(context) ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={view === 'client'} onClick={() => router.push('/client')}>
                <UserIcon /> Client view
              </DropdownMenuItem>
              <DropdownMenuItem disabled={view === 'org'} onClick={() => router.push('/org')}>
                <BuildingIcon /> Organization view
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem closeOnClick={false} onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
          <SunIcon className="dark:hidden" />
          <MoonIcon className="hidden dark:block" />
          <span className="dark:hidden">Dark mode</span>
          <span className="hidden dark:inline">Light mode</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={signOut}>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

(If `DropdownMenuItem` does not accept `variant`, drop that prop and add `className="text-destructive"`.)

`src/components/shell/top-bar.tsx`:

```tsx
'use client'

import Link from 'next/link'

import { Logo } from '@/components/brand/logo'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserContext } from '@/lib/api/types'
import { AvatarMenu } from './avatar-menu'
import type { AppView } from './tab-bar'

export function TopBar({ context, view }: { context: UserContext | undefined; view: AppView | null }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
        <Link href={view === 'org' ? '/org' : '/client'} aria-label="Home">
          <Logo />
        </Link>
        {context ? <AvatarMenu context={context} view={view} /> : <Skeleton className="size-8 rounded-full" />}
      </div>
    </header>
  )
}
```

`src/components/shell/app-shell.tsx`:

```tsx
'use client'

import { usePathname } from 'next/navigation'

import { useUserContext } from '@/hooks/use-user-context'
import { TabBar, type AppView } from './tab-bar'
import { TopBar } from './top-bar'

function viewFromPath(pathname: string): AppView | null {
  if (pathname === '/org' || pathname.startsWith('/org/')) return 'org'
  if (pathname === '/client' || pathname.startsWith('/client/')) return 'client'
  return null
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const view = viewFromPath(pathname)
  const { data: context } = useUserContext()

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar context={context} view={view} />
      <main className={view ? 'mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-24' : 'mx-auto w-full max-w-lg flex-1 px-4 py-4'}>{children}</main>
      {view ? <TabBar view={view} /> : null}
    </div>
  )
}
```

- [ ] **Step 4: `(app)` layout, role redirect page, loading/error/not-found**

`src/app/(app)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'

import { AppShell } from '@/components/shell/app-shell'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) redirect('/auth/login')

  return <AppShell>{children}</AppShell>
}
```

`src/app/(app)/page.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { ErrorCard } from '@/components/shared/error-card'
import { Spinner } from '@/components/ui/spinner'
import { useUserContext } from '@/hooks/use-user-context'
import { hasOrganizations } from '@/lib/roles'

export default function EntryPage() {
  const router = useRouter()
  const { data, error, isError, refetch } = useUserContext()

  useEffect(() => {
    if (data) router.replace(hasOrganizations(data) ? '/org' : '/client')
  }, [data, router])

  if (isError) {
    return (
      <div className="flex flex-col gap-4 pt-8">
        <ErrorCard error={error} title="Could not load your account" onRetry={() => refetch()} />
        <LogoutButton />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <Spinner className="size-6" />
      <p className="text-sm">Loading your account…</p>
    </div>
  )
}
```

`src/app/(app)/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  )
}
```

`src/app/(app)/error.tsx`:

```tsx
'use client'

import { ErrorCard } from '@/components/shared/error-card'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="pt-8">
      <ErrorCard error={error} title="Something went wrong" onRetry={reset} />
    </div>
  )
}
```

`src/app/not-found.tsx`:

```tsx
import Link from 'next/link'

import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo size="lg" />
      <div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">The link may be outdated or the QR code may be invalid.</p>
      </div>
      <Button render={<Link href="/" />}>Go home</Button>
    </div>
  )
}
```

Change `src/components/logout-button.tsx` to `variant="outline"` so it reads as secondary in error states.

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run typecheck`, then `NEXT_PUBLIC_USE_MOCKS=true npm run dev` with real Supabase env vars in `.env.local`.
Expected: `/auth/login` shows the branded card; after Google sign-in, `/` shows the spinner then redirects to `/client` (persona `client`) — `/client` will 404 until Task 6, that is expected. Persona switcher visible bottom-left on desktop.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add auth screens restyle, app shell and role-based entry redirect"
```

---

### Task 6: Client home — QR card, invitations, stamp cards, recent orders

**Files:**
- Create: `src/lib/qr.ts`
- Create: `src/components/client/qr-card.tsx`, `src/components/client/qr-fullscreen-dialog.tsx`, `src/components/client/invitation-card.tsx`, `src/components/client/stamp-card.tsx`, `src/components/client/order-list.tsx`
- Create: `src/app/(app)/client/page.tsx`

**Interfaces:**
- Consumes: `useUserContext`, `useStampCards`, `useMyOrders`, `useRespondToInvitation`, `toast` from `@/components/ui/toast`.
- Produces: `buildRegisterUrl(origin, token)`, `parseScannedValue(text): string | null`, `REGISTER_PATH_PREFIX`; `<OrderList orders emptyText? showCustomer?>` reused by Tasks 7 and 8; `<StampCard card>`.

- [ ] **Step 1: QR helpers**

`src/lib/qr.ts`:

```ts
export const REGISTER_PATH_PREFIX = '/org/register/'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isQrToken(value: string) {
  return UUID_RE.test(value)
}

export function buildRegisterUrl(origin: string, qrToken: string) {
  return `${origin}${REGISTER_PATH_PREFIX}${encodeURIComponent(qrToken)}`
}

/** Accepts a full register URL (any origin) or a bare token. Returns the normalized token or null. */
export function parseScannedValue(text: string): string | null {
  const trimmed = text.trim()
  if (isQrToken(trimmed)) return trimmed.toLowerCase()
  try {
    const url = new URL(trimmed)
    const index = url.pathname.indexOf(REGISTER_PATH_PREFIX)
    if (index === -1) return null
    const token = decodeURIComponent(url.pathname.slice(index + REGISTER_PATH_PREFIX.length).split('/')[0] ?? '')
    return isQrToken(token) ? token.toLowerCase() : null
  } catch {
    return null
  }
}
```

- [ ] **Step 2: QR card and full-screen dialog**

`src/components/client/qr-card.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { ExpandIcon } from 'lucide-react'

import { UserAvatar } from '@/components/shared/user-avatar'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { User } from '@/lib/api/types'
import { buildRegisterUrl } from '@/lib/qr'
import { QrFullscreenDialog } from './qr-fullscreen-dialog'

export function useQrSvg(qrToken: string) {
  const [svg, setSvg] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    const url = buildRegisterUrl(window.location.origin, qrToken)
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }).then((result) => {
      if (!cancelled) setSvg(`data:image/svg+xml;utf8,${encodeURIComponent(result)}`)
    })
    return () => {
      cancelled = true
    }
  }, [qrToken])
  return svg
}

export function QrCard({ user }: { user: User }) {
  const svg = useQrSvg(user.qrToken)
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-4 px-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Show my QR code full screen"
        >
          <div className="rounded-xl bg-white p-2 shadow-sm">
            {svg ? <img src={svg} alt="Your QR code" className="size-28" /> : <Skeleton className="size-28" />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
              <span className="truncate font-medium">{user.displayName ?? 'Your card'}</span>
            </div>
            <p className="text-sm text-primary-foreground/80">Show this code at the counter so staff can register your order.</p>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-foreground/90">
              <ExpandIcon className="size-3.5" aria-hidden="true" /> Tap to enlarge
            </span>
          </div>
        </button>
      </Card>
      <QrFullscreenDialog open={open} onOpenChange={setOpen} svg={svg} name={user.displayName} />
    </>
  )
}
```

`src/components/client/qr-fullscreen-dialog.tsx`:

```tsx
'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export function QrFullscreenDialog({ open, onOpenChange, svg, name }: { open: boolean; onOpenChange: (open: boolean) => void; svg: string | null; name: string | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-svh max-h-svh w-screen max-w-none flex-col items-center justify-center gap-6 rounded-none bg-white text-neutral-900 sm:h-auto sm:max-h-[90vh] sm:w-auto sm:max-w-md sm:rounded-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-neutral-900">{name ?? 'Your QR code'}</DialogTitle>
          <DialogDescription className="text-neutral-600">Hold the screen steady for the cashier.</DialogDescription>
        </DialogHeader>
        {svg ? <img src={svg} alt="Your QR code, enlarged" className="w-full max-w-xs" /> : <Skeleton className="size-72" />}
        <p className="text-xs text-neutral-500">Tap outside or press Escape to close.</p>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Invitation card, stamp card, order list**

`src/components/client/invitation-card.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { MailIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { useRespondToInvitation } from '@/hooks/use-client-data'
import { errorMessage } from '@/lib/api/errors'
import type { Invitation } from '@/lib/api/types'
import { roleLabel } from '@/lib/roles'

export function InvitationCard({ invitation }: { invitation: Invitation }) {
  const router = useRouter()
  const respond = useRespondToInvitation()

  const handle = (decision: 'accepted' | 'rejected') => {
    respond.mutate(
      { invitationId: invitation.id, decision },
      {
        onSuccess: () => {
          if (decision === 'rejected') {
            toast.add({ title: 'Invitation declined' })
            return
          }
          if (invitation.role === 'owner') {
            toast.add({ type: 'success', title: `You now own ${invitation.organization.displayName}`, description: 'Let’s finish setting it up.' })
            router.push(`/onboarding/${invitation.organization.id}`)
            return
          }
          toast.add({ type: 'success', title: `Welcome to ${invitation.organization.displayName}`, description: 'The Organization view is now available from your account menu.' })
        },
        onError: (error) => toast.add({ type: 'error', title: 'Could not respond', description: errorMessage(error) }),
      }
    )
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailIcon className="size-4 text-brand" aria-hidden="true" />
          {invitation.organization.displayName}
          <Badge variant="secondary">{roleLabel(invitation.role)}</Badge>
        </CardTitle>
        <CardDescription>
          {invitation.sentBy?.displayName ? `Invited by ${invitation.sentBy.displayName}. ` : ''}
          {invitation.role === 'owner' ? 'Accepting makes you the owner and starts the setup of the organization.' : 'Accepting lets you register orders for this organization.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="hidden" />
      <CardFooter className="gap-2">
        <Button size="sm" onClick={() => handle('accepted')} disabled={respond.isPending}>Accept</Button>
        <Button size="sm" variant="ghost" onClick={() => handle('rejected')} disabled={respond.isPending}>Decline</Button>
      </CardFooter>
    </Card>
  )
}
```

`src/components/client/stamp-card.tsx`:

```tsx
import { GiftIcon, MapPinIcon } from 'lucide-react'
import { cn } from 'cn'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { StampCard as StampCardModel } from '@/lib/api/types'

export function StampCard({ card, compact = false }: { card: StampCardModel; compact?: boolean }) {
  const filled = Math.min(card.orderCount, card.threshold)
  const rewardReady = card.rewardsAvailable > 0 || card.orderCount >= card.threshold
  return (
    <Card size="sm" className={cn(rewardReady && 'ring-brand/60')}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="truncate">{card.cafeteria.displayName}</span>
          {rewardReady ? (
            <Badge className="bg-brand text-brand-foreground"><GiftIcon /> Reward ready</Badge>
          ) : (
            <span className="text-sm font-normal text-muted-foreground">{filled}/{card.threshold}</span>
          )}
        </CardTitle>
        {!compact ? (
          <CardDescription className="flex items-center gap-1">
            <MapPinIcon className="size-3.5" aria-hidden="true" /> {card.cafeteria.location}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-10 gap-1.5" role="img" aria-label={`${filled} of ${card.threshold} stamps`}>
          {Array.from({ length: card.threshold }, (_, i) => (
            <span key={i} className={cn('aspect-square rounded-full border', i < filled ? 'border-primary bg-primary' : 'border-border bg-muted')} />
          ))}
        </div>
        {card.rewardsAvailable > 1 ? <p className="mt-2 text-xs text-muted-foreground">{card.rewardsAvailable} rewards available</p> : null}
      </CardContent>
    </Card>
  )
}
```

`src/components/client/order-list.tsx`:

```tsx
import { CoffeeIcon } from 'lucide-react'

import { UserAvatar } from '@/components/shared/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { CafeteriaOrder, Order } from '@/lib/api/types'
import { formatDay, formatTime } from '@/lib/format'

type AnyOrder = Order | CafeteriaOrder

function groupByDay(orders: AnyOrder[]) {
  const groups = new Map<string, AnyOrder[]>()
  for (const order of orders) {
    const key = formatDay(order.createdAt)
    groups.set(key, [...(groups.get(key) ?? []), order])
  }
  return Array.from(groups.entries())
}

export function OrderList({ orders, emptyTitle = 'No orders yet', emptyDescription = 'Orders registered by cafeteria staff will show up here.', grouped = true }: { orders: AnyOrder[]; emptyTitle?: string; emptyDescription?: string; grouped?: boolean }) {
  if (orders.length === 0) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon"><CoffeeIcon /></EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const sections = grouped ? groupByDay(orders) : [['', orders] as const]

  return (
    <div className="flex flex-col gap-4">
      {sections.map(([day, dayOrders]) => (
        <section key={day || 'all'} className="flex flex-col gap-2">
          {day ? <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{day}</h3> : null}
          <ul className="divide-y rounded-xl border bg-card">
            {dayOrders.map((order) => (
              <li key={order.id} className="flex items-start gap-3 p-3">
                {'customer' in order ? (
                  <UserAvatar name={order.customer.displayName} avatarUrl={order.customer.avatarUrl} size="sm" className="mt-0.5" />
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{'customer' in order ? order.customer.displayName ?? 'Customer' : order.cafeteria.displayName}</span>
                    <time dateTime={order.createdAt} className="shrink-0 text-xs text-muted-foreground">{formatTime(order.createdAt)}</time>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {order.items.length > 0 ? order.items.map((item, i) => <Badge key={`${item}-${i}`} variant="outline">{item}</Badge>) : <span className="text-xs text-muted-foreground">Visit registered</span>}
                  </div>
                  {order.note ? <p className="text-xs text-muted-foreground">“{order.note}”</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Client home page**

`src/app/(app)/client/page.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { ChevronRightIcon } from 'lucide-react'

import { InvitationCard } from '@/components/client/invitation-card'
import { OrderList } from '@/components/client/order-list'
import { QrCard } from '@/components/client/qr-card'
import { StampCard } from '@/components/client/stamp-card'
import { ErrorCard } from '@/components/shared/error-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyOrders, useStampCards } from '@/hooks/use-client-data'
import { useUserContext } from '@/hooks/use-user-context'

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function ClientHomePage() {
  const context = useUserContext()
  const stampCards = useStampCards()
  const orders = useMyOrders()

  if (context.isError) return <ErrorCard error={context.error} onRetry={() => context.refetch()} />
  if (!context.data) return <Skeleton className="h-40 w-full rounded-2xl" />

  const { user, pendingInvitations } = context.data

  return (
    <div className="flex flex-col gap-8">
      <QrCard user={user} />

      {pendingInvitations.length > 0 ? (
        <Section title="Pending invitations">
          <div className="flex flex-col gap-3">
            {pendingInvitations.map((invitation) => <InvitationCard key={invitation.id} invitation={invitation} />)}
          </div>
        </Section>
      ) : null}

      <Section title="Your cafeterias">
        {stampCards.isPending ? <Skeleton className="h-28 w-full rounded-2xl" /> : null}
        {stampCards.isError ? <ErrorCard error={stampCards.error} onRetry={() => stampCards.refetch()} /> : null}
        {stampCards.data?.length === 0 ? <p className="text-sm text-muted-foreground">Visit a participating cafeteria and show your QR to start collecting stamps.</p> : null}
        <div className="flex flex-col gap-3">
          {stampCards.data?.map((card) => <StampCard key={card.cafeteria.id} card={card} />)}
        </div>
      </Section>

      <Section
        title="Recent orders"
        action={
          <Button variant="ghost" size="sm" render={<Link href="/client/orders" />}>
            See all <ChevronRightIcon />
          </Button>
        }
      >
        {orders.isPending ? <Skeleton className="h-32 w-full rounded-2xl" /> : null}
        {orders.isError ? <ErrorCard error={orders.error} onRetry={() => orders.refetch()} /> : null}
        {orders.data ? <OrderList orders={orders.data.slice(0, 5)} grouped={false} /> : null}
      </Section>
    </div>
  )
}
```

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run typecheck`, then dev server with mocks.
Expected, persona `client`: QR card renders and opens full screen; two stamp cards (Northside Main 7/10, Bean & Co Harbor "Reward ready"); five recent orders. Persona `client-with-invites`: two invitation cards; Decline removes one with a toast; Accept on the member invite shows a success toast and the avatar menu gains the view switcher; Accept on the owner invite navigates to `/onboarding/...` (404 until Task 12, expected).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add client home: QR card, invitations, stamp cards, recent orders"
```

---

### Task 7: Client orders history

**Files:**
- Create: `src/app/(app)/client/orders/page.tsx`

**Interfaces:**
- Consumes: `useMyOrders(cafeteriaId?)`, `useStampCards` (for the cafeteria filter options), `OrderList`, `PageHeader`, shadcn `Select`.

- [ ] **Step 1: Page**

```tsx
'use client'

import { useState } from 'react'

import { OrderList } from '@/components/client/order-list'
import { ErrorCard } from '@/components/shared/error-card'
import { PageHeader } from '@/components/shell/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyOrders, useStampCards } from '@/hooks/use-client-data'

const ALL = 'all'

export default function ClientOrdersPage() {
  const [cafeteriaId, setCafeteriaId] = useState<string>(ALL)
  const stampCards = useStampCards()
  const orders = useMyOrders(cafeteriaId === ALL ? undefined : cafeteriaId)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Orders" description="Everything staff have registered for you." />

      <Select value={cafeteriaId} onValueChange={(value) => setCafeteriaId(value ?? ALL)}>
        <SelectTrigger className="w-full" aria-label="Filter by cafeteria">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All cafeterias</SelectItem>
          {stampCards.data?.map((card) => (
            <SelectItem key={card.cafeteria.id} value={card.cafeteria.id}>{card.cafeteria.displayName}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {orders.isPending ? <Skeleton className="h-64 w-full rounded-2xl" /> : null}
      {orders.isError ? <ErrorCard error={orders.error} onRetry={() => orders.refetch()} /> : null}
      {orders.data ? <OrderList orders={orders.data} /> : null}
    </div>
  )
}
```

If `SelectValue` renders the raw id instead of the label, pass `items` to `Select`: build `const items = [{ value: ALL, label: 'All cafeterias' }, ...cards.map(c => ({ value: c.cafeteria.id, label: c.cafeteria.displayName }))]` and `<Select items={items} …>`.

- [ ] **Step 2: Verify and commit**

Expected: orders grouped by day (Today / Yesterday / weekday date); filter switches between cafeterias.

```bash
git add -A
git commit -m "Add client orders history with cafeteria filter"
```

---

### Task 8: Org home — active cafeteria, selector, today's tiles, finish-setup banner

**Files:**
- Create: `src/hooks/use-active-cafeteria.ts`
- Create: `src/components/org/cafeteria-selector.tsx`, `src/components/org/stat-tile.tsx`, `src/components/org/finish-setup-banner.tsx`, `src/components/org/org-guard.tsx`
- Create: `src/app/(app)/org/page.tsx`

**Interfaces:**
- Consumes: `useUserContext`, `useCafeteriaStats`, `OrderList`, shadcn `Sheet`.
- Produces: `useActiveCafeteria()` → `{ organization, cafeteria, organizations, setActive(organizationId, cafeteriaId), isReady, canManage }`; `<OrgGuard>{(active) => …}</OrgGuard>` which renders loading/error/not-a-member states and passes the resolved active selection; `<StatTile label value hint?>`; `<CafeteriaSelector>`.

- [ ] **Step 1: Active cafeteria hook**

`src/hooks/use-active-cafeteria.ts`:

```ts
'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

import type { Cafeteria, Organization } from '@/lib/api/types'
import { canManage as canManageRole } from '@/lib/roles'
import { useUserContext } from './use-user-context'

const STORAGE_KEY = 'cv.active'
const EVENT = 'cv:active-changed'

interface Stored {
  organizationId: string
  cafeteriaId: string | null
}

function read(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(EVENT, callback)
  }
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY)
}

export function useActiveCafeteria() {
  const { data: context, isPending, isError, error, refetch } = useUserContext()
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null)
  const stored = useMemo<Stored | null>(() => (raw ? read() : null), [raw])

  const organizations = context?.organizations ?? []

  const resolved = useMemo(() => {
    if (organizations.length === 0) return { organization: undefined, cafeteria: undefined }
    const organization = organizations.find((o) => o.id === stored?.organizationId) ?? organizations[0]
    const cafeteria = organization.cafeterias.find((c) => c.id === stored?.cafeteriaId) ?? organization.cafeterias[0]
    return { organization, cafeteria }
  }, [organizations, stored])

  const setActive = useCallback((organizationId: string, cafeteriaId: string | null) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ organizationId, cafeteriaId } satisfies Stored))
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return {
    organizations,
    organization: resolved.organization as Organization | undefined,
    cafeteria: resolved.cafeteria as Cafeteria | undefined,
    setActive,
    canManage: canManageRole(resolved.organization?.role),
    isReady: !isPending && !isError,
    isPending,
    isError,
    error,
    refetch,
  }
}
```

- [ ] **Step 2: Guard, selector, tile, banner**

`src/components/org/org-guard.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { BuildingIcon } from 'lucide-react'

import { ErrorCard } from '@/components/shared/error-card'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveCafeteria } from '@/hooks/use-active-cafeteria'

type Active = ReturnType<typeof useActiveCafeteria>

export function OrgGuard({ children }: { children: (active: Active & { organization: NonNullable<Active['organization']> }) => React.ReactNode }) {
  const active = useActiveCafeteria()

  if (active.isPending) return <Skeleton className="h-40 w-full rounded-2xl" />
  if (active.isError) return <ErrorCard error={active.error} onRetry={() => active.refetch()} />
  if (!active.organization) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon"><BuildingIcon /></EmptyMedia>
          <EmptyTitle>You are not part of an organization</EmptyTitle>
          <EmptyDescription>Ask an organization admin to invite you. Invitations appear on your client home.</EmptyDescription>
        </EmptyHeader>
        <Button render={<Link href="/client" />}>Go to client view</Button>
      </Empty>
    )
  }

  return <>{children({ ...active, organization: active.organization })}</>
}
```

`src/components/org/cafeteria-selector.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { CheckIcon, ChevronDownIcon, MapPinIcon } from 'lucide-react'
import { cn } from 'cn'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { Cafeteria, Organization } from '@/lib/api/types'
import { roleLabel } from '@/lib/roles'

export function CafeteriaSelector({ organizations, organization, cafeteria, onSelect }: { organizations: Organization[]; organization: Organization; cafeteria: Cafeteria | undefined; onSelect: (organizationId: string, cafeteriaId: string | null) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" className="h-auto w-full justify-between py-2 text-left" />}>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-xs text-muted-foreground">{organization.displayName}</span>
          <span className="truncate font-medium">{cafeteria?.displayName ?? 'No cafeteria yet'}</span>
        </span>
        <ChevronDownIcon className="shrink-0 text-muted-foreground" />
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Active cafeteria</SheetTitle>
          <SheetDescription>Orders you register and the stats you see use this cafeteria.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-6">
          {organizations.map((org) => (
            <section key={org.id} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                {org.displayName} <Badge variant="secondary">{roleLabel(org.role)}</Badge>
              </h3>
              {org.cafeterias.length === 0 ? <p className="text-sm text-muted-foreground">No cafeterias yet.</p> : null}
              <ul className="flex flex-col gap-1">
                {org.cafeterias.map((c) => {
                  const selected = c.id === cafeteria?.id && org.id === organization.id
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => { onSelect(org.id, c.id); setOpen(false) }}
                        className={cn('flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left hover:bg-muted', selected && 'border-primary bg-accent')}
                        aria-pressed={selected}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{c.displayName}</span>
                          <span className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPinIcon className="size-3" aria-hidden="true" /> {c.location}</span>
                        </span>
                        {selected ? <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

`src/components/org/stat-tile.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function StatTile({ label, value, hint, loading = false }: { label: string; value: string | number; hint?: string; loading?: boolean }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {loading ? <Skeleton className="h-8 w-16" /> : <span className="text-3xl font-semibold tabular-nums">{value}</span>}
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  )
}
```

`src/components/org/finish-setup-banner.tsx`:

```tsx
import Link from 'next/link'
import { SparklesIcon } from 'lucide-react'

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { Organization } from '@/lib/api/types'

export function FinishSetupBanner({ organization }: { organization: Organization }) {
  if (organization.status !== 'pending' || organization.role !== 'owner') return null
  return (
    <Alert className="border-brand/50 bg-accent">
      <SparklesIcon className="text-brand" />
      <AlertTitle>Finish setting up {organization.displayName}</AlertTitle>
      <AlertDescription>Confirm the name and add your first cafeteria to start registering orders.</AlertDescription>
      <AlertAction>
        <Button size="sm" render={<Link href={`/onboarding/${organization.id}`} />}>Set up</Button>
      </AlertAction>
    </Alert>
  )
}
```

- [ ] **Step 3: Org home page**

`src/app/(app)/org/page.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { ChevronRightIcon, ScanLineIcon } from 'lucide-react'

import { OrderList } from '@/components/client/order-list'
import { CafeteriaSelector } from '@/components/org/cafeteria-selector'
import { FinishSetupBanner } from '@/components/org/finish-setup-banner'
import { OrgGuard } from '@/components/org/org-guard'
import { StatTile } from '@/components/org/stat-tile'
import { ErrorCard } from '@/components/shared/error-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCafeteriaStats } from '@/hooks/use-org-data'
import { formatRelative } from '@/lib/format'

function OrgHome({ organization, organizations, cafeteria, setActive }: { organization: NonNullable<ReturnType<typeof import('@/hooks/use-active-cafeteria').useActiveCafeteria>['organization']>; organizations: ReturnType<typeof import('@/hooks/use-active-cafeteria').useActiveCafeteria>['organizations']; cafeteria: ReturnType<typeof import('@/hooks/use-active-cafeteria').useActiveCafeteria>['cafeteria']; setActive: (organizationId: string, cafeteriaId: string | null) => void }) {
  const stats = useCafeteriaStats(cafeteria?.id)

  return (
    <div className="flex flex-col gap-6">
      <CafeteriaSelector organizations={organizations} organization={organization} cafeteria={cafeteria} onSelect={setActive} />
      <FinishSetupBanner organization={organization} />

      <Button size="lg" className="h-16 w-full text-base" render={<Link href="/org/scan" />} disabled={!cafeteria}>
        <ScanLineIcon className="size-6" /> Register order
      </Button>
      {!cafeteria ? <p className="-mt-4 text-center text-xs text-muted-foreground">Add a cafeteria before registering orders.</p> : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Today at {cafeteria?.displayName ?? 'your cafeteria'}</h2>
        {stats.isError ? <ErrorCard error={stats.error} onRetry={() => stats.refetch()} /> : null}
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Orders" value={stats.data?.ordersToday ?? 0} loading={stats.isPending} />
          <StatTile label="Customers" value={stats.data?.uniqueCustomersToday ?? 0} loading={stats.isPending} />
          <StatTile label="Last order" value={stats.data?.lastOrderAt ? formatRelative(stats.data.lastOrderAt) : '—'} loading={stats.isPending} />
          <StatTile label="Last 7 days" value={stats.data?.ordersLast7Days ?? 0} loading={stats.isPending} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent orders</h2>
          <Button variant="ghost" size="sm" render={<Link href="/org/stats" />}>Stats <ChevronRightIcon /></Button>
        </div>
        {stats.isPending ? <Skeleton className="h-40 w-full rounded-2xl" /> : null}
        {stats.data ? <OrderList orders={stats.data.recentOrders.slice(0, 5)} grouped={false} emptyTitle="No orders yet today" emptyDescription="Registered orders will appear here." /> : null}
      </section>
    </div>
  )
}

export default function OrgHomePage() {
  return <OrgGuard>{(active) => <OrgHome organization={active.organization} organizations={active.organizations} cafeteria={active.cafeteria} setActive={active.setActive} />}</OrgGuard>
}
```

Simplify the `OrgHome` prop types by exporting `export type ActiveCafeteria = ReturnType<typeof useActiveCafeteria>` from `use-active-cafeteria.ts` and typing the props as `Pick<ActiveCafeteria, 'organizations' | 'cafeteria' | 'setActive'> & { organization: Organization }`.

- [ ] **Step 4: Verify and commit**

Expected, persona `org-member`: `/` → `/org`; selector shows Northside Roasters / Northside Main; tiles show 3 orders today, 2 customers; switching to Northside Station updates tiles and persists after reload. Persona `org-admin`: selector lists two organizations.

```bash
git add -A
git commit -m "Add org home with active cafeteria selector and today's stats"
```

---

### Task 9: Scanner page

**Files:**
- Create: `src/components/org/qr-scanner.tsx`, `src/components/org/manual-token-form.tsx`
- Create: `src/app/(app)/org/scan/page.tsx`

**Interfaces:**
- Consumes: `parseScannedValue`, `REGISTER_PATH_PREFIX`, `useMocks`, `MOCK_CUSTOMER_TOKEN` (import from `@/lib/api/mock/fixtures` only inside a `useMocks` branch via the persona-safe constant — see Step 2).
- Produces: `<QrScanner onToken(token) />` (client-only, dynamic).

- [ ] **Step 1: Scanner wrapper**

`src/components/org/qr-scanner.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Scanner, type IScannerError } from '@yudiel/react-qr-scanner'
import { CameraOffIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { parseScannedValue } from '@/lib/qr'

const ERROR_COPY: Record<IScannerError['kind'], string> = {
  'permission-denied': 'Camera access was denied. Allow camera access for this site in your browser settings, then reload.',
  'no-camera': 'No camera was found on this device.',
  'in-use': 'The camera is being used by another app.',
  overconstrained: 'The camera does not support the requested settings.',
  'insecure-context': 'Camera access requires HTTPS.',
  unsupported: 'This browser does not support camera scanning.',
  aborted: 'Camera start was interrupted.',
  security: 'Camera access was blocked by the browser.',
  'type-error': 'Could not start the camera.',
  unknown: 'Could not start the camera.',
}

export default function QrScanner({ onToken, paused = false }: { onToken: (token: string) => void; paused?: boolean }) {
  const [error, setError] = useState<IScannerError | null>(null)
  const [rejected, setRejected] = useState(false)

  if (error) {
    return (
      <Alert variant="destructive">
        <CameraOffIcon />
        <AlertTitle>Camera unavailable</AlertTitle>
        <AlertDescription>{ERROR_COPY[error.kind]}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <Scanner
        onScan={(codes) => {
          const token = codes.map((c) => parseScannedValue(c.rawValue)).find((t): t is string => Boolean(t))
          if (token) onToken(token)
          else setRejected(true)
        }}
        onError={setError}
        formats={['qr_code']}
        paused={paused}
        constraints={{ facingMode: 'environment' }}
        components={{ finder: true, torch: true, onOff: false, zoom: false }}
        allowMultiple
        scanDelay={1500}
        sound={false}
        styles={{ container: { width: '100%', aspectRatio: '3 / 4' }, video: { objectFit: 'cover' } }}
      />
      {rejected ? (
        <p className="absolute inset-x-0 bottom-0 bg-black/70 p-2 text-center text-xs text-white">That code is not a CafeVisitor customer code.</p>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Manual entry form**

`src/components/org/manual-token-form.tsx`:

```tsx
'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useMocks } from '@/lib/config'
import { parseScannedValue } from '@/lib/qr'

const MOCK_HINT = '11111111-1111-4111-8111-111111111111'

export function ManualTokenForm({ onToken }: { onToken: (token: string) => void }) {
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        const token = parseScannedValue(value)
        if (!token) return setInvalid(true)
        onToken(token)
      }}
    >
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor="manual-token">Customer code</FieldLabel>
        <Input id="manual-token" value={value} onChange={(e) => { setValue(e.target.value); setInvalid(false) }} placeholder="Paste the code or link from the customer" autoComplete="off" inputMode="text" aria-invalid={invalid} />
        <FieldDescription>{useMocks ? `Mock mode: try ${MOCK_HINT}` : 'Ask the customer to open their QR card and read the code under it.'}</FieldDescription>
        {invalid ? <FieldError>That does not look like a valid customer code.</FieldError> : null}
      </Field>
      <Button type="submit" variant="secondary" disabled={!value.trim()}>Continue</Button>
    </form>
  )
}
```

The hint is a literal matching `MOCK_CUSTOMER_TOKEN` in fixtures; keep them equal (do not import fixtures here so production bundles stay mock-free).

- [ ] **Step 3: Scan page**

`src/app/(app)/org/scan/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { KeyboardIcon } from 'lucide-react'

import { ManualTokenForm } from '@/components/org/manual-token-form'
import { OrgGuard } from '@/components/org/org-guard'
import { PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { REGISTER_PATH_PREFIX } from '@/lib/qr'

const QrScanner = dynamic(() => import('@/components/org/qr-scanner'), { ssr: false, loading: () => <Skeleton className="aspect-[3/4] w-full rounded-2xl" /> })

export default function ScanPage() {
  const router = useRouter()
  const [manual, setManual] = useState(false)
  const [navigating, setNavigating] = useState(false)

  const goToRegister = (token: string) => {
    if (navigating) return
    setNavigating(true)
    router.push(`${REGISTER_PATH_PREFIX}${encodeURIComponent(token)}`)
  }

  return (
    <OrgGuard>
      {({ cafeteria }) => (
        <div className="flex flex-col gap-4">
          <PageHeader title="Scan customer QR" description={cafeteria ? `Registering at ${cafeteria.displayName}` : 'Select a cafeteria first'} />
          {manual ? (
            <ManualTokenForm onToken={goToRegister} />
          ) : (
            <QrScanner onToken={goToRegister} paused={navigating} />
          )}
          <Button variant="ghost" onClick={() => setManual((m) => !m)}>
            <KeyboardIcon /> {manual ? 'Use the camera' : 'Enter code manually'}
          </Button>
        </div>
      )}
    </OrgGuard>
  )
}
```

- [ ] **Step 4: Verify and commit**

Expected on desktop: camera prompt appears (or the permission-denied alert with instructions). Manual entry with the mock token navigates to `/org/register/1111…` (404 until Task 10). On a phone via `next dev --experimental-https`, scanning a QR from the client view on another device navigates the same way.

```bash
git add -A
git commit -m "Add QR scanner page with manual code fallback"
```

---

### Task 10: Register order page

**Files:**
- Create: `src/components/org/customer-summary.tsx`, `src/components/org/order-items-form.tsx`
- Create: `src/app/(app)/org/register/[qrToken]/page.tsx`

**Interfaces:**
- Consumes: `useCustomerLookup`, `useRegisterOrder`, `useActiveCafeteria` via `OrgGuard`, `StampCard`, `ORDER_ITEM_OPTIONS`, `isQrToken`, `toast`.

- [ ] **Step 1: Customer summary and items form**

`src/components/org/customer-summary.tsx`:

```tsx
import { StampCard } from '@/components/client/stamp-card'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Card, CardContent } from '@/components/ui/card'
import type { CustomerLookup } from '@/lib/api/types'

export function CustomerSummary({ customer }: { customer: CustomerLookup }) {
  return (
    <div className="flex flex-col gap-3">
      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <UserAvatar name={customer.user.displayName} avatarUrl={customer.user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-medium">{customer.user.displayName ?? 'Customer'}</p>
            <p className="truncate text-sm text-muted-foreground">{customer.user.email}</p>
          </div>
        </CardContent>
      </Card>
      {customer.stampCard ? <StampCard card={customer.stampCard} compact /> : <p className="text-sm text-muted-foreground">First visit to this cafeteria.</p>}
    </div>
  )
}
```

`src/components/org/order-items-form.tsx`:

```tsx
'use client'

import { cn } from 'cn'

import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { ORDER_ITEM_OPTIONS } from '@/lib/config'

export function OrderItemsForm({ items, note, onItemsChange, onNoteChange, disabled }: { items: string[]; note: string; onItemsChange: (items: string[]) => void; onNoteChange: (note: string) => void; disabled?: boolean }) {
  const toggle = (item: string) => onItemsChange(items.includes(item) ? items.filter((i) => i !== item) : [...items, item])

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="text-sm font-medium">What did they order?</legend>
        <div className="flex flex-wrap gap-2">
          {ORDER_ITEM_OPTIONS.map((item) => {
            const selected = items.includes(item)
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(item)}
                className={cn('min-h-11 rounded-full border px-4 text-sm font-medium transition-colors', selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}
              >
                {item}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">Optional. Tap everything that applies.</p>
      </fieldset>
      <Field>
        <FieldLabel htmlFor="order-note">Note</FieldLabel>
        <Textarea id="order-note" value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="e.g. oat milk, extra hot" rows={2} maxLength={200} disabled={disabled} />
      </Field>
    </div>
  )
}
```

- [ ] **Step 2: Register page**

`src/app/(app)/org/register/[qrToken]/page.tsx`:

```tsx
'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2Icon, ScanLineIcon } from 'lucide-react'

import { StampCard } from '@/components/client/stamp-card'
import { CustomerSummary } from '@/components/org/customer-summary'
import { OrderItemsForm } from '@/components/org/order-items-form'
import { OrgGuard } from '@/components/org/org-guard'
import { ErrorCard } from '@/components/shared/error-card'
import { PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useCustomerLookup, useRegisterOrder } from '@/hooks/use-org-data'
import { errorMessage } from '@/lib/api/errors'
import type { Cafeteria, RegisterOrderResult } from '@/lib/api/types'
import { isQrToken } from '@/lib/qr'

function RegisterFlow({ qrToken, cafeteria }: { qrToken: string; cafeteria: Cafeteria }) {
  const lookup = useCustomerLookup(qrToken, cafeteria.id)
  const register = useRegisterOrder()
  const [items, setItems] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [result, setResult] = useState<RegisterOrderResult | null>(null)

  if (result) {
    return (
      <div className="flex flex-col items-center gap-6 py-6 text-center">
        <CheckCircle2Icon className="size-16 text-brand" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold">Order registered</h2>
          <p className="text-sm text-muted-foreground">{lookup.data?.user.displayName ?? 'The customer'} now has {result.stampCard.orderCount} of {result.stampCard.threshold} stamps at {cafeteria.displayName}.</p>
        </div>
        <div className="w-full"><StampCard card={result.stampCard} compact /></div>
        <div className="flex w-full flex-col gap-2">
          <Button size="lg" render={<Link href="/org/scan" />}><ScanLineIcon /> Scan next customer</Button>
          <Button variant="ghost" render={<Link href="/org" />}>Back to home</Button>
        </div>
      </div>
    )
  }

  if (lookup.isPending) return <Skeleton className="h-48 w-full rounded-2xl" />
  if (lookup.isError) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorCard error={lookup.error} title="Customer not found" onRetry={() => lookup.refetch()} />
        <Button variant="outline" render={<Link href="/org/scan" />}>Scan again</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <CustomerSummary customer={lookup.data} />
      <OrderItemsForm items={items} note={note} onItemsChange={setItems} onNoteChange={setNote} disabled={register.isPending} />
      <Button
        size="lg"
        className="h-14 w-full text-base"
        disabled={register.isPending}
        onClick={() =>
          register.mutate(
            { cafeteriaId: cafeteria.id, qrToken, items, note: note.trim() || undefined },
            {
              onSuccess: setResult,
              onError: (error) => toast.add({ type: 'error', title: 'Could not register the order', description: errorMessage(error) }),
            }
          )
        }
      >
        {register.isPending ? <Spinner /> : null} Confirm order
      </Button>
    </div>
  )
}

export default function RegisterOrderPage({ params }: PageProps<'/org/register/[qrToken]'>) {
  const { qrToken } = use(params)
  const token = decodeURIComponent(qrToken)

  return (
    <OrgGuard>
      {({ cafeteria }) => (
        <div className="flex flex-col gap-4">
          <PageHeader title="Register order" description={cafeteria ? `At ${cafeteria.displayName}` : undefined} />
          {!isQrToken(token) ? <ErrorCard error={new Error('This QR code is not a valid customer code.')} title="Invalid code" /> : null}
          {isQrToken(token) && !cafeteria ? <ErrorCard error={new Error('Add a cafeteria to your organization before registering orders.')} title="No active cafeteria" /> : null}
          {isQrToken(token) && cafeteria ? <RegisterFlow qrToken={token} cafeteria={cafeteria} /> : null}
        </div>
      )}
    </OrgGuard>
  )
}
```

`OrgGuard` already covers the "logged in but not in any organization" case (a client scanning a friend's QR sees the "not part of an organization" empty state).

- [ ] **Step 3: Verify and commit**

Expected: `/org/register/11111111-1111-4111-8111-111111111111` as `org-member` shows Ana with 7/10 at Northside Main; select Coffee + Pastry, note, Confirm → success screen shows 8/10; "Scan next" returns to the scanner. An unknown UUID shows "Customer not found". Client persona at the same URL sees the not-in-organization state.

```bash
git add -A
git commit -m "Add register order flow with customer lookup and confirmation"
```

---

### Task 11: Stats and Manage pages

**Files:**
- Create: `src/components/org/orders-per-day-chart.tsx`
- Create: `src/app/(app)/org/stats/page.tsx`
- Create: `src/components/org/members-list.tsx`, `src/components/org/invite-dialog.tsx`, `src/components/org/cafeterias-list.tsx`, `src/components/org/add-cafeteria-dialog.tsx`
- Create: `src/app/(app)/org/manage/page.tsx`

**Interfaces:**
- Consumes: `useCafeteriaStats`, `useMembers`, `useOrganizationInvitations`, `useSendInvitation`, `useCafeterias`, `useCreateCafeteria`, `canManage`, shadcn `Tabs`, `Dialog`, `Select`, `Field`, `Input`.

- [ ] **Step 1: Chart and stats page**

`src/components/org/orders-per-day-chart.tsx`:

```tsx
import { formatShortDay } from '@/lib/format'

export function OrdersPerDayChart({ data, days = 14 }: { data: Array<{ date: string; count: number }>; days?: number }) {
  const slice = data.slice(-days)
  const max = Math.max(1, ...slice.map((d) => d.count))
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-32 items-end gap-1" role="img" aria-label={`Orders per day for the last ${slice.length} days`}>
        {slice.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${formatShortDay(d.date)}: ${d.count}`}>
            <span className="text-[10px] tabular-nums text-muted-foreground">{d.count || ''}</span>
            <div className="w-full rounded-t-sm bg-primary/80" style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>{slice[0] ? formatShortDay(slice[0].date) : ''}</span>
        <span>Today</span>
      </figcaption>
    </figure>
  )
}
```

`src/app/(app)/org/stats/page.tsx`:

```tsx
'use client'

import { OrderList } from '@/components/client/order-list'
import { OrdersPerDayChart } from '@/components/org/orders-per-day-chart'
import { OrgGuard } from '@/components/org/org-guard'
import { StatTile } from '@/components/org/stat-tile'
import { ErrorCard } from '@/components/shared/error-card'
import { PageHeader } from '@/components/shell/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCafeteriaStats } from '@/hooks/use-org-data'
import type { Cafeteria } from '@/lib/api/types'

function Stats({ cafeteria }: { cafeteria: Cafeteria }) {
  const stats = useCafeteriaStats(cafeteria.id)
  if (stats.isError) return <ErrorCard error={stats.error} onRetry={() => stats.refetch()} />
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Today" value={stats.data?.ordersToday ?? 0} loading={stats.isPending} />
        <StatTile label="7 days" value={stats.data?.ordersLast7Days ?? 0} loading={stats.isPending} />
        <StatTile label="30 days" value={stats.data?.ordersLast30Days ?? 0} loading={stats.isPending} />
      </div>
      <Card size="sm">
        <CardHeader><CardTitle>Orders per day</CardTitle></CardHeader>
        <CardContent>{stats.data ? <OrdersPerDayChart data={stats.data.ordersPerDay} /> : <Skeleton className="h-32 w-full" />}</CardContent>
      </Card>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Latest orders</h2>
        {stats.data ? <OrderList orders={stats.data.recentOrders} /> : <Skeleton className="h-40 w-full rounded-2xl" />}
      </section>
    </div>
  )
}

export default function StatsPage() {
  return (
    <OrgGuard>
      {({ cafeteria }) => (
        <div className="flex flex-col gap-4">
          <PageHeader title="Stats" description={cafeteria ? cafeteria.displayName : 'Select a cafeteria on Home'} />
          {cafeteria ? <Stats cafeteria={cafeteria} /> : null}
        </div>
      )}
    </OrgGuard>
  )
}
```

- [ ] **Step 2: Members list and invite dialog**

`src/components/org/members-list.tsx`:

```tsx
'use client'

import { UserAvatar } from '@/components/shared/user-avatar'
import { ErrorCard } from '@/components/shared/error-card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useMembers, useOrganizationInvitations } from '@/hooks/use-org-data'
import { roleLabel } from '@/lib/roles'
import { formatShortDay } from '@/lib/format'

export function MembersList({ organizationId }: { organizationId: string }) {
  const members = useMembers(organizationId)
  const invitations = useOrganizationInvitations(organizationId)
  const pending = invitations.data?.filter((i) => i.status === 'pending') ?? []

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Members</h3>
        {members.isPending ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
        {members.isError ? <ErrorCard error={members.error} onRetry={() => members.refetch()} /> : null}
        {members.data ? (
          <ul className="divide-y rounded-xl border bg-card">
            {members.data.map((m) => (
              <li key={m.user.id} className="flex items-center gap-3 p-3">
                <UserAvatar name={m.user.displayName} avatarUrl={m.user.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.user.displayName ?? m.user.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>{roleLabel(m.role)}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Pending invitations</h3>
        {invitations.isPending ? <Skeleton className="h-12 w-full rounded-xl" /> : null}
        {invitations.isError ? <ErrorCard error={invitations.error} onRetry={() => invitations.refetch()} /> : null}
        {invitations.data && pending.length === 0 ? <p className="text-sm text-muted-foreground">No pending invitations.</p> : null}
        {pending.length > 0 ? (
          <ul className="divide-y rounded-xl border bg-card">
            {pending.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.email}</p>
                  <p className="text-xs text-muted-foreground">Sent {formatShortDay(i.createdAt)}</p>
                </div>
                <Badge variant="outline">{roleLabel(i.role)}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
```

`src/components/org/invite-dialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { UserPlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useSendInvitation } from '@/hooks/use-org-data'
import { errorMessage } from '@/lib/api/errors'
import type { OrganizationRole } from '@/lib/api/types'

const ROLE_ITEMS: Array<{ value: OrganizationRole; label: string }> = [
  { value: 'member', label: 'Member — can register orders' },
  { value: 'admin', label: 'Admin — can also manage team and cafeterias' },
]

export function InviteDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganizationRole>('member')
  const send = useSendInvitation(organizationId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}><UserPlusIcon /> Invite</DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            send.mutate(
              { email, role },
              {
                onSuccess: () => { toast.add({ type: 'success', title: `Invitation sent to ${email}` }); setEmail(''); setRole('member'); setOpen(false) },
                onError: (error) => toast.add({ type: 'error', title: 'Could not send invitation', description: errorMessage(error) }),
              }
            )
          }}
        >
          <DialogHeader>
            <DialogTitle>Invite to the team</DialogTitle>
            <DialogDescription>They will see the invitation on their CafeVisitor home after signing in.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="invite-email">Email</FieldLabel>
            <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="barista@example.com" />
          </Field>
          <Field>
            <FieldLabel htmlFor="invite-role">Role</FieldLabel>
            <Select items={ROLE_ITEMS} value={role} onValueChange={(value) => value && setRole(value as OrganizationRole)}>
              <SelectTrigger id="invite-role" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_ITEMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <FieldDescription>Only owners can transfer ownership; that is not available here.</FieldDescription>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={send.isPending || !email}>{send.isPending ? <Spinner /> : null} Send invitation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Cafeterias list and add dialog**

`src/components/org/cafeterias-list.tsx`:

```tsx
'use client'

import { MapPinIcon } from 'lucide-react'

import { ErrorCard } from '@/components/shared/error-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCafeterias } from '@/hooks/use-org-data'

export function CafeteriasList({ organizationId }: { organizationId: string }) {
  const cafeterias = useCafeterias(organizationId)
  if (cafeterias.isPending) return <Skeleton className="h-24 w-full rounded-xl" />
  if (cafeterias.isError) return <ErrorCard error={cafeterias.error} onRetry={() => cafeterias.refetch()} />
  if (cafeterias.data.length === 0) return <p className="text-sm text-muted-foreground">No cafeterias yet.</p>
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {cafeterias.data.map((c) => (
        <li key={c.id} className="flex flex-col gap-0.5 p-3">
          <span className="text-sm font-medium">{c.displayName}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPinIcon className="size-3" aria-hidden="true" /> {c.location}</span>
        </li>
      ))}
    </ul>
  )
}
```

`src/components/org/add-cafeteria-dialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useCreateCafeteria } from '@/hooks/use-org-data'
import { errorMessage } from '@/lib/api/errors'

export function AddCafeteriaDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [location, setLocation] = useState('')
  const create = useCreateCafeteria(organizationId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}><PlusIcon /> Add cafeteria</DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate(
              { displayName, location },
              {
                onSuccess: (cafeteria) => { toast.add({ type: 'success', title: `${cafeteria.displayName} added` }); setDisplayName(''); setLocation(''); setOpen(false) },
                onError: (error) => toast.add({ type: 'error', title: 'Could not add cafeteria', description: errorMessage(error) }),
              }
            )
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a cafeteria</DialogTitle>
            <DialogDescription>Staff can select it as their active cafeteria right away.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="cafeteria-name">Name</FieldLabel>
            <Input id="cafeteria-name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Northside Station" />
          </Field>
          <Field>
            <FieldLabel htmlFor="cafeteria-location">Location</FieldLabel>
            <Input id="cafeteria-location" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Central Station, Hall B" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !displayName || !location}>{create.isPending ? <Spinner /> : null} Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Manage page**

`src/app/(app)/org/manage/page.tsx`:

```tsx
'use client'

import { AddCafeteriaDialog } from '@/components/org/add-cafeteria-dialog'
import { CafeteriasList } from '@/components/org/cafeterias-list'
import { InviteDialog } from '@/components/org/invite-dialog'
import { MembersList } from '@/components/org/members-list'
import { OrgGuard } from '@/components/org/org-guard'
import { PageHeader } from '@/components/shell/page-header'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { roleLabel } from '@/lib/roles'

export default function ManagePage() {
  return (
    <OrgGuard>
      {({ organization, canManage }) => (
        <div className="flex flex-col gap-4">
          <PageHeader title="Manage" description={organization.displayName} action={<Badge variant="secondary">{roleLabel(organization.role)}</Badge>} />
          <Tabs defaultValue="team">
            <TabsList className="w-full">
              <TabsTrigger value="team" className="flex-1">Team</TabsTrigger>
              <TabsTrigger value="cafeterias" className="flex-1">Cafeterias</TabsTrigger>
            </TabsList>
            <TabsContent value="team" className="flex flex-col gap-4 pt-4">
              {canManage ? <div className="flex justify-end"><InviteDialog organizationId={organization.id} /></div> : null}
              <MembersList organizationId={organization.id} />
            </TabsContent>
            <TabsContent value="cafeterias" className="flex flex-col gap-4 pt-4">
              {canManage ? <div className="flex justify-end"><AddCafeteriaDialog organizationId={organization.id} /></div> : null}
              <CafeteriasList organizationId={organization.id} />
            </TabsContent>
          </Tabs>
          {!canManage ? <p className="text-xs text-muted-foreground">Only owners and admins can invite people or add cafeterias.</p> : null}
        </div>
      )}
    </OrgGuard>
  )
}
```

- [ ] **Step 5: Verify and commit**

Expected: `org-member` sees Stats with three tiles + bar chart, Manage read-only (no Invite / Add buttons). `org-admin` can send an invitation (appears under Pending) and add a cafeteria (appears in the list and in the selector on Home).

```bash
git add -A
git commit -m "Add org stats and manage pages (team, invitations, cafeterias)"
```

---

### Task 12: Owner onboarding wizard

**Files:**
- Create: `src/components/onboarding/organization-setup-wizard.tsx`
- Create: `src/app/(app)/onboarding/[organizationId]/page.tsx`

**Interfaces:**
- Consumes: `useUserContext`, `useCompleteOrganizationSetup`, `useActiveCafeteria().setActive`, `Progress`.

- [ ] **Step 1: Wizard component**

`src/components/onboarding/organization-setup-wizard.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useActiveCafeteria } from '@/hooks/use-active-cafeteria'
import { useCompleteOrganizationSetup } from '@/hooks/use-org-data'
import { errorMessage } from '@/lib/api/errors'
import type { Organization } from '@/lib/api/types'

export function OrganizationSetupWizard({ organization }: { organization: Organization }) {
  const router = useRouter()
  const { setActive } = useActiveCafeteria()
  const complete = useCompleteOrganizationSetup(organization.id)
  const [step, setStep] = useState<1 | 2>(1)
  const [displayName, setDisplayName] = useState(organization.displayName)
  const [cafeteriaName, setCafeteriaName] = useState('')
  const [location, setLocation] = useState('')

  const finish = () =>
    complete.mutate(
      { displayName, cafeteria: { displayName: cafeteriaName, location } },
      {
        onSuccess: (org) => {
          const first = org.cafeterias[0]
          setActive(org.id, first?.id ?? null)
          toast.add({ type: 'success', title: `${org.displayName} is ready`, description: 'You can start registering orders.' })
          router.replace('/org')
        },
        onError: (error) => toast.add({ type: 'error', title: 'Could not finish setup', description: errorMessage(error) }),
      }
    )

  return (
    <div className="flex flex-col gap-6">
      <Progress value={step === 1 ? 50 : 100} aria-label={`Step ${step} of 2`}>
        <ProgressTrack><ProgressIndicator /></ProgressTrack>
      </Progress>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Name your organization</CardTitle>
            <CardDescription>This is what customers and staff will see. You can keep the suggested name.</CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="org-name">Organization name</FieldLabel>
              <Input id="org-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoFocus />
            </Field>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={() => setStep(2)} disabled={!displayName.trim()}>Continue</Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Add your first cafeteria</CardTitle>
            <CardDescription>You can add more later from Manage.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="first-cafeteria-name">Cafeteria name</FieldLabel>
              <Input id="first-cafeteria-name" value={cafeteriaName} onChange={(e) => setCafeteriaName(e.target.value)} placeholder={`${displayName} Main`} required autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="first-cafeteria-location">Location</FieldLabel>
              <Input id="first-cafeteria-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="12 Market St" required />
              <FieldDescription>Street address or a short description customers recognize.</FieldDescription>
            </Field>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={complete.isPending}>Back</Button>
            <Button onClick={finish} disabled={complete.isPending || !cafeteriaName.trim() || !location.trim()}>
              {complete.isPending ? <Spinner /> : null} Finish setup
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Page**

`src/app/(app)/onboarding/[organizationId]/page.tsx`:

```tsx
'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { OrganizationSetupWizard } from '@/components/onboarding/organization-setup-wizard'
import { ErrorCard } from '@/components/shared/error-card'
import { PageHeader } from '@/components/shell/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserContext } from '@/hooks/use-user-context'

export default function OnboardingPage({ params }: PageProps<'/onboarding/[organizationId]'>) {
  const { organizationId } = use(params)
  const router = useRouter()
  const context = useUserContext()
  const organization = context.data?.organizations.find((o) => o.id === organizationId)

  useEffect(() => {
    if (organization && (organization.status === 'created' || organization.role !== 'owner')) router.replace('/org')
  }, [organization, router])

  if (context.isPending) return <Skeleton className="h-64 w-full rounded-2xl" />
  if (context.isError) return <ErrorCard error={context.error} onRetry={() => context.refetch()} />
  if (!organization) return <ErrorCard error={new Error('You do not own this organization or the invitation was not accepted.')} title="Organization not found" />

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Set up your organization" description="Two quick steps and you are ready to register orders." />
      <OrganizationSetupWizard organization={organization} />
    </div>
  )
}
```

- [ ] **Step 3: Verify and commit**

Expected, persona `client-with-invites`: Accept the owner invitation → wizard with name prefilled ("Ana's Corner Café") → add a cafeteria → lands on `/org` with that cafeteria active and no "Finish setup" banner. Reload keeps the selection.

```bash
git add -A
git commit -m "Add owner onboarding wizard"
```

---

### Task 13: Polish, README, final verification

**Files:**
- Modify: `README.md`
- Review/adjust any component from Tasks 5–12 for responsive and dark-mode issues

- [ ] **Step 1: README**

Replace `README.md` with:

```markdown
# CafeVisitor — frontend

Mobile-first web app for cafeteria loyalty. Clients show a personal QR code; cafeteria staff scan it to register orders, and clients collect stamps per cafeteria.

## Stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn (Base UI), TanStack Query, Supabase auth (Google OAuth).

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable key. Set `NEXT_PUBLIC_BACKEND_URL` to the API base URL.
3. `npm run dev` and open http://localhost:3000

### Mock mode
Set `NEXT_PUBLIC_USE_MOCKS=true` to run the whole UI against in-memory fixtures (no backend needed, Supabase login is still required). A flask button (bottom-left on desktop, top-right on mobile) switches between personas: client, client with invitations, organization member, organization admin. The mock customer QR code is `11111111-1111-4111-8111-111111111111`.

### Testing the camera on a phone
Camera access needs HTTPS: run `npx next dev --experimental-https` and open the LAN URL it prints on your phone.

## Structure
- `src/app` routes. `(app)` is the authenticated shell: `/client/*` client view, `/org/*` organization view, `/onboarding/[organizationId]` owner setup.
- `src/lib/api` typed API contract (`types.ts` zod schemas, `api.ts` interface), `http.ts` real adapter, `mock/` fixtures and personas.
- `src/hooks` TanStack Query hooks over the API.
- `src/components` UI, grouped by surface (`client`, `org`, `shell`, `shared`, `ui`).
- `src/proxy.ts` Supabase session refresh and auth redirect.

## Scripts
`npm run dev` · `npm run build` · `npm run start` · `npm run lint` · `npm run typecheck`

## Connecting the backend
Only `GET /user/context` is wired today. Each other method in `src/lib/api/http.ts` names its intended route and throws `not_implemented`; replace it with a `fetchJson(route, schema)` call once the endpoint exists. The zod schemas in `src/lib/api/types.ts` are the response contract.
```

- [ ] **Step 2: Responsive and dark-mode pass**

Run the dev server with mocks and check at 360px, 768px and 1280px widths, light and dark, all four personas:
- Bottom tab bar never overlaps content (main has `pb-24`).
- QR card contrast in dark mode (white QR tile stays white).
- Stamp dots, brand badge and chips readable in dark mode.
- Dialogs and the bottom sheet fit on 360px.
- Avatar menu theme toggle switches instantly and persists on reload.
Fix anything off directly in the component concerned.

- [ ] **Step 3: Production build check**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: build succeeds. Then: `grep -rl "Northside Roasters" .next/static | wc -l` → `0` when `NEXT_PUBLIC_USE_MOCKS` is unset (fixtures not bundled). Run once more with `NEXT_PUBLIC_USE_MOCKS=true npm run build` → count `> 0` (mock chunk present only when enabled).

- [ ] **Step 4: Unauthenticated deep link**

Sign out, open `/org/register/11111111-1111-4111-8111-111111111111`. Expected redirect to `/auth/login?next=/org/register/1111…`, and after Google sign-in the browser lands back on the register page.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Polish redesign, document setup and mock mode"
```

---

## Self-review notes

- Spec coverage: shell + switcher (T5), entry redirect (T5), client home incl. QR/invitations/stamps/orders (T6), orders history (T7), org home + selector + banner (T8), scanner + manual entry (T9), register flow + native camera deep link (T9/T10/T1 proxy `next`), stats (T11), manage (T11), onboarding (T12), auth restyle + error back link (T5), theme + fonts + destructive class fixes (T1/T5), mock adapter/personas/dynamic import (T3), HTTP placeholders (T4), README/env (T1/T13).
- Type consistency: `Api` method names in T2 match `http.ts` (T4) and `mock/index.ts` (T3) and every hook in T4. `useActiveCafeteria` return shape used by `OrgGuard` (T8), scan (T9), register (T10), stats/manage (T11), wizard (T12). `OrderList` accepts `Order | CafeteriaOrder` (T6) and is used in T7, T8, T11.
