import { ActionReducer, INIT, UPDATE } from '@ngrx/store';
import { AccountRecord, toAccountsRecord } from '../account';
import { canBecomeFounder } from '../founder';
import { AppState, initialAppState } from './app.state';
import {
  APP_STORAGE_KEY,
  GUEST_THEME_SESSION_KEY,
  REVIEW_REMINDER_SESSION_KEY,
} from './app.effects';

interface RootState {
  app: AppState;
}

/** Normalize legacy array-format accounts to the Record format. */
function normalizeAccounts(
  raw: AccountRecord[] | Record<string, AccountRecord>,
): Record<string, AccountRecord> {
  if (Array.isArray(raw)) {
    const record: Record<string, AccountRecord> = {};
    for (const a of raw) {
      record[a.id] = a;
    }
    return record;
  }
  return raw;
}

function migrateLegacyTalentLanguage(savedState: AppState): AppState {
  const activeAccountId =
    savedState.activeAccountId === 'candidate-demo'
      ? 'talent-demo'
      : savedState.activeAccountId;
  return {
    ...savedState,
    activeAccountId,
    accounts: normalizeAccounts(savedState.accounts as AccountRecord[] | Record<string, AccountRecord>),
    registration: {
      ...savedState.registration,
      accountType:
        (savedState.registration.accountType as string) === 'candidate'
          ? 'talent'
          : savedState.registration.accountType,
    },
  };
}

export function hydrationMetaReducer(
  reducer: ActionReducer<RootState>,
): ActionReducer<RootState> {
  return (state, action) => {
    if (action.type === INIT || action.type === UPDATE) {
      try {
        const saved = localStorage.getItem(APP_STORAGE_KEY);
        const reminderValue = sessionStorage.getItem(REVIEW_REMINDER_SESSION_KEY);
        const guestThemeValue = sessionStorage.getItem(GUEST_THEME_SESSION_KEY);
        const pingedAccountIds = reminderValue
          ? (JSON.parse(reminderValue) as string[])
          : [];
        const guestThemePreference =
          guestThemeValue === 'light' || guestThemeValue === 'dark'
            ? guestThemeValue
            : 'auto';
        if (saved) {
          const savedState = migrateLegacyTalentLanguage(
            JSON.parse(saved) as AppState,
          );
          // Normalize and migrate accounts (handles legacy array format)
          const normalized = normalizeAccounts(
            savedState.accounts as
              | AccountRecord[]
              | Record<string, AccountRecord>,
          );
          // Ensure new fields exist on legacy accounts
          const migratedAccounts: Record<string, AccountRecord> = {};
          for (const [id, account] of Object.entries(normalized)) {
            migratedAccounts[id] = {
              ...account,
              id: account.id === 'candidate-demo' ? 'talent-demo' : account.id,
              type: (account.type as string) === 'candidate' ? 'talent' : account.type,
              displayPhone: account.displayPhone ?? '',
              email: account.email ?? '',
              shareEmail: account.shareEmail ?? false,
              sharePhone: account.sharePhone ?? false,
              founder:
                account.founder !== undefined
                  ? account.founder
                  : canBecomeFounder(Object.keys(normalized).length),
            };
          }
          // Merge new seed accounts that don't exist in saved state
          for (const [id, seed] of Object.entries(initialAppState.accounts)) {
            if (!migratedAccounts[id]) {
              migratedAccounts[id] = seed;
            }
          }
          state = {
            ...state,
            app: {
              ...initialAppState,
              ...savedState,
              // Don't auto-hydrate accounts — loaded on demand per session.
              // Reset activeAccountId if the account isn't in seeds (user-created
              // accounts aren't hydrated, so we'd have a dangling pointer).
              accounts: initialAppState.accounts,
              activeAccountId:
                savedState.activeAccountId &&
                initialAppState.accounts[savedState.activeAccountId]
                  ? savedState.activeAccountId
                  : null,
              verificationSecurity: initialAppState.verificationSecurity,
              hiring: {
                ...(savedState.hiring ?? initialAppState.hiring),
                pendingInvite: null,
              },
              reviewReminder: { pingedAccountIds },
              guestThemePreference,
            },
          };
        } else {
          state = {
            ...state,
            app: {
              ...initialAppState,
              reviewReminder: { pingedAccountIds },
              guestThemePreference,
            },
          };
        }
      } catch {
        state = { ...state, app: initialAppState };
      }
    }
    return reducer(state, action);
  };
}
