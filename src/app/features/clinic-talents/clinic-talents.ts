import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AccountService } from '../../core/account.service';
import { applicationStatusLabel, generateSlug } from '../../core/hiring';
import {
  selectApplicationsForMyClinic,
  selectCurrentAccount,
} from '../../core/store/app.selectors';
import { FounderBadge } from '../../shared/founder-badge/founder-badge';

@Component({
  selector: 'app-clinic-talents',
  imports: [RouterLink, MatButtonModule, FounderBadge],
  templateUrl: './clinic-talents.html',
  styleUrl: './clinic-talents.scss',
})
export class ClinicTalents {
  private readonly store = inject(Store);
  private readonly accountService = inject(AccountService);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  private readonly applications = this.store.selectSignal(selectApplicationsForMyClinic);

  /** All talents that have a connection to this clinic. */
  protected readonly talents = computed(() => {
    const talents = this.accountService.getByType('talent');
    const apps = this.applications();

    const accountList = talents;

    // Start with approved talents (they appear regardless of applications)
    const approved = accountList.filter(
      (a) =>
        a.type === 'talent' && a.status === 'approved' && a.talentDetails,
    );

    // Add under-review / invited talents that have an application
    const invited = accountList.filter(
      (a) =>
        a.type === 'talent' &&
        a.status !== 'approved' &&
        apps.some((app) => app.talentAccountId === a.id),
    );

    // Deduplicate: approved talent should not appear twice
    const seen = new Set(approved.map((a) => a.id));
    const uniqueInvited = invited.filter((a) => !seen.has(a.id));

    return [...approved, ...uniqueInvited];
  });

  protected readonly founderAccounts = computed(() =>
    this.talents().filter((a) => a.founder),
  );

  protected getApplication(talentId: string) {
    return this.applications().find((a) => a.talentAccountId === talentId);
  }

  protected sourceLabel(talentId: string): string | null {
    const app = this.getApplication(talentId);
    if (!app) return null;
    if (app.source === 'clinic-hiring-link') return 'Invited by you';
    if (app.source === 'talent-passport') return 'Found via Talent Passport';
    return null;
  }

  protected statusLabel(talentId: string): string | null {
    const app = this.getApplication(talentId);
    if (!app) return null;
    return applicationStatusLabel(app.status);
  }

  protected founderNumber(talentId: string): number | null {
    const founders = this.founderAccounts();
    const idx = founders.findIndex((a) => a.id === talentId);
    return idx >= 0 ? idx + 1 : null;
  }

  protected talentSlug(name: string): string {
    return generateSlug(name);
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('');
  }
}
