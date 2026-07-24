import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { generateSlug } from '../../core/hiring';
import { AppActions } from '../../core/store/app.actions';
import {
  selectAccounts,
  selectApplicationsForMyClinic,
  selectCurrentAccount,
} from '../../core/store/app.selectors';
import { FounderBadge } from '../../shared/founder-badge/founder-badge';

@Component({
  selector: 'app-public-talent-passport',
  imports: [RouterLink, MatButtonModule, FounderBadge],
  templateUrl: './public-talent-passport.html',
  styleUrl: './public-talent-passport.scss',
})
export class PublicTalentPassport {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

  private readonly talentSlug = this.route.snapshot.params['talentSlug'] as string;
  protected readonly inviteToken =
    this.route.snapshot.queryParamMap.get('invite') ?? undefined;

  protected readonly accounts = this.store.selectSignal(selectAccounts);
  protected readonly viewer = this.store.selectSignal(selectCurrentAccount);
  private readonly myClinicApps = this.store.selectSignal(
    selectApplicationsForMyClinic,
  );

  protected readonly talent = computed(() =>
    Object.values(this.accounts()).find(
      (a) =>
        a.type === 'talent' &&
        a.talentDetails &&
        generateSlug(a.displayName) === this.talentSlug,
    ),
  );

  protected readonly profile = computed(() => this.talent()?.talentDetails);
  protected readonly isFounder = computed(() => this.talent()?.founder === true);
  protected readonly isLoggedIn = computed(() => Boolean(this.viewer()));
  protected readonly isClinic = computed(() => this.viewer()?.type === 'clinic');
  protected readonly alreadyAdded = computed(() => {
    const t = this.talent();
    if (!t) return false;
    return this.myClinicApps().some((a) => a.talentAccountId === t.id);
  });

  protected readonly founderMemberNumber = computed(() => {
    const t = this.talent();
    if (!t?.founder) return null;
    const founders = Object.values(this.accounts()).filter((a) => a.founder);
    const idx = founders.findIndex((a) => a.id === t.id);
    return idx >= 0 ? idx + 1 : null;
  });

  protected addTalent(): void {
    // If there's an invite token from a shared link, use that flow
    if (this.inviteToken) {
      this.store.dispatch(AppActions.acceptPassportInvite({ token: this.inviteToken }));
      return;
    }
    // Direct add when already signed in as a clinic
    const t = this.talent();
    if (!t) return;
    this.store.dispatch(AppActions.addTalentToMyClinic({ talentAccountId: t.id }));
  }
}
