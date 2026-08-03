import { type ChatMessage } from '../../../features/accounts/onboarding-chat/models';

export interface OnboardingState {
  messages: ChatMessage[];
  sending: boolean;
  complete: boolean;
  step: string;
}

export const initialOnboardingState: OnboardingState = {
  messages: [],
  sending: false,
  complete: false,
  step: 'greeting',
};
