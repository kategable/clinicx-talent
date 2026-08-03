import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, filter, from, map, mergeMap, of, withLatestFrom } from 'rxjs';
import type { ClinicDetails, TalentDetails } from '../../account';
import { AppActions } from '../app.actions';
import { selectCurrentAccount } from '../app.selectors';
import { OnboardingService } from '../../../features/accounts/onboarding-chat/onboarding.service';
import { OnboardingActions } from './onboarding.actions';
import { selectOnboardingMessages } from './onboarding.selectors';

function emptyClinic(): ClinicDetails {
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

function emptyTalent(): TalentDetails {
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

const clinicFields = ['clinicName', 'location', 'specialties', 'position', 'payRange', 'idealHire'];
const talentFields = ['professionalName', 'role', 'yearsExperience', 'skills', 'availability'];

@Injectable()
export class OnboardingEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly service = inject(OnboardingService);

  /** Calls the service with the full message history after each user message. */
  readonly sendMessage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OnboardingActions.sendMessage),
      withLatestFrom(this.store.select(selectOnboardingMessages)),
      mergeMap(([{ accountType }, messages]) =>
        from(this.service.sendMessage(accountType, messages)).pipe(
          map((response) => OnboardingActions.messageReceived({ response })),
          catchError(() =>
            of(
              OnboardingActions.messageReceived({
                response: {
                  message: "Sorry, something went wrong. Let's try again.",
                  step: 'complete',
                },
              }),
            ),
          ),
        ),
      ),
    ),
  );

  /** Persist the user's answer into the appropriate profile field after each response. */
  readonly saveProfile$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(OnboardingActions.messageReceived),
        withLatestFrom(
          this.store.select(selectOnboardingMessages),
          this.store.select(selectCurrentAccount),
        ),
        map(([, messages, account]) => {
          if (!account) return undefined;

          const userMsgs = messages.filter((m) => m.role === 'user');
          if (userMsgs.length === 0) return undefined;

          const lastAnswer = userMsgs[userMsgs.length - 1].content;
          const fields = account.type === 'clinic' ? clinicFields : talentFields;
          const field = fields[Math.min(userMsgs.length - 1, fields.length - 1)];

          if (account.type === 'clinic') {
            const details: ClinicDetails = {
              ...emptyClinic(),
              ...account.clinicDetails,
              [field]: lastAnswer,
            };
            return AppActions.saveClinicDetails({ details });
          }
          const details: TalentDetails = {
            ...emptyTalent(),
            ...account.talentDetails,
            [field]: lastAnswer,
          };
          return AppActions.saveTalentDetails({ details });
        }),
        filter((action): action is NonNullable<typeof action> => action != null),
      ),
    { dispatch: true },
  );
}
