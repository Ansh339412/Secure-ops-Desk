# SecureOps Desk

Security operations and IT asset management for small organizations. Register assets, record vulnerabilities, report and investigate incidents, and see what to fix first, with every organization's data isolated at the database level.

> **Screenshots:** add your own to `public/screenshots/` after you run the app (see _Demo data_ below) and link them here. None are included because they should show your running deployment.

## The problem

Small businesses, colleges and IT teams often track security problems in spreadsheets, email threads and chat. A laptop has outdated software, a server has a known weakness, someone reports a suspicious login, and nobody can say what is most urgent or who owns the fix. SecureOps Desk puts those workflows in one application.

## Features

| Area                        | What it does                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard                   | Counts, open vulnerabilities by severity, remediation progress, overdue deadlines, and the assets to look at first. All values come from the database. |
| Assets                      | Laptops, servers, websites and network gear with owner, operating system, status and a business-critical flag.                                         |
| Vulnerabilities             | Severity, status, optional CVE id, remediation deadline, linked asset. Overdue items are flagged.                                                      |
| Incidents                   | Anyone in the organization can report one. Analysts and admins triage, assign, add investigation notes and resolve.                                    |
| Team                        | Admins add members by email, change roles and remove people. The last admin cannot be removed.                                                         |
| Audit log                   | Admin-only record of changes to assets, vulnerabilities, incidents and memberships, written by database triggers.                                      |
| Security posture score      | Rule-based 0-100 score per asset with an itemised explanation. An internal prioritisation metric, not a security rating.                               |
| Search, filters, pagination | Server-side, URL-driven, work without JavaScript.                                                                                                      |

### Roles

|                                                                      | Viewer | Analyst | Admin |
| -------------------------------------------------------------------- | :----: | :-----: | :---: |
| Read everything in the organization                                  |  yes   |   yes   |  yes  |
| Report an incident, add investigation notes                          |  yes   |   yes   |  yes  |
| Create and edit assets, vulnerabilities; triage and assign incidents |        |   yes   |  yes  |
| Delete records, manage the team, read the audit log                  |        |         |  yes  |

### Security posture score

Points per asset (all values in `src/lib/risk.ts`, overridable through `RiskConfig`):

- Open or in-progress vulnerability: critical 40, high 20, medium 8, low 2
- Each overdue remediation deadline: +10
- Unresolved incident linked to the asset: critical 20, high 15, medium 10, low 5
- Marked business-critical: total multiplied by 1.25
- Capped at 100. Levels: 0-24 low, 25-49 medium, 50-74 high, 75+ critical

## Technology

Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS · PostgreSQL via Supabase · Supabase Auth · Row Level Security · Zod · Recharts · Vitest + React Testing Library · Playwright · ESLint + Prettier · GitHub Actions · Vercel.

The UI components are small hand-written ones (`src/components/ui`), not shadcn/ui.

## Architecture

```mermaid
flowchart LR
  U[Browser] --> M[Next.js middleware<br/>validates session]
  M --> P[Server Components<br/>and Server Actions]
  P -->|Zod validation +<br/>role check| S[Supabase client<br/>user JWT, anon key]
  S --> A[Supabase Auth]
  S --> D[(PostgreSQL<br/>RLS on every table)]
  D --> T[Triggers<br/>audit log, timestamps]
```

Design decisions worth explaining in an interview:

- **No service-role key anywhere.** Server code uses the signed-in user's session, so RLS applies to every query. Server Actions also check the role and filter by the active organization, but the database is the final authority.
- **The active organization is never taken from the request.** It is derived from the user's memberships.
- **Cross-organization references are impossible by construction.** `vulnerabilities`, `incidents` and `incident_comments` use composite foreign keys `(asset_id, organization_id)`, so a record cannot point at another organization's asset, and an incident can only be assigned to a member of its own organization.
- **Organization creation and member invites go through `SECURITY DEFINER` functions** (`create_organization`, `add_member_by_email`) so the bootstrap problem is solved without opening up the tables.
- **Audit log rows are written only by triggers.** Users have no insert, update or delete policy on `audit_logs`.

## Database schema

```mermaid
erDiagram
  organizations ||--o{ memberships : has
  profiles ||--o{ memberships : joins
  organizations ||--o{ assets : owns
  assets ||--o{ vulnerabilities : "affected by"
  assets |o--o{ incidents : involves
  incidents ||--o{ incident_comments : has
  organizations ||--o{ audit_logs : records
```

| Table               | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `profiles`          | Name and email, created automatically when a user signs up |
| `organizations`     | Tenants                                                    |
| `memberships`       | User, organization and role (`admin`, `analyst`, `viewer`) |
| `assets`            | IT asset inventory                                         |
| `vulnerabilities`   | Weaknesses with severity, status and deadline              |
| `incidents`         | Security incidents with reporter and assignee              |
| `incident_comments` | Immutable investigation notes                              |
| `audit_logs`        | Trigger-written change history                             |

Every organization-owned table has an `organization_id` column (`org_id` on `memberships`) used by the RLS policies. The full definition is in `supabase/migrations/20260101000000_init.sql`.

## Run it locally

Requirements: Node 20+ and a Supabase project (a free one is fine), or the Supabase CLI.

```bash
git clone https://github.com/YOUR_USERNAME/secureops-desk.git
cd secureops-desk
npm install
cp .env.example .env.local   # fill in your Supabase values
```

Create the database:

- **Hosted project:** open the SQL editor, paste `supabase/migrations/20260101000000_init.sql` and run it. Or `supabase link --project-ref <ref> && supabase db push`.
- **Local CLI:** `supabase start`, then `supabase db reset`. Use the URL and anon key printed by `supabase start`.

Then:

```bash
npm run dev    # http://localhost:3000
```

In Supabase, Authentication → URL Configuration: set the Site URL to your app URL and add `<app url>/auth/callback` to the redirect URLs. For quick local testing you can turn off "Confirm email".

### Environment variables

| Variable                        | Description                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project URL                                                                                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon or publishable key. Safe in the browser only because RLS is enabled. **Never use the service-role key.** |
| `NEXT_PUBLIC_SITE_URL`          | Public URL of the app, used in email confirmation links                                                       |

### Demo data

`supabase/demo-data.sql` fills your oldest organization with clearly labelled `Demo -` records, useful for screenshots. Run it in the Supabase SQL editor after creating an organization. It is optional.

## Testing

```bash
npm run lint && npm run typecheck && npm test   # static checks and unit/component tests
npm run test:rls                                 # database migration + RLS tests
npm run test:e2e                                 # Playwright
```

| Layer                    | Location                    | What it covers                                                                                                                                                                                                                      |
| ------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit and component       | `tests/unit`                | Risk scoring rules, Zod schemas, redirect and search helpers, badge and risk card rendering                                                                                                                                         |
| Database / authorization | `tests/integration/rls.sql` | Runs the migration and checks cross-organization isolation, per-role permissions, composite foreign keys, the audit log, last-admin protection and anonymous access. Each scenario prints `PASS:`                                   |
| End to end               | `tests/e2e`                 | `smoke.spec.ts` (public pages, auth redirect, headers) needs no backend. `journey.spec.ts` (sign in, create asset, vulnerability, incident) needs a real Supabase project and `E2E_EMAIL` / `E2E_PASSWORD`; it is skipped otherwise |

`npm run test:rls` needs `psql` and a **disposable** Postgres database:

```bash
# plain Postgres (adds a minimal stand-in for Supabase's auth schema)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres npm run test:rls -- --stub
# Supabase CLI database (real auth schema, no --stub)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run test:rls
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, format check, unit tests and build; the RLS suite against a Postgres service container; and the Playwright smoke tests.

## Deploy

1. **Supabase:** create a project, run the migration, then set Authentication → URL Configuration (Site URL = your Vercel URL, redirect URL `https://<your-app>/auth/callback`). Keep email confirmation on for production.
2. **Vercel:** import the GitHub repository, add the three environment variables above, deploy.
3. **Smoke test the live site:** register, confirm the email, create an organization, add an asset, record a vulnerability, report an incident, then sign up a second account and confirm it cannot see the first organization's data (and that opening the first account's asset URL returns "Page not found").

## Publishing to GitHub safely

`.env*` files (except `.env.example`) are git-ignored, and `npm run check:secrets` fails if an env file or a key-like string is about to be committed. CI runs the same check. Real values belong only in `.env.local` and in Vercel/Supabase settings.

```bash
npm run check:secrets
git init -b main
git add .
git commit -m "chore: initial commit"
git remote add origin https://github.com/YOUR_USERNAME/secureops-desk.git
git push -u origin main
```

If a key is ever committed by mistake, rotate it in Supabase immediately; deleting the commit is not enough.

## Security design and limitations

Implemented: Supabase Auth sessions validated with `getUser()` in middleware; server-side Zod validation on every action; RLS on every table with role-based policies; `SECURITY DEFINER` helpers with a pinned `search_path`; no public or anonymous privileges; generic login errors; open-redirect protection on `next` parameters; LIKE-wildcard escaping in search; security response headers; immutable notes and trigger-written audit logs.

Known limitations:

- No rate limiting on sign-in or server actions beyond what Supabase Auth provides.
- No CSP header yet, no MFA flow, no password-reset page (Supabase supports all three).
- Dashboard aggregates read up to 2,000 rows per table.
- Dates are displayed in UTC.
- Only one UI organization is active at a time (a cookie chooses it); a user can belong to several.
- CSV import and email notifications are not implemented.
- The E2E journey test has not been run in CI because it needs a live backend.

## Ethical use

SecureOps Desk is an educational security operations platform designed for authorized asset and incident management. It does not independently discover vulnerabilities or certify an organization's security posture. Users are responsible for ensuring that assets and security information are managed with appropriate authorization.

## Future improvements

Rate limiting, CSP and MFA, password reset, CSV vulnerability import with validation, email or webhook notifications for overdue items, per-organization risk configuration, SLA reports, and a generated `database.types.ts` from the Supabase CLI.

## Project layout

```
src/app          routes: (auth), (dashboard) with assets, vulnerabilities, incidents, team, audit
src/actions      Server Actions (validation, role checks, writes)
src/lib          Supabase clients, auth helpers, Zod schemas, risk scoring, utilities
src/components   UI primitives and per-feature components
supabase/        migration, optional demo data, CLI config
tests/           unit, integration (RLS), e2e
```
