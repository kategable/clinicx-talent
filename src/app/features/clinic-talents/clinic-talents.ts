import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAccounts, selectCurrentAccount } from '../../core/store/app.selectors';

@Component({
  selector: 'app-clinic-talents',
  imports: [RouterLink],
  templateUrl: './clinic-talents.html',
  styleUrl: './clinic-talents.scss',
})
export class ClinicTalents {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  private readonly accounts = this.store.selectSignal(selectAccounts);
  protected readonly talents = computed(() =>
    this.accounts().filter(
      (account) =>
        account.type === 'talent' && account.status === 'approved' && account.talentDetails,
    ),
  );

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('');
  }
}
