import { Component, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { GoogleSigninButton } from '../../../shared/google-signin-button/google-signin-button';

@Component({
  selector: 'app-reg-auth-step',
  imports: [GoogleSigninButton, MatButtonModule],
  template: `
    <!-- 2 circles for preselected, 3 for full flow -->
    <div class="steps">
      <span class="active">1</span><i></i>
      @if (!preselected()) {
        <span class="active">2</span><i></i>
      }
      <span [class.active]="!preselected() ? '' : 'active'">{{ preselected() ? 2 : 3 }}</span>
    </div>
    <div class="card-heading">
      <span>{{ stepLabel() }} &middot; {{ label() }}</span>
      <h2>Sign up for ClinicX</h2>
      <p>Choose how you'd like to get started.</p>
    </div>
    <app-google-signin-button [loading]="loading()" (googleSignIn)="googleSignIn.emit($event)" />
    @if (!showPhoneOption()) {
      <button mat-button class="phone-toggle" type="button" (click)="onChoosePhone()">
        Sign up with phone instead
      </button>
    } @else {
      <p class="divider">or</p>
    }
    @if (!preselected()) {
      <button mat-button class="back-link" type="button" (click)="back.emit()">
        &larr; Change account type
      </button>
    }
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
      .phone-toggle {
        text-transform: none;
        font-size: 0.875rem;
        color: var(--cx-text);
        align-self: center;
      }
      .divider {
        text-align: center;
        color: var(--cx-muted);
        font-size: 0.8125rem;
        margin: 0;
        position: relative;
      }
      .divider::before,
      .divider::after {
        content: '';
        position: absolute;
        top: 50%;
        width: 42%;
        height: 1px;
        background: var(--cx-border);
      }
      .divider::before {
        left: 0;
      }
      .divider::after {
        right: 0;
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
export class RegAuthStep {
  readonly loading = input(false);
  readonly preselected = input(false);
  readonly label = input('Clinic');
  readonly googleSignIn = output<string>();
  readonly back = output<void>();
  readonly choosePhone = output<void>();
  readonly showPhoneOption = signal(false);

  stepLabel() {
    return this.preselected() ? 'Step 1 of 2' : 'Step 2 of 3';
  }

  protected onChoosePhone(): void {
    this.showPhoneOption.set(true);
    this.choosePhone.emit();
  }
}
