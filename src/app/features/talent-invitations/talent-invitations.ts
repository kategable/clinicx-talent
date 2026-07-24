import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { applicationStatusLabel, generateSlug } from '../../core/hiring';
import { AppActions } from '../../core/store/app.actions';
import {
  selectAccounts,
  selectApplicationsForMyTalent,
  selectOpportunities,
} from '../../core/store/app.selectors';

@Component({
  selector: 'app-talent-invitations',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './talent-invitations.html',
  styleUrl: './talent-invitations.scss',
})
export class TalentInvitations {
  private readonly store = inject(Store);
  private readonly accounts = this.store.selectSignal(selectAccounts);
  private readonly myApplications = this.store.selectSignal(
    selectApplicationsForMyTalent,
  );
  private readonly opportunities = this.store.selectSignal(selectOpportunities);

  protected readonly applicationCards = computed(() => {
    const apps = this.myApplications();
    const opps = this.opportunities();
    const allAccounts = this.accounts();

    return apps.map((app) => {
      const opp = opps.find((o) => o.id === app.opportunityId);
      const clinic = allAccounts[app.clinicAccountId];
      return {
        application: app,
        clinic,
        positionTitle: opp?.title ?? 'Opportunity',
        sourceLabel:
          app.source === 'clinic-hiring-link'
            ? 'You accepted an invitation'
            : app.source === 'talent-passport'
              ? 'Found via your passport'
              : 'Matched by ClinicX',
        statusLabel: applicationStatusLabel(app.status),
        canRespond: app.status === 'invited',
      };
    });
  });

  protected clinicSlug(name: string): string {
    return generateSlug(name);
  }

  protected respondInterested(appId: string): void {
    this.store.dispatch(
      AppActions.updateApplicationStatus({
        applicationId: appId,
        status: 'interested',
      }),
    );
  }
}
