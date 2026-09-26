# CafeVisitor — frontend

Mobile-first web app for cafeteria loyalty. Clients show a personal QR code; cafeteria staff scan it to register orders, and clients collect stamps per cafeteria.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn (Base UI), TanStack Query, Supabase auth (Google OAuth).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable key. Set `NEXT_PUBLIC_BACKEND_URL` to the API base URL.
3. `npm run dev` and open http://localhost:3000

### Mock mode

Set `NEXT_PUBLIC_USE_MOCKS=true` to run the whole UI against in-memory fixtures (no backend needed; Supabase sign-in is still required). A flask button (bottom-left on desktop, top-right on mobile) switches between personas: client, client with invitations, organization member, organization admin. The mock customer QR code is `11111111-1111-4111-8111-111111111111`; type it into "Enter code manually" on the Scan screen.

### Testing the camera on a phone

Camera access needs HTTPS: run `npx next dev --experimental-https` and open the LAN URL it prints on your phone.

## Structure

- `src/app` routes. `(app)` is the authenticated shell: `/client/*` client view, `/org/*` organization view, `/onboarding/[organizationId]` owner setup. `/` picks the view from the user context.
- `src/lib/api` typed API contract (`types.ts` zod schemas, `api.ts` interface), `http.ts` real adapter, `mock/` fixtures and personas. `ApiProvider` picks the adapter from `NEXT_PUBLIC_USE_MOCKS`.
- `src/hooks` TanStack Query hooks over the API, plus `use-active-cafeteria` (device-remembered cafeteria).
- `src/components` UI grouped by surface (`client`, `org`, `shell`, `shared`, `onboarding`, `ui`).
- `src/proxy.ts` Supabase session refresh and auth redirect (keeps `?next=` so QR deep links survive login).

## Scripts

`npm run dev` · `npm run build` · `npm run start` · `npm run lint` · `npm run typecheck`

## Connecting the backend

Only `GET /users/context` is wired today. Each other method in `src/lib/api/http.ts` names its intended route and throws `not_implemented`; replace it with a `fetchJson(route, schema)` call once the endpoint exists. The zod schemas in `src/lib/api/types.ts` are the response contract.

Note: the mock adapter is loaded through a dynamic `import('./mock')` guarded by the env flag. Turbopack still emits it as a small separate chunk, but that chunk is only requested when `NEXT_PUBLIC_USE_MOCKS=true`.
