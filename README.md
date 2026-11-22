# Contour Consultations (mini-LMS)

Students sign up, book consultations, mark them complete or incomplete, reschedule and cancel them. Admins see every consultation in the system (read-only).

**Stack:** Next.js 16.4 (App Router) · TypeScript · Supabase (`@supabase/supabase-js`, `@supabase/ssr`, PostgreSQL 17) · shadcn/ui · zod · Vitest · pgTAP

---

## 1. Setup

### Prerequisites
- Node.js 20.9 or newer
- Docker Desktop, running (for the local Supabase stack)

The Supabase CLI is a dev dependency, so there is nothing else to install globally.

### Run it
```bash
npm install
npm run db:start                 # starts local Supabase, applies migrations and seed
cp .env.example .env.local       # then paste the publishable key (next command prints it)
npx supabase status -o env       # copy PUBLISHABLE_KEY into NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                      # http://localhost:3000
```

> The local stack uses ports **553xx** (API on `55321`) instead of the default 543xx so it can run alongside other local Supabase projects. Change them in `supabase/config.toml` if needed.

### Demo accounts (local seed only)
| Email | Password | Role |
|---|---|---|
| admin@example.com | Password123! | Admin |
| alice@example.com | Password123! | Student (3 consultations) |
| bob@example.com | Password123! | Student (2 consultations) |

New sign-ups are always students. Email confirmation is off locally (Supabase default), so sign-up logs you straight in. Auth emails, if enabled, appear in Mailpit at http://127.0.0.1:55324.

To make another user an admin (Supabase Studio at http://127.0.0.1:55323, SQL editor):
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'someone@example.com');
```

Passwords: at least 8 characters with upper and lower case letters and a number (`supabase/config.toml`), hashed by Supabase Auth. Changing a password requires a recent login (`secure_password_change`).

### Scripts
| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint (next/core-web-vitals + typescript) |
| `npm test` | Unit tests (Vitest): schemas, status rules, service, API boundary, browser client, redirect guard |
| `npm run test:db` | Database tests (pgTAP): RLS, roles, privileges, status rules |
| `npm run test:api` | API integration tests (Vitest): real HTTP against the running app (`npm run dev`) and local Supabase |
| `npm run db:start` / `db:reset` | Start the local stack / rebuild the DB from migrations + seed |
| `npm run db:types` | Regenerate `lib/supabase/database.types.ts` from the schema |

---

## 2. Implementation summary

```
Browser ──fetch──▶ /api/* Route Handlers ──▶ lib/consultations/service.ts ──▶ Supabase (RLS + trigger)
   ▲                  zod validation              user-scoped client                │
   │                  auth + role checks                                            │
   └──── Server Components (pages) ──read──▶ service.ts ─────────────────────────────┘
```

- **Writes go through API routes** (`app/api/**/route.ts`), as requested ("APIs over Server Actions"). Client components call them with `fetch`, then `router.refresh()` re-renders the server list.
- **Reads happen in Server Components** that call the same service module directly, so pages do not make an HTTP round trip to their own server. The template's auth flows (login, sign-up, password reset) are unchanged apart from redirects.
- **One service module** (`lib/consultations/service.ts`) holds every query. Route handlers stay thin: authenticate, validate, call the service, map errors.
- **One zod schema per payload** (`lib/consultations/schema.ts`), shared by the booking form (instant feedback) and the API (authoritative check).
- **Every query runs as the signed-in user** through the cookie-based `@supabase/ssr` client, so RLS applies everywhere. The service role key is never used by the app.
- Pages use Next 16 Cache Components: the prerendered static shell is only the layout and a skeleton. Everything role-specific (page headings, the Book button) renders behind `RoleGate` after the role check, so a student never sees the admin page and an admin never sees the Book button. The data then streams in behind a table skeleton.

### Features
| Requirement | Where |
|---|---|
| Sign up / log in / log out | Template auth pages (`app/auth/*`), role-aware redirect in `app/page.tsx` |
| Student dashboard (own consultations only) | `app/(app)/dashboard`, `GET /api/consultations` |
| Mark complete / incomplete | Checkbox per row, `PATCH /api/consultations/:id { status }` |
| Booking form (first name, last name, reason, datetime) | `BookConsultationDialog`, `POST /api/consultations` |
| Reschedule / cancel own consultations | Row actions, `PATCH /api/consultations/:id { scheduledAt }` / `{ status: "cancelled" }` |
| Admin view of all consultations (read-only) | `app/(app)/admin`, `GET /api/admin/consultations`, paginated + status filter |
| Migrations + schema | `supabase/migrations/` (`..._init.sql`, `..._admins_read_only.sql`) |

### API
All responses are JSON. Success: `{ data }` (lists add `page`, `pageSize`, `total`). Errors: `{ error: { code, message, fields? } }`.

| Method | Path | Who | Body / query |
|---|---|---|---|
| GET | `/api/consultations` | student | `?status=booked\|completed\|cancelled&page=1&pageSize=20` (max 100) |
| POST | `/api/consultations` | student | `{ firstName, lastName, reason, scheduledAt }` (ISO 8601, future) |
| PATCH | `/api/consultations/:id` | student (owner) | `{ scheduledAt }` **or** `{ status }` |
| GET | `/api/admin/consultations` | admin | same query as above, all students |

| Status | When |
|---|---|
| 400 | Validation failed (`fields` holds per-field messages), malformed id, unknown keys |
| 401 | Not signed in |
| 403 | A student on the admin endpoint, or an admin on a student endpoint (admins are read-only) |
| 404 | Consultation does not exist **or belongs to someone else** (no existence leak) |
| 409 | Invalid status transition, e.g. rescheduling a cancelled consultation |

### Data model
```
auth.users 1──1 public.profiles (role: student | admin)
                       1
                       │
                       * public.consultations
                           first_name, last_name, reason, scheduled_at (timestamptz),
                           status: booked | completed | cancelled, created_at, updated_at
```
Status rules: `booked ⇄ completed`, `booked → cancelled` (final). Only booked consultations can be rescheduled, and only to a future time.

---

## 3. Roles and security (justification)

**Roles are rows, not code.** `public.profiles.role` (enum `student | admin`) is the single source of truth. A trigger creates the profile for every new auth user with the default `student`. There is no insert, update or delete privilege on `profiles` for app users, so nobody can promote themselves through the UI, the API, or the Supabase Data API. Admins are assigned only with SQL (or the seed).

**RLS is the primary authorization layer.** I chose RLS deliberately rather than relying on API checks alone: the Supabase URL and publishable key are shipped to the browser (the auth client needs them), so anyone signed in can call the Data API directly and skip our Next.js routes. Only the database can enforce rules for every path.

| Layer | What it enforces |
|---|---|
| **Privileges** (`grant`/`revoke`) | `anon` has no access. Users may insert only `first_name, last_name, reason, scheduled_at` (owner and status come from defaults) and update only `scheduled_at, status`. No deletes: cancelling is a status change. |
| **RLS policies** | Students read, insert and update only rows where `student_id = auth.uid()`. Admins read all rows (via `is_admin()`) and write nothing: the insert and update policies also require `not is_admin()`, so the admin view is read-only at the database level. |
| **Trigger** `enforce_consultation_rules` | Future-only bookings and reschedules, valid status transitions. Raises custom SQLSTATEs (`PT400`, `PT409`) that the API maps to 400/409; PostgREST uses the same codes as HTTP statuses for direct callers. |
| **Check constraints** | Non-blank names and reason, length limits. |
| **API routes** | Authentication (`getClaims()` verifies the JWT), zod validation with strict objects (unknown keys rejected), explicit admin check for a correct 403, 404 for rows the caller cannot see. |

`public.is_admin()` is a `security definer`, `stable` SQL function with an empty `search_path`. RLS policies and the API (`supabase.rpc("is_admin")`) both use it, so there is exactly one definition of "admin". Because it reads the table, demoting an admin takes effect on the next request, with no wait for a token refresh. Policies wrap helpers as `(select auth.uid())` / `(select is_admin())` so Postgres evaluates them once per statement rather than per row.

**Why not put the role in the JWT?** A Custom Access Token Hook would remove the per-request `is_admin()` lookup (one primary-key read). I kept the table lookup because revocation is immediate and setup has no extra moving parts. If role checks ever became hot, the hook can copy `profiles.role` into a claim without changing the data model.

All of the above is proven by `supabase/tests/database/security.test.sql` (26 pgTAP assertions), and was re-checked by calling the Supabase Data API directly with real student and admin tokens (reading others' rows, self-promotion, setting owner/status, deleting, editing as admin: all refused).

---

## 4. Assumptions

- **First and last name are stored on each consultation** as entered, because the brief says the form captures them and nothing more. They are not tied to a profile.
- **Consultations belong to the signed-in student.** There is no tutor/assignee, availability, duration, or double-booking check: none are in the brief.
- **Cancel is a soft cancel** (status `cancelled`), so history stays visible to students and admins. Cancelled is final.
- **A student can mark a consultation complete at any time** (self-tracking); the brief sets no rule.
- **Admins oversee; they don't book, edit or delete.** The brief asks for an admin list of all consultations and says read-only is fine, and never has admins booking. So admins land on `/admin`, `/dashboard` redirects them there, the booking API returns 403 for them, and RLS blocks admin writes. Nobody hard-deletes; cancelling is a status. Admin actions (e.g. cancel on a student's behalf) would be a small addition: an admin update policy plus a route.
- **Times** are stored as `timestamptz` (UTC) and displayed in the viewer's browser timezone. The booking form offers a calendar plus 30-minute time slots between 7am and 9pm (a UI convenience; the API accepts any future time).
- **Lists are sorted by scheduled time, soonest first**, 20 per page.
- Email confirmation is off locally (Supabase CLI default). In production it should be on, with the confirmation email template pointed at the template's `/auth/confirm` route (token hash flow). That route only redirects to same-origin paths (`lib/safe-next-path.ts`), so its `?next=` cannot be used as an open redirect.

---

## 5. Decisions and trade-offs

| Decision | Why |
|---|---|
| Status enum instead of `is_completed` / `is_cancelled` flags | One column cannot hold contradictory states, and adding a status later is a one-line migration. |
| Business rules in a DB trigger, mirrored in zod | Rules hold for every client; zod gives friendly field-level messages before a round trip. |
| `PATCH` takes exactly one change (`scheduledAt` or `status`) | Each action is atomic and maps to one clear error. |
| URL-driven filter and pagination | Shareable, back-button friendly, works without client state. |
| Offset pagination with an exact count | Simple and fine at this scale; indexes on `(student_id, scheduled_at)` and `(scheduled_at)` back every list query. Measured with 200k rows and RLS on: a page of the student or admin list takes under 1 ms (index scan); the admin's exact count is a ~20 ms sequential scan, the first thing to replace (estimated count or keyset pagination) as volume grows. |
| Generated DB types (`supabase gen types`) | End-to-end typing from the schema to the UI; the zod status enum is built from the generated constants. |
| Pinned versions (`next@16.4.6`, Supabase libs) | The template uses `latest`, which could silently move past the required Next.js version. |

### Conventions
- **Naming:** DB is `snake_case`; API and UI are `camelCase`, mapped in one place (`toConsultation` in the service).
- **One component per file.** Shared helpers that are not components (status labels, list URLs) live in `lib/consultations/`.
- **Types:** shared contract types live in `types` files: `lib/consultations/types.ts` (domain, derived from the DB and zod schemas) and `lib/api-types.ts` (the HTTP error contract used by server and client). Types private to one module (`Guard`, `Result`, `CurrentUser`) stay in that module. Component props are typed inline next to the component.
- **Error handling at boundaries, one pattern per layer:**
  - Service and browser client both return `{ data, error }` instead of throwing.
  - API routes map errors in `lib/api.ts` (`validationError`, `dbError`), and every handler is wrapped in `withErrorHandling`, so even an unexpected failure (Supabase down, a bug) is logged and answered as JSON in the shared shape, never as Next's HTML 500.
  - `getCurrentUser` tells "not signed in" (401) apart from "Auth unreachable" (500).
  - Pages handle a failed read where the data is loaded (`ConsultationList` shows an inline message); `error.tsx` only catches the truly unexpected.
- **Styling:** Tailwind with the shadcn theme tokens (`text-destructive`, `bg-secondary`, ...); no hardcoded colours; Tailwind's rem-based scale for sizes.
- Server-only modules import `server-only` so they cannot leak into client bundles.
- Status and role values come from the generated DB enums, never hand-written string lists.

### Engineering principles
How the usual principles show up here, and where I deliberately stopped.

| Principle | Where it shows |
|---|---|
| **Single responsibility / separation of concerns** | Route handlers only do HTTP (guard, parse, call, map). `service.ts` only does data access and DB-to-API mapping. Components render; `use-update-consultation` owns the PATCH + toast + refresh flow. The database owns authorization and integrity. |
| **Encapsulation** | `toConsultation` is private to the service, so `snake_case` never leaks past it. `readJson` is private to `lib/api.ts`. Each layer exposes a small surface: `listConsultations` / `createConsultation` / `updateConsultation`, `callApi`, `requireStudent` / `requireAdmin` / `requirePageRole`. |
| **Dependency injection** | Service functions take the Supabase client as a parameter instead of creating one, so the caller decides which identity runs the query (always the signed-in user) and tests pass a fake (`service.test.ts`, no database). |
| **Interfaces / contracts** | Typed contracts at every boundary: `Consultation`, `Paginated<T>`, inputs inferred from zod (`types.ts`); `ApiErrorBody`, `FieldErrors` (`api-types.ts`); `Result<T>` and `ApiResult<T>` for `{ data, error }`; DB types generated from the schema. |
| **DRY / reuse** | One zod schema per payload for form and API; `consultationLimits` for field and paging limits; status rules in `rules.ts` (UI) and the trigger (DB); `parse` / `parseBody` / `parseQuery` for every handler; `listHref`, `statusLabel`, date formatters and slot helpers in `lib/consultations/`; `ListLink`, `FormField`, `StatusBadge` reused across views. |
| **Fail fast, validate at the edge** | zod at the API boundary (strict objects reject unknown keys), constraints and a trigger in the database. |
| **Least privilege / defense in depth** | Column grants, RLS, no service role key, API role guards, UI only hides. Each layer would stop the attack on its own. |
| **Open for extension** | Statuses come from a DB enum feeding zod, types and labels; adding one is a migration plus a label. Roles live in a table and one function, so permissions can grow without touching callers. |
| **KISS / YAGNI (deliberate)** | No repository classes or interfaces with a single implementation: plain functions with an injected client are easier to test and read. No state library: the URL holds list state and the server renders it. |

---

## 6. Testing

| Suite | Command | Covers |
|---|---|---|
| Database (pgTAP) | `npm run test:db` | RLS enabled; anon has no access; students see only their own rows and profile; cannot change roles, set owner/status on insert, delete, or touch others' rows; future-only bookings; blank fields rejected; every status transition; admin reads all but cannot write |
| API integration (Vitest) | `npm run test:api` | 38 tests over real HTTP with real sessions: 401 on every route; booking (201, field errors, past/blank/long/non-ISO, client-set owner or status, bad JSON); own-rows-only listing, envelope, filters, page past the end, bad query params; complete/reopen/reschedule/cancel, every 409 transition, bad bodies, malformed id, 404 for other students and unknown ids; admin 403 on student routes and student 403 on the admin route; admin sees every student, filter + pagination |
| Unit (Vitest) | `npm test` | 42 tests: schemas (future dates, lengths, strict keys, one-change rule, page size cap, one message per bad date); status rules matrix (same as the DB); time slot helpers; service with a fake injected client (filters, paging, camelCase mapping, page-past-the-end fallback, only booking fields sent, owner-scoped update); API boundary (`withErrorHandling`, `dbError`, field errors); browser client (`callApi` success, API error, non-JSON reply including a 2xx, network failure); `?next=` redirect guard (same-origin paths kept; `https://`, `//`, `/\`, tab and `javascript:` tricks fall back to `/`) |
| Manual | browser | Signed-out redirects; wrong password; sign-up (mismatch, short password, success as Student); booking validation (blank, whitespace, no date); picker (past days and slots hidden, local time sent as UTC); complete/incomplete persists; reschedule pre-fills and re-sorts; cancel confirm and "Keep it"; status filters and bad query params; page past the end; stale row changed elsewhere (409 toast, list refreshes); empty states (no bookings, empty filter, page past the end); cancel button disabled while saving; student 404 on `/admin`; admin list, filter, read-only; logout clears client state; phone width |
| Security probes | curl + browser | Direct Data API calls with student/admin/no token; cross-site POST and PATCH from another origin (blocked: `SameSite=Lax` cookie, CORS preflight); HTML/script in names and reason renders as text; `/auth/confirm?next=https://evil.com` with a valid token lands on `/`, not off-site; no secret or service role key in the client bundle; `npm audit` clean |

---

## 7. With more time

- Browser end-to-end tests (e.g. Playwright) for the main flows.
- Keyset pagination and search for the admin view once volumes grow.
- Tutors and availability: assign consultations, prevent double bookings with an exclusion constraint on a time range.
- Audit log of status changes (who/when), useful for admins.
- Rate limiting on the API and turning on email confirmation, leaked-password protection and MFA for admins in the hosted project.
- `getClaims()` verifies the JWT locally (fast, no Auth round trip), so a deleted or banned user keeps a valid session until the token expires (1 hour by default). RLS still limits them to their own rows. For stricter revocation, call `getUser()` on mutations or shorten the JWT expiry.
- CI pipeline running lint, type check, unit, pgTAP and API tests (against a fresh `supabase start`) on every push.

---

## Project structure
```
app/
  (app)/layout.tsx              signed-in shell: nav, role badge, logout
  (app)/dashboard/page.tsx      student view
  (app)/admin/page.tsx          admin view (404 for non-admins)
  api/consultations/route.ts         GET, POST
  api/consultations/[id]/route.ts    PATCH
  api/admin/consultations/route.ts   GET (admin)
  auth/*                        template auth pages
components/
  consultations/                one component per file: list, table, status badge/filter,
                                pagination, booking/reschedule/cancel dialogs, complete toggle,
                                date-time picker, form field, skeleton
  user-nav.tsx, role-redirect.tsx, logout-button.tsx, auth forms (template)
lib/
  api.ts                        API boundary: guards, withErrorHandling, error mapping
  api-types.ts                  HTTP error contract shared by server and client
  auth.ts                       getCurrentUser (claims + is_admin), requirePageRole
  consultations/schema.ts       zod request schemas
  consultations/types.ts        shared domain types
  consultations/service.ts      all consultation queries (server)
  consultations/api-client.ts   browser boundary for /api calls
  consultations/rules.ts        UI mirror of the DB status rules
  consultations/datetime.ts, status.ts, list-url.ts   small shared helpers (slots, formatting, labels, URLs)
  supabase/                     clients, proxy session refresh, generated types
supabase/
  migrations/                   schema, RLS, privileges, trigger
  seed.sql                      demo users and data
  tests/database/               pgTAP security tests
tests/api/                      API integration tests (Vitest, real HTTP)
proxy.ts                        refreshes the session, redirects signed-out page requests
```
