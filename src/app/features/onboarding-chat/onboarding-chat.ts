import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../core/store/app.actions';
import { selectCurrentAccount } from '../../core/store/app.selectors';
import type { ClinicDetails, TalentDetails } from '../../core/account';
import { type ChatMessage } from './models';
import { OnboardingService } from './onboarding.service';

function emptyClinicDetails(): ClinicDetails {
  return {
    clinicName: '',
    location: '',
    city: '',
    state: '',
    website: '',
    specialties: '',
    about: '',
    position: '',
    mustHaveSkills: '',
    payRange: '',
    benefits: '',
    urgency: '',
    idealHire: '',
  };
}

function emptyTalentDetails(): TalentDetails {
  return {
    professionalName: '',
    photoName: '',
    videoName: '',
    role: '',
    location: '',
    yearsExperience: '',
    experienceTimeline: '',
    skills: '',
    certificateNames: [],
    availability: '',
    salaryExpectation: '',
    languages: '',
    portfolioUrl: '',
    galleryNames: [],
    introduction: '',
  };
}

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
  private readonly service = inject(OnboardingService);
  private readonly store = inject(Store);
  private readonly messageList = viewChild<ElementRef>('messageList');

  protected readonly account = this.store.selectSignal(selectCurrentAccount);

  readonly messages = signal<ChatMessage[]>([this.greeting()]);
  readonly inputValue = signal('');
  readonly sending = signal(false);
  readonly complete = signal(false);

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  sendMessage(): void {
    const text = this.inputValue().trim();
    if (!text || this.sending() || this.complete()) return;

    const accountType = this.account()?.type ?? 'talent';

    this.pushMessage('user', text);
    this.inputValue.set('');
    this.sending.set(true);

    this.service.sendMessage(accountType, this.messages()).subscribe({
      next: (res) => {
        this.pushMessage('assistant', res.message);
        this.savingUpdates(res.profileUpdates);
        this.sending.set(false);
        if (res.step === 'complete') {
          this.complete.set(true);
        }
        this.scrollToBottom();
      },
    });
  }

  /** Merge profile updates from the LLM response into the store. */
  private savingUpdates(updates?: Record<string, string>): void {
    if (!updates || Object.keys(updates).length === 0) return;

    const current = this.account();
    if (!current) return;

    if (current.type === 'clinic') {
      const details: ClinicDetails = {
        ...emptyClinicDetails(),
        ...current.clinicDetails,
        ...updates,
      };
      this.store.dispatch(AppActions.saveClinicDetails({ details }));
    } else {
      const details: TalentDetails = {
        ...emptyTalentDetails(),
        ...current.talentDetails,
        ...updates,
      };
      this.store.dispatch(AppActions.saveTalentDetails({ details }));
    }
  }

  private pushMessage(role: ChatMessage['role'], content: string): void {
    this.messages.update((msgs) => [
      ...msgs,
      { role, content, timestamp: new Date().toISOString() },
    ]);
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const el = this.messageList()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  private greeting(): ChatMessage {
    const accountType = this.account()?.type ?? 'talent';
    const label = accountType === 'clinic' ? 'clinic' : 'professional';
    return {
      role: 'assistant',
      content: `Hi! I'm your ClinicX setup assistant. I'll ask a few questions to help build your ${label} profile. Ready?`,
      timestamp: new Date().toISOString(),
    };
  }
}
