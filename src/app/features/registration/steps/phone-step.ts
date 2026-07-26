import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { PhoneInput } from '../../../shared/phone-input/phone-input';

@Component({
  selector: 'app-reg-phone-step',
  imports: [PhoneInput, MatButtonModule],
  template: `
    <div class="steps">
      <span class="active">1</span><i></i>
      @if (preselected()) {
        <span class="active">2</span>
      } @else {
        <span class="active">2</span><i></i><span class="active">3</span>
      }
    </div>
    <div class="card-heading">
      <span>{{ stepLabel() }} &middot; {{ label() }}</span>
      <h2>What's your mobile number?</h2>
      <p>We'll send a one-time verification code.</p>
    </div>
    <app-phone-input
      [loading]="loading()"
      [errorMessage]="error()"
      (phoneSubmitted)="phoneSubmitted.emit($event)"
    />
    <button mat-button class="back-link" type="button" (click)="back.emit()">
      &larr; Back to sign-up options
    </button>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .steps {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .steps span {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8125rem;
        font-weight: 600;
        background: var(--cx-surface);
        color: var(--cx-muted);
        border: 2px solid var(--cx-border);
      }
      .steps span.active {
        background: var(--cx-text, #18312c);
        color: #fff;
        border-color: var(--cx-text, #18312c);
      }
      .steps i {
        flex: 1;
        height: 1px;
        background: var(--cx-border);
        max-width: 60px;
      }
      .card-heading {
        text-align: center;
      }
      .card-heading span {
        font-size: 0.8125rem;
        color: var(--cx-muted);
      }
      .card-heading h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0.5rem 0;
      }
      .card-heading p {
        color: var(--cx-muted);
        font-size: 0.9375rem;
      }
      .back-link {
        text-transform: none;
        font-size: 0.875rem;
        color: var(--cx-muted);
        align-self: flex-start;
      }
    `,
  ],
})
export class RegPhoneStep {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly preselected = input(false);
  readonly label = input('Clinic');
  readonly phoneSubmitted = output<string>();
  readonly back = output<void>();

  stepLabel() {
    return this.preselected() ? 'Step 2 of 2' : 'Step 3 of 3';
  }
}
