import { Component, input, output, signal } from '@angular/core';
import { form, FormField, pattern, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * Phone number input with US formatting ((312) 555-0101).
 * Emits the formatted phone number when the user submits.
 */
@Component({
  selector: 'app-phone-input',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './phone-input.html',
  styleUrl: './phone-input.scss',
})
export class PhoneInput {
  readonly loading = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly phoneSubmitted = output<string>();

  protected readonly model = signal({ phone: '' });
  protected readonly phoneForm = form(this.model, (path) => {
    required(path.phone, { message: 'Enter your mobile number.' });
    pattern(path.phone, /^\D*(?:\d\D*){10}$/, {
      message: 'Enter a 10-digit US phone number.',
    });
  });

  protected maskPhone(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const digits = input.value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 6) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 3) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }

    input.value = formatted;
    this.model.set({ phone: formatted });
  }

  protected submitPhone(): void {
    if (this.phoneForm().invalid() || this.loading()) return;
    this.phoneSubmitted.emit(this.model().phone);
  }
}
