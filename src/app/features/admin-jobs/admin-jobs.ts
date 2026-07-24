import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { applicationStatusLabel, generateSlug, isInviteValid } from '../../core/hiring';
import { AppActions } from '../../core/store/app.actions';
import {
  selectAccounts,
  selectApplications,
  selectInvites,
  selectOpportunities,
} from '../../core/store/app.selectors';

@Component({
  selector: 'app-admin-jobs',
  imports: [RouterLink],
  templateUrl: './admin-jobs.html',
  styleUrl: './admin-jobs.scss',
})
export class AdminJobs {
  private readonly store = inject(Store);
  private readonly opportunities = this.store.selectSignal(selectOpportunities);
  private readonly invites = this.store.selectSignal(selectInvites);
  private readonly applications = this.store.selectSignal(selectApplications);
  private readonly accounts = this.store.selectSignal(selectAccounts);

  constructor() {
    this.store.dispatch(AppActions.loadAllAccounts());
    this.store.dispatch(AppActions.loadAllHiring());
  }

  protected readonly rows = computed(() => {
    const opps = this.opportunities();
    const invites = this.invites();
    const apps = this.applications();
    const accts = this.accounts();

    return opps.map((opp) => {
      const invite = invites.find((i) => i.opportunityId === opp.id);
      const talentApps = apps.filter((a) => a.opportunityId === opp.id);
      const clinic = accts[opp.clinicAccountId];
      const linkValid = invite ? isInviteValid(invite) : null;
      const publicLink = invite
        ? `/join/${opp.slug}/${opp.positionSlug}?invite=${invite.token}`
        : null;

      return { opportunity: opp, clinic, invite, publicLink, linkValid, talentApps };
    });
  });

  protected readonly brokenCount = computed(
    () => this.rows().filter((r) => r.linkValid === false).length,
  );

  protected statusLabel = applicationStatusLabel;

  protected talentName(id: string): string {
    return this.accounts()[id]?.displayName ?? id;
  }

  protected talentSlug(name: string): string {
    return generateSlug(name);
  }

  protected copyLink(link: string): void {
    void navigator.clipboard.writeText(`${window.location.origin}${link}`);
  }
}
