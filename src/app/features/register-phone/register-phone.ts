import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { GoogleSigninButton } from '../../shared/google-signin-button/google-signin-button';
import { PhoneInput } from '../../shared/phone-input/phone-input';
import { VerificationCodeInput } from '../../shared/verification-code-input/verification-code-input';
import { AuthService } from '../../core/auth.service';
import { AccountType } from '../../core/account';

type Step = 'choose' | 'choose-type' | 'phone' | 'code';

/**
 * Registration page with two paths:
 * 1. Google sign-in → if new account, choose type → phone verification
 * 2. Phone registration → choose type → phone → code → create account
 */
@Component({
  selector: 'app-register-phone',
  imports: [
    GoogleSigninButton,
    PhoneInput,
    VerificationCodeInput,
    RouterLink,
    MatButtonModule,
  ],
  templateUrl: './register-phone.html',
  styleUrl: './register-phone.scss',
})
export class RegisterPhone {
  private readonly auth = inject(AuthService);

  protected readonly step = signal<Step>('choose');
  protected readonly accountType = signal<AccountType | undefined>(undefined);
  protected readonly phone = signal('');
  protected readonly showPhoneOption = signal(false);

  protected readonly isLoading = this.auth.isLoading;
  protected readonly authError = this.auth.authError;

  // -- Google ---------------------------------------------------------------

  protected async signInWithGoogle(): Promise<void> {
    await this.auth.signInWithGoogle();
    // After Google auth, AuthService navigates existing accounts to dashboard.
    // If phoneRequired is set, the user needs phone verification — handled
    // by the template showing the phone step.
  }

  // -- Phone ----------------------------------------------------------------

  protected showPhone(): void {
    this.showPhoneOption.set(true);
    this.step.set('choose-type');
  }

  protected selectType(type: AccountType): void {
    this.accountType.set(type);
    this.step.set('phone');
  }

  protected async handlePhoneSubmit(phoneNumber: string): Promise<void> {
    this.phone.set(phoneNumber);
    await this.auth.sendSmsCode(phoneNumber);
    this.step.set('code');
  }

  protected async handleCodeSubmit(code: string): Promise<void> {
    const type = this.accountType();
    if (!type) return;

    await this.auth.verifySmsCode(this.phone(), code);

    if (this.auth.authState().phoneRequired) {
      await this.auth.createAccount(type, this.phone());
    }
  }

  protected handleResend(): void {
    this.auth.sendSmsCode(this.phone());
  }

  protected backToPhone(): void {
    this.step.set('phone');
  }

  protected backToType(): void {
    if (this.showPhoneOption()) {
      this.step.set('choose-type');
    } else {
      this.step.set('choose');
    }
  }

  protected backToChoose(): void {
    this.step.set('choose');
  }
}
