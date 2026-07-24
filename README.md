# ClinicX Talent

ClinicX Talent is a curated hiring marketplace for clinics. The MVP is designed to validate one business question: can ClinicX consistently introduce clinics to qualified, pre-vetted talent and get paid for successful matches?

## MVP today

The current Angular application is a full hiring marketplace prototype:

- Premium, responsive landing page with talent showcase
- Phone-only registration and sign-in with local SMS-code verification (no real SMS)
- **Growth loop**: Clinic Hiring Links and Talent Passport — two shareable products that bring both sides into the platform
- **Founder 1000 Club** — early members get a founder badge, voice in features, and life-long free accounts
- **Clinic dashboard** with Material sidenav: Home (profile), Talent search, Create hiring link, Appearance, Account status
- **Talent dashboard** with Material sidenav: Home (profile), Talent Passport, My invitations, Appearance, Account status
- **Hiring links**: approved clinics create public job postings at `/join/:clinicSlug/:positionSlug` with invite tokens
- **Talent Passport**: talent shares a public profile at `/talent/:talentSlug`; clinics can add them directly
- **Public clinic profiles** at `/c/:clinicSlug`
- **Invitation flow**: tokens survive registration → sign-in → application created → clinic sees “Invited by you” badge
- **Talent invitations page**: see connected clinics, respond “I’m interested”, view contact info when shared
- **Email and contact phone** fields on both account types, with per-field share toggles (default off)
- **Per-phone verification security**: 3 attempts per phone before lockout; >5 distinct phones flags the system for admin review
- **Admin dashboard** with working sidebar tabs: Account review, Talent, Clinics, Jobs, Placements
- **Admin Jobs tab**: view all hiring opportunities, link status (active/expired), applicants with source attribution
- **Sortable admin tables**: account review sortable by status, type
- **Data source abstraction**: `AccountDataSource` / `HiringDataSource` are abstract classes; MVP uses localStorage-backed implementations, ready to swap for HTTP when the backend arrives
- NgRx application state with browser-session restoration (accounts indexed by ID for O(1) lookup)
- Account records, hiring data, and review status persisted in `localStorage` (MVP database)
- Per-account light, dark, or automatic appearance preferences
- Angular Material form controls, Signal Forms, and native control flow throughout
- Responsive — mobile hamburger menus on all dashboards
- 13 Vitest unit tests (Angular and reducer specs)
- Playwright E2E test plan documented (deferred)

All data is client-side for MVP testing. No real backend yet.

## MVP account access

Registration is available at `/register`. No SMS is sent. Use one of these test phone numbers and verification codes:

| Phone            | Code     | Account |
| ---------------- | -------- | ------- |
| `(312) 555-0101` | `246810` | Radiance Med Clinic (approved clinic) |
| `(312) 555-0102` | `135790` | Sophia Chen, RN (approved talent) |
| `(312) 555-0199` | `112233` | No seed — creates new account on registration |
| `(773) 555-0142` | `445566` | Lumen Aesthetics (under-review clinic) |
| `(847) 555-0168` | `778899` | Alex Morgan, RN (on-hold talent) |
| `(312) 555-0200` | `998877` | Lux Aesthetics Lounge (approved clinic) |

New accounts default to **under review**. Sign-in routes to the appropriate dashboard: approved clinics → `/clinic/talents`, approved talent → `/talent/home`, under-review/on-hold accounts → `/clinic/status` or `/talent/status`.

The temporary admin login is at `/admin/login`:

| Username | Password |
| -------- | -------- |
| `admin`  | `admin`  |

Admin unlocks the full admin dashboard with tabbed navigation at `/admin/accounts`.

All credentials, sessions, and admin controls are client-side for MVP testing.

## Architecture

### Data layer
- **Abstract data sources**: `AccountDataSource` and `HiringDataSource` are abstract classes. `LocalAccountDataSource` and `LocalHiringDataSource` implement them using seeds + localStorage. Swap to HTTP implementations when the backend arrives — no component code changes.
- **NgRx effects** are the sole integration point between the store and data sources. Components dispatch actions; effects call services; reducers update state.
- **Accounts indexed by ID** (`Record<string, AccountRecord>`) for O(1) lookup.
- **Per-phone verification**: each phone gets 3 code attempts before lockout; >5 distinct phones flags for admin review without blocking the system.

### Key routes
| Route | Access |
|-------|--------|
| `/` | Public landing page |
| `/register`, `/signin` | Registration and sign-in |
| `/clinic/**` | Clinic dashboard shell (sidenav + tabs) |
| `/talent/**` | Talent dashboard shell (sidenav + tabs) |
| `/admin/**` | Admin dashboard shell (guarded, tabbed) |
| `/join/:clinicSlug/:positionSlug` | Public hiring page |
| `/talent/:talentSlug` | Public talent passport |
| `/c/:clinicSlug` | Public clinic profile |
| `/founders` | Founder 1000 Club page |

### State management
- Single `app` NgRx feature store with `createActionGroup`, `createReducer`, `createEffect`, `createFeatureSelector`/`createSelector`
- All mutations through dispatched actions; all reads through selectors
- localStorage persists accounts + hiring data; sessionStorage handles ephemeral state (review reminders, guest theme)
- Only seed accounts (5) and the signed-in account are loaded into the store at init — admin page loads the full dataset via effects

## Technology

- Angular 22.0.6
- Angular Material and CDK 22.0.4 with Material 3 light and dark themes
- TypeScript 6.0
- Standalone components (default, no `standalone: true` needed)
- `OnPush` change detection (default in v22, no explicit annotation needed)
- NgRx Store, Effects, selectors, and Store DevTools for application state
- Angular Signal Forms for all forms
- Native Angular template control flow (`@if`, `@for`, `@switch`)
- `inject()` instead of constructor injection
- SCSS component styling
- Vitest testing (13 tests)
- Playwright E2E test plan (deferred)

The intended backend is ASP.NET Core with PostgreSQL. Resume and video assets will eventually use object storage such as Amazon S3.

## Local setup

Node 24.15.0 is pinned in `.nvmrc`. With `nvm` installed:

```bash
nvm install
nvm use
npm install
npm start
```

Open [http://localhost:4200](http://localhost:4200).

## Verification

```bash
npm run build
npm test
npm run test:coverage
npm run audit:lighthouse   # requires dev server on :4200
```

NgRx 21.1.1 is installed with a peer override pending the NgRx 22 release.
