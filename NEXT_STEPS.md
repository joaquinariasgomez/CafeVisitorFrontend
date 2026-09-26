What was built

- Design spec and implementation plan under docs/superpowers/.
- Foundation: middleware.ts renamed to Next 16's proxy.ts, warm coffee palette with light and dark mode via next-themes, Providers (theme, React Query, toaster, API adapter), CafeVisitor branding, boilerplate removed, .env.example and README rewritten.
- Typed API layer in src/lib/api: zod schemas, an Api interface, an HTTP adapter (only /users/context wired, the rest name their intended routes), and a mock adapter with four personas, in-memory mutations and a floating persona switcher in mock mode.
- Auth: restyled login card, error page with a back link, and the proxy now keeps ?next= so a scanned QR deep link survives login.
- App shell with top bar, avatar menu (client/org view switcher, theme toggle, sign out) and a per-view bottom tab bar.
- Client view: QR card with full-screen dialog, pending invitations (accept/decline, owner invite routes to onboarding), stamp cards with reward badges, recent orders, and a filterable order history.
- Organization view: active org/cafeteria selector remembered on the device, register-order CTA, today's tiles, camera scanner with manual code fallback, register flow (customer lookup, item chips, note, confirm, success state), stats with a per-day bar chart, and Manage with team, invitations, cafeterias and role-gated Invite/Add dialogs.
- Owner onboarding wizard (org name, then first cafeteria).

What I could not verify

- Authenticated screens were not viewed in a browser. The repo has no .env.local, so Google sign-in can't run here. I verified with placeholder Supabase values that the login page renders and that the proxy redirects correctly. To review the UI, copy .env.example to .env.local, add your Supabase keys, keep NEXT_PUBLIC_USE_MOCKS=true, and switch personas with the flask button.
- Camera scanning needs a phone over HTTPS (npx next dev --experimental-https).
- The mock fixtures still compile into a small lazy chunk with mocks off. It is never requested in that mode, and this is noted in the README.

Two loose ends for you

- Next 16 auto-generated AGENTS.md and CLAUDE.md on first next dev. They are untracked. Commit them or set agentRules: false in next.config.ts.
- Some UI details depend on Base UI behaviors I couldn't see rendered (the Select value label, dialog sizing on small screens). Expect a short polish pass once you've had a look.

Implementation complete. What would you like to do?

1. Merge back to master locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
