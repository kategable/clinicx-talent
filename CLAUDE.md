# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Dev server at http://localhost:4200
npm run build          # Production build
docker compose up               # Full stack: PostgreSQL + API + Angular
docker compose up postgres api  # Backend only: DB + API
npm test               # Run all Vitest unit tests (30 tests)
npm run test:coverage  # Run tests with coverage (vitest/coverage-v8)
npm run audit:lighthouse  # Lighthouse audit (requires dev server on :4200)
npm run lint            # ESLint for TS + HTML templates (zero-error policy)
npm run lint:fix        # ESLint with auto-fix
npm run format          # Prettier on all files
npm run format:check    # Prettier dry-run check
npm run test:e2e        # Playwright E2E tests (46 tests, requires dev server on :4200)
npm run test:e2e:ui     # Playwright E2E tests with interactive UI
npm run watch          # Dev build with watch mode
```

Node 24.15.0 is pinned in `.nvmrc`. Angular 22 requires Node ^22.22.3, ^24.15.0, or >=26.0.0.

ESLint 10 with typescript-eslint + angular-eslint-template. Prettier for formatting. Husky enforces lint-staged on commit (ESLint + Prettier auto-fix) and `ng lint` + `npm test` + `npm run build` on push. Claude Code hooks auto-format and lint-check TS/HTML/SCSS files on every Edit/Write.

## Architecture

**Angular 22 standalone application** — no NgModules. Standalone components loaded via `provideRouter` with lazy-loaded feature routes. **ASP.NET Core 9 backend** in `backend/` with PostgreSQL, Docker Compose dev setup.

### State management (NgRx)

A single `app` feature store manages all global state:

- `app.state.ts` — `AppState` with `accounts`, `auth`, `hiring`, `verificationSecurity` slices
- `app.actions.ts` — `createActionGroup` with all actions (auth, hiring, soft delete, admin)
- `app.reducer.ts` — Pure state transitions; MVP backend for credential matching, account creation
- `app.effects.ts` — Auth flow orchestration (Google, SMS, admin), hiring data loading, localStorage persistence, navigation after auth
- `app.selectors.ts` — Feature + derived selectors including auth status, active accounts, hiring pipelines
- `storage.ts` — `hydrationMetaReducer` restoring state from `localStorage` on `INIT`/`UPDATE`

**Auth slice** (`state.auth`): `token`, `refreshToken`, `status` (idle|loading|authenticated|error), `error`, `isNewAccount`, `phoneRequired`. Auth flow goes through NgRx effects → AuthProvider → store actions → selectors → components.

### Auth system

**Provider pattern:** `AuthProvider` (abstract) → `MockAuthProvider` (dev/E2E) / `HttpAuthProvider` (backend). Swapped via DI in `app.config.ts`. Environment flags `useMockAuth`/`useBackend` in `environment.ts` control which implementation is active.

**Flow:** Component dispatches action → Effect calls `AuthProvider` method → Updates store with result → `navigateAfterAuth$` effect navigates to dashboard/onboarding.

**Provider methods:** `exchangeGoogleToken()`, `sendSmsCode()`, `verifySmsCode()`, `createAccount()`, `adminLogin()`. Mock provider accepts any phone with code `123456` and logs it to sessionStorage for E2E tests.

**Components:** `Signin` (/signin) and `Registration` (/register, /register/clinic, /register/talent). Both dispatch store actions, read auth state from selectors. Registration split into 4 step sub-components: `RegTypeStep`, `RegAuthStep`, `RegPhoneStep`, `RegCodeStep`.

**HTTP interceptors:** `jwt-interceptor.ts` (attaches Bearer token), `error-interceptor.ts` (handles 401/403/429).

### Routing (lazy-loaded feature modules)

- `src/app/features/clinic.routes.ts` — `/clinic/home`, `/clinic/talents` (approvedClinicGuard)
- `src/app/features/talent.routes.ts` — `/talent/home`, `/talent/passport`, `/talent/invitations`
- `src/app/features/admin.routes.ts` — `/admin/login`, `/admin/accounts` (adminGuard)
- `/register/:type` — type bound to component via `input()` + `withComponentInputBinding()`
- `/signin` — Google-first sign-in with phone fallback

Guards are functional — no class-based guards.

### Core domain (`src/app/core/`)

- `account.ts` — `AccountRecord`, `ClinicDetails`, `TalentDetails`, seeded demo accounts, phone helpers
- `hiring.ts` — `HiringOpportunity`, `HiringInvite`, `TalentPassportShare`, `TalentApplication`, business logic
- `founder.ts` — Founder 1000 Club logic
- `auth-provider.ts` — Abstract `AuthProvider` interface
- `auth.service.ts` — `@Service()` orchestrating all auth flows (deprecated, moved to NgRx effects)
- `mock-auth.provider.ts` / `http-auth.provider.ts` — Provider implementations
- `account-data.source.ts` / `hiring-data.source.ts` — Abstract + local implementations
- `http-account.data-source.ts` / `http-hiring.data-source.ts` — HTTP implementations (ready, not active)
- `theme-manager.ts` — `ThemeManager` service for light/dark/auto theme

### Backend (`backend/`)

ASP.NET Core 9 Clean Architecture solution:

- `ClinicX.Domain` — Entities (Account, HiringOpportunity, etc.), Enums
- `ClinicX.Application` — Use cases, interfaces
- `ClinicX.Infrastructure` — EF Core DbContext, PostgreSQL, SeedData
- `ClinicX.Api` — Controllers: Auth, Accounts, Hiring

Docker Compose starts PostgreSQL 16 + API on `:5001` + Angular on `:4200`. API auto-creates schema (`EnsureCreated`) and seeds demo accounts. Dev SMS code is always `123456`.

### Component conventions

- `standalone: true` omitted (default in v20+); `OnPush` omitted (default in v22+)
- `inject()` instead of constructor injection; `input()`/`output()` instead of decorators
- Signal Forms (`@angular/forms/signals`) for all forms — no ReactiveForms or Template-driven
- Native template control flow: `@if`, `@for`, `@switch`
- `@Service()` decorator for singleton services (Angular v22+)
- Host bindings in `host` object, never `@HostBinding`/`@HostListener`
- External templates/styles relative to component TS file

### Styling

Material 3 theming. CSS custom properties: `--cx-text`, `--cx-muted`, `--cx-surface`, `--cx-border`, `--cx-accent`, `--cx-background`, `--cx-success`. Dark mode via `body.theme-dark` class toggle. `ThemePicker` shared component.

### Soft delete

`AccountRecord`, `HiringOpportunity`, `HiringInvite`, `TalentPassportShare` all have optional `deletedAt?: string`. NgRx actions: `softDeleteAccount`/`restoreAccount`, `softDeleteOpportunity`/`restoreOpportunity`, `softDeletePassport`/`restorePassport`, `softDeleteInvite`/`restoreInvite`. Selectors filter deleted by default. Admin shows deleted accounts toggle. Clinic/talent can manage their own resources.

### Testing

**Unit:** Vitest with `vitest/globals`. 30 tests across 3 files. Reducer tests call reducer directly; component tests use `TestBed.configureTestingModule`.

**E2E:** Playwright (46 tests). `e2e/auth/` covers Google, phone sign-in, registration, admin, sign-out. `e2e/specs/` covers dashboards, hiring, public pages. `e2e/seed.ts` has `signInViaUI()` helper. Mock code `123456` stored in sessionStorage. Run without Docker — `useMockAuth: true` by default.

### NgRx version note

NgRx 21.1.1 with peer-dependency override. Upgrade to NgRx 22 when available.
