import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ReviewStatus } from '../../core/account';
import { AppActions } from '../../core/store/app.actions';
import { selectAccounts, selectPendingCount } from '../../core/store/app.selectors';

@Component({
  selector: 'app-admin-accounts',
  imports: [RouterLink],
  templateUrl: './admin-accounts.html',
  styleUrl: './admin-accounts.scss',
})
export class AdminAccounts {
  private readonly store = inject(Store);
  protected readonly accounts = this.store.selectSignal(selectAccounts);
  protected readonly pendingCount = this.store.selectSignal(selectPendingCount);
  protected setStatus(id: string, status: ReviewStatus): void {
    this.store.dispatch(AppActions.setReviewStatus({ id, status }));
  }
  protected signOut(): void {
    this.store.dispatch(AppActions.adminLogout());
  }
  protected statusLabel(status: ReviewStatus): string {
    return status.replace('-', ' ');
  }
}
