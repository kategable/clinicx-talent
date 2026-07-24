import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { AccountType, ReviewStatus } from '../../core/account';
import { AppActions } from '../../core/store/app.actions';
import {
  selectAccountValues,
  selectPendingCount,
  selectVerificationLockedPhones,
  selectVerificationFlagged,
} from '../../core/store/app.selectors';

type SortKey = 'status' | 'type' | 'createdAt';

const STATUS_ORDER: Record<ReviewStatus, number> = {
  'under-review': 0,
  'on-hold': 1,
  approved: 2,
};

@Component({
  selector: 'app-admin-accounts',
  imports: [MatButtonModule],
  templateUrl: './admin-accounts.html',
  styleUrl: './admin-accounts.scss',
})
export class AdminAccounts {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

  private readonly typeFilter = this.route.snapshot.data['typeFilter'] as
    | AccountType
    | undefined;

  constructor() {
    this.store.dispatch(AppActions.loadAllAccounts());
  }

  // Reactive — re-computes when the store changes (e.g. admin approves an account).
  private readonly storeAccounts = this.store.selectSignal(selectAccountValues);

  protected readonly pendingCount = this.store.selectSignal(selectPendingCount);
  protected readonly verificationFlagged = this.store.selectSignal(selectVerificationFlagged);
  protected readonly lockedPhones = this.store.selectSignal(selectVerificationLockedPhones);

  protected readonly sortKey = signal<SortKey>('status');
  protected readonly sortAsc = signal(false);

  protected readonly accounts = computed(() => {
    let list = this.storeAccounts();
    if (this.typeFilter) {
      list = list.filter((a) => a.type === this.typeFilter);
    }
    const key = this.sortKey();
    const asc = this.sortAsc();

    const sorted = [...list];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (key === 'status') {
        cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      } else if (key === 'type') {
        cmp = a.type.localeCompare(b.type);
      } else {
        cmp = a.createdAt.localeCompare(b.createdAt);
      }
      return asc ? cmp : -cmp;
    });
    return sorted;
  });

  protected toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortAsc.update((v) => !v);
    } else {
      this.sortKey.set(key);
      this.sortAsc.set(false);
    }
  }

  protected sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) return '';
    return this.sortAsc() ? ' ↑' : ' ↓';
  }

  protected setStatus(id: string, status: ReviewStatus): void {
    this.store.dispatch(AppActions.setReviewStatus({ id, status }));
  }
  protected resetVerification(): void {
    this.store.dispatch(AppActions.resetVerification());
  }
  protected statusLabel(status: ReviewStatus): string {
    return status.replace('-', ' ');
  }
}
