# Nuru Dating

A dating platform for the Kenyan market, built with Next.js and Supabase and
deployed to Cloudflare Workers via OpenNext.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Database / Auth | Supabase (Postgres, Row Level Security, Auth) |
| Payments | Paystack (Inline v2) |
| AI | Groq / OpenAI-compatible SDKs (bio generator, AI coach, AI companions) |
| Styling | Tailwind CSS + Radix UI primitives |
| State | Zustand, TanStack Query |
| Hosting | Cloudflare Workers (via `@opennextjs/cloudflare`) |

## Features

- Email/password and Google OAuth sign-up
- Guided onboarding (age, gender, preferences, location, bio)
- Swipe-style discovery feed and matching
- Realtime messaging (`postgres_changes` subscriptions)
- Wallet / in-app purchases via Paystack
- AI bio generator, AI dating coach, AI companion chat
- Admin dashboard: user moderation, reports queue
- Legal/info pages: privacy, terms, safety, cookies, help, about, careers, press, contact

## Project structure

```
app/
  page.tsx                 Landing page
  login/, register/        Auth pages
  auth/callback/           OAuth / email-confirmation callback (see "Auth flow")
  onboarding/               Multi-step profile creation, enforces 18+ minimum age
  discover/                 Swipe feed
  matches/                  Matches list
  chat/[userId]/            1:1 messaging
  profile/                  View/edit own profile
  wallet/                   Paystack top-ups and transaction history
  ai/                       Bio generator, coach, companions, chat
  admin/                    Moderation dashboard (users, reports) — gated by `admins` table
  api/
    ai/                     AI endpoints (bio generation, coach, companion chat)
    payments/               Paystack initialize / verify / webhook
    conversations/          Messaging API routes
    notifications/          Notification API routes

lib/
  supabase/
    client.ts               Browser Supabase client (createBrowserClient)
    server.ts                Server Supabase client (cookies-based, for Server Components/Route Handlers)
    admin.ts                 Service-role Supabase client — server-only, bypasses RLS
  utils.ts                   Shared helpers (calculateAge, formatDate, formatTime, cn)

supabase/
  schema.sql                 Full table definitions — source of truth for a fresh database
  policies.sql                Row Level Security policies
  migrations/                 Incremental SQL migrations to apply to an existing database

middleware.ts                 Edge auth check, per-route rate limiting, admin route gating
wrangler.toml                  Cloudflare Workers deployment config
scripts/postbuild-cloudflare.js  Post-build step for the Cloudflare adapter
```

## Local development

### Prerequisites

- Node.js 20+
- A Supabase project
- A Paystack account (test mode is fine for local dev)

### Setup

```bash
npm install
cp .env.example .env.local   # then fill in real values, see below
npm run dev
```

### Environment variables

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Public anon key, safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (`lib/supabase/admin.ts`) | **Secret.** Bypasses RLS — never expose to the client, never commit |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | client (wallet page) | Public key |
| `PAYSTACK_SECRET_KEY` | server only (`api/payments/*`) | **Secret** |
| `GROQ_API_KEY` | server only (`api/ai/*`) | **Secret** |
| `OPENROUTER_API_KEY` | server only (`api/ai/*`) | **Secret** |
| `NEXT_PUBLIC_APP_URL` | client + server | Used to build OAuth `redirectTo` and Paystack callback URLs |

Never commit `.env.local`. In production (Cloudflare), set secrets with
`wrangler secret put <NAME>` rather than putting real values in `wrangler.toml`.

### Database setup

Run once, against a fresh Supabase project, in this order:

1. `supabase/schema.sql` — creates all tables, including the `profiles` table
   with its `CHECK` constraints (gender, interests, body type, minimum age).
2. `supabase/policies.sql` — enables and defines Row Level Security policies
   for every table.

For an **existing** database, don't re-run `schema.sql`. Instead apply each
file under `supabase/migrations/` in filename (chronological) order. Each
migration is a standalone, idempotent-as-possible SQL script — check the
comment header in each file before running, some require a one-time data
check first (see `20260710_min_age_18.sql` for an example).

Run migrations via the Supabase SQL editor or `supabase db push` if you're
using the Supabase CLI.

## Auth flow

- **Email/password sign-up** (`/register`) creates the `auth.users` row, then
  the client redirects straight to `/onboarding` to collect profile data and
  insert the `profiles` row.
- **Email/password login** (`/login`) redirects to `/discover`, assuming a
  profile already exists.
- **Google OAuth** (from either `/login` or `/register`) round-trips through
  `/auth/callback`, which exchanges the auth code for a session, then
  **checks whether a `profiles` row already exists** for that user:
  - No profile → redirect to `/onboarding` (first-time OAuth sign-up)
  - Profile exists → redirect to `/discover`

  This check matters: without it, first-time OAuth users skip onboarding
  entirely and never get a `profiles` row, which surfaces later as a
  confusing "Profile not found" error on `/profile` or `/discover` that
  looks like an RLS bug but is actually a missing row.

- `middleware.ts` re-validates the session on every request, rate-limits
  `/api/ai/*`, `/api/payments/*`, and `/api/notifications/*` (20 req/min/route
  per IP+path), and gates `/admin/*` behind both a session check and an
  `admins` table lookup. Individual admin pages/API routes re-check
  server-side as defense in depth — the middleware check is not the only
  gate.

## Payments (Paystack)

The app uses **Paystack Inline v2**. The script tag in `app/layout.tsx` must
load `https://js.paystack.co/v2/inline.js` to match the `new
PaystackPop().newTransaction()` call in `app/wallet/page.tsx`. Mixing v1's
script with v2 call syntax (or vice versa) throws a misleading "put your
Paystack Inline javascript file inside of a form element" error and 400s on
`request_inline` — the two must be kept in sync if either is ever changed.

Flow: `app/wallet/page.tsx` (client) → `app/api/payments/initialize` (server,
creates a Paystack transaction) → Paystack Inline popup → Paystack calls
`app/api/payments/webhook` (server) to confirm payment → `app/api/payments/verify`
is used for client-side confirmation polling/redirect handling.

## Minimum age requirement

Nuru requires all users to be **18 or older**. This is enforced at three
layers, deliberately redundant:

1. **Database**: a `CHECK` constraint on `profiles.birth_date` rejects any
   row where the birth date is less than 18 years before the current date.
   This is the authoritative guard — client-side checks are a UX nicety on
   top of it, not a substitute for it.
2. **Onboarding** (`app/onboarding/page.tsx`): blocks advancing past the
   birth-date step, and blocks final submission, if the calculated age is
   under 18. Shows an inline warning as soon as an underage date is entered.
3. **Profile editing** (`app/profile/page.tsx`): blocks saving an edit that
   would change `birth_date` to something under 18.

If you ever add another path that writes `birth_date` (e.g. an admin edit
tool, a bulk import script, a different sign-up flow), it must go through
the same check — do not rely on the database constraint alone to produce a
good user-facing error message, but never remove the database constraint
either.

## Deployment

Deployed to Cloudflare Workers using the OpenNext Cloudflare adapter.

```bash
npm run pages:build   # next build + opennextjs-cloudflare build
npm run preview       # build + wrangler dev (local Workers runtime)
npm run deploy        # build + wrangler deploy
```

Cloudflare-specific config lives in `wrangler.toml` and
`open-next.config.ts`. Secrets are set with `wrangler secret put <NAME>`, not
committed. `scripts/postbuild-cloudflare.js` runs after `next build` to patch
up anything the Cloudflare adapter needs.

## Known operational notes / gotchas

- **Paystack v1/v2 mismatch** — see "Payments" above. If you see the "put
  inline javascript inside a form element" error again, check
  `app/layout.tsx`'s script `src` matches the API style used in
  `app/wallet/page.tsx`.
- **"Profile not found" after OAuth sign-up** — see "Auth flow" above. This
  is almost always a missing `profiles` row from a sign-up path that skipped
  onboarding, not a Row Level Security bug. Check `supabase/policies.sql`
  first to rule out policy issues, then check whether the row exists at all
  before assuming RLS is broken.
- **GitHub PATs / secrets in chat** — if a personal access token or secret
  key is ever shared in a support conversation or commit, rotate it
  immediately. Treat anything pasted into a chat as compromised.
- **Dependabot alerts** — check
  `https://github.com/learninghub44/nuru-dating/security/dependabot`
  periodically; as of this writing there were unresolved alerts on the
  default branch.

## Commit conventions

- One fix per commit — don't batch unrelated fixes into a single commit.
- Prefer small, reviewable diffs over large rewrites, especially around
  auth, payments, and RLS policies where mistakes are costly.
