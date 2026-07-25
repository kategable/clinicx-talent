import { Component, input, output, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Reusable Google sign-in button styled to match Google's brand guidelines.
 * Uses a plain button (not mat-flat-button) so theme overrides don't interfere.
 */
@Component({
  selector: 'app-google-signin-button',
  imports: [MatProgressSpinnerModule],
  templateUrl: './google-signin-button.html',
  styleUrl: './google-signin-button.scss',
  host: {
    '[attr.data-testid]': '"google-signin-button"',
  },
})
export class GoogleSigninButton {
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly googleSignIn = output<void>();

  protected readonly clicked = signal(false);

  protected handleClick(): void {
    if (this.loading() || this.disabled()) return;
    this.clicked.set(true);
    this.googleSignIn.emit();
  }
}
