import {
  type ChatMessage,
  type OnboardingResponse,
} from '../../../features/accounts/onboarding-chat/models';

export interface OnboardingState {
  messages: ChatMessage[];
  sending: boolean;
  complete: boolean;
  step: OnboardingResponse['step'];
}

export const initialOnboardingState: OnboardingState = {
  messages: [],
  sending: false,
  complete: false,
  step: 'greeting',
};
