import { AccountRecord, AccountType, SEEDED_ACCOUNTS, ThemePreference } from '../account';

export type RegistrationStep = 'type' | 'phone' | 'code';

export interface AppState {
  accounts: AccountRecord[];
  activeAccountId: string | null;
  registration: {
    accountType?: AccountType;
    phone: string;
    step: RegistrationStep;
    isSignIn: boolean;
    accountCreated: boolean;
  };
  adminAuthenticated: boolean;
  verificationSecurity: {
    attemptedPhones: string[];
    blocked: boolean;
  };
  reviewReminder: {
    pingedAccountIds: string[];
  };
  themePreference: ThemePreference;
  error: string;
}

export const initialAppState: AppState = {
  accounts: SEEDED_ACCOUNTS,
  activeAccountId: null,
  registration: { phone: '', step: 'type', isSignIn: false, accountCreated: false },
  adminAuthenticated: false,
  verificationSecurity: { attemptedPhones: [], blocked: false },
  reviewReminder: { pingedAccountIds: [] },
  themePreference: 'auto',
  error: '',
};
