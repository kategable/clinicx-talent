import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { AccountType, ReviewStatus } from '../../../core/account';
import { AppActions } from '../../../core/store/app.actions';
import {
  selectActiveAccounts,
  selectDeletedAccounts,
  selectPendingCount,
  selectVerificationLockedPhones,
  selectVerificationFlagged,
} from '../../../core/store/app.selectors';

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

  private readonly typeFilter = this.route.snapshot.data['typeFilter'] as AccountType | undefined;

  constructor() {
    this.store.dispatch(AppActions.loadAllAccounts());
  }

  private readonly activeAccounts = this.store.selectSignal(selectActiveAccounts);
  private readonly deletedAccounts = this.store.selectSignal(selectDeletedAccounts);

  protected readonly pendingCount = this.store.selectSignal(selectPendingCount);
  protected readonly verificationFlagged = this.store.selectSignal(selectVerificationFlagged);
  protected readonly lockedPhones = this.store.selectSignal(selectVerificationLockedPhones);

  protected readonly sortKey = signal<SortKey>('createdAt');
  protected readonly sortAsc = signal(true);
  protected readonly showDeleted = signal(false);

  protected readonly accounts = computed(() => {
    const list = this.showDeleted() ? this.deletedAccounts() : this.activeAccounts();
    const filtered = this.typeFilter ? list.filter((a) => a.type === this.typeFilter) : list;
    const key = this.sortKey();
    const asc = this.sortAsc();

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let cmp: number;
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

  protected toggleDeleted(): void {
    this.showDeleted.update((v) => !v);
  }

  protected softDeleteAccount(id: string): void {
    this.store.dispatch(AppActions.softDeleteAccount({ id }));
  }
  protected restoreAccount(id: string): void {
    this.store.dispatch(AppActions.restoreAccount({ id }));
  }
}
