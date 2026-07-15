import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../core/store/app.actions';
import { selectCurrentAccount, selectReviewReminderSent } from '../../core/store/app.selectors';

@Component({
  selector: 'app-account-status',
  imports: [RouterLink],
  templateUrl: './account-status.html',
  styleUrl: './account-status.scss',
})
export class AccountStatus {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  protected readonly reminderSent = this.store.selectSignal(selectReviewReminderSent);

  protected requestReminder(): void {
    const account = this.account();
    if (!account || this.reminderSent()) return;
    this.store.dispatch(AppActions.requestReviewReminder({ accountId: account.id }));
  }
}
