import { Component, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AccountType } from '../../../core/account';

@Component({
  selector: 'app-reg-type-step',
  imports: [MatButtonModule],
  template: `
    <div class="steps" aria-label="Registration progress">
      <span class="active">1</span><i></i><span>2</span><i></i><span>3</span>
    </div>
    <div class="card-heading">
      <span>Step 1 of 3</span>
      <h2>How will you use ClinicX?</h2>
      <p>Choose the profile you want to create first.</p>
    </div>
    <div class="type-options">
      <button
        mat-stroked-button
        class="type-choice"
        type="button"
        (click)="selected.emit('clinic')"
      >
        <span class="type-choice-content">
          <span class="type-copy">
            <strong>I represent a clinic</strong>
            <small>Hire and vet exceptional talent</small>
          </span>
          <span class="type-arrow">&rarr;</span>
        </span>
      </button>
      <button
        mat-stroked-button
        class="type-choice"
        type="button"
        (click)="selected.emit('talent')"
      >
        <span class="type-choice-content">
          <span class="type-copy">
            <strong>I'm joining as talent</strong>
            <small>Build a profile and explore clinics</small>
          </span>
          <span class="type-arrow">&rarr;</span>
        </span>
      </button>
    </div>
  `,
  styles: [
    `
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
      .type-options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .type-choice {
        width: 100%;
        text-align: left;
        justify-content: flex-start;
        padding: 1.5rem 1.25rem;
        border-radius: 12px;
        border: 2px solid var(--cx-border) !important;
      }
      .type-choice:hover {
        border-color: var(--cx-text) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
      .type-choice-content {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        width: 100%;
      }
      .type-copy {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .type-copy strong {
        font-size: 1.0625rem;
        font-weight: 600;
        line-height: 1.4;
      }
      .type-copy small {
        font-size: 0.875rem;
        color: var(--cx-muted);
        line-height: 1.4;
      }
      .type-arrow {
        color: var(--cx-muted);
        font-size: 1.5rem;
        font-weight: 300;
      }
    `,
  ],
})
export class RegTypeStep {
  readonly selected = output<AccountType>();
}
