import { Routes } from '@angular/router';
import { talentAccountGuard } from '../core/talent-account.guard';

export const TALENT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [talentAccountGuard],
    loadComponent: () =>
      import('./talent-shell/talent-shell').then((m) => m.TalentShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () =>
          import('./talent-home/talent-home').then((m) => m.TalentHome),
        title: 'Talent profile | ClinicX Talent',
      },
      {
        path: 'passport',
        loadComponent: () =>
          import('./talent-passport/talent-passport').then(
            (m) => m.TalentPassport,
          ),
        title: 'Talent Passport | ClinicX Talent',
      },
      {
        path: 'invitations',
        loadComponent: () =>
          import('./talent-invitations/talent-invitations').then(
            (m) => m.TalentInvitations,
          ),
        title: 'My invitations | ClinicX Talent',
      },
      {
        path: 'status',
        loadComponent: () =>
          import('./account-status/account-status').then(
            (m) => m.AccountStatus,
          ),
        title: 'Account status | ClinicX Talent',
      },
      {
        path: 'appearance',
        loadComponent: () =>
          import('./talent-appearance/talent-appearance').then(
            (m) => m.TalentAppearance,
          ),
        title: 'Appearance | ClinicX Talent',
      },
    ],
  },
];
