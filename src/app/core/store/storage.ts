import { ActionReducer, INIT, UPDATE } from '@ngrx/store';
import { AppState, initialAppState } from './app.state';
import {
  APP_STORAGE_KEY,
  GUEST_THEME_SESSION_KEY,
  REVIEW_REMINDER_SESSION_KEY,
} from './app.effects';

interface RootState {
  app: AppState;
}

function migrateLegacyTalentLanguage(savedState: AppState): AppState {
  const activeAccountId =
    savedState.activeAccountId === 'candidate-demo' ? 'talent-demo' : savedState.activeAccountId;
  return {
    ...savedState,
    activeAccountId,
    accounts: savedState.accounts.map((account) => ({
      ...account,
      id: account.id === 'candidate-demo' ? 'talent-demo' : account.id,
      type: (account.type as string) === 'candidate' ? 'talent' : account.type,
    })),
    registration: {
      ...savedState.registration,
      accountType:
        (savedState.registration.accountType as string) === 'candidate'
          ? 'talent'
          : savedState.registration.accountType,
    },
  };
}

export function hydrationMetaReducer(reducer: ActionReducer<RootState>): ActionReducer<RootState> {
  return (state, action) => {
    if (action.type === INIT || action.type === UPDATE) {
      try {
        const saved = localStorage.getItem(APP_STORAGE_KEY);
        const reminderValue = sessionStorage.getItem(REVIEW_REMINDER_SESSION_KEY);
        const guestThemeValue = sessionStorage.getItem(GUEST_THEME_SESSION_KEY);
        const pingedAccountIds = reminderValue ? (JSON.parse(reminderValue) as string[]) : [];
        const guestThemePreference =
          guestThemeValue === 'light' || guestThemeValue === 'dark' ? guestThemeValue : 'auto';
        if (saved) {
          const savedState = migrateLegacyTalentLanguage(JSON.parse(saved) as AppState);
          state = {
            ...state,
            app: {
              ...initialAppState,
              ...savedState,
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
