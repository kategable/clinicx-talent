# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Dev server at http://localhost:4200
npm run build          # Production build
npm test               # Run all Vitest unit tests
npm run test:coverage  # Run tests with coverage (vitest/coverage-v8)
npm run audit:lighthouse  # Lighthouse audit (requires dev server on :4200)
npm run watch          # Dev build with watch mode
```

Node 24.15.0 is pinned in `.nvmrc`. Angular 22 requires Node ^22.22.3, ^24.15.0, or >=26.0.0.

No linter is configured — formatting uses Prettier (`npx prettier --check .`).

## Architecture

**Angular 22 standalone application** — no NgModules anywhere. Standalone components load via `provideRouter` with lazy-loaded feature routes.

### State management (NgRx)

A single `app` feature store manages all global state:
- `src/app/core/store/app.state.ts` — `AppState` interface and `initialAppState`
- `src/app/core/store/app.actions.ts` — `createActionGroup` with all actions under source `'ClinicX App'`
- `src/app/core/store/app.reducer.ts` — `createReducer` with pure state transitions; the reducer IS the backend for MVP (credential matching, account creation, review-status updates, verification-abuse limits)
- `src/app/core/store/app.effects.ts` — side effects: localStorage persistence, sessionStorage (review reminders, guest theme), post-registration/sign-in routing, admin-login redirects, blocked-verification redirect
- `src/app/core/store/app.selectors.ts` — feature selector + derived selectors
- `src/app/core/store/storage.ts` — `hydrationMetaReducer` that restores state from `localStorage` key `clinicx.state.v1` on `INIT`/`UPDATE`, with legacy `candidate`→`talent` migration
- `src/app/core/store/app.navigation.ts` — `existingAccountDestination()` routes signed-in accounts based on review status and account type

No API calls exist yet — all data is client-side. State persists to browser storage so it survives refreshes during MVP testing. Production must move credential verification, admin auth, and account persistence to ASP.NET Core.

### Routing (lazy-loaded feature modules)

Top-level routes in `src/app/app.routes.ts` use `loadComponent` for single-component routes (`home`, `register`, `signin`, `onboarding`, `account/status`, `contact`) and `loadChildren` for feature sub-trees:

- `src/app/features/clinic.routes.ts` — `/clinic/home` (clinicAccountGuard), `/clinic/talents` (approvedClinicGuard)
- `src/app/features/talent.routes.ts` — `/talent/home` (talentAccountGuard)
- `src/app/features/admin.routes.ts` — `/admin/login`, `/admin/accounts` (adminGuard)

Guards are functional (`clinicAccountGuard`, `approvedClinicGuard`, `talentAccountGuard`, `adminGuard`) — no class-based guards.

### Core domain (`src/app/core/`)

- `account.ts` — `AccountType`, `ReviewStatus`, `ThemePreference`, `AccountRecord`, `ClinicDetails`, `TalentDetails`, test credentials, seeded demo accounts, phone helpers
- `theme-manager.ts` — `ThemeManager` service that toggles `theme-dark`/`theme-light` CSS classes on `<body>` and sets `color-scheme`. Resolves auto (light 7AM–7PM local), light, dark, or `?theme=` query-param override. Polls clock every 60s.

### Component conventions

- All components omit `standalone: true` (default in v20+) and `changeDetection: ChangeDetectionStrategy.OnPush` (default in v22+)
- `inject()` instead of constructor injection
- Signal Forms (`@angular/forms/signals`) — `form()`, `FormField`, `required()`, `pattern()` — for all forms. No ReactiveForms or Template-driven forms.
- Host bindings go in the `host` object of `@Component`/`@Directive`, never `@HostBinding`/`@HostListener`
- `input()` and `output()` functions, not decorators
- Native template control flow: `@if`, `@for`, `@switch` — no `*ngIf`, `*ngFor`, `*ngSwitch`
- `@Service` decorator for singleton services (Angular v22+), `@Injectable()` for others that need DI config
- External templates/styles use paths relative to the component TS file

### Styling

Material 3 theming with light and dark themes via SCSS in `src/styles.scss`. Theme-adaptive colors use CSS class toggles on `<body>` (`theme-dark`, `theme-light`). The `ThemePicker` shared component lets users select light/dark/auto.

### Testing

Vitest with `vitest/globals` (describe/it/expect available globally). Tests import the reducer directly and call it sequentially to simulate action flows — no TestBed or component fixtures for state tests. Component tests use `TestBed.configureTestingModule` with `provideRouter([])` and `provideStore({ app: appReducer })`.

### NgRx version note

NgRx 21.1.1 is used with a peer-dependency override because NgRx 22 wasn't published when this project started. Upgrade to NgRx 22 when available.
