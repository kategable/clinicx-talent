import { computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Service } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthProvider } from './auth-provider';
import { AccountType, AccountRecord } from './account';
import { AuthState, AuthResult, AuthError } from './auth/models';
import { TOKEN_STORAGE_KEY, ACTIVE_ACCOUNT_KEY } from './auth/constants';
import { AppActions } from './store/app.actions';

/**
 * Orchestrates all authentication flows: Google OAuth, phone SMS, and admin
 * login. Manages JWT tokens in sessionStorage so the session survives
 * refreshes. On successful auth, sets activeAccountId in the NgRx store.
 *
 * Provided in root so components can lazy-load it via `injectAsync`:
 *   private readonly auth = injectAsync(() =>
 *     import('./auth.service').then(m => m.AuthService));
 */
@Service()
export class AuthService {
  private readonly provider = inject(AuthProvider);
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  // -- State ----------------------------------------------------------------
  readonly authState = signal<AuthState>({
    status: 'idle',
    account: null,
    error: null,
    phoneRequired: false,
  });

  readonly isAuthenticated = computed(
    () => this.authState().status === 'authenticated',
  );

  readonly isLoading = computed(
    () => this.authState().status === 'loading',
  );

  readonly currentAccount = computed(() => this.authState().account);
  readonly authError = computed(() => this.authState().error);

  constructor() {
    this.hydrateFromStorage();
  }

  // -- Google OAuth ---------------------------------------------------------

  /**
   * Initiates the Google sign-in flow. In production this opens the Google
   * One Tap prompt. In dev mode (MockAuthProvider) it simulates the flow.
   */
  async signInWithGoogle(): Promise<void> {
    this.setState({ status: 'loading', error: null });
    try {
      // In mock mode we pass a fake token. In production, GIS calls the
      // callback with a real credential, which flows through handleGoogleCallback.
      const result = await this.provider.exchangeGoogleToken('mock-google-id-token');
      this.handleAuthSuccess(result);
    } catch (err) {
      this.handleAuthError(err);
    }
  }

  /**
   * Called by the Google Identity Services callback with the ID token.
   * In mock mode you can call this directly.
   */
  async handleGoogleCallback(idToken: string): Promise<void> {
    this.setState({ status: 'loading', error: null });
    try {
      const result = await this.provider.exchangeGoogleToken(idToken);
      this.handleAuthSuccess(result);
    } catch (err) {
      this.handleAuthError(err);
    }
  }

  // -- Phone SMS ------------------------------------------------------------

  /** Send a 6-digit code to the given phone. */
  async sendSmsCode(phone: string): Promise<void> {
    this.setState({ status: 'loading', error: null });
    try {
      await this.provider.sendSmsCode(phone);
      this.setState({ status: 'idle' }); // wait for code input
    } catch (err) {
      this.handleAuthError(err);
    }
  }

  /** Verify a 6-digit code for the given phone. */
  async verifySmsCode(phone: string, code: string): Promise<void> {
    this.setState({ status: 'loading', error: null });
    try {
      const result = await this.provider.verifySmsCode(phone, code);
      if (result.isNewAccount) {
        // New account — need type selection before completing auth
        this.setState({
          status: 'idle',
          account: result.account,
          phoneRequired: true,
          error: null,
        });
        return;
      }
      this.handleAuthSuccess(result);
    } catch (err) {
      this.handleAuthError(err);
    }
  }

  // -- Registration (new account type selection) ----------------------------

  /** Complete new-account registration by choosing clinic or talent. */
  async createAccount(type: AccountType, phone: string): Promise<void> {
    const account = this.authState().account;
    if (!account) {
      this.setState({
        status: 'error',
        error: 'No pending account. Please start registration again.',
      });
      return;
    }

    const fullAccount = {
      ...account,
      type,
      displayName: type === 'clinic' ? 'New clinic' : 'New talent',
    };

    // Store it as if we got a full auth result
    this.handleAuthSuccess({
      token: account.id, // placeholder — real JWT comes from backend
      refreshToken: '',
      account: fullAccount,
      isNewAccount: true,
      phoneRequired: false,
    });
  }

  // -- Admin ----------------------------------------------------------------

  async adminLogin(username: string, password: string): Promise<void> {
    this.setState({ status: 'loading', error: null });
    try {
      const result = await this.provider.adminLogin(username, password);
      this.persistTokens(result);
      this.setState({ status: 'authenticated', account: result.account, error: null });
      this.store.dispatch(
        AppActions.adminLogin({ username, password }),
      );
      void this.router.navigateByUrl('/admin/accounts').catch(() => {});
    } catch (err) {
      this.handleAuthError(err);
    }
  }

  adminLogout(): void {
    this.clearSession();
    this.store.dispatch(AppActions.adminLogout());
    void this.router.navigateByUrl('/admin/login').catch(() => {});
  }

  // -- Session management ---------------------------------------------------

  /** Sign out the current account and redirect to home. */
  signOut(): void {
    this.clearSession();
    this.store.dispatch(AppActions.signOut());
    void this.router.navigateByUrl('/').catch(() => {});
  }

  /** Return the current access token, or null if not authenticated. */
  getToken(): string | null {
    try {
      const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (!raw) return null;
      const pair = JSON.parse(raw) as { token: string };
      return pair.token ?? null;
    } catch {
      return null;
    }
  }

  private handleAuthSuccess(result: AuthResult): void {
    this.persistTokens(result);
    const activeAccountId = result.account.id;
    sessionStorage.setItem(ACTIVE_ACCOUNT_KEY, activeAccountId);
    this.setState({
      status: 'authenticated',
      account: result.account,
      error: null,
      phoneRequired: result.phoneRequired,
    });
    // Set the active account in the NgRx store so existing guards work
    this.store.dispatch(
      AppActions.setActiveAccount({ accountId: activeAccountId }),
    );

    // Navigate to the appropriate dashboard
    if (!result.isNewAccount) {
      void this.router.navigateByUrl(
        this.destinationForAccount(result.account),
      ).catch(() => {});
    } else {
      // New accounts go to onboarding
      void this.router.navigateByUrl('/onboarding').catch(() => {});
    }
  }

  private destinationForAccount(account: AccountRecord): string {
    if (account.status !== 'approved') {
      return account.type === 'clinic' ? '/clinic/status' : '/talent/status';
    }
    return account.type === 'clinic' ? '/clinic/talents' : '/talent/home';
  }

  private handleAuthError(err: unknown): void {
    if (err instanceof AuthError) {
      this.setState({ status: 'error', error: err.message });
      return;
    }
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred.';
    this.setState({ status: 'error', error: message });
  }

  private persistTokens(result: AuthResult): void {
    try {
      sessionStorage.setItem(
        TOKEN_STORAGE_KEY,
        JSON.stringify({ token: result.token, refreshToken: result.refreshToken }),
      );
    } catch {
      // sessionStorage unavailable — non-fatal
    }
  }

  private hydrateFromStorage(): void {
    try {
      const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      const accountId = sessionStorage.getItem(ACTIVE_ACCOUNT_KEY);
      if (raw && accountId) {
        // We can't fully restore the account from just the token in mock mode,
        // but we mark as authenticated so guards allow navigation.
        // The store's hydration meta-reducer handles the full account restore.
        this.setState({
          status: 'authenticated',
          account: null,
          error: null,
          phoneRequired: false,
        });
      }
    } catch {
      // sessionStorage unavailable
    }
  }

  clearSession(): void {
    try {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    } catch {
      // non-fatal
    }
    this.setState({ status: 'idle', account: null, error: null, phoneRequired: false });
  }

  private setState(patch: Partial<AuthState>): void {
    this.authState.update((s) => ({ ...s, ...patch }));
  }
}
