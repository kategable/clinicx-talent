import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppState } from './app.state';

export const selectAppState = createFeatureSelector<AppState>('app');
export const selectAccounts = createSelector(selectAppState, (state) => state.accounts);
export const selectCurrentAccount = createSelector(selectAppState, (state) =>
  state.accounts.find((account) => account.id === state.activeAccountId),
);
export const selectPendingCount = createSelector(
  selectAccounts,
  (accounts) => accounts.filter((account) => account.status === 'under-review').length,
);
export const selectRegistration = createSelector(selectAppState, (state) => state.registration);
export const selectError = createSelector(selectAppState, (state) => state.error);
export const selectAdminAuthenticated = createSelector(
  selectAppState,
  (state) => state.adminAuthenticated,
);
export const selectVerificationBlocked = createSelector(
  selectAppState,
  (state) => state.verificationSecurity.blocked,
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
  (state, account) => account?.themePreference ?? state.themePreference,
);
