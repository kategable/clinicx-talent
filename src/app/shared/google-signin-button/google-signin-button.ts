import { Component, ElementRef, input, output, signal, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

/**
 * Google sign-in button. When a real Google Client ID is configured, loads the
 * Google Identity Services library and renders an official button. Falls back to
 * a styled mock button in dev mode.
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
  private readonly el = inject(ElementRef);
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly googleSignIn = output<string>();

  protected readonly clicked = signal(false);
  private gisLoaded = false;

  get useMock(): boolean {
    return (
      environment.useMockAuth ||
      !environment.googleClientId ||
      environment.googleClientId.startsWith('1234')
    );
  }

  constructor() {
    if (!this.useMock) {
      this.loadGoogleScript();
    }
  }

  private async loadGoogleScript(): Promise<void> {
    if (this.gisLoaded) return;
    return new Promise((resolve) => {
      // Wait for the script to load, then render the button
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.gisLoaded = true;
        this.renderGoogleButton();
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  private renderGoogleButton(): void {
    const win = window as unknown as {
      google?: {
        accounts?: {
          id?: {
            initialize: (config: Record<string, unknown>) => void;
            renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
            prompt: () => void;
          };
        };
      };
    };

    if (!win.google?.accounts?.id) {
      setTimeout(() => this.renderGoogleButton(), 200);
      return;
    }

    win.google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: { credential: string }) => {
        this.googleSignIn.emit(response.credential);
      },
      auto_select: false,
    });

    // Render the real Google button into our container div
    const container = this.el.nativeElement.querySelector('#google-btn-container');
    if (container) {
      win.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: container.clientWidth || 300,
      });
    }
  }

  protected handleClick(): void {
    if (this.loading() || this.disabled()) return;
    this.clicked.set(true);

    if (this.useMock) {
      // Mock mode: emit a fake token
      this.googleSignIn.emit('mock-google-id-token');
    } else {
      // Real Google: trigger the One Tap prompt
      const win = window as unknown as {
        google?: {
          accounts?: {
            id?: {
              prompt: () => void;
            };
          };
        };
      };
      win.google?.accounts?.id?.prompt();
    }
  }
}
