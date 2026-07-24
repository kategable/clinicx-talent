import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../core/store/app.actions';
import {
  selectCurrentAccount,
  selectMyOpportunities,
} from '../../core/store/app.selectors';
import { ThemePicker } from '../../shared/theme-picker/theme-picker';

@Component({
  selector: 'app-clinic-opportunities-list',
  imports: [RouterLink, MatButtonModule, ThemePicker],
  templateUrl: './clinic-opportunities-list.html',
  styleUrl: './clinic-opportunities-list.scss',
})
export class ClinicOpportunitiesList {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  protected readonly opportunities = this.store.selectSignal(selectMyOpportunities);

  protected copyLink(slug: string, positionSlug: string): void {
    const link = `${window.location.origin}/join/${slug}/${positionSlug}`;
    void navigator.clipboard.writeText(link);
  }

  protected toggleStatus(opportunityId: string, current: string): void {
    const next = current === 'active' ? 'paused' : 'active';
    this.store.dispatch(
      AppActions.updateApplicationStatus({
        applicationId: opportunityId,
        status: next as 'invited',
      }),
    );
  }
}
