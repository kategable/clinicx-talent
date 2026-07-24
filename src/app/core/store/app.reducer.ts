import { createReducer, on } from '@ngrx/store';
import { formatPhone, normalizePhone, TEST_CREDENTIALS } from '../account';
import { canBecomeFounder } from '../founder';
import { defaultExpiresAt, generateInviteToken, generateSlug } from '../hiring';
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
    const normalized = normalizePhone(phone);

    // Authenticated users bypass rate limiting — they're known accounts
    if (state.activeAccountId) {
      if (!credentialMatches(phone)) {
        return {
          ...state,
          error: 'For this MVP, use one of the test phone numbers shown below.',
        };
      }
      return {
        ...state,
        registration: { ...state.registration, phone: formatPhone(phone), step: 'code' },
        error: '',
      };
    }

    // Per-phone lockout: this specific phone exceeded 3 attempts
    if (state.verificationSecurity.lockedPhones.includes(normalized)) {
      return {
        ...state,
        error:
          'This phone number has been temporarily locked due to too many attempts. Try another number or contact support.',
      };
    }

    // Track attempts per phone
    const existing = state.verificationSecurity.phoneAttempts[normalized];
    const count = (existing?.count ?? 0) + 1;
    const phoneAttempts = {
      ...state.verificationSecurity.phoneAttempts,
      [normalized]: { count },
    };

    const distinctPhones = Object.keys(phoneAttempts).length;

    // Lock this specific phone after 3 failed attempts
    const alreadyLocked = state.verificationSecurity.lockedPhones.includes(normalized);
    const lockedPhones =
      count > 3 && !alreadyLocked
        ? [...state.verificationSecurity.lockedPhones, normalized]
        : state.verificationSecurity.lockedPhones;

    // Flag system if >5 distinct phones — admin review, doesn't block anyone
    const flagged = distinctPhones > 5;

    if (!credentialMatches(phone)) {
      if (count > 3) {
        return {
          ...state,
          verificationSecurity: { phoneAttempts, lockedPhones, flagged },
          error:
            'This phone number has been temporarily locked due to too many attempts. Try another number or contact support.',
        };
      }
      return {
        ...state,
        verificationSecurity: { phoneAttempts, lockedPhones, flagged },
        error: 'For this MVP, use one of the test phone numbers shown below.',
      };
    }

    return {
      ...state,
      registration: { ...state.registration, phone: formatPhone(phone), step: 'code' },
      verificationSecurity: { phoneAttempts, lockedPhones, flagged },
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
    const existing = Object.values(state.accounts).find(
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
      displayPhone: '',
      email: '',
      shareEmail: false,
      sharePhone: false,
      status: 'under-review' as const,
      createdAt: 'Today',
      profileComplete: false,
      displayName: accountType === 'clinic' ? 'New clinic' : 'New talent',
      founder: canBecomeFounder(Object.keys(state.accounts).length),
    };
    return {
      ...state,
      accounts: { [account.id]: account, ...state.accounts },
      activeAccountId: account.id,
      registration: { ...state.registration, accountCreated: true },
      error: '',
    };
  }),
  on(AppActions.verifySignInCode, (state, { code }) => {
    const { phone } = state.registration;
    const account = Object.values(state.accounts).find(
      (item) => normalizePhone(item.phone) === normalizePhone(phone),
    );
    if (!credentialMatches(phone, code) || !account) {
      return {
        ...state,
        error:
          'We could not find an account for that phone and code. Create a clinic or talent account first.',
      };
    }
    return {
      ...state,
      activeAccountId: account.id,
      accounts: { ...state.accounts, [account.id]: account },
      error: '',
    };
  }),
  on(AppActions.completeProfile, (state, { displayName }) => ({
    ...state,
    accounts:
      state.activeAccountId && state.accounts[state.activeAccountId]
        ? {
            ...state.accounts,
            [state.activeAccountId]: {
              ...state.accounts[state.activeAccountId],
              displayName,
              profileComplete: true,
            },
          }
        : state.accounts,
  })),
  on(AppActions.saveClinicDetails, (state, { details }) => ({
    ...state,
    accounts:
      state.activeAccountId && state.accounts[state.activeAccountId]?.type === 'clinic'
        ? {
            ...state.accounts,
            [state.activeAccountId]: {
              ...state.accounts[state.activeAccountId],
              displayName: details.clinicName,
              clinicDetails: details,
            },
          }
        : state.accounts,
  })),
  on(AppActions.saveTalentDetails, (state, { details }) => ({
    ...state,
    accounts:
      state.activeAccountId && state.accounts[state.activeAccountId]?.type === 'talent'
        ? {
            ...state.accounts,
            [state.activeAccountId]: {
              ...state.accounts[state.activeAccountId],
              displayName: details.professionalName,
              talentDetails: details,
            },
          }
        : state.accounts,
  })),
  on(AppActions.setThemePreference, (state, { preference }) => ({
    ...state,
    guestThemePreference: state.activeAccountId ? state.guestThemePreference : preference,
    accounts:
      state.activeAccountId && state.accounts[state.activeAccountId]
        ? {
            ...state.accounts,
            [state.activeAccountId]: {
              ...state.accounts[state.activeAccountId],
              themePreference: preference,
            },
          }
        : state.accounts,
  })),
  on(AppActions.setReviewStatus, (state, { id, status }) => ({
    ...state,
    accounts: state.accounts[id]
      ? {
          ...state.accounts,
          [id]: { ...state.accounts[id], status },
        }
      : state.accounts,
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
  on(AppActions.resetVerification, (state) => ({
    ...state,
    verificationSecurity: { phoneAttempts: {}, lockedPhones: [], flagged: false },
    error: '',
  })),
  on(
    AppActions.loadHiringData,
    (state, { opportunities, invites, applications }) => ({
      ...state,
      hiring: { ...state.hiring, opportunities, invites, applications },
    }),
  ),
  on(AppActions.loadAccounts, (state, { accounts }) => ({
    ...state,
    accounts: { ...accounts, ...state.accounts }, // merge, don't replace
  })),
  on(AppActions.clearError, (state) => ({ ...state, error: '' })),

  // -- Hiring: opportunity creation -----------------------------------------
  on(
    AppActions.createOpportunity,
    (
      state,
      { clinicName, position, location, payRange, mustHaveSkills, benefits, urgency, idealHire },
    ) => {
      const slug = generateSlug(clinicName);
      const positionSlug = generateSlug(position);
      const opportunityId = `opportunity-${Date.now()}`;
      const inviteId = `invite-${Date.now()}`;
      const token = generateInviteToken();

      const opportunity: typeof state.hiring.opportunities[number] = {
        id: opportunityId,
        clinicAccountId: state.activeAccountId!,
        slug,
        positionSlug,
        title: position,
        location,
        payRange,
        mustHaveSkills,
        benefits,
        urgency,
        idealHire,
        status: 'active',
        createdAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };

      const invite: typeof state.hiring.invites[number] = {
        id: inviteId,
        opportunityId,
        token,
        createdAt: opportunity.createdAt,
        expiresAt: defaultExpiresAt(),
        active: true,
      };

      return {
        ...state,
        hiring: {
          ...state.hiring,
          opportunities: [opportunity, ...state.hiring.opportunities],
          invites: [invite, ...state.hiring.invites],
        },
      };
    },
  ),

  // -- Hiring: talent passport share ----------------------------------------
  on(AppActions.shareTalentPassport, (state, { talentAccountId }) => {
    const token = generateInviteToken();
    const passport: typeof state.hiring.passportShares[number] = {
      id: `passport-${Date.now()}`,
      talentAccountId,
      token,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      active: true,
    };
    return {
      ...state,
      hiring: {
        ...state.hiring,
        passportShares: [passport, ...state.hiring.passportShares],
      },
    };
  }),

  // -- Hiring: accept invite (both directions) -------------------------------
  on(AppActions.acceptHiringInvite, (state, { token }) => {
    const invite = state.hiring.invites.find(
      (i) => i.token === token && i.active,
    );
    if (!invite) {
      return {
        ...state,
        error: 'This invitation link is no longer active.',
      };
    }
    return {
      ...state,
      error: '',
      hiring: {
        ...state.hiring,
        pendingInvite: {
          token,
          type: 'hiring-link',
          opportunityId: invite.opportunityId,
        },
      },
    };
  }),

  on(AppActions.acceptPassportInvite, (state, { token }) => {
    const passport = state.hiring.passportShares.find(
      (p) => p.token === token && p.active,
    );
    if (!passport) {
      return {
        ...state,
        error: 'This talent profile link is no longer active.',
      };
    }
    return {
      ...state,
      error: '',
      hiring: {
        ...state.hiring,
        pendingInvite: {
          token,
          type: 'talent-passport',
          talentAccountId: passport.talentAccountId,
        },
      },
    };
  }),

  // -- Hiring: create application from pending invite ------------------------
  on(AppActions.createApplicationFromInvite, (state) => {
    const { pendingInvite } = state.hiring;
    if (!pendingInvite || !state.activeAccountId) return state;

    const applicationId = `app-${Date.now()}`;
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (pendingInvite.type === 'hiring-link') {
      const existing = state.hiring.applications.find(
        (a) =>
          a.talentAccountId === state.activeAccountId &&
          a.opportunityId === pendingInvite.opportunityId,
      );
      if (existing) {
        return { ...state, hiring: { ...state.hiring, pendingInvite: null } };
      }

      const app: typeof state.hiring.applications[number] = {
        id: applicationId,
        opportunityId: pendingInvite.opportunityId,
        talentAccountId: state.activeAccountId,
        clinicAccountId:
          state.hiring.opportunities.find(
            (o) => o.id === pendingInvite.opportunityId,
          )?.clinicAccountId ?? '',
        source: 'clinic-hiring-link',
        status: 'invited',
        acceptedAt: today,
        submittedAt: today,
      };
      return {
        ...state,
        hiring: {
          ...state.hiring,
          applications: [app, ...state.hiring.applications],
          pendingInvite: null,
        },
      };
    }

    // talent-passport direction
    const existing = state.hiring.applications.find(
      (a) =>
        a.clinicAccountId === state.activeAccountId &&
        a.talentAccountId === pendingInvite.talentAccountId,
    );
    if (existing) {
      return { ...state, hiring: { ...state.hiring, pendingInvite: null } };
    }

    const app: typeof state.hiring.applications[number] = {
      id: applicationId,
      talentAccountId: pendingInvite.talentAccountId!,
      clinicAccountId: state.activeAccountId,
      source: 'talent-passport',
      status: 'invited',
      acceptedAt: today,
      submittedAt: today,
    };
    return {
      ...state,
      hiring: {
        ...state.hiring,
        applications: [app, ...state.hiring.applications],
        pendingInvite: null,
      },
    };
  }),

  // -- Hiring: update application status -------------------------------------
  on(AppActions.updateApplicationStatus, (state, { applicationId, status }) => ({
    ...state,
    hiring: {
      ...state.hiring,
      applications: state.hiring.applications.map((app) =>
        app.id === applicationId ? { ...app, status } : app,
      ),
    },
  })),

  // -- Account: save contact preferences ------------------------------------
  on(
    AppActions.saveAccountContact,
    (state, { email, displayPhone, shareEmail, sharePhone }) => ({
      ...state,
      accounts:
        state.activeAccountId && state.accounts[state.activeAccountId]
          ? {
              ...state.accounts,
              [state.activeAccountId]: {
                ...state.accounts[state.activeAccountId],
                email,
                displayPhone,
                shareEmail,
                sharePhone,
              },
            }
          : state.accounts,
    }),
  ),

  // -- Hiring: add talent directly (no token needed) -------------------------
  on(AppActions.addTalentToMyClinic, (state, { talentAccountId }) => {
    if (!state.activeAccountId) return state;
    const existing = state.hiring.applications.find(
      (a) =>
        a.clinicAccountId === state.activeAccountId &&
        a.talentAccountId === talentAccountId,
    );
    if (existing) return state;

    const app: typeof state.hiring.applications[number] = {
      id: `app-${Date.now()}`,
      talentAccountId,
      clinicAccountId: state.activeAccountId,
      source: 'talent-passport' as const,
      status: 'invited' as const,
      acceptedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      submittedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
    return {
      ...state,
      hiring: {
        ...state.hiring,
        applications: [app, ...state.hiring.applications],
      },
    };
  }),

  // -- Hiring: clear pending invite ------------------------------------------
  on(AppActions.clearPendingInvite, (state) => ({
    ...state,
    hiring: { ...state.hiring, pendingInvite: null },
  })),
);
