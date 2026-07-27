# ClinicX Talent -- Backend Implementation Plan

## 1. Overview and Execution Order

### The Big Picture

The current application is entirely client-side: domain logic lives in NgRx reducers, data persists in localStorage, authentication is simulated via hardcoded test credentials, and SMS verification is a no-op that accepts a fixed set of phone/code pairs. The data source abstractions (`AccountDataSource`, `HiringDataSource`) already exist and are injected via Angular DI -- the frontend migration path is clean: swap local implementations for HTTP implementations that call the new ASP.NET Core API.

### Execution Order

**Phase 0 (NOW): Frontend login UI + auth services + tests -- no backend required**
Build the Google OAuth and phone login UI in the Angular app. All API interactions are mocked. Unit tests and Playwright E2E tests validate every flow. The CI/CD pipeline enforces these tests on every PR and before production deployment.

**Phase 1+: Backend implementation (later)**
Build the ASP.NET Core API, PostgreSQL database, Azure services, and connect the frontend to the real backend.

This plan documents Phase 0 in detail. The backend architecture (Phases 1+) remains from earlier versions as reference.

---

## 2. Phase 0: Frontend Login UI -- What We Are Building

### 2.1 Goal

Replace the current hardcoded test credential login with a real two-path authentication UI:

1. **Google OAuth** (primary) -- "Sign in with Google" button using Google Identity Services
2. **Phone SMS** (secondary) -- phone number input + 6-digit code verification
3. All interactions go through abstract services that are **mocked** during development until the backend is ready

### 2.2 Current Auth Flow (to be replaced)

The existing login lives in `src/app/features/registration/registration.ts` and is driven by NgRx actions in the reducer:

- `AppActions.selectAccountType` -- picks clinic or talent
- `AppActions.requestSMSCode` -- enters phone, matched against `TEST_CREDENTIALS`
- `AppActions.verifyRegistrationCode` -- enters code, matched against `TEST_CREDENTIALS`
- `AppActions.verifySignInCode` -- same for sign-in
- `AppActions.adminLogin` -- hardcoded `admin`/`admin` check

These all use hardcoded test data (`TEST_CREDENTIALS`, `SEEDED_ACCOUNTS`). We replace them with Google OAuth + real phone input backed by mock services.

### 2.3 New Auth Service Architecture

```
[Registration Component]
    |
    +--- [AuthService] ---------> [IAuthProvider] ---------> [MockAuthProvider]  (dev)
    |       (orchestrator)        (abstract)                  [HttpAuthProvider]  (future)
    |
    +--- Google Identity Services (GIS) library (window.google.accounts.id)
    |
    +--- NgRx Store (for state)
```

The `AuthService` replaces the direct NgRx action dispatches for auth. It:

- Orchestrates the Google sign-in flow
- Manages phone SMS entry and code verification
- Stores/retrieves JWT tokens in memory (or sessionStorage for MVP)
- Provides `isAuthenticated()` and `currentAccount` observables

### 2.4 New Files to Create

```
src/app/core/
  auth.service.ts                  # Orchestrates all auth flows
  auth.service.spec.ts             # Unit tests for AuthService
  auth-provider.ts                 # Abstract IAuthProvider interface
  mock-auth.provider.ts            # Mock implementation for development
  jwt-interceptor.ts               # Attaches JWT to HTTP requests
  jwt-interceptor.spec.ts          # Unit tests for interceptor
  error-interceptor.ts             # Handles 401/403/429 globally

src/app/core/auth/
  models.ts                        # AuthResult, TokenPair, AuthState interfaces
  constants.ts                     # Token storage keys

src/app/shared/
  google-signin-button/
    google-signin-button.ts        # Reusable Google sign-in button component
    google-signin-button.html
    google-signin-button.scss
    google-signin-button.spec.ts   # Unit tests
  phone-input/
    phone-input.ts                 # Phone number input with country code
    phone-input.html
    phone-input.scss
    phone-input.spec.ts
  verification-code-input/
    verification-code-input.ts     # 6-digit code input
    verification-code-input.html
    verification-code-input.scss
    verification-code-input.spec.ts

src/app/features/
  signin/
    signin.ts                      # New sign-in page component (replaces registration)
    signin.html
    signin.scss
    signin.spec.ts                 # Unit tests
  register/
    register-phone.ts              # Phone registration step
    register-phone.html
    register-phone.scss
    register-phone.spec.ts

src/environments/
  environment.ts                   # googleClientId, useMockAuth, apiUrl

e2e/
  auth/
    google-signin.spec.ts          # Playwright: Google sign-in flow
    phone-signin.spec.ts           # Playwright: phone SMS sign-in flow
    registration.spec.ts           # Playwright: new account registration
    admin-login.spec.ts            # Playwright: admin login
```

### 2.5 AuthService Design

```typescript
// src/app/core/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly store = inject(Store);
  private readonly provider = inject(AuthProvider);  // Mock or real
  private readonly router = inject(Router);

  // State
  readonly authState = signal<AuthState>({
    status: 'idle',           // idle | loading | authenticated | error
    account: null,
    error: null,
    phoneRequired: false,
  });

  constructor() {
    // Hydrate from sessionStorage on init
    const saved = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as TokenPair;
      this.authState.set({ ...this.authState(), status: 'authenticated' });
    }
  }

  // --- Google OAuth ---
  async signInWithGoogle(): Promise<void> { ... }
  async handleGoogleCallback(idToken: string): Promise<void> { ... }

  // --- Phone SMS ---
  async sendSmsCode(phone: string): Promise<void> { ... }
  async verifySmsCode(phone: string, code: string): Promise<void> { ... }

  // --- Registration (new account) ---
  async createAccount(type: AccountType, phone: string): Promise<void> { ... }

  // --- Admin ---
  async adminLogin(username: string, password: string): Promise<void> { ... }
  adminLogout(): void { ... }

  // --- Token management ---
  getToken(): string | null { ... }
  clearSession(): void { ... }
  isAuthenticated(): boolean { ... }
}
```

### 2.6 MockAuthProvider Design

```typescript
// src/app/core/mock-auth.provider.ts
@Injectable()
export class MockAuthProvider implements AuthProvider {
  async exchangeGoogleToken(idToken: string): Promise<AuthResult> {
    // Simulate network delay
    await delay(800);

    // Mock response -- returns a simulated account
    return {
      token: 'mock-jwt-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      account: {
        id: 'mock-account-1',
        type: 'talent',
        phone: '3125550199',
        status: 'approved',
        displayName: 'Demo User',
        email: 'demo@gmail.com',
        founder: false,
        profileComplete: true,
      },
      isNewAccount: false,
      phoneRequired: false,
    };
  }

  async sendSmsCode(phone: string): Promise<void> {
    await delay(500);
    // In dev mode: log the code to console so the tester can read it
    const mockCode = '123456';
    console.log(`[MOCK SMS] Code for ${phone}: ${mockCode}`);
    sessionStorage.setItem('clinicx.mock.code', mockCode);
  }

  async verifySmsCode(phone: string, code: string): Promise<AuthResult> {
    await delay(500);
    const expectedCode = sessionStorage.getItem('clinicx.mock.code') ?? '123456';
    if (code !== expectedCode) {
      throw new AuthError('INVALID_CODE', 'The code does not match.');
    }
    return { token: '...', account: { ... }, isNewAccount: true };
  }

  async adminLogin(username: string, password: string): Promise<AuthResult> {
    await delay(500);
    if (username === 'admin' && password === 'admin') {
      return { token: 'mock-admin-token', account: { ... } };
    }
    throw new AuthError('INVALID_CREDENTIALS', 'Incorrect admin credentials.');
  }
}
```

### 2.7 Registration Page Redesign

The current `src/app/features/registration/registration.ts` has a multi-step flow (type -> phone -> code). It is replaced with a cleaner two-path design:

```
New user arrives at /register
   |
   +--> [Sign in with Google button]  --> Google consent screen
   |       |
   |       +--> Existing account? --> Dashboard (JWT in memory)
   |       +--> New account? --> Choose type (clinic/talent) --> Phone verification step --> Dashboard
   |
   +--> [Sign in with phone]  --> Enter phone number
           |
           +--> Enter 6-digit code
           +--> Existing account? --> Dashboard
           +--> New account? --> Choose type --> Dashboard
```

The Google button is prominent and primary. The phone option is below as a text link ("Sign in with phone instead").

### 2.8 NgRx Changes (minimal -- all auth logic moves to AuthService)

The reducer loses these handlers:

- `selectAccountType` -- replaced by AuthService + Google flow
- `requestSMSCode` -- replaced by AuthService mock/real
- `verifyRegistrationCode` -- replaced by AuthService
- `verifySignInCode` -- replaced by AuthService
- `adminLogin` -- replaced by AuthService
- `adminLogout` -- replaced by AuthService clearSession

What remains:

- `saveClinicDetails` -- profile editing (not auth)
- `saveTalentDetails` -- profile editing (not auth)
- `setThemePreference` -- UI preference
- `signOut` -- can delegate to AuthService.clearSession()
- All hiring actions -- unchanged
- `setReviewStatus` -- unchanged

The store keeps `activeAccountId` but it is set by the AuthService after successful authentication, not by the reducer matching test credentials.

### 2.9 DI Registration

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    // Auth -- mock until backend is ready
    {
      provide: AuthProvider,
      useClass: environment.useBackend ? HttpAuthProvider : MockAuthProvider,
    },
    AuthService,

    // Existing data sources (still local until backend)
    { provide: AccountDataSource, useClass: LocalAccountDataSource },
    { provide: HiringDataSource, useClass: LocalHiringDataSource },

    // Interceptors (for future HTTP auth)
    provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),

    // Routing + store
    provideRouter(routes),
    provideStore({ app: appReducer }),
    provideEffects(AppEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: false }),
  ],
};
```

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api/v1',
  googleClientId: '1234567890-xxxxx.apps.googleusercontent.com',
  useBackend: false,
  useMockAuth: true,
};
```

---

## 3. Unit Tests

### 3.1 Test Plan

All new and modified files must have corresponding unit tests. The existing reducer tests in `src/app/core/store/app.reducer.spec.ts` should be updated to reflect the removal of auth logic.

| File                         | Test File                         | What to Test                                                                                                     |
| ---------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `auth.service.ts`            | `auth.service.spec.ts`            | Google sign-in flow; phone send + verify; token persistence; error states; session clear                         |
| `auth-provider.ts`           | — (interface, no tests needed)    | —                                                                                                                |
| `mock-auth.provider.ts`      | Included in auth.service.spec.ts  | Mock returns correct shapes; mock delay simulates network                                                        |
| `jwt-interceptor.ts`         | `jwt-interceptor.spec.ts`         | Token attached to outgoing requests; no token skips header; 401 triggers redirect                                |
| `error-interceptor.ts`       | `error-interceptor.spec.ts`       | 401 -> redirect to sign-in; 403 -> forbidden toast; 429 -> rate limit message                                    |
| `signin.ts`                  | `signin.spec.ts`                  | Google button renders; phone input renders; form validation; loading state; error display; navigation on success |
| `register-phone.ts`          | `register-phone.spec.ts`          | Phone input validation; code input; retry sends new code; error handling                                         |
| `google-signin-button.ts`    | `google-signin-button.spec.ts`    | Button renders; click triggers Google flow; loading state; disabled when authenticating                          |
| `phone-input.ts`             | `phone-input.spec.ts`             | Input formatting ( (312) 555-0101 ); validation (10 digits); disabled state                                      |
| `verification-code-input.ts` | `verification-code-input.spec.ts` | 6-digit input; auto-submit on full code; paste support; error display; resend timer                              |

### 3.2 AuthService Unit Tests (Detailed)

```typescript
// src/app/core/auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let mockProvider: MockAuthProvider;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthProvider, useClass: MockAuthProvider },
        provideMockStore({ initialState }),
      ],
    });
    service = TestBed.inject(AuthService);
    mockProvider = TestBed.inject(AuthProvider) as MockAuthProvider;
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('signInWithGoogle', () => {
    it('should set auth state to loading when Google sign-in starts', () => { ... });
    it('should set auth state to authenticated on successful Google callback', () => { ... });
    it('should set auth state to error on Google token validation failure', () => { ... });
    it('should store JWT in sessionStorage on success', () => { ... });
    it('should set phoneRequired flag when account needs phone verification', () => { ... });
  });

  describe('sendSmsCode', () => {
    it('should call provider.sendSmsCode with normalized phone', () => { ... });
    it('should set state to loading during send', () => { ... });
    it('should handle rate limit errors (429)', () => { ... });
    it('should handle phone already locked errors', () => { ... });
  });

  describe('verifySmsCode', () => {
    it('should call provider.verifySmsCode with phone and code', () => { ... });
    it('should set auth state to authenticated on valid code', () => { ... });
    it('should set auth state to error on invalid code', () => { ... });
    it('should handle account creation for new phone numbers', () => { ... });
    it('should handle max attempts exceeded', () => { ... });
  });

  describe('token management', () => {
    it('should persist token across page reloads via sessionStorage', () => { ... });
    it('should clear token on logout', () => { ... });
    it('should return null for token when not authenticated', () => { ... });
  });

  describe('adminLogin', () => {
    it('should succeed with valid admin credentials', () => { ... });
    it('should fail with invalid admin credentials', () => { ... });
  });
});
```

### 3.3 Running Tests

```bash
# Unit tests (Vitest)
npm test                              # All unit tests
npm run test:coverage                 # With coverage report
npm test -- --include src/app/core/auth.service.spec.ts  # Single file

# Expected coverage targets:
#   Branches:   80%+
#   Functions:  90%+
#   Lines:      90%+
```

---

## 4. Playwright E2E Tests

### 4.1 Test Plan

| Test File                                  | Scenario                                    | Steps                                                                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/auth/google-signin.spec.ts`           | Google sign-in button visible and clickable | 1. Navigate to /register 2. Assert Google button renders 3. Click button 4. Assert loading state 5. Assert Google popup opens (or mock intercepts)                                                                         |
| `e2e/auth/phone-signin.spec.ts`            | Sign in with phone SMS                      | 1. Navigate to /signin 2. Click "Sign in with phone" 3. Enter phone number 4. Click "Send Code" 5. Enter mock code from sessionStorage 6. Assert redirected to dashboard                                                   |
| `e2e/auth/phone-signin-wrong-code.spec.ts` | Wrong code shows error                      | 1. Same as above through step 5 2. Enter wrong code 3. Assert error message displayed 4. Assert able to retry                                                                                                              |
| `e2e/auth/registration.spec.ts`            | New account registration                    | 1. Navigate to /register 2. Click Google sign-in (mock) 3. Assert navigated to account type selection 4. Select "talent" 5. Assert navigated to phone verification 6. Enter phone + code 7. Assert navigated to onboarding |
| `e2e/auth/admin-login.spec.ts`             | Admin login                                 | 1. Navigate to /admin/login 2. Enter username/password 3. Click login 4. Assert navigated to admin dashboard 5. Assert admin controls visible                                                                              |
| `e2e/auth/admin-login-wrong.spec.ts`       | Bad admin login shows error                 | 1. Navigate to /admin/login 2. Enter wrong credentials 3. Assert error message                                                                                                                                             |
| `e2e/auth/signout.spec.ts`                 | Sign out clears session                     | 1. Sign in 2. Navigate to settings 3. Click sign out 4. Assert redirected to home 5. Assert dashboard not accessible                                                                                                       |

### 4.2 Mock Setup for E2E Tests

Since there is no backend, E2E tests need the mock auth provider active. The Playwright tests intercept Google's third-party script and inject a mock response:

```typescript
// e2e/auth/google-signin.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Google sign-in', () => {
  test('shows Google sign-in button on registration page', async ({ page }) => {
    await page.goto('/register');

    // The Google Sign-In button renders even without the real GIS library
    // because the mock provider simulates the button UI
    const googleButton = page.getByTestId('google-signin-button');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toContainText('Sign in with Google');
  });

  test('mock Google sign-in completes and redirects to dashboard', async ({ page }) => {
    // Mock the Google Identity Services callback
    await page.goto('/register');
    await page.evaluate(() => {
      // Simulate Google One Tap callback with mock token
      (window as any).__googleMockCallback?.({
        credential: 'mock-google-id-token',
      });
    });

    // Assert loading state
    await expect(page.getByText('Signing in...')).toBeVisible();

    // Assert redirected to dashboard (mock returns approved account)
    await page.waitForURL('**/talent/home');
  });
});
```

### 4.3 Running E2E Tests

```bash
# Prerequisites: dev server running on :4200
npm start &

# Run all E2E tests
npm run test:e2e

# Run specific file
npm run test:e2e -- e2e/auth/google-signin.spec.ts

# Run with UI mode (debugging)
npm run test:e2e:ui

# Headless with trace on failure
npm run test:e2e -- --trace on
```

The Playwright config in `playwright.config.ts` should include the auth route:

```typescript
// playwright.config.ts additions
testMatch: ['e2e/**/*.spec.ts'],
use: {
  baseURL: 'http://localhost:4200',
  testIdAttribute: 'data-testid',
},
webServer: {
  command: 'npm start',
  port: 4200,
  reuseExistingServer: true,
},
```

---

## 5. CI/CD Pipeline with Tests and Approval Gates

### 5.1 Pipeline Files

```yaml
# .github/workflows/ci.yml -- Runs on every PR
name: CI - Pull Request Validation

on:
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint check
        run: npx prettier --check .

      - name: Build
        run: npm run build

      - name: Run unit tests with coverage
        run: npm run test:coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

      - name: Start dev server for E2E tests
        run: npm start & npx wait-on http://localhost:4200

      - name: Run Playwright E2E tests
        run: npx playwright test e2e/auth/

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

```yaml
# .github/workflows/cd.yml -- Deploys on push to main (with approval gate)
name: CD - Deploy to Production

on:
  push:
    branches: [main]

jobs:
  lint-build-test:
    # Same build+test as CI above
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npm ci
      - run: npx prettier --check .
      - run: npm run build
      - run: npm run test:coverage

      # Playwright E2E tests must pass before deployment can proceed
      - run: npm start & npx wait-on http://localhost:4200
      - run: npx playwright test e2e/

      # Upload built artifact for downstream jobs
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/clinicx-talent

  deploy-uat:
    needs: lint-build-test
    environment:
      name: uat
      url: https://uat.clinicx-talent.com
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-pages-artifact@v3
      - name: Deploy to Azure App Service (UAT slot)
        run: |
          az webapp deploy ...
      - name: Run smoke tests against UAT
        run: |
          ./scripts/smoke-test.sh https://uat.clinicx-talent.com

  deploy-production:
    needs: deploy-uat
    environment:
      name: production
      url: https://clinicx-talent.com

      # *** APPROVAL GATE ***
      # Deployment to production requires manual approval
      # Configured in GitHub repo: Settings > Environments > production
      # Approvers must be added in the environment configuration
      required_approvers: 1

    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-pages-artifact@v3

      - name: Deploy to production green slot
        run: |
          az webapp deploy ... --slot green

      - name: Swap green slot to production
        run: |
          az webapp deployment slot swap ...

      - name: Post-deploy smoke tests
        run: |
          ./scripts/smoke-test.sh https://clinicx-talent.com
```

### 5.2 Environment Configuration in GitHub

The `deploy-production` job uses GitHub Environments with a manual approval gate:

1. Go to GitHub repo: Settings > Environments > New Environment
2. Create `production` environment
3. Add required reviewers (1 or more)
4. Add environment secrets (if needed for deployment)
5. The `cd.yml` workflow will pause at `deploy-production` until an approver clicks "Approve"

**Approval workflow:**

1. CI passes all checks on `main` branch
2. Developer creates a PR, gets it reviewed and merged
3. `cd.yml` triggers on push to `main`
4. Build + test runs automatically
5. If tests pass, deploy to UAT (no approval needed)
6. **Deploy to production pauses -- requires manual approval**
7. Designated reviewer checks the UAT deployment, reviews the diff
8. Reviewer clicks "Approve deploy" in GitHub Actions UI
9. Pipeline resumes: deploy to production green slot, swap, smoke tests

### 5.3 Branch Protection Rules

```yaml
# Configured in GitHub repo: Settings > Branches > Branch protection rules

Branch: main
  - Require pull request reviews (1 reviewer)
  - Require status checks:
      - "build-and-test" from CI workflow must pass
      - "deploy-uat" from CD workflow must pass
  - Require branches to be up to date
  - Include administrators
  - Allow force pushes: false
```

---

## 6. What Stays Unchanged

The following are NOT part of Phase 0 -- they remain exactly as they are now:

- **Backend** -- no ASP.NET Core code, no PostgreSQL, no Azure services
- **LocalAccountDataSource** -- still reads from localStorage
- **LocalHiringDataSource** -- still reads from localStorage
- **NgRx reducer for hiring** -- all hiring actions are unchanged
- **Existing components** -- clinic/talent dashboards, profile setup, hiring pages
- **Theme management** -- unchanged
- **Founder 1000 Club** -- unchanged (still computed client-side)
- **Playwright config** -- only adding `e2e/auth/` test files; existing E2E tests remain

---

## 7. Phase 0 Implementation Checklist

### Step 1: Define auth models and interfaces

- [ ] Create `src/app/core/auth/models.ts` -- AuthResult, TokenPair, AuthState, AuthError
- [ ] Create `src/app/core/auth/constants.ts` -- token keys
- [ ] Create `src/app/core/auth-provider.ts` -- abstract IAuthProvider interface

### Step 2: Build mock auth provider

- [ ] Create `src/app/core/mock-auth.provider.ts`
- [ ] Mock Google token exchange
- [ ] Mock phone SMS send/verify
- [ ] Mock admin login
- [ ] Mock rate limiting and error states

### Step 3: Build AuthService

- [ ] Create `src/app/core/auth.service.ts`
- [ ] Implement Google sign-in flow
- [ ] Implement phone SMS send/verify
- [ ] Implement admin login/logout
- [ ] Implement token persistence in sessionStorage
- [ ] Implement session clear on logout
- [ ] Wire up to NgRx store for activeAccountId

### Step 4: Update DI configuration

- [ ] Update `src/app/environments/environment.ts` with googleClientId and useMockAuth
- [ ] Update `src/app/app.config.ts` to register AuthProvider and AuthService
- [ ] Add JwtInterceptor and ErrorInterceptor

### Step 5: Build shared UI components

- [ ] Create `google-signin-button` component
- [ ] Create `phone-input` component with formatting
- [ ] Create `verification-code-input` component (6-digit, auto-submit)

### Step 6: Build sign-in and registration pages

- [ ] Create `signin` feature component (Google + phone options)
- [ ] Create `register-phone` feature component (phone + code for new accounts)
- [ ] Update routing for new pages
- [ ] Remove old `registration` component or repurpose

### Step 7: Update NgRx reducer

- [ ] Remove `credentialMatches()` function
- [ ] Remove `TEST_CREDENTIALS` reference
- [ ] Remove hardcoded `admin`/`admin` login
- [ ] Remove local account creation from verifyRegistrationCode
- [ ] Remove in-memory verificationSecurity tracking
- [ ] Keep `activeAccountId` but set it from AuthService

### Step 8: Guard updates

- [ ] Update `clinicAccountGuard` to check AuthService.isAuthenticated()
- [ ] Update `talentAccountGuard` to check AuthService.isAuthenticated()
- [ ] Update `adminGuard` to check AuthService for admin role
- [ ] Update `approvedClinicGuard` to check auth + status

### Step 9: Write unit tests

- [ ] `auth.service.spec.ts` (15+ tests)
- [ ] `jwt-interceptor.spec.ts` (5+ tests)
- [ ] `error-interceptor.spec.ts` (5+ tests)
- [ ] `signin.spec.ts` (8+ tests)
- [ ] `register-phone.spec.ts` (8+ tests)
- [ ] `google-signin-button.spec.ts` (4+ tests)
- [ ] `phone-input.spec.ts` (6+ tests)
- [ ] `verification-code-input.spec.ts` (6+ tests)

### Step 10: Write Playwright E2E tests

- [ ] `e2e/auth/google-signin.spec.ts` (2+ scenarios)
- [ ] `e2e/auth/phone-signin.spec.ts` (happy path)
- [ ] `e2e/auth/phone-signin-wrong-code.spec.ts` (error path)
- [ ] `e2e/auth/registration.spec.ts` (new account)
- [ ] `e2e/auth/admin-login.spec.ts` (happy path)
- [ ] `e2e/auth/admin-login-wrong.spec.ts` (error path)
- [ ] `e2e/auth/signout.spec.ts` (session clear)

### Step 11: CI/CD pipeline

- [ ] Create `.github/workflows/ci.yml` (PR validation)
- [ ] Create `.github/workflows/cd.yml` (UAT + production with approval)
- [ ] Configure GitHub Environments with approval gate
- [ ] Configure branch protection rules

### Step 12: Final review

- [ ] Run all unit tests -- all pass
- [ ] Run all E2E tests -- all pass with mocked auth
- [ ] Manual test: Google sign-in flow works in browser
- [ ] Manual test: Phone SMS flow works in browser
- [ ] Manual test: Admin login works
- [ ] Manual test: Sign out clears session
- [ ] Manual test: Protected routes redirect to sign-in when not authenticated
- [ ] **Do NOT commit -- present for review**

---

## 8. Future Phases (Backend, After Phase 0)

### Phase 1+: Backend Implementation (future)

After Phase 0 is reviewed and approved, the backend implementation begins:

1. ASP.NET Core solution scaffold (Clean Architecture)
2. PostgreSQL schema with EF Core (ISoftDeletable global filters)
3. Auth: Google OAuth validation + Azure ACS SMS
4. Accounts API
5. File upload API (Azure Blob Storage)
6. Hiring API
7. Hard delete approval workflow
8. Infrastructure as Code (Bicep)
9. Production CI/CD with green/blue swaps

At that point, the `MockAuthProvider` is replaced by `HttpAuthProvider`, and the `environment.useBackend` flag is flipped. All components and tests remain the same -- only the provider implementation changes.

---

### Critical Files for Implementation (Phase 0)

- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/store/app.reducer.ts` -- Remove hardcoded auth logic (TEST_CREDENTIALS, admin/admin, credentialMatches)
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/features/registration/registration.ts` -- Replace with new Google + phone sign-in flow (or create new signin component)
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/app.config.ts` -- Register AuthProvider, AuthService, interceptors
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/account.ts` -- Reference for domain types when building auth service
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/playwright.config.ts` -- Add test directory and mock config
