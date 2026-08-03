import { createFeatureSelector, createSelector } from '@ngrx/store';
import { type OnboardingState } from './onboarding.state';

export const selectOnboardingState = createFeatureSelector<OnboardingState>('onboarding');

export const selectOnboardingMessages = createSelector(
  selectOnboardingState,
  (state) => state.messages,
);

export const selectOnboardingSending = createSelector(
  selectOnboardingState,
  (state) => state.sending,
);

export const selectOnboardingComplete = createSelector(
  selectOnboardingState,
  (state) => state.complete,
);
