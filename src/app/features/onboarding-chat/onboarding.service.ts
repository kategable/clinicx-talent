import { Injectable } from '@angular/core';
import { delay, map, of, type Observable } from 'rxjs';
import { type ChatMessage, type OnboardingResponse } from './models';

interface QuestionDef {
  message: string;
  step: OnboardingResponse['step'];
  fields?: Record<string, string>; // field → hint (not used for parsing in mock)
}

/**
 * Mock onboarding service — simulates a backend AI-powered workflow.
 * Each call advances the conversation and returns field mappings that tell
 * the component which NgRx action to dispatch.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly clinicQuestions: QuestionDef[] = [
    {
      message: "Let's start with the basics. What's the name of your clinic?",
      step: 'identity',
      fields: { clinicName: '' },
    },
    {
      message: 'Where is your clinic located? (City and state is perfect.)',
      step: 'location',
      fields: { location: '', city: '', state: '' },
    },
    {
      message:
        'What treatments and specialties does your clinic focus on? (Injectables, laser, body contouring, etc.)',
      step: 'experience',
      fields: { specialties: '', about: '' },
    },
    {
      message:
        'What position are you looking to hire for? (e.g., RN Injector, Aesthetic NP, Practice Manager)',
      step: 'role',
      fields: { position: '', mustHaveSkills: '' },
    },
    {
      message:
        "What's the pay range and benefits for this role? (Health insurance, PTO, commission, etc.)",
      step: 'skills',
      fields: { payRange: '', benefits: '' },
    },
    {
      message: 'Describe your ideal hire. What kind of person would thrive at your clinic?',
      step: 'availability',
      fields: { urgency: '', idealHire: '' },
    },
    {
      message:
        "That's everything I need. Your clinic profile is ready for review! We'll let you know when a ClinicX admin approves it.",
      step: 'complete',
    },
  ];

  private readonly talentQuestions: QuestionDef[] = [
    {
      message: "Let's start with the basics. What's your professional name?",
      step: 'identity',
      fields: { professionalName: '' },
    },
    {
      message: "What's your current role and where are you based?",
      step: 'role',
      fields: { role: '', location: '' },
    },
    {
      message:
        "Tell me about your experience. How many years have you been in aesthetics, and what's your background?",
      step: 'experience',
      fields: { yearsExperience: '', experienceTimeline: '' },
    },
    {
      message:
        "What skills and procedures do you specialize in? List any techniques, devices, or treatments you're proficient with.",
      step: 'skills',
      fields: { skills: '', introduction: '' },
    },
    {
      message: "What's your typical availability and salary expectation?",
      step: 'availability',
      fields: { availability: '', salaryExpectation: '' },
    },
    {
      message:
        "That's everything I need. Your profile is ready for review! We'll let you know when a ClinicX admin approves it.",
      step: 'complete',
    },
  ];

  /** Returns the last user message text, or empty string. */
  private lastAnswer(messages: ChatMessage[]): string {
    const userMsgs = messages.filter((m) => m.role === 'user');
    return userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : '';
  }

  sendMessage(
    accountType: 'clinic' | 'talent',
    messages: ChatMessage[],
  ): Observable<OnboardingResponse> {
    const questions = accountType === 'clinic' ? this.clinicQuestions : this.talentQuestions;
    const userMsgCount = messages.filter((m) => m.role === 'user').length;

    // Previous step → build profile updates from the user's answer
    const prevIdx = userMsgCount - 1;
    let profileUpdates: Record<string, string> | undefined;
    if (prevIdx >= 0 && prevIdx < questions.length) {
      const prevQ = questions[prevIdx];
      if (prevQ.fields) {
        const answer = this.lastAnswer(messages);
        profileUpdates = {};
        for (const key of Object.keys(prevQ.fields)) {
          profileUpdates[key] = answer;
        }
      }
    }

    // Pick the next question
    const idx = Math.min(userMsgCount, questions.length - 1);
    const { message, step } = questions[idx];

    const latency = 800 + Math.random() * 600;

    return of({ message, step, profileUpdates }).pipe(
      delay(latency),
      map((r) => r),
    );
  }
}
