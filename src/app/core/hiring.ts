// ---------------------------------------------------------------------------
// ClinicX Talent — Hiring domain types, business logic, and seed data
// ---------------------------------------------------------------------------
// Pure functions with no Angular or NgRx dependency. Ready for extraction to
// a shared library when the backend arrives.

// ---- Types ----------------------------------------------------------------

export type OpportunityStatus = 'active' | 'paused' | 'closed';
export type ApplicationSource =
  | 'clinic-hiring-link'
  | 'talent-passport'
  | 'clinicx-match';

export type ApplicationStatus =
  | 'invited'
  | 'interested'
  | 'profile-in-progress'
  | 'under-review'
  | 'ready-to-review'
  | 'interview-requested'
  | 'closed';

export interface HiringOpportunity {
  id: string;
  clinicAccountId: string;
  slug: string;
  positionSlug: string;
  title: string;
  location: string;
  payRange: string;
  mustHaveSkills: string;
  benefits: string;
  urgency: string;
  idealHire: string;
  status: OpportunityStatus;
  createdAt: string;
}

export interface HiringInvite {
  id: string;
  opportunityId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
}

export interface TalentPassportShare {
  id: string;
  talentAccountId: string;
  token: string;
  createdAt: string;
  active: boolean;
}

export interface TalentApplication {
  id: string;
  opportunityId?: string;
  talentAccountId: string;
  clinicAccountId: string;
  source: ApplicationSource;
  status: ApplicationStatus;
  acceptedAt: string;
  submittedAt: string;
}

// ---- Pure business functions ----------------------------------------------

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function generateInviteToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Returns true when the clinic account is eligible to create opportunities.
 * In the MVP an approved clinic with completed profile qualifies.
 */
export function canCreateOpportunity(clinic: {
  type: string;
  status: string;
  profileComplete: boolean;
}): boolean {
  return clinic.type === 'clinic' && clinic.status === 'approved' && clinic.profileComplete;
}

/** Returns true when the invite is still usable (active and not expired). */
export function isInviteValid(invite: HiringInvite): boolean {
  if (!invite.active) return false;
  return new Date(invite.expiresAt).getTime() > Date.now();
}

/** Expiration date 30 days from now, formatted for display. */
export function defaultExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Human-readable label for each application status. */
export function applicationStatusLabel(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    invited: 'Invited',
    interested: 'Interested',
    'profile-in-progress': 'Profile in progress',
    'under-review': 'Under ClinicX review',
    'ready-to-review': 'Ready to review',
    'interview-requested': 'Interview requested',
    closed: 'Closed',
  };
  return labels[status];
}

/** Natural sort order weight for application statuses (lower = earlier in pipeline). */
export function applicationStatusOrder(status: ApplicationStatus): number {
  const order: Record<ApplicationStatus, number> = {
    invited: 0,
    interested: 1,
    'profile-in-progress': 2,
    'under-review': 3,
    'ready-to-review': 4,
    'interview-requested': 5,
    closed: 6,
  };
  return order[status];
}

/**
 * Determines the next status when transitioning from the current status.
 * Simple linear pipeline for MVP.
 */
export function getNextApplicationStatus(
  current: ApplicationStatus,
  action: 'advance' | 'close',
): ApplicationStatus | null {
  if (action === 'close') return 'closed';
  const pipeline: ApplicationStatus[] = [
    'invited',
    'interested',
    'profile-in-progress',
    'under-review',
    'ready-to-review',
    'interview-requested',
  ];
  const idx = pipeline.indexOf(current);
  if (idx === -1 || idx >= pipeline.length - 1) return null;
  return pipeline[idx + 1];
}

// ---- Seed data ------------------------------------------------------------

export const SEEDED_OPPORTUNITIES: HiringOpportunity[] = [
  {
    id: 'opp-1',
    clinicAccountId: 'clinic-approved',
    slug: 'lux-aesthetics-lounge',
    positionSlug: 'aesthetic-np',
    title: 'Aesthetic NP',
    location: 'Gold Coast, Chicago, IL',
    payRange: '$100,000–$130,000',
    mustHaveSkills: 'Injectables, client consultations, treatment planning',
    benefits: 'Full benefits, commission, product allowance',
    urgency: 'Within 60 days',
    idealHire: 'Experienced NP with a boutique service mindset.',
    status: 'active',
    createdAt: 'Jul 14, 2026',
  },
];

export const SEEDED_INVITES: HiringInvite[] = [
  {
    id: 'inv-1',
    opportunityId: 'opp-1',
    token: 'demo-hiring-token-001',
    createdAt: 'Jul 14, 2026',
    expiresAt: 'Aug 14, 2026',
    active: true,
  },
];

export const SEEDED_PASSPORTS: TalentPassportShare[] = [
  {
    id: 'passport-1',
    talentAccountId: 'talent-demo',
    token: 'demo-passport-token-001',
    createdAt: 'Jul 14, 2026',
    active: true,
  },
];

export const SEEDED_APPLICATIONS: TalentApplication[] = [];
