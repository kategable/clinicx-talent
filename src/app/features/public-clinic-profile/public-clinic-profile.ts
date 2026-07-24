import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { generateSlug } from '../../core/hiring';
import { selectAccounts } from '../../core/store/app.selectors';
import { FounderBadge } from '../../shared/founder-badge/founder-badge';

@Component({
  selector: 'app-public-clinic-profile',
  imports: [RouterLink, MatButtonModule, FounderBadge],
  templateUrl: './public-clinic-profile.html',
  styleUrl: './public-clinic-profile.scss',
})
export class PublicClinicProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly accounts = this.store.selectSignal(selectAccounts);

  private readonly clinicSlug =
    this.route.snapshot.params['clinicSlug'] as string;

  protected readonly clinic = computed(() =>
    Object.values(this.accounts()).find((a) => {
      if (a.type !== 'clinic') return false;
      return generateSlug(a.displayName) === this.clinicSlug;
    }),
  );

  protected readonly details = computed(() => this.clinic()?.clinicDetails);
  protected readonly isFounder = computed(
    () => this.clinic()?.founder === true,
  );

  protected readonly founderMemberNumber = computed(() => {
    const c = this.clinic();
    if (!c?.founder) return null;
    const founders = Object.values(this.accounts()).filter((a) => a.founder);
    const idx = founders.findIndex((a) => a.id === c.id);
    return idx >= 0 ? idx + 1 : null;
  });
}
