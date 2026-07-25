import { Component, input, output, signal } from '@angular/core';
import { form, FormField, pattern, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * 6-digit verification code input. Auto-submits when 6 digits are entered.
 * Supports paste and shows a resend timer.
 */
@Component({
  selector: 'app-verification-code-input',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './verification-code-input.html',
  styleUrl: './verification-code-input.scss',
})
export class VerificationCodeInput {
  readonly loading = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly phone = input.required<string>();
  readonly codeVerified = output<string>();
  readonly resendRequested = output<void>();

  protected readonly model = signal({ code: '' });
  protected readonly codeForm = form(this.model, (path) => {
    required(path.code, { message: 'Enter the code from your text message.' });
    pattern(path.code, /^\d{6}$/, {
      message: 'The verification code must be 6 digits.',
    });
  });

  /** Seconds remaining before resend is allowed. */
  protected readonly resendCooldown = signal(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  protected submitCode(): void {
    if (this.codeForm().invalid() || this.loading()) return;
    this.codeVerified.emit(this.model().code);
  }

  protected requestResend(): void {
    if (this.resendCooldown() > 0 || this.loading()) return;
    this.resendRequested.emit();
    this.startCooldown(30);
  }

  private startCooldown(seconds: number): void {
    this.resendCooldown.set(seconds);
    this.cooldownInterval = setInterval(() => {
      const current = this.resendCooldown() - 1;
      this.resendCooldown.set(current);
      if (current <= 0 && this.cooldownInterval) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = null;
      }
    }, 1000);
  }
}
