# Database

This directory is the source of truth for the Postgres schema and Row Level
Security (RLS) policies backing Nuru Dating.

## Files

- **`schema.sql`** — table definitions for a brand-new database. Run this
  once when standing up a new Supabase project. Do **not** re-run this
  against a database that already has data; it will fail on the `CREATE
  TABLE` statements for tables that already exist.
- **`policies.sql`** — RLS policies for every table. Run once alongside
  `schema.sql` on a fresh project.
- **`migrations/`** — ordered, incremental SQL files. This is how you evolve
  an existing (already-deployed) database. Each file is named
  `YYYYMMDD_description.sql` and should be applied in filename order.

## Setting up a new database

```sql
-- In the Supabase SQL editor, in order:
\i schema.sql
\i policies.sql
```

(Or paste each file's contents into the SQL editor and run it.)

## Applying migrations to an existing database

1. Open each file in `migrations/` in chronological order (by filename).
2. Read the comment header — some migrations require you to check for
   existing data that would violate a new constraint before running the
   `ALTER TABLE` statement. The migration will simply fail with a clear
   Postgres error if you skip this and it matters; nothing runs silently.
3. Run the SQL in the Supabase SQL editor, or via `supabase db push` if
   you've adopted the Supabase CLI.
4. Migrations are not currently tracked in a schema_migrations table — this
   is a manual, ordered process. If you add tooling for this later, update
   this doc.

## RLS policy design

General pattern used throughout `policies.sql`:

- **SELECT**: generally open to any `authenticated` user (`USING (true)`)
  for public-facing tables like `profiles`, since the app is a discovery
  feed by nature. Sensitive per-user tables (messages, wallet transactions,
  notifications) scope `SELECT` to rows the user is a participant in.
- **INSERT**: scoped with `WITH CHECK (id = auth.uid())` (or the equivalent
  foreign key column) so a user can only create rows attributed to
  themselves.
- **UPDATE**: scoped with both `USING` and `WITH CHECK` on `auth.uid()` so a
  user can only modify their own rows, and can't reassign a row to someone
  else on update.
- **Admin access**: the `admins` table is checked explicitly in
  `middleware.ts` and again server-side in individual admin routes/pages —
  admin bypass is not implemented as a blanket RLS policy, to keep the blast
  radius of an admin-panel bug smaller.

If a query is unexpectedly returning zero rows for a logged-in user, check
in this order:

1. Does the row actually exist? (Query it directly in the SQL editor with
   the service role, bypassing RLS, to rule this out first.)
2. Is the session actually authenticated at the time of the query? (Cookie/
   session sync bugs between server and client Supabase clients are a more
   common cause of "row missing" than an actual policy bug.)
3. Only then, suspect the policy itself.

This order matters because "profile not found"-style bugs in this codebase
have so far always turned out to be (1) — a row that was never created
because a sign-up path skipped onboarding — rather than an RLS policy bug.
See the root `README.md`'s "Auth flow" section for a concrete example.

## Constraints worth knowing about

- `profiles.birth_date` has a `CHECK` constraint requiring the user to be 18
  or older (`birth_date <= CURRENT_DATE - INTERVAL '18 years'`). This is a
  hard floor — see the root `README.md`'s "Minimum age requirement" section.
  Do not relax this constraint.
- `profiles.gender`, `profiles.interested_in`, `profiles.body_type`,
  `profiles.relationship_status`, `profiles.drinking`, and
  `profiles.smoking` are all constrained to fixed enums via `CHECK`. If the
  product adds a new option to any of these (e.g. a new gender option), it
  needs a migration to alter the constraint — the app code and the
  constraint will silently disagree otherwise, and inserts/updates using the
  new value will fail with a Postgres constraint-violation error rather than
  a friendly app-level message.
