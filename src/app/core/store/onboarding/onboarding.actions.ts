import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { type OnboardingResponse } from '../../../features/accounts/onboarding-chat/models';

export const OnboardingActions = createActionGroup({
  source: 'Onboarding',
  events: {
    Start: props<{ accountType: 'clinic' | 'talent' }>(),
    'Send Message': props<{ accountType: 'clinic' | 'talent'; content: string }>(),
    'Message Received': props<{ response: OnboardingResponse }>(),
    Reset: emptyProps(),
  },
});
