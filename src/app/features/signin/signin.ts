import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { GoogleSigninButton } from '../../shared/google-signin-button/google-signin-button';
import { PhoneInput } from '../../shared/phone-input/phone-input';
import { VerificationCodeInput } from '../../shared/verification-code-input/verification-code-input';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-signin',
  imports: [GoogleSigninButton, PhoneInput, VerificationCodeInput, RouterLink, MatButtonModule],
  templateUrl: './signin.html',
  styleUrl: './signin.scss',
})
export class Signin {
  private readonly auth = inject(AuthService);

  protected readonly step = signal<'choose' | 'phone' | 'code'>('choose');
  protected readonly phone = signal('');
  protected readonly showPhoneOption = signal(false);

  protected readonly isSigningIn = this.auth.isLoading;
  protected readonly authError = this.auth.authError;

  // -- Google ---------------------------------------------------------------

  protected async signInWithGoogle(idToken: string): Promise<void> {
    await this.auth.handleGoogleCallback(idToken);
  }

  // -- Phone ----------------------------------------------------------------

  protected showPhone(): void {
    this.showPhoneOption.set(true);
    this.step.set('phone');
  }

  protected async handlePhoneSubmit(phoneNumber: string): Promise<void> {
    this.phone.set(phoneNumber);
    await this.auth.sendSmsCode(phoneNumber);
    this.step.set('code');
  }

  protected async handleCodeSubmit(code: string): Promise<void> {
    await this.auth.verifySmsCode(this.phone(), code);
  }

  protected handleResend(): void {
    this.auth.sendSmsCode(this.phone());
  }

  protected backToPhone(): void {
    this.step.set('phone');
  }
}
