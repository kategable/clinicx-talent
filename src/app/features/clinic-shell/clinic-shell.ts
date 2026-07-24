import {
  afterNextRender,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../core/store/app.actions';
import {
  selectAccounts,
  selectCurrentAccount,
  selectPendingTalentCount,
} from '../../core/store/app.selectors';
import { FounderBadge } from '../../shared/founder-badge/founder-badge';

@Component({
  selector: 'app-clinic-shell',
  imports: [
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    FounderBadge,
  ],
  templateUrl: './clinic-shell.html',
  styleUrl: './clinic-shell.scss',
})
export class ClinicShell {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  protected readonly accounts = this.store.selectSignal(selectAccounts);
  protected readonly pendingCount = this.store.selectSignal(
    selectPendingTalentCount,
  );

  private readonly isDesktop = (): boolean => window.innerWidth >= 960;
  protected readonly sidenavMode = signal<'over' | 'side'>(
    this.isDesktop() ? 'side' : 'over',
  );
  protected readonly opened = signal(this.isDesktop());

  constructor() {
    afterNextRender(() => {
      this.onResize();
    });
  }

  @HostListener('window:resize')
  protected onResize(): void {
    const desktop = this.isDesktop();
    this.sidenavMode.set(desktop ? 'side' : 'over');
    this.opened.set(desktop);
  }

  protected readonly founderMemberNumber = computed(() => {
    const acct = this.account();
    if (!acct?.founder) return null;
    const founders = Object.values(this.accounts()).filter((a) => a.founder);
    const idx = founders.findIndex((a) => a.id === acct.id);
    return idx >= 0 ? idx + 1 : null;
  });

  protected close(): void {
    if (this.sidenavMode() === 'over') {
      this.opened.set(false);
    }
  }

  protected toggle(): void {
    this.opened.update((v) => !v);
  }

  protected signOut(): void {
    this.store.dispatch(AppActions.signOut());
  }
}
