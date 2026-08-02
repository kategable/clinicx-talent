import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Store } from '@ngrx/store';
import { generateSlug } from '../../core/hiring';
import { AppActions } from '../../core/store/app.actions';
import { selectAllPassportShares, selectCurrentAccount } from '../../core/store/app.selectors';

@Component({
  selector: 'app-talent-passport',
  imports: [MatButtonModule],
  templateUrl: './talent-passport.html',
  styleUrl: './talent-passport.scss',
})
export class TalentPassport {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  /** All passport shares for the current talent (including deleted). */
  private readonly allShares = this.store.selectSignal(selectAllPassportShares);

  protected readonly passportCreated = signal(false);
  protected readonly passportLink = signal('');

  /** Active shares only. */
  protected readonly activeShares = computed(() => {
    const acct = this.account();
    if (!acct) return [];
    return this.allShares().filter((p) => p.talentAccountId === acct.id && !p.deletedAt);
  });

  /** Deleted shares for management. */
  protected readonly deletedShares = computed(() => {
    const acct = this.account();
    if (!acct) return [];
    return this.allShares().filter((p) => p.talentAccountId === acct.id && p.deletedAt);
  });

  protected sharePassport(): void {
    const acct = this.account();
    if (!acct) return;
    this.store.dispatch(AppActions.shareTalentPassport({ talentAccountId: acct.id }));
    const slug = generateSlug(acct.displayName);
    this.passportLink.set(`${window.location.origin}/talent/${slug}`);
    this.passportCreated.set(true);
  }

  protected copyPassportLink(): void {
    const shares = this.activeShares();
    const latest = shares[0];
    const link = latest ? `${this.passportLink()}?invite=${latest.token}` : this.passportLink();
    void navigator.clipboard.writeText(link);
  }

  protected softDelete(id: string): void {
    this.store.dispatch(AppActions.softDeletePassport({ id }));
  }
  protected restore(id: string): void {
    this.store.dispatch(AppActions.restorePassport({ id }));
  }
}
