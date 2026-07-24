import { inject, Injectable } from '@angular/core';
import { AccountType } from './account';
import { AccountDataSource } from './account-data.source';

/**
 * Session-scoped account service. Depends on the abstract AccountDataSource
 * — currently provided as LocalAccountDataSource (seeds + localStorage), but
 * swapped to an HTTP implementation when the backend arrives without changing
 * any component code.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly source = inject(AccountDataSource);

  /** Returns all accounts from the data source. */
  getAll() {
    return this.source.getAll();
  }

  /** Returns accounts filtered by type. */
  getByType(type: AccountType) {
    return Object.values(this.source.getAll()).filter((a) => a.type === type);
  }

  /** Returns a single account by ID, or undefined. */
  getById(id: string) {
    return this.source.getById(id);
  }

  /** Clear cache so next read re-fetches from the data source. */
  invalidate(): void {
    this.source.invalidate();
  }
}
