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
    'Set Active Account': props<{ accountId: string }>(),
    'Set Active Account With Record': props<{
      accountId: string;
      account: import('../account').AccountRecord;
    }>(),
    'Clear Pending Invite': emptyProps(),

    // -- Auth ----------------------------------------------------------------
    'Sign In With Google': props<{ idToken: string }>(),
    'Send Sms Code': props<{ phone: string }>(),
    'Verify Sms Code': props<{ phone: string; code: string }>(),
    'Create Account': props<{ accountType: AccountType; phone: string }>(),
    'Auth Admin Login': props<{ username: string; password: string }>(),
    'Auth Admin Logout': emptyProps(),
    'Auth Sign Out': emptyProps(),
    'Set Auth Status': props<{
      status: 'idle' | 'loading' | 'authenticated' | 'error';
      error?: string;
      isNewAccount?: boolean;
      phoneRequired?: boolean;
    }>(),
    'Set Auth Tokens': props<{ token: string; refreshToken: string }>(),
    'Clear Auth Error': emptyProps(),

    // -- Soft delete ----------------------------------------------------------
    'Soft Delete Account': props<{ id: string }>(),
    'Restore Account': props<{ id: string }>(),
    'Soft Delete Opportunity': props<{ id: string }>(),
    'Restore Opportunity': props<{ id: string }>(),
    'Soft Delete Passport': props<{ id: string }>(),
    'Restore Passport': props<{ id: string }>(),
    'Soft Delete Invite': props<{ id: string }>(),
    'Restore Invite': props<{ id: string }>(),
  },
});
