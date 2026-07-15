import { createReducer, on } from '@ngrx/store';
import { formatPhone, normalizePhone, TEST_CREDENTIALS } from '../account';
import { AppActions } from './app.actions';
import { AppState, initialAppState } from './app.state';

function credentialMatches(phone: string, code?: string): boolean {
  return TEST_CREDENTIALS.some(
    (item) => normalizePhone(item.phone) === normalizePhone(phone) && (!code || item.code === code),
  );
}

export const appReducer = createReducer(
  initialAppState,
  on(AppActions.resetRegistration, (state, { accountType, signIn }) => ({
    ...state,
    registration: {
      accountType,
      phone: '',
      step: signIn || accountType ? 'phone' : 'type',
      isSignIn: signIn,
      accountCreated: false,
    },
    error: '',
  })),
  on(AppActions.selectAccountType, (state, { accountType }) => ({
    ...state,
    registration: { ...state.registration, accountType, step: 'phone' },
    error: '',
  })),
  on(AppActions.requestSMSCode, (state, { phone }) => {
    if (state.verificationSecurity.blocked) return state;
    const normalized = normalizePhone(phone);
    const attemptedPhones = state.verificationSecurity.attemptedPhones.includes(normalized)
      ? state.verificationSecurity.attemptedPhones
      : [...state.verificationSecurity.attemptedPhones, normalized];
    const blocked = attemptedPhones.length > 3;
    if (blocked) {
      return {
        ...state,
        verificationSecurity: { attemptedPhones, blocked: true },
        error: 'Verification access has been paused. Contact us to request a usage review.',
      };
    }
    if (!credentialMatches(phone)) {
      return {
        ...state,
        verificationSecurity: { attemptedPhones, blocked: false },
        error: 'For this MVP, use one of the test phone numbers shown below.',
      };
    }
    return {
      ...state,
      registration: { ...state.registration, phone: formatPhone(phone), step: 'code' },
      verificationSecurity: { attemptedPhones, blocked: false },
      error: '',
    };
  }),
  on(AppActions.changePhone, (state) => ({
    ...state,
    registration: { ...state.registration, step: 'phone' },
    error: '',
  })),
  on(AppActions.changeAccountType, (state) => ({
    ...state,
    registration: { ...state.registration, accountType: undefined, step: 'type' },
    error: '',
  })),
  on(AppActions.verifyRegistrationCode, (state, { code }) => {
    const { phone, accountType } = state.registration;
    if (!accountType || !credentialMatches(phone, code)) {
      return {
        ...state,
        error: 'That code does not match this phone number. Try the paired test code.',
      };
    }
    const existing = state.accounts.find(
      (account) => normalizePhone(account.phone) === normalizePhone(phone),
    );
    if (existing) {
      return {
        ...state,
        activeAccountId: existing.id,
        registration: { ...state.registration, accountCreated: false },
        error: '',
      };
    }
    const account = {
      id: `account-${Date.now()}`,
      type: accountType,
      phone: formatPhone(phone),
      status: 'under-review' as const,
      createdAt: 'Today',
      profileComplete: false,
      displayName: accountType === 'clinic' ? 'New clinic' : 'New talent',
    };
    return {
      ...state,
      accounts: [account, ...state.accounts],
      activeAccountId: account.id,
      registration: { ...state.registration, accountCreated: true },
      error: '',
    };
  }),
  on(AppActions.verifySignInCode, (state, { code }) => {
    const { phone } = state.registration;
    const account = state.accounts.find(
      (item) => normalizePhone(item.phone) === normalizePhone(phone),
    );
    if (!credentialMatches(phone, code) || !account) {
      return {
        ...state,
        error:
          'We could not find an account for that phone and code. Create a clinic or talent account first.',
      };
    }
    return { ...state, activeAccountId: account.id, error: '' };
  }),
  on(AppActions.completeProfile, (state, { displayName }) => ({
    ...state,
    accounts: state.accounts.map((account) =>
      account.id === state.activeAccountId
        ? { ...account, displayName, profileComplete: true }
        : account,
    ),
  })),
  on(AppActions.saveClinicDetails, (state, { details }) => ({
    ...state,
    accounts: state.accounts.map((account) =>
      account.id === state.activeAccountId && account.type === 'clinic'
        ? { ...account, displayName: details.clinicName, clinicDetails: details }
        : account,
    ),
  })),
  on(AppActions.saveTalentDetails, (state, { details }) => ({
    ...state,
    accounts: state.accounts.map((account) =>
      account.id === state.activeAccountId && account.type === 'talent'
        ? { ...account, displayName: details.professionalName, talentDetails: details }
        : account,
    ),
  })),
  on(AppActions.setThemePreference, (state, { preference }) => ({
    ...state,
    themePreference: preference,
    accounts: state.accounts.map((account) =>
      account.id === state.activeAccountId ? { ...account, themePreference: preference } : account,
    ),
  })),
  on(AppActions.setReviewStatus, (state, { id, status }) => ({
    ...state,
    accounts: state.accounts.map((account) =>
      account.id === id ? { ...account, status } : account,
    ),
  })),
  on(AppActions.signOut, (state) => ({ ...state, activeAccountId: null })),
  on(AppActions.requestReviewReminder, (state, { accountId }) => ({
    ...state,
    reviewReminder: {
      pingedAccountIds: state.reviewReminder.pingedAccountIds.includes(accountId)
        ? state.reviewReminder.pingedAccountIds
        : [...state.reviewReminder.pingedAccountIds, accountId],
    },
  })),
  on(AppActions.adminLogin, (state, { username, password }) =>
    username === 'admin' && password === 'admin'
      ? { ...state, adminAuthenticated: true, error: '' }
      : { ...state, adminAuthenticated: false, error: 'Incorrect admin username or password.' },
  ),
  on(AppActions.adminLogout, (state) => ({ ...state, adminAuthenticated: false, error: '' })),
  on(AppActions.clearError, (state) => ({ ...state, error: '' })),
);
