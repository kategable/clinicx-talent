import { AccountRecord, AccountType, SEEDED_ACCOUNTS, ThemePreference, toAccountsRecord } from '../account';
import {
  HiringInvite,
  HiringOpportunity,
  SEEDED_APPLICATIONS,
  SEEDED_INVITES,
  SEEDED_OPPORTUNITIES,
  SEEDED_PASSPORTS,
  TalentApplication,
  TalentPassportShare,
} from '../hiring';

export type RegistrationStep = 'type' | 'phone' | 'code';

export interface AppState {
  accounts: Record<string, AccountRecord>;
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
    /** Per-phone attempt counts: normalizedPhone → { count, firstAttemptAt } */
    phoneAttempts: Record<string, { count: number }>;
    /** Phones currently locked (exceeded attempt limit) */
    lockedPhones: string[];
    /** Set when >5 distinct phones attempted — alerts admin, doesn't block anyone */
    flagged: boolean;
  };
  reviewReminder: {
    pingedAccountIds: string[];
  };
  guestThemePreference: ThemePreference;
  error: string;
  hiring: {
    opportunities: HiringOpportunity[];
    invites: HiringInvite[];
    passportShares: TalentPassportShare[];
    applications: TalentApplication[];
    pendingInvite: {
      token: string;
      type: 'hiring-link' | 'talent-passport';
      opportunityId?: string;
      talentAccountId?: string;
    } | null;
  };
}

export const initialAppState: AppState = {
  accounts: toAccountsRecord(SEEDED_ACCOUNTS), // Seed directory for referral flows
  activeAccountId: null,
  registration: { phone: '', step: 'type', isSignIn: false, accountCreated: false },
  adminAuthenticated: false,
  verificationSecurity: { phoneAttempts: {}, lockedPhones: [], flagged: false },
  reviewReminder: { pingedAccountIds: [] },
  guestThemePreference: 'auto',
  error: '',
  hiring: {
    opportunities: SEEDED_OPPORTUNITIES,
    invites: SEEDED_INVITES,
    passportShares: SEEDED_PASSPORTS,
    applications: SEEDED_APPLICATIONS,
    pendingInvite: null,
  },
};
