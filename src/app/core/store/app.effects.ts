import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { filter, tap, withLatestFrom } from 'rxjs';
import { AppActions } from './app.actions';
import { existingAccountDestination } from './app.navigation';
import { selectAppState, selectVerificationBlocked } from './app.selectors';

export const APP_STORAGE_KEY = 'clinicx.state.v1';
export const REVIEW_REMINDER_SESSION_KEY = 'clinicx.review-reminders';
export const GUEST_THEME_SESSION_KEY = 'clinicx.guest-theme';

@Injectable()
export class AppEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  readonly persistState$ = createEffect(
    () =>
      this.actions$.pipe(
        withLatestFrom(this.store.select(selectAppState)),
        tap(([, state]) => {
          try {
            localStorage.setItem(
              APP_STORAGE_KEY,
              JSON.stringify({
                ...state,
                reviewReminder: { pingedAccountIds: [] },
                guestThemePreference: 'auto',
              }),
            );
          } catch {
            // Browser storage is optional in the MVP.
          }
        }),
      ),
    { dispatch: false },
  );

  readonly persistGuestTheme$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.setThemePreference),
        withLatestFrom(this.store.select(selectAppState)),
        filter(([, state]) => !state.activeAccountId),
        tap(([, state]) => {
          try {
            sessionStorage.setItem(GUEST_THEME_SESSION_KEY, state.guestThemePreference);
          } catch {
            // Session storage is optional in the MVP.
          }
        }),
      ),
    { dispatch: false },
  );

  readonly navigateAfterRegistration$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.verifyRegistrationCode),
        withLatestFrom(this.store.select(selectAppState)),
        filter(([, state]) => Boolean(state.activeAccountId && !state.error)),
        tap(([, state]) => {
          if (state.registration.accountCreated) {
            void this.router.navigateByUrl('/onboarding');
            return;
          }
          this.navigateExistingAccount(state);
        }),
      ),
    { dispatch: false },
  );

  readonly navigateAfterSignIn$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.verifySignInCode),
        withLatestFrom(this.store.select(selectAppState)),
        filter(([, state]) => Boolean(state.activeAccountId && !state.error)),
        tap(([, state]) => this.navigateExistingAccount(state)),
      ),
    { dispatch: false },
  );

  readonly persistReviewReminder$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.requestReviewReminder),
        withLatestFrom(this.store.select(selectAppState)),
        tap(([, state]) => {
          try {
            sessionStorage.setItem(
              REVIEW_REMINDER_SESSION_KEY,
              JSON.stringify(state.reviewReminder.pingedAccountIds),
            );
          } catch {
            // Session storage is optional in the MVP.
          }
        }),
      ),
    { dispatch: false },
  );

  readonly redirectBlockedVerification$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.requestSMSCode),
        withLatestFrom(this.store.select(selectVerificationBlocked)),
        filter(([, blocked]) => blocked),
        tap(() => void this.router.navigateByUrl('/contact?reason=verification-limit')),
      ),
    { dispatch: false },
  );

  readonly navigateAfterAdminLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.adminLogin),
        withLatestFrom(this.store.select(selectAppState)),
        filter(([, state]) => state.adminAuthenticated),
        tap(() => void this.router.navigateByUrl('/admin/accounts')),
      ),
    { dispatch: false },
  );

  readonly navigateAfterAdminLogout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.adminLogout),
        tap(() => void this.router.navigateByUrl('/admin/login')),
      ),
    { dispatch: false },
  );

  private navigateExistingAccount(state: Parameters<typeof existingAccountDestination>[0]): void {
    const destination = existingAccountDestination(state);
    if (destination) void this.router.navigateByUrl(destination);
  }
}
