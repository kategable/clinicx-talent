import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../core/store/app.actions';
import {
  selectAccounts,
  selectOpportunityBySlug,
} from '../../core/store/app.selectors';
import { FounderBadge } from '../../shared/founder-badge/founder-badge';

@Component({
  selector: 'app-public-hiring-page',
  imports: [RouterLink, MatButtonModule, FounderBadge],
  templateUrl: './public-hiring-page.html',
  styleUrl: './public-hiring-page.scss',
})
export class PublicHiringPage {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

  private readonly clinicSlug = this.route.snapshot.params['clinicSlug'] as string;
  private readonly positionSlug = this.route.snapshot.params['positionSlug'] as string;
  protected readonly inviteToken =
    this.route.snapshot.queryParamMap.get('invite') ?? undefined;

  protected readonly opportunity = this.store.selectSignal(
    selectOpportunityBySlug(this.clinicSlug, this.positionSlug),
  );
  protected readonly accounts = this.store.selectSignal(selectAccounts);

  protected readonly clinic = computed(() => {
    const opp = this.opportunity();
    if (!opp) return undefined;
    return this.accounts()[opp.clinicAccountId];
  });

  protected readonly founderMemberNumber = computed(() => {
    const c = this.clinic();
    if (!c?.founder) return null;
    const founders = Object.values(this.accounts()).filter((a) => a.founder);
    const idx = founders.findIndex((a) => a.id === c.id);
    return idx >= 0 ? idx + 1 : null;
  });

  protected acceptInvite(): void {
    if (this.inviteToken) {
      this.store.dispatch(AppActions.acceptHiringInvite({ token: this.inviteToken }));
    } else {
      this.store.dispatch(
        AppActions.resetRegistration({ accountType: 'talent', signIn: false }),
      );
    }
  }
}
