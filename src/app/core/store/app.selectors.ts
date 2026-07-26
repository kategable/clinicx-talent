import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppState } from './app.state';

export const selectAppState = createFeatureSelector<AppState>('app');
export const selectAccounts = createSelector(selectAppState, (state) => state.accounts);
export const selectAccountValues = createSelector(selectAccounts, (accounts) =>
  Object.values(accounts),
);
/** Active (non-deleted) accounts only. */
export const selectActiveAccounts = createSelector(selectAccountValues, (accounts) =>
  accounts.filter((a) => !a.deletedAt),
);
/** Deleted accounts (for admin view toggle). */
export const selectDeletedAccounts = createSelector(selectAccountValues, (accounts) =>
  accounts.filter((a) => a.deletedAt),
);
export const selectCurrentAccount = createSelector(selectAppState, (state) =>
  state.activeAccountId ? state.accounts[state.activeAccountId] : undefined,
);
/** Active accounts only for admin counts. */
export const selectPendingCount = createSelector(
  selectActiveAccounts,
  (accounts) => accounts.filter((a) => a.status === 'under-review').length,
);
export const selectRegistration = createSelector(selectAppState, (state) => state.registration);
export const selectError = createSelector(selectAppState, (state) => state.error);

// -- Auth selectors --------------------------------------------------------
export const selectAuth = createSelector(selectAppState, (state) => state.auth);
export const selectAuthStatus = createSelector(selectAuth, (auth) => auth.status);
export const selectAuthError = createSelector(selectAuth, (auth) => auth.error);
export const selectIsAuthenticated = createSelector(
  selectAuth,
  (auth) => auth.status === 'authenticated',
);
export const selectAuthToken = createSelector(selectAuth, (auth) => auth.token);
export const selectIsNewAccount = createSelector(selectAuth, (auth) => auth.isNewAccount);
export const selectPhoneRequired = createSelector(selectAuth, (auth) => auth.phoneRequired);
export const selectAdminAuthenticated = createSelector(
  selectAppState,
  (state) => state.adminAuthenticated,
);
export const selectVerificationBlocked = createSelector(
  selectAppState,
  (state) => state.verificationSecurity.flagged,
);
export const selectVerificationLockedPhones = createSelector(
  selectAppState,
  (state) => state.verificationSecurity.lockedPhones,
);
export const selectVerificationFlagged = createSelector(
  selectAppState,
  (state) => state.verificationSecurity.flagged,
);
export const selectReviewReminderSent = createSelector(
  selectAppState,
  selectCurrentAccount,
  (state, account) =>
    Boolean(account && state.reviewReminder.pingedAccountIds.includes(account.id)),
);
export const selectThemePreference = createSelector(
  selectAppState,
  selectCurrentAccount,
  (state, account) => (account ? (account.themePreference ?? 'auto') : state.guestThemePreference),
);

// -- Hiring selectors --------------------------------------------------------

export const selectHiring = createSelector(selectAppState, (state) => state.hiring);
/** Active (non-deleted) opportunities. */
export const selectOpportunities = createSelector(selectHiring, (h) =>
  h.opportunities.filter((o) => !o.deletedAt),
);
/** Active (non-deleted) invites. */
export const selectInvites = createSelector(selectHiring, (h) =>
  h.invites.filter((i) => !i.deletedAt),
);
/** Active (non-deleted) passport shares. */
export const selectPassportShares = createSelector(selectHiring, (h) =>
  h.passportShares.filter((p) => !p.deletedAt),
);
/** All passport shares including deleted (for management page). */
export const selectAllPassportShares = createSelector(selectHiring, (h) => h.passportShares);
export const selectApplications = createSelector(selectHiring, (h) => h.applications);
export const selectPendingInvite = createSelector(selectHiring, (h) => h.pendingInvite);

export const selectMyActiveOpportunities = createSelector(
  selectOpportunities,
  selectCurrentAccount,
  (opportunities, account) =>
    account
      ? opportunities.filter((o) => o.clinicAccountId === account.id && o.status === 'active')
      : [],
);

export const selectMyOpportunities = createSelector(
  selectOpportunities,
  selectCurrentAccount,
  (opportunities, account) =>
    account ? opportunities.filter((o) => o.clinicAccountId === account.id) : [],
);

export const selectOpportunityBySlug = (clinicSlug: string, positionSlug: string) =>
  createSelector(selectOpportunities, (opportunities) =>
    opportunities.find((o) => o.slug === clinicSlug && o.positionSlug === positionSlug),
  );

export const selectPassportByTalentSlug = (talentSlug: string) =>
  createSelector(selectPassportShares, selectAccounts, (passports, accounts) => {
    for (const passport of passports) {
      if (!passport.active) continue;
      const account = accounts[passport.talentAccountId];
      if (!account) continue;
      const expectedSlug = account.displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (expectedSlug === talentSlug) {
        return { passport, account };
      }
    }
    return undefined;
  });

export const selectApplicationsForMyClinic = createSelector(
  selectApplications,
  selectCurrentAccount,
  (apps, account) => (account ? apps.filter((a) => a.clinicAccountId === account.id) : []),
);

export const selectPendingTalentCount = createSelector(selectApplicationsForMyClinic, (apps) => {
  const pendingIds = new Set(
    apps
      .filter((a) => a.status === 'invited' || a.status === 'interested')
      .map((a) => a.talentAccountId),
  );
  return pendingIds.size;
});

export const selectApplicationsForMyTalent = createSelector(
  selectApplications,
  selectCurrentAccount,
  (apps, account) => (account ? apps.filter((a) => a.talentAccountId === account.id) : []),
);

export const selectFounderCount = createSelector(
  selectActiveAccounts,
  (accounts) => accounts.filter((a) => a.founder).length,
);

export const selectFounderSpotsRemaining = createSelector(selectActiveAccounts, (accounts) =>
  Math.max(0, 1000 - accounts.length),
);

export const selectAccountCount = createSelector(
  selectActiveAccounts,
  (accounts) => accounts.length,
);
