import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppState } from './app.state';

export const selectAppState = createFeatureSelector<AppState>('app');
export const selectAccounts = createSelector(selectAppState, (state) => state.accounts);
export const selectAccountValues = createSelector(selectAccounts, (accounts) =>
  Object.values(accounts),
);
export const selectCurrentAccount = createSelector(selectAppState, (state) =>
  state.activeAccountId ? state.accounts[state.activeAccountId] : undefined,
);
export const selectPendingCount = createSelector(
  selectAccountValues,
  (accounts) => accounts.filter((a) => a.status === 'under-review').length,
);
export const selectRegistration = createSelector(selectAppState, (state) => state.registration);
export const selectError = createSelector(selectAppState, (state) => state.error);
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
export const selectOpportunities = createSelector(selectHiring, (h) => h.opportunities);
export const selectInvites = createSelector(selectHiring, (h) => h.invites);
export const selectPassportShares = createSelector(selectHiring, (h) => h.passportShares);
export const selectApplications = createSelector(selectHiring, (h) => h.applications);
export const selectPendingInvite = createSelector(selectHiring, (h) => h.pendingInvite);

export const selectMyActiveOpportunities = createSelector(
  selectOpportunities,
  selectCurrentAccount,
  (opportunities, account) =>
    account
      ? opportunities.filter(
          (o) => o.clinicAccountId === account.id && o.status === 'active',
        )
      : [],
);

export const selectMyOpportunities = createSelector(
  selectOpportunities,
  selectCurrentAccount,
  (opportunities, account) =>
    account ? opportunities.filter((o) => o.clinicAccountId === account.id) : [],
);

export const selectOpportunityBySlug = (
  clinicSlug: string,
  positionSlug: string,
) =>
  createSelector(selectOpportunities, (opportunities) =>
    opportunities.find(
      (o) => o.slug === clinicSlug && o.positionSlug === positionSlug,
    ),
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
  (apps, account) =>
    account ? apps.filter((a) => a.clinicAccountId === account.id) : [],
);

export const selectPendingTalentCount = createSelector(
  selectApplicationsForMyClinic,
  (apps) => {
    const pendingIds = new Set(
      apps
        .filter(
          (a) => a.status === 'invited' || a.status === 'interested',
        )
        .map((a) => a.talentAccountId),
    );
    return pendingIds.size;
  },
);

export const selectApplicationsForMyTalent = createSelector(
  selectApplications,
  selectCurrentAccount,
  (apps, account) =>
    account ? apps.filter((a) => a.talentAccountId === account.id) : [],
);

export const selectFounderCount = createSelector(
  selectAccountValues,
  (accounts) => accounts.filter((a) => a.founder).length,
);

export const selectFounderSpotsRemaining = createSelector(
  selectAccountValues,
  (accounts) =>
    Math.max(0, 1000 - accounts.length),
);

export const selectAccountCount = createSelector(
  selectAccounts,
  (accounts) => Object.keys(accounts).length,
);
