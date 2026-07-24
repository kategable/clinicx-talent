import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { filter, map, tap, withLatestFrom } from 'rxjs';
import { AccountService } from '../account.service';
import { HiringService } from '../hiring.service';
import { AppActions } from './app.actions';
import { existingAccountDestination } from './app.navigation';
import {
  selectAppState,
  selectHiring,
  selectVerificationFlagged,
} from './app.selectors';

export const APP_STORAGE_KEY = 'clinicx.state.v1';
export const REVIEW_REMINDER_SESSION_KEY = 'clinicx.review-reminders';
export const GUEST_THEME_SESSION_KEY = 'clinicx.guest-theme';

@Injectable()
export class AppEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);
  private readonly hiringService = inject(HiringService);

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
                hiring: { ...state.hiring, pendingInvite: null },
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

  readonly redirectFlaggedVerification$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.requestSMSCode),
        withLatestFrom(this.store.select(selectVerificationFlagged)),
        filter(([, flagged]) => flagged),
        tap(() =>
          void this.router.navigateByUrl('/contact?reason=verification-limit'),
        ),
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

  // -- Admin: invalidate account cache when review status changes -------------
  readonly invalidateAfterReview$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.setReviewStatus),
        tap(() => this.accountService.invalidate()),
      ),
    { dispatch: false },
  );

  // -- Admin: load all hiring data from the data source into the store -----
  readonly loadAllHiring$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.loadAllHiring),
      map(() => {
        const opportunities = this.hiringService.getOpportunities();
        const invites = this.hiringService.getInvites();
        const applications = this.hiringService.getApplications();
        return AppActions.loadHiringData({
          opportunities,
          invites,
          applications,
        });
      }),
    ),
  );

  // -- Admin: load all accounts from the data source into the store -------
  readonly loadAllAccounts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.loadAllAccounts),
      map(() => {
        const accounts = this.accountService.getAll();
        return AppActions.loadAccounts({ accounts });
      }),
    ),
  );

  private navigateExistingAccount(state: Parameters<typeof existingAccountDestination>[0]): void {
    const destination = existingAccountDestination(state);
    if (destination) void this.router.navigateByUrl(destination);
  }

  // -- Hiring: create application after registration/sign-in verification -----
  readonly createApplicationAfterVerification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.verifyRegistrationCode, AppActions.verifySignInCode),
      withLatestFrom(this.store.select(selectAppState)),
      filter(
        ([, state]) =>
          Boolean(
            state.activeAccountId &&
              !state.error &&
              state.hiring.pendingInvite,
          ),
      ),
      map(([, state]) => {
        const account = state.activeAccountId
          ? state.accounts[state.activeAccountId]
          : undefined;
        const invite = state.hiring.pendingInvite!;

        // Hiring links are for talent applicants — don't create an
        // application when a clinic account signs in through one.
        if (invite.type === 'hiring-link' && account?.type !== 'talent') {
          return AppActions.clearPendingInvite();
        }
        // Talent passports are for clinic owners — don't create an
        // application when a talent account signs in through one.
        if (invite.type === 'talent-passport' && account?.type !== 'clinic') {
          return AppActions.clearPendingInvite();
        }

        return AppActions.createApplicationFromInvite();
      }),
    ),
  );

  // -- Hiring: navigate after accepting a hiring invite -----------------------
  readonly navigateAfterHiringInvite$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.acceptHiringInvite),
        withLatestFrom(this.store.select(selectHiring)),
        filter(([, hiring]) => hiring.pendingInvite !== null),
        tap(([, hiring]) => {
          void this.router.navigateByUrl(
            `/register?type=talent&invite=${hiring.pendingInvite!.token}`,
          );
        }),
      ),
    { dispatch: false },
  );

  // -- Hiring: navigate after accepting a passport invite ---------------------
  readonly navigateAfterPassportInvite$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.acceptPassportInvite),
        withLatestFrom(this.store.select(selectHiring)),
        filter(([, hiring]) => hiring.pendingInvite !== null),
        tap(([, hiring]) => {
          void this.router.navigateByUrl(
            `/register?type=clinic&invite=${hiring.pendingInvite!.token}`,
          );
        }),
      ),
    { dispatch: false },
  );
}
