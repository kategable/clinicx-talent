import { createReducer, on } from '@ngrx/store';
import { OnboardingActions } from './onboarding.actions';
import { initialOnboardingState } from './onboarding.state';

export const onboardingReducer = createReducer(
  initialOnboardingState,

  on(OnboardingActions.start, (_state, { accountType }) => {
    const prompt =
      accountType === 'clinic'
        ? "Hi! I'm your ClinicX setup assistant. I'll ask a few questions to help build your clinic profile. When you're ready, type your clinic name."
        : "Hi! I'm your ClinicX setup assistant. I'll ask a few questions to help build your professional profile. When you're ready, type your professional name.";
    return {
      ...initialOnboardingState,
      messages: [
        {
          role: 'assistant',
          content: prompt,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }),

  on(OnboardingActions.sendMessage, (state, { content }) => ({
    ...state,
    messages: [...state.messages, { role: 'user', content, timestamp: new Date().toISOString() }],
    sending: true,
  })),

  on(OnboardingActions.messageReceived, (state, { response }) => ({
    ...state,
    messages: [
      ...state.messages,
      { role: 'assistant', content: response.message, timestamp: new Date().toISOString() },
    ],
    sending: false,
    step: response.step,
    complete: response.step === 'complete',
  })),

  on(OnboardingActions.reset, () => initialOnboardingState),
);
