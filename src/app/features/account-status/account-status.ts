import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Store } from '@ngrx/store';
import { AppActions } from '../../core/store/app.actions';
import {
  selectAccounts,
  selectCurrentAccount,
  selectReviewReminderSent,
} from '../../core/store/app.selectors';
import { FounderBadge } from '../../shared/founder-badge/founder-badge';

@Component({
  selector: 'app-account-status',
  imports: [RouterLink, MatButtonModule, FounderBadge],
  templateUrl: './account-status.html',
  styleUrl: './account-status.scss',
})
export class AccountStatus {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  protected readonly accounts = this.store.selectSignal(selectAccounts);
  protected readonly reminderSent = this.store.selectSignal(selectReviewReminderSent);

  protected readonly founderMemberNumber = computed(() => {
    const acct = this.account();
    if (!acct?.founder) return null;
    const founders = Object.values(this.accounts()).filter((a) => a.founder);
    const idx = founders.findIndex((a) => a.id === acct.id);
    return idx >= 0 ? idx + 1 : null;
  });

  protected requestReminder(): void {
    const account = this.account();
    if (!account || this.reminderSent()) return;
    this.store.dispatch(AppActions.requestReviewReminder({ accountId: account.id }));
  }
}
