import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Store } from '@ngrx/store';
import { generateSlug } from '../../core/hiring';
import { AppActions } from '../../core/store/app.actions';
import {
  selectCurrentAccount,
  selectPassportShares,
} from '../../core/store/app.selectors';

@Component({
  selector: 'app-talent-passport',
  imports: [MatButtonModule],
  templateUrl: './talent-passport.html',
  styleUrl: './talent-passport.scss',
})
export class TalentPassport {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  protected readonly passportShares = this.store.selectSignal(selectPassportShares);
  protected readonly passportCreated = signal(false);
  protected readonly passportLink = signal('');

  protected sharePassport(): void {
    const acct = this.account();
    if (!acct) return;
    this.store.dispatch(AppActions.shareTalentPassport({ talentAccountId: acct.id }));
    const slug = generateSlug(acct.displayName);
    this.passportLink.set(`${window.location.origin}/talent/${slug}`);
    this.passportCreated.set(true);
  }

  protected copyPassportLink(): void {
    const shares = this.passportShares();
    const latest = shares[0];
    const link = latest
      ? `${this.passportLink()}?invite=${latest.token}`
      : this.passportLink();
    void navigator.clipboard.writeText(link);
  }
}
