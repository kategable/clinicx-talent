import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../../core/store/app.actions';
import { selectCurrentAccount, selectHiring } from '../../../core/store/app.selectors';
import { ThemePicker } from '../../../shared/theme-picker/theme-picker';

@Component({
  selector: 'app-clinic-opportunities-list',
  imports: [RouterLink, MatButtonModule, ThemePicker],
  templateUrl: './clinic-opportunities-list.html',
  styleUrl: './clinic-opportunities-list.scss',
})
export class ClinicOpportunitiesList {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  private readonly hiring = this.store.selectSignal(selectHiring);

  /** All opportunities for the current clinic (including deleted). */
  protected readonly myOpportunities = computed(() => {
    const acc = this.account();
    if (!acc) return [];
    return this.hiring().opportunities.filter((o) => o.clinicAccountId === acc.id);
  });

  protected readonly showDeleted = signal(false);

  protected readonly visibleOpportunities = computed(() => {
    if (this.showDeleted()) {
      return this.myOpportunities();
    }
    return this.myOpportunities().filter((o) => !o.deletedAt);
  });

  protected copyLink(slug: string, positionSlug: string): void {
    const link = `${window.location.origin}/join/${slug}/${positionSlug}`;
    void navigator.clipboard.writeText(link);
  }

  protected softDelete(id: string): void {
    this.store.dispatch(AppActions.softDeleteOpportunity({ id }));
  }
  protected restore(id: string): void {
    this.store.dispatch(AppActions.restoreOpportunity({ id }));
  }
  protected toggleDeleted(): void {
    this.showDeleted.update((v) => !v);
  }
}
