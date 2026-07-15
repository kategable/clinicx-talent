# ClinicX Talent

ClinicX Talent is a curated hiring marketplace for med spas. The MVP is designed to validate one business question: can ClinicX consistently introduce clinics to qualified, pre-vetted talent and get paid for successful matches?

## MVP today

The current Angular application demonstrates the clinic-owner experience:

- Premium, responsive landing page
- Curated talent shortlist
- Match scores, skills, and vetting highlights
- Working interview-request interaction
- Responsive hiring workflow section
- Phone-only registration with local SMS-code verification
- Clinic and talent account-type selection
- Profile onboarding with an under-review state
- Admin account review with approve and on-hold actions
- NgRx application state with browser-session restoration
- Guarded admin access with a development-only login
- Simulated verification-abuse limits and usage-review contact path
- Status-aware sign-in routing for accounts under review, on hold, or approved
- Once-per-session “I’m waiting” review reminder simulation
- Session-aware marketing navigation showing the active account name
- Clinic workspace with locally persisted profile details
- Talent workspace with locally persisted professional details
- Angular and service unit tests

Talent showcase data is currently static. MVP account records persist in browser storage; real authentication, server persistence, file uploads, and payments have not been added yet.

## MVP account access

Registration is available at `/register`. No SMS is sent in the local MVP. Use one paired phone number and verification code:

| Phone            | Code     |
| ---------------- | -------- |
| `(312) 555-0101` | `246810` |
| `(312) 555-0102` | `135790` |
| `(312) 555-0199` | `112233` |

New accounts default to **under review** and can begin building a profile at `/onboarding`. Account data and the active account ID are persisted under the versioned `clinicx.state.v1` browser-storage key, so local sessions survive a refresh or browser restart during MVP testing.

The temporary admin login is available at `/admin/login`:

| Username | Password |
| -------- | -------- |
| `admin`  | `admin`  |

Successful admin authentication unlocks the guarded `/admin/accounts` route. Admin session state is also local-only for MVP testing.

Existing accounts are routed according to review status after sign-in. Accounts under review or on hold see `/account/status`. The “I’m waiting” acknowledgement can be used once per account during a browser session and is stored in `sessionStorage`; it does not contact ClinicX yet. Approved clinic accounts can enter the guarded `/clinic/talents` placeholder, where talent search will be implemented later.

When a session is active, the marketing header replaces “Sign in” with the account display name. Clinic accounts link to `/clinic/home`, where owners can maintain clinic location, website, specialties, and introductory information. Those changes dispatch NgRx actions and persist with the rest of the local MVP account state. Talent search remains available only to approved clinics.

Talent accounts link to `/talent/home`. The talent workspace stores professional role, location, experience timeline, skills, certificates, availability, salary expectations, languages, portfolio, introduction, and photo/video/gallery file metadata through NgRx. Only the professional name is required during the MVP. Actual media bytes are not stored in browser state; the current file selectors retain names for flow testing until secure backend object-storage uploads are implemented.

These credentials, sessions, limits, and admin controls are intentionally client-side for local testing. They provide no security against someone who can inspect or modify browser storage.

Before production:

- ASP.NET Core must verify SMS challenges and enforce attempt limits by phone, IP address, time window, and appropriate device/risk signals.
- A fourth distinct phone-number attempt in the configured window should create an audit event and send the user to the usage-review flow. Shared clinic, office, mobile, and public IP addresses require time-based limits and a manual release path rather than permanent blocking.
- The backend must issue a rotating refresh token in a `Secure`, `HttpOnly`, `SameSite` cookie. Angular should restore the current account through a session endpoint and must not store production access or refresh credentials in `localStorage`.
- Admin routes and review APIs must require a server-validated admin role. The hard-coded credential, client route guard, and local review changes must be removed and replaced with audited authorization.

## Technology

- Angular 22.0.6
- TypeScript 6.0
- Standalone components
- NgRx Store, Effects, selectors, and Store DevTools for application state
- Angular Signals Forms and component-local presentation state
- Native Angular template control flow
- SCSS component styling
- Vitest testing

The intended backend is ASP.NET Core with PostgreSQL. Resume and video assets will eventually use object storage such as Amazon S3.

## Local setup

Angular 22 requires one of these Node.js versions:

- Node 22.22.3 or newer on the Node 22 line
- Node 24.15.0 or newer on the Node 24 line
- Node 26 or newer

Node 24.15.0 is pinned in `.nvmrc`. With `nvm` installed:

```bash
cd /Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent
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
```

The project uses strict TypeScript and Angular template checking.

NgRx 21.1.1 is temporarily installed with a peer override because it is the newest published NgRx release and currently declares Angular 21 compatibility while this project uses Angular 22. Upgrade to the matching NgRx 22 release when it becomes available.

## Next milestone

Build one thin, API-backed workflow from beginning to end:

1. A talent submits a basic profile and résumé.
2. An administrator reviews and approves or rejects the talent.
3. An approved talent appears in an employer shortlist.
4. The employer requests an interview.
5. The administrator tracks the request and placement outcome.

Matching should remain manual during this phase. The goal is to validate demand for curated talent before automating recommendations.

## Not in the MVP

- AI matching
- Direct messaging or chat
- Social feeds
- Payroll
- Scheduling
- Mobile applications
- Automated video processing
- Continuing education

## AI development guidance

`AGENTS.md` contains the official Angular 22 coding guidance generated by the Angular CLI. The official Angular `angular-developer` agent skill is also installed for version-aligned guidance on Signals, Signal Forms, routing, accessibility, testing, and CLI tooling.
