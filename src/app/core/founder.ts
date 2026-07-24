// ---------------------------------------------------------------------------
// ClinicX Talent — Founder 1000 Club business logic
// ---------------------------------------------------------------------------
// Pure functions with no Angular or NgRx dependency.

export const FOUNDER_LIMIT = 1000;

/** An account record only needs these two fields for founder logic. */
export interface FounderAccount {
  founder: boolean;
  id: string;
}

export interface FounderStatus {
  isFounder: boolean;
  memberNumber: number | null;
  remaining: number;
}

/**
 * Returns the founder status for an account relative to the total account
 * pool. If `founderAccounts` is the full list of accounts sorted by creation
 * order, memberNumber is the 1-based index of this account among founders.
 */
export function getFounderStatus(
  account: FounderAccount,
  founderAccounts: FounderAccount[],
): FounderStatus {
  const isFounder = account.founder === true;
  const index = isFounder
    ? founderAccounts.filter((a) => a.founder).findIndex((a) => a.id === account.id)
    : -1;
  return {
    isFounder,
    memberNumber: index >= 0 ? index + 1 : null,
    remaining: Math.max(0, FOUNDER_LIMIT - founderAccounts.length),
  };
}

/** Returns true when an account has the founder flag. */
export function isFounder(account: FounderAccount): boolean {
  return account.founder === true;
}

/** Returns true when a new account can still become a founder. */
export function canBecomeFounder(totalAccounts: number): boolean {
  return totalAccounts < FOUNDER_LIMIT;
}
