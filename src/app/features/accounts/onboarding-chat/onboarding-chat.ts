import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, pairwise } from 'rxjs';
import { OnboardingActions } from '../../../core/store/onboarding/onboarding.actions';
import {
  selectOnboardingComplete,
  selectOnboardingMessages,
  selectOnboardingSending,
} from '../../../core/store/onboarding/onboarding.selectors';
import { selectCurrentAccount } from '../../../core/store/app.selectors';

@Component({
  selector: 'app-onboarding-chat',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './onboarding-chat.html',
  styleUrl: './onboarding-chat.scss',
})
export class OnboardingChat implements AfterViewInit {
  private readonly store = inject(Store);
  private readonly messageList = viewChild<ElementRef>('messageList');

  private readonly chatInput = viewChild('chatInput', { read: MatInput });

  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  protected readonly messages = this.store.selectSignal(selectOnboardingMessages);
  protected readonly sending = this.store.selectSignal(selectOnboardingSending);
  protected readonly complete = this.store.selectSignal(selectOnboardingComplete);

  readonly inputValue = signal('');

  constructor() {
    const accountType = this.account()?.type ?? 'talent';
    this.store.dispatch(OnboardingActions.start({ accountType }));

    // When sending flips true→false, the response arrived — refocus input
    toObservable(this.sending)
      .pipe(
        takeUntilDestroyed(),
        pairwise(),
        filter(([prev, curr]) => prev && !curr),
      )
      .subscribe(() => {
        requestAnimationFrame(() => {
          this.scrollToBottom();
          this.chatInput()?.focus();
        });
      });
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  sendMessage(): void {
    const text = this.inputValue().trim();
    if (!text || this.sending() || this.complete()) return;

    const accountType = this.account()?.type ?? 'talent';
    this.store.dispatch(OnboardingActions.sendMessage({ accountType, content: text }));
    this.inputValue.set('');
  }

  private scrollToBottom(): void {
    const el = this.messageList()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
