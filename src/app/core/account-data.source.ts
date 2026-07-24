import { Injectable } from '@angular/core';
import { AccountRecord, SEEDED_ACCOUNTS } from './account';
import { APP_STORAGE_KEY } from './store/app.effects';

/**
 * Abstract data source for account records. The MVP implementation reads from
 * seeds + localStorage. Swap to HttpAccountDataSource when the backend is ready
 * — no other code needs to change.
 */
export abstract class AccountDataSource {
  abstract getAll(): Record<string, AccountRecord>;
  abstract getById(id: string): AccountRecord | undefined;
  abstract invalidate(): void;
}

/**
 * MVP data source: seeds (simulating server baseline) merged with
 * localStorage (simulating user-created records from the database).
 */
@Injectable()
export class LocalAccountDataSource implements AccountDataSource {
  private cache: Record<string, AccountRecord> | null = null;

  getAll(): Record<string, AccountRecord> {
    if (this.cache) return this.cache;

    const record: Record<string, AccountRecord> = {};
    // Layer 1: seed accounts (the "server" baseline)
    for (const a of SEEDED_ACCOUNTS) {
      record[a.id] = a;
    }
    // Layer 2: user-created accounts from localStorage (the "database")
    try {
      const saved = localStorage.getItem(APP_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as {
          accounts?: AccountRecord[];
        };
        if (state.accounts && Array.isArray(state.accounts)) {
          for (const a of state.accounts) {
            if (!a?.id) continue;
            record[a.id] = { ...record[a.id], ...a };
          }
        }
      }
    } catch {
      // localStorage unavailable or corrupted — seeds only
    }

    this.cache = record;
    return record;
  }

  getById(id: string): AccountRecord | undefined {
    return this.getAll()[id];
  }

  invalidate(): void {
    this.cache = null;
  }
}
