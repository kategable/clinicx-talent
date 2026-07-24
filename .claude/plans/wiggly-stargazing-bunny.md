# Clinic Hiring Link + Talent Passport — Implementation Plan

## Context

ClinicX needs both sides of its growth loop — two shareable products that reinforce each other:

- **Clinic Hiring Link:** clinic shares an opportunity → new talent discovers ClinicX, registers, appears in that clinic's list
- **Talent Passport:** talent shares their professional identity → new clinic discovers ClinicX, registers, can add that talent to their list

Both invitations must survive the full registration flow (public page → phone verification → account creation → profile setup → review → talent list), creating a permanent relationship with source attribution. Everything is client-side for now with data structures ready for backend migration.

---

> **Plan persistence:** This file lives at `.claude/plans/wiggly-stargazing-bunny.md` and the spec is in `memory/hiring-link-feature.md` (loaded into every session via `MEMORY.md`). Both survive sessions and restarts.

---

## Part A: Business Logic Library

Currently business logic is scattered across the reducer, effects, and component files. Extract pure domain functions into dedicated core modules — no NgRx dependency, no Angular injection, just typed functions. This gives us a single source of truth for business rules, makes them testable in isolation, and prepares them for extraction to a shared library when the backend arrives.

### Pattern

Follow the existing `src/app/core/account.ts` pattern — types + constants + pure utility functions in one file per domain:

| Module | Purpose |
|---|---|
| `src/app/core/account.ts` | Account types, phone formatting, test credentials, seed data (exists — enhance) |
| `src/app/core/hiring.ts` | Hiring types, slug/token generation, application lifecycle, seed data (NEW — see Part B) |
| `src/app/core/founder.ts` | Founder types, count threshold, qualification logic (NEW — see Part D) |

### Rules for business logic modules

- **Pure functions only** — no `inject()`, no `Store`, no side effects. Input in, output out.
- **Used by the reducer** — the reducer calls these functions, keeping reducer handlers thin.
- **Used by components** — components import types and call utility functions directly (e.g. `generateSlug()`, `isFounder()`).
- **Ready for extraction** — when the .NET backend arrives, these modules move to a shared library without refactoring.

---

## Part B: Hiring Link + Talent Passport

### Step B1: Data model — `src/app/core/hiring.ts` (NEW)

New file with interfaces, utility functions, and seeded demo data:

- `HiringOpportunity` — id, clinicAccountId, slug, positionSlug, title, location, payRange, mustHaveSkills, benefits, urgency, idealHire, status (`'active'|'paused'|'closed'`), createdAt
- `HiringInvite` — id, opportunityId, token, createdAt, expiresAt, active
- `TalentPassportShare` — id, talentAccountId, token, createdAt, active
- `TalentApplication` — id, opportunityId (optional — absent for passport-sourced apps), talentAccountId, clinicAccountId (denormalized for easy lookup), source (`'clinic-hiring-link'|'talent-passport'|'clinicx-match'`), status (`'invited'|'profile-in-progress'|'under-review'|'ready-to-review'|'interview-requested'|'closed'`), acceptedAt, submittedAt
- `generateSlug(text)` — URL-safe slug generator
- `generateInviteToken()` — unique token generator (`Date.now().toString(36)-random`)
- `SEEDED_OPPORTUNITIES` — one demo opportunity for the approved clinic account
- `SEEDED_INVITES` — one demo invite linked to that opportunity
- `SEEDED_PASSPORTS` — one demo passport share for the seeded talent account
- `SEEDED_APPLICATIONS` — empty (generated from real flow)

Also includes pure business functions: `canCreateOpportunity(clinic)`, `isInviteValid(invite)`, `getApplicationLifecycle(app, account)`, `getNextApplicationStatus(current, action)`.

### Step B2: State slice — `src/app/core/store/app.state.ts` (MODIFY)

Add to `AppState`:

```typescript
hiring: {
  opportunities: HiringOpportunity[];
  invites: HiringInvite[];
  passportShares: TalentPassportShare[];
  applications: TalentApplication[];
  pendingInvite: {
    token: string;
    type: 'hiring-link' | 'talent-passport';
    opportunityId?: string;   // set when type === 'hiring-link'
    talentAccountId?: string;  // set when type === 'talent-passport'
  } | null;
}
```

Initialize with seeded data. `pendingInvite` starts null. A single unified `pendingInvite` object handles both directions — the `type` discriminator tells the reducer which kind of application to create.

### Step B3: Actions — `src/app/core/store/app.actions.ts` (MODIFY)

Add to existing `createActionGroup`:

```
'Create Opportunity': props<{ clinicName: string; position: string; location: string; payRange: string; mustHaveSkills: string; benefits: string; urgency: string; idealHire: string }>()
'Share Talent Passport': props<{ talentAccountId: string }>()
'Accept Hiring Invite': props<{ token: string }>()
'Accept Passport Invite': props<{ token: string }>()
'Create Application From Invite': emptyProps()
'Update Application Status': props<{ applicationId: string; status: ApplicationStatus }>()
'Clear Pending Invite': emptyProps()
```

### Step B4: Reducer — `src/app/core/store/app.reducer.ts` (MODIFY)

- **createOpportunity**: Generate IDs, slugs from clinicName and position, create HiringOpportunity + HiringInvite records
- **shareTalentPassport**: Generate token, create TalentPassportShare record for the talent
- **acceptHiringInvite**: Set `pendingInvite = { token, type: 'hiring-link', opportunityId: <looked up from invite> }`
- **acceptPassportInvite**: Set `pendingInvite = { token, type: 'talent-passport', talentAccountId: <looked up from passport share> }`
- **createApplicationFromInvite**: Look at `pendingInvite.type` — if `hiring-link`, create TalentApplication linking talent to opportunity with source `'clinic-hiring-link'`. If `talent-passport`, create TalentApplication linking clinic to talent with source `'talent-passport'`. Clear `pendingInvite` in both cases.
- **updateApplicationStatus**: Update matching application status
- **clearPendingInvite**: Set `pendingInvite = null`

### Step B5: Selectors — `src/app/core/store/app.selectors.ts` (MODIFY)

- `selectHiring`, `selectOpportunities`, `selectInvites`, `selectPassportShares`, `selectApplications`, `selectPendingInvite`
- `selectMyOpportunities` — filter by current clinic account ID
- `selectOpportunityBySlug(clinicSlug, positionSlug)` — factory selector for hiring page
- `selectPassportByTalentSlug(talentSlug)` — factory selector for passport page (slug = URL-safe display name)
- `selectApplicationsForMyClinic` — apps where `clinicAccountId` matches current clinic
- `selectApplicationsForMyTalent` — apps where `talentAccountId` matches current talent

### Step B6: Effects — `src/app/core/store/app.effects.ts` (MODIFY)

- **createApplicationAfterVerification$**: On `verifyRegistrationCode`/`verifySignInCode` success + `pendingInvite` is set → dispatch `createApplicationFromInvite()`. This single effect handles both directions — hiring link creates an app when a talent registers, passport creates an app when a clinic registers.
- **navigateAfterHiringInvite$**: On `acceptHiringInvite` → navigate to `/register?type=talent&invite=TOKEN`
- **navigateAfterPassportInvite$**: On `acceptPassportInvite` → navigate to `/register?type=clinic&invite=TOKEN`
- Update `persistState$` to exclude `pendingInvite` from localStorage (like reviewReminder/guestTheme)
- Guard against duplicate applications: check no existing app for same talentAccountId + clinicAccountId pair

### Step B7: Routes

**`src/app/app.routes.ts`** — add two public routes (no guard):

```typescript
// Clinic Hiring Link — public job posting
{ path: 'join/:clinicSlug/:positionSlug', loadComponent: () => import('./features/public-hiring-page/public-hiring-page').then(m => m.PublicHiringPage), title: 'Job opportunity | ClinicX Talent' }
// Talent Passport — public talent profile
{ path: 'talent/:talentSlug', loadComponent: () => import('./features/public-talent-passport/public-talent-passport').then(m => m.PublicTalentPassport), title: 'Talent profile | ClinicX Talent' }
```

**`src/app/features/clinic.routes.ts`** — add protected routes:

```typescript
{ path: 'opportunities', canActivate: [approvedClinicGuard], loadComponent: () => import('./clinic-opportunities-list/clinic-opportunities-list').then(m => m.ClinicOpportunitiesList), title: 'My hiring links | ClinicX Talent' }
{ path: 'opportunities/new', canActivate: [approvedClinicGuard], loadComponent: () => import('./clinic-opportunity-form/clinic-opportunity-form').then(m => m.ClinicOpportunityForm), title: 'Create hiring link | ClinicX Talent' }
```

### Step B8: New Components

**`PublicHiringPage`** — `src/app/features/public-hiring-page/` (3 files)
- Read slug params from ActivatedRoute, token from queryParamMap
- Show opportunity details (title, location, pay, benefits, skills, ideal hire) and clinic name
- CTA for talent: "Accept invitation and create profile" → dispatch `acceptHiringInvite({ token })`
- Secondary link: "Already have an account? Sign in" → `/signin?invite=TOKEN`
- Edge cases: expired/missing opportunity (empty state), missing token (show details but change CTA to "Browse ClinicX")

**`PublicTalentPassport`** — `src/app/features/public-talent-passport/` (3 files)
- Read `:talentSlug` from ActivatedRoute, token from queryParamMap
- Show talent professional profile: name, role, location, experience, skills, availability, languages, introduction. Hide private details (phone, certificates, portfolio files).
- CTA for clinic: "Add this talent to my clinic" → dispatch `acceptPassportInvite({ token })`, effect navigates to `/register?type=clinic&invite=TOKEN`
- Secondary link: "Already have an account? Sign in" → `/signin?invite=TOKEN`
- Edge cases: expired/missing passport, private details hidden per privacy spec

**`ClinicOpportunityForm`** — `src/app/features/clinic-opportunity-form/` (3 files)
- Signal Forms pattern matching `ClinicHome` exactly
- Pre-fill from current clinic's ClinicDetails (position, location, payRange, etc.)
- On save: dispatch `createOpportunity(...)`, show generated share link with copy-to-clipboard
- Fields: position, location, payRange, mustHaveSkills, benefits, urgency, idealHire
- Required validation on position and location

**`ClinicOpportunitiesList`** — `src/app/features/clinic-opportunities-list/` (3 files)
- List all opportunities for current clinic with status, copy-link, toggle active/paused/closed

### Step B9: Modified Components

**`ClinicTalents`** (`clinic-talents.ts`, `.html`, `.scss`)
- Add `selectApplicationsForMyClinic` selector
- Show talent cards with application status badges and source attribution:
  - `'clinic-hiring-link'` → "Invited by you" badge
  - `'talent-passport'` → "Found via Talent Passport" badge
  - Application status chip (invited, in progress, under review, ready to review, etc.)
- Include under-review talents who have applications (not just approved ones)
- Add "Create hiring link" button in nav area

**`TalentHome`** (`talent-home.ts`, `.html`, `.scss`)
- Add "Share your Talent Passport" section/button below the profile form
- On click: dispatch `shareTalentPassport({ talentAccountId })`
- Show generated passport link: `clinicxtalent.com/talent/:talentSlug?invite=TOKEN` with copy-to-clipboard
- Show a small summary of what clinics will see (public fields only)

**`Registration`** (`registration.ts`)
- In `ngOnInit()`: read `invite` query param, also check route data/snapshot for invite context
- If invite present: dispatch `acceptHiringInvite({ token })` or `acceptPassportInvite({ token })` — determined by the `type` query param (talent=from hiring link, clinic=from passport)
- Pre-select account type based on invite direction (belt-and-suspenders with the redirect URL)

**`ClinicHome`** (`clinic-home.html`)
- Add "Create hiring link" link → `/clinic/opportunities/new`, visible only when `account().status === 'approved'`

### Step B10: Seeded data update — `src/app/core/account.ts` (MODIFY)

Add a third seeded account `clinic-approved` with `status: 'approved'` so the demo flow works without changing the existing `clinic-demo` (which stays under-review for testing). Phone: `(312) 555-0200`, matching a new test credential.

---

## Part C: Founder 1000 Club

Every account that joins before the 1,000-user mark gets a **Founder 1000** badge. Founders receive: voice in feature roadmap, priority bug reporting, and unlimited life-long free accounts. The badge appears on both talent and clinic profiles — inside the app and on public pages. This is a growth accelerant: it makes every invitation feel like access to something exclusive.

### Step C1: Business logic — `src/app/core/founder.ts` (NEW)

Pure functions following the business logic module pattern:

```typescript
export const FOUNDER_LIMIT = 1000;

export interface FounderStatus {
  isFounder: boolean;
  memberNumber: number | null;   // null if not a founder
  remaining: number;              // spots left before limit is hit
}

export function getFounderStatus(account: AccountRecord, totalAccounts: number): FounderStatus { ... }
export function isFounder(account: AccountRecord): boolean { return account.founder === true; }
export function canBecomeFounder(totalAccounts: number): boolean { return totalAccounts < FOUNDER_LIMIT; }
```

### Step C2: Extend AccountRecord — `src/app/core/account.ts` (MODIFY)

```typescript
export interface AccountRecord {
  // ... existing fields ...
  founder: boolean;              // true if joined before 1,000-user limit
}
```

All `SEEDED_ACCOUNTS` start with `founder: true`. New accounts created during registration get `founder: true` if `canBecomeFounder(accounts.length)`.

### Step C3: State + Reducer changes

Update `AppState.registration` or the reducer's `verifyRegistrationCode` handler to call `canBecomeFounder()` from `founder.ts` and set `founder: true` on the new account record when eligible. No new state slice needed — founder status is derived from the account record itself.

### Step C4: Shared badge component — `src/app/shared/founder-badge/` (NEW — 3 files)

A small, reusable badge. Follows the `ThemePicker` shared component pattern (standalone, `input()` for configuration):

```typescript
@Component({
  selector: 'app-founder-badge',
  imports: [RouterLink, MatTooltipModule],
  templateUrl: './founder-badge.html',
  styleUrl: './founder-badge.scss',
})
export class FounderBadge {
  readonly compact = input(false, { transform: booleanAttribute });
  readonly memberNumber = input<number | null>(null);
  // Link to /founders page for more info
}
```

Two modes:
- **Full**: Shows "Founder 1000" text + member number + small icon. Used on profile pages.
- **Compact**: Shows just the icon with tooltip. Used on cards in lists.

Links to `/founders` page. Uses `--cx-accent` for the badge color.

### Step C5: Static founders page — `src/app/features/founders/` (NEW — 3 files)

Route: `/founders` — public, no guard. Explains the Founder 1000 Club:

- "The first 1,000 members of ClinicX are founders."
- Benefits: voice in new features, priority bug reporting, unlimited life-long free accounts
- "Join before we reach 1,000 to claim your founder badge."
- CTA: "Create your account" → `/register`
- If signed in and is a founder: shows "You're Founder #{memberNumber} ✓"
- Shows remaining spots counter (derived from `selectAccounts`)

### Step C6: Badge placement

Show the `FounderBadge` component (compact mode) in these locations:

| Location | File to modify |
|---|---|
| Clinic talent list cards | `clinic-talents.html` — next to talent name (if talent is founder) |
| Clinic workspace header | `clinic-home.html` — next to clinic display name (if clinic is founder) |
| Talent workspace header | `talent-home.html` — next to talent display name (if talent is founder) |
| Public hiring page | `public-hiring-page.html` — next to clinic name (if clinic is founder) |
| Public talent passport | `public-talent-passport.html` — next to talent name (if talent is founder) |
| Account status page | `account-status.html` — next to account name |

### Step C7: Route

**`src/app/app.routes.ts`**:

```typescript
{ path: 'founders', loadComponent: () => import('./features/founders/founders').then(m => m.Founders), title: 'Founder 1000 Club | ClinicX Talent' }
```

---

## Part D: Updated Token Flows

### Hiring Link direction (clinic → talent)

```
Clinic creates opportunity → reducer creates HiringOpportunity + HiringInvite
  → UI shows: /join/lumen-aesthetics/rn-injector?invite=TOKEN

Talent opens public page → clicks "Accept invitation"
  → dispatch(acceptHiringInvite({ token }))
  → reducer sets pendingInvite = { token, type: 'hiring-link', opportunityId }
  → effect navigates to /register?type=talent&invite=TOKEN

Registration page loads → ngOnInit reads invite param
  → dispatch(acceptHiringInvite({ token })) (belt-and-suspenders)
  → user completes phone + code verification

Code verified → activeAccountId set (talent account)
  → createApplicationAfterVerification$ fires
  → pendingInvite.type === 'hiring-link' → dispatch(createApplicationFromInvite())
  → reducer creates TalentApplication(source='clinic-hiring-link', talentAccountId, opportunityId), clears pendingInvite
```

### Talent Passport direction (talent → clinic)

```
Talent shares passport → reducer creates TalentPassportShare with token
  → UI shows: /talent/alex-morgan-rn?invite=TOKEN

Clinic opens public page → clicks "Add this talent to my clinic"
  → dispatch(acceptPassportInvite({ token }))
  → reducer sets pendingInvite = { token, type: 'talent-passport', talentAccountId }
  → effect navigates to /register?type=clinic&invite=TOKEN

Registration page loads → ngOnInit reads invite param
  → dispatch(acceptPassportInvite({ token })) (belt-and-suspenders)
  → user completes phone + code verification

Code verified → activeAccountId set (clinic account)
  → createApplicationAfterVerification$ fires
  → pendingInvite.type === 'talent-passport' → dispatch(createApplicationFromInvite())
  → reducer creates TalentApplication(source='talent-passport', clinicAccountId, talentAccountId), clears pendingInvite
```

Token survives page refreshes via hydration but is **excluded from localStorage persistence** (like review reminders) — it only lives in-memory for the current session.

---

## Files Summary

| File | Action |
|---|---|
| `src/app/core/hiring.ts` | **NEW** — hiring domain types, utils, business logic, seed data |
| `src/app/core/founder.ts` | **NEW** — founder business logic, threshold, status functions |
| `src/app/core/store/app.state.ts` | MODIFY — add `hiring` slice |
| `src/app/core/store/app.actions.ts` | MODIFY — add 7 actions |
| `src/app/core/store/app.reducer.ts` | MODIFY — add 6 hiring handlers + founder auto-assignment |
| `src/app/core/store/app.selectors.ts` | MODIFY — add ~10 selectors |
| `src/app/core/store/app.effects.ts` | MODIFY — add 3 effects, update persistState$ |
| `src/app/core/store/storage.ts` | MODIFY — exclude `pendingInvite` from localStorage |
| `src/app/core/account.ts` | MODIFY — add `founder` field, approved clinic seed account + test cred |
| `src/app/app.routes.ts` | MODIFY — add 3 public routes (`/join/`, `/talent/`, `/founders`) |
| `src/app/features/clinic.routes.ts` | MODIFY — add 2 protected routes |
| `src/app/features/public-hiring-page/` | **NEW** (3 files) |
| `src/app/features/public-talent-passport/` | **NEW** (3 files) |
| `src/app/features/founders/` | **NEW** (3 files) — static Founder 1000 Club page |
| `src/app/features/clinic-opportunity-form/` | **NEW** (3 files) |
| `src/app/features/clinic-opportunities-list/` | **NEW** (3 files) |
| `src/app/shared/founder-badge/` | **NEW** (3 files) — shared badge component |
| `src/app/features/clinic-talents/` | MODIFY (3 files) — application badges + status + founder badge |
| `src/app/features/clinic-home/` | MODIFY (1 file) — "Create hiring link" nav + founder badge |
| `src/app/features/talent-home/` | MODIFY (3 files) — passport share section + founder badge |
| `src/app/features/registration/` | MODIFY (1 file) — invite param handling |
| `src/app/features/account-status/` | MODIFY (1 file) — founder badge |
| `src/app/core/store/app.reducer.spec.ts` | MODIFY — new tests for hiring + founder actions

## Verification

1. `npm run build` — must produce clean production build
2. `npm test` — all existing tests pass; new reducer tests for hiring + passport + founder actions
3. **Hiring Link flow**: Sign in as approved clinic → create opportunity → copy link → open in new tab → accept → register talent → talent appears in clinic's list with "Invited by you" + founder badge
4. **Talent Passport flow**: Sign in as talent → share passport → copy link → open in new tab → accept → register clinic → talent appears in clinic's list with "Found via Talent Passport" + founder badge
5. **Founder badge**: New accounts get `founder: true` automatically (under 1000 limit). Badge visible on: clinic-home, talent-home, clinic-talents cards, public passport page, account status page, founders page
6. **Founders page**: `/founders` accessible to all, shows remaining spots, personalized message when signed in as founder
7. **Privacy**: Public pages don't expose identity until explicit accept. Passport page hides phone/certificates.
8. **robots.txt**: New public routes (`/join/`, `/talent/` for passport slugs, `/founders`) should be crawlable
