---
name: e2e-testing-plan
description: Playwright E2E testing setup plan — deferred for later implementation
metadata: 
  node_type: memory
  type: project
  originSessionId: e5940a67-42da-4467-b179-bbd67d2d7374
  modified: 2026-07-23T23:16:01.158Z
---

# E2E Testing with Playwright

The app has 13 Vitest unit tests (reducer + component) but zero E2E coverage. Every flow — registration, sign-in, dashboard navigation, hiring links, passport sharing, admin review — is tested manually. We need automated browser tests that exercise the full app as a user would.

## Verdict: Playwright (not Vitest browser mode, not Cypress)

- **Playwright** runs as a separate layer with its own runner (`@playwright/test`) — keeps clean separation from Vitest unit tests
- Angular 22 has no built-in E2E tooling; Playwright needs no Angular adapter — it drives the compiled app in a real browser
- All-browser coverage (Chromium, Firefox, WebKit) — important for a marketplace
- TypeScript-native, parallel by default, active Microsoft-backed community

## Setup

```bash
npm install -D @playwright/test
npx playwright install chromium  # just Chromium for MVP; add firefox/webkit later
```

### Directory structure

```
e2e/
  playwright.config.ts   # Playwright config (webServer, baseURL, projects)
  tsconfig.json          # Separate tsconfig (no vitest/globals types)
  seed.ts                # localStorage seeding helper
  specs/
    sign-in.spec.ts
    registration.spec.ts
    clinic-dashboard.spec.ts
    hiring-links.spec.ts
    talent-passport.spec.ts
    admin-review.spec.ts
    public-pages.spec.ts
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  retries: 1,
  webServer: {
    command: 'npm start',
    port: 4200,
    reuseExistingServer: true,
  },
  use: { baseURL: 'http://localhost:4200' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

### npm scripts

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

## State Seeding

The app has no backend — all state is in localStorage (`clinicx.state.v1`). E2E tests need known starting state. Use `page.evaluate()` to set localStorage with known seed data before each test. Hybrid approach: seed for setup-heavy tests (sign-in with existing account), use UI for the flow being tested.

## Test Specs (in priority order)

1. **sign-in.spec.ts** — Foundation: seed state, sign in with test credentials, verify redirect, test error states, sign-out
2. **registration.spec.ts** — New user: select type, enter phone, verify code, account creation, onboarding redirect
3. **clinic-dashboard.spec.ts** — Sidenav: tabs navigation, active states, mobile hamburger toggle, desktop persistent drawer
4. **hiring-links.spec.ts** — Create opportunity form, submit, verify success page with share link, open link in new page
5. **talent-passport.spec.ts** — Generate passport link, open as clinic, click add, verify talent appears in list
6. **admin-review.spec.ts** — Login, verify pending accounts, approve/reject, verification reset
7. **public-pages.spec.ts** — Smoke tests: home, founders, talent passport, clinic profile, hiring page

**Why:** E2E coverage for all critical user flows — currently everything is tested manually.
**How to apply:** Install Playwright, create config, write specs in priority order. Each spec seeds localStorage before running. See [[angular-v22-conventions]] for coding standards.
