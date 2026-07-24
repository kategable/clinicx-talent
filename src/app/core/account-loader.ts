import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AccountRecord, SEEDED_ACCOUNTS, toAccountsRecord } from './account';
import { AppActions } from './store/app.actions';
import { APP_STORAGE_KEY } from './store/app.effects';

/** Loads accounts from localStorage on demand — not at init. */
@Injectable({ providedIn: 'root' })
export class AccountLoader {
  private readonly store = inject(Store);

  /** Load all accounts (seeds + any saved) into the store. Use on admin page. */
  loadAll(): void {
    const seedRecord = toAccountsRecord(SEEDED_ACCOUNTS);
    let merged = { ...seedRecord };
    try {
      const saved = localStorage.getItem(APP_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as { accounts?: AccountRecord[] };
        if (state.accounts && Array.isArray(state.accounts)) {
          for (const a of state.accounts) {
            merged[a.id] = a as AccountRecord;
          }
        }
      }
    } catch {
      // localStorage unavailable or corrupted
    }
    this.store.dispatch(AppActions.loadAccounts({ accounts: merged }));
  }

  /** Load talent accounts only (for talent search). */
  loadTalents(): void {
    const seedRecord = toAccountsRecord(SEEDED_ACCOUNTS);
    const talents: Record<string, AccountRecord> = {};
    for (const [id, a] of Object.entries(seedRecord)) {
      if (a.type === 'talent') talents[id] = a;
    }
    try {
      const saved = localStorage.getItem(APP_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as { accounts?: AccountRecord[] };
        if (state.accounts && Array.isArray(state.accounts)) {
          for (const a of state.accounts) {
            if ((a as AccountRecord).type === 'talent') {
              talents[a.id] = a as AccountRecord;
            }
          }
        }
      }
    } catch {
      // localStorage unavailable
    }
    this.store.dispatch(AppActions.loadAccounts({ accounts: talents }));
  }

  /** Load a single account by ID from localStorage or seeds. */
  loadById(id: string): void {
    const seedRecord = toAccountsRecord(SEEDED_ACCOUNTS);
    if (seedRecord[id]) {
      this.store.dispatch(
        AppActions.loadAccounts({ accounts: { [id]: seedRecord[id] } }),
      );
      return;
    }
    try {
      const saved = localStorage.getItem(APP_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as { accounts?: AccountRecord[] };
        if (state.accounts && Array.isArray(state.accounts)) {
          const found = state.accounts.find((a) => a.id === id);
          if (found) {
            this.store.dispatch(
              AppActions.loadAccounts({ accounts: { [id]: found } }),
            );
          }
        }
      }
    } catch {
      // localStorage unavailable
    }
  }
}
