import { Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../../core/store/app.actions';
import { AccountType } from '../../../core/account';
import {
  selectAuthStatus,
  selectAuthError,
  selectPhoneRequired,
  selectIsNewAccount,
} from '../../../core/store/app.selectors';
import { RegTypeStep } from './steps/type-step';
import { RegAuthStep } from './steps/auth-step';
import { RegPhoneStep } from './steps/phone-step';
import { RegCodeStep } from './steps/code-step';

type Step = 'choose-type' | 'choose-auth' | 'phone' | 'code';

@Component({
  selector: 'app-registration',
  imports: [RouterLink, RegTypeStep, RegAuthStep, RegPhoneStep, RegCodeStep],
  templateUrl: './registration.html',
  styleUrl: './registration.scss',
})
export class Registration {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  /** Bound from /register/:type — 'clinic' or 'talent'. */
  readonly type = input<AccountType>();

  protected readonly step = signal<Step>('choose-type');
  protected readonly accountType = signal<AccountType | undefined>(undefined);
  protected readonly phone = signal('');
  protected readonly showPhoneOption = signal(false);
  protected readonly hasPreselectedType = signal(false);

  protected readonly authStatus = this.store.selectSignal(selectAuthStatus);
  protected readonly authError = this.store.selectSignal(selectAuthError);
  protected readonly phoneRequired = this.store.selectSignal(selectPhoneRequired);
  protected readonly isNewAccount = this.store.selectSignal(selectIsNewAccount);

  readonly loading = () => this.authStatus() === 'loading';
  readonly label = () => (this.accountType() === 'clinic' ? 'Clinic' : 'Talent');

  constructor() {
    // Reset auth state when entering registration flow
    this.store.dispatch(
      AppActions.setAuthStatus({ status: 'idle', isNewAccount: false, phoneRequired: false }),
    );

    // React to type input changes (e.g. switching from /register/clinic to /register)
    effect(() => {
      const t = this.type();
      if (t === 'clinic' || t === 'talent') {
        this.accountType.set(t);
        this.hasPreselectedType.set(true);
        this.step.set('choose-auth');
      } else {
        this.accountType.set(undefined);
        this.hasPreselectedType.set(false);
        this.step.set('choose-type');
      }
    });

    // After Google sign-in: phoneRequired → go to phone step
    effect(() => {
      if (this.phoneRequired() && this.step() !== 'code') {
        this.step.set('phone');
      }
    });

    // After SMS verification for new account: isNewAccount → create account
    effect(() => {
      if (this.isNewAccount() && this.step() === 'code') {
        const type = this.accountType();
        if (type) {
          this.store.dispatch(AppActions.createAccount({ accountType: type, phone: this.phone() }));
        }
      }
    });
  }

  // -- Type selection -------------------------------------------------------
  protected onTypeSelected(type: AccountType): void {
    this.accountType.set(type);
    this.step.set('choose-auth');
    // Only update URL if coming from a preset type
    if (this.hasPreselectedType()) {
      this.router.navigateByUrl(`/register/${type}`, { replaceUrl: true });
    }
  }

  // -- Auth (Google + phone) ------------------------------------------------
  protected onGoogleSignIn(idToken: string): void {
    this.store.dispatch(AppActions.signInWithGoogle({ idToken }));
  }
  protected onChoosePhone(): void {
    this.showPhoneOption.set(true);
    this.step.set('phone');
  }
  protected backToType(): void {
    this.step.set('choose-type');
    this.router.navigateByUrl('/register', { replaceUrl: true });
  }

  // -- Phone ----------------------------------------------------------------
  protected onPhoneSubmit(phoneNumber: string): void {
    this.phone.set(phoneNumber);
    this.store.dispatch(AppActions.sendSmsCode({ phone: phoneNumber }));
    this.step.set('code');
  }
  protected backToAuth(): void {
    this.step.set('choose-auth');
  }

  // -- Code ----------------------------------------------------------------
  protected onCodeSubmit(code: string): void {
    this.store.dispatch(AppActions.verifySmsCode({ phone: this.phone(), code }));
  }
  protected onResend(): void {
    this.store.dispatch(AppActions.sendSmsCode({ phone: this.phone() }));
  }
  protected backToPhone(): void {
    this.step.set('phone');
  }
}
