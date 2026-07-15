import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  AccountType,
  ClinicDetails,
  ReviewStatus,
  TalentDetails,
  ThemePreference,
} from '../account';

export const AppActions = createActionGroup({
  source: 'ClinicX App',
  events: {
    'Select Account Type': props<{ accountType: AccountType }>(),
    'Request SMS Code': props<{ phone: string }>(),
    'Change Phone': emptyProps(),
    'Change Account Type': emptyProps(),
    'Verify Registration Code': props<{ code: string }>(),
    'Verify Sign In Code': props<{ code: string }>(),
    'Reset Registration': props<{ accountType?: AccountType; signIn: boolean }>(),
    'Complete Profile': props<{ displayName: string }>(),
    'Save Clinic Details': props<{ details: ClinicDetails }>(),
    'Save Talent Details': props<{ details: TalentDetails }>(),
    'Set Theme Preference': props<{ preference: ThemePreference }>(),
    'Set Review Status': props<{ id: string; status: ReviewStatus }>(),
    'Sign Out': emptyProps(),
    'Request Review Reminder': props<{ accountId: string }>(),
    'Admin Login': props<{ username: string; password: string }>(),
    'Admin Logout': emptyProps(),
    'Clear Error': emptyProps(),
  },
});
