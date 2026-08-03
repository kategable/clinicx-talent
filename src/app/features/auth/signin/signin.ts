import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Store } from '@ngrx/store';
import { GoogleSigninButton } from '../../../shared/google-signin-button/google-signin-button';
import { PhoneInput } from '../../../shared/phone-input/phone-input';
import { VerificationCodeInput } from '../../../shared/verification-code-input/verification-code-input';
import { AppActions } from '../../../core/store/app.actions';
import { selectAuthStatus, selectAuthError } from '../../../core/store/app.selectors';

@Component({
  selector: 'app-signin',
  imports: [GoogleSigninButton, PhoneInput, VerificationCodeInput, RouterLink, MatButtonModule],
  templateUrl: './signin.html',
  styleUrl: './signin.scss',
})
export class Signin {
  private readonly store = inject(Store);

  protected readonly step = signal<'choose' | 'phone' | 'code'>('choose');
  protected readonly phone = signal('');
  protected readonly showPhoneOption = signal(false);

  protected readonly authStatus = this.store.selectSignal(selectAuthStatus);
  protected readonly isSigningIn = () => this.authStatus() === 'loading';
  protected readonly authError = this.store.selectSignal(selectAuthError);

  // -- Google ---------------------------------------------------------------

  protected signInWithGoogle(idToken: string): void {
    this.store.dispatch(AppActions.signInWithGoogle({ idToken }));
  }

  // -- Phone ----------------------------------------------------------------

  protected showPhone(): void {
    this.showPhoneOption.set(true);
    this.step.set('phone');
  }

  protected handlePhoneSubmit(phoneNumber: string): void {
    this.phone.set(phoneNumber);
    this.store.dispatch(AppActions.sendSmsCode({ phone: phoneNumber }));
    this.step.set('code');
  }

  protected handleCodeSubmit(code: string): void {
    this.store.dispatch(AppActions.verifySmsCode({ phone: this.phone(), code }));
  }

  protected handleResend(): void {
    this.store.dispatch(AppActions.sendSmsCode({ phone: this.phone() }));
  }

  protected backToPhone(): void {
    this.step.set('phone');
  }
}
