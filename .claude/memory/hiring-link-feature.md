---
name: hiring-link-feature
description: Complete spec for the Clinic Hiring Link and Talent Passport growth-loop feature
metadata: 
  node_type: memory
  type: project
  originSessionId: e5940a67-42da-4467-b179-bbd67d2d7374
  modified: 2026-07-23T15:36:40.551Z
---

# Clinic Hiring Link & Talent Passport Feature

## The Growth Loop

Two shareable products that reinforce each other:

- **Talent Passport:** talent shares their professional identity with clinics.
- **Clinic Hiring Link:** clinic shares an opportunity and invites talent into ClinicX.

```
Talent Passport → new clinic
Clinic Hiring Link → new talent
```

## Feature Spec

### Public hiring link page

`clinicxtalent.com/join/lumen-aesthetics/rn-injector`

Shows: clinic name/location, position, pay range (optional), must-have skills, benefits, urgency, ideal hire description, "Create your Talent Passport and apply" CTA, "Already have a ClinicX account? Sign in to apply" link.

### Invitation preservation through registration

```
Hiring link → phone verification → account creation → profile setup → account review → clinic talent list
```

Invitation token retained during registration. Once talent account exists, becomes a permanent relationship: clinic, opportunity, talent, source link, application status.

### Privacy boundary

Opening a link does NOT expose the visitor to the clinic. Clinic relationship begins when talent clicks "Accept invitation and create profile." Before that: anonymous analytics only (link opened). After accepting: clinic sees invited profile in progress, private details hidden until consent/review state, being invited does not bypass vetting, clinics cannot see phone numbers or private documents.

### Clinic talent dashboard sections

Invited, Applied, Profile in progress, Under ClinicX review, Ready to review, Interview requested, Closed.

Candidate cards show: name, "Invited by you" marker, profile status, position applied to, source.

### MVP data model (client-side placeholders for now)

- **HiringOpportunity**: id, clinicAccountId, title, location, payRange, mustHaveSkills, benefits, urgency, idealHire, status
- **HiringInvite**: id, opportunityId, token, createdAt, expiresAt, active
- **TalentApplication**: id, opportunityId, inviteId, talentAccountId, source, status, acceptedAt, submittedAt

Source values: `clinic-hiring-link`, `talent-passport`, `clinicx-match`

### Trust controls

Only approved clinics can publish hiring links. Support: disable/revoke link, expiration, closed-position state, report opportunity, rate limiting, admin visibility.

### Build sequence

1. Hiring opportunity form (fields already on clinic)
2. Public hiring-link page
3. Accept-invitation attribution through registration
4. TalentApplication state in NgRx/localStorage
5. Clinic talent list with "Invited by you" + application status
6. Talent Passport (alongside or after)

**Why:** This is the other half of the growth loop — gives both clinics and talent a reason to distribute ClinicX.
**How to apply:** Implement client-side first with NgRx-managed state persisted to localStorage. All data structures use placeholder IDs ready for backend migration. Detailed plan at [[Implementation Plan]].

## Founder 1000 Club

Every account before the 1,000-user mark receives a Founder 1000 badge with: voice in feature roadmap, priority bug reporting, unlimited life-long free accounts. Badge appears on clinic/talent profiles, public pages, and talent list cards. This makes every invitation feel exclusive. See [[Implementation Plan]] for build details. See [[angular-v22-conventions]] for coding standards.
