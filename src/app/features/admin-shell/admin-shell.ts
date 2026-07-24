import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../core/store/app.actions';
import { selectPendingCount } from '../../core/store/app.selectors';

@Component({
  selector: 'app-admin-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly store = inject(Store);
  protected readonly pendingCount = this.store.selectSignal(selectPendingCount);
  protected readonly navOpen = signal(false);

  protected toggleNav(): void {
    this.navOpen.update((v) => !v);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  protected signOut(): void {
    this.store.dispatch(AppActions.adminLogout());
  }
}
