import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  AccountType,
  ClinicDetails,
  ReviewStatus,
  TalentDetails,
  ThemePreference,
} from '../account';
import { ApplicationStatus } from '../hiring';

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
    'Reset Verification': emptyProps(),
    'Load All Accounts': emptyProps(),
    'Load All Hiring': emptyProps(),
    'Load Hiring Data': props<{
      opportunities: import('../hiring').HiringOpportunity[];
      invites: import('../hiring').HiringInvite[];
      applications: import('../hiring').TalentApplication[];
    }>(),
    'Load Accounts': props<{ accounts: Record<string, import('../account').AccountRecord> }>(),
    'Clear Error': emptyProps(),
    'Create Opportunity': props<{
      clinicName: string;
      position: string;
      location: string;
      payRange: string;
      mustHaveSkills: string;
      benefits: string;
      urgency: string;
      idealHire: string;
    }>(),
    'Share Talent Passport': props<{ talentAccountId: string }>(),
    'Accept Hiring Invite': props<{ token: string }>(),
    'Accept Passport Invite': props<{ token: string }>(),
    'Create Application From Invite': emptyProps(),
    'Update Application Status': props<{
      applicationId: string;
      status: ApplicationStatus;
    }>(),
    'Save Account Contact': props<{
      email: string;
      displayPhone: string;
      shareEmail: boolean;
      sharePhone: boolean;
    }>(),
    'Add Talent To My Clinic': props<{ talentAccountId: string }>(),
    'Clear Pending Invite': emptyProps(),
  },
});
