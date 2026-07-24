import { Routes } from '@angular/router';
import { approvedClinicGuard } from '../core/approved-clinic.guard';
import { clinicAccountGuard } from '../core/clinic-account.guard';

export const CLINIC_ROUTES: Routes = [
  {
    path: '',
    canActivate: [clinicAccountGuard],
    loadComponent: () =>
      import('./clinic-shell/clinic-shell').then((m) => m.ClinicShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () =>
          import('./clinic-home/clinic-home').then((m) => m.ClinicHome),
        title: 'Clinic home | ClinicX Talent',
      },
      {
        path: 'talents',
        canActivate: [approvedClinicGuard],
        loadComponent: () =>
          import('./clinic-talents/clinic-talents').then((m) => m.ClinicTalents),
        title: 'Talent search | ClinicX Talent',
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
          import('./clinic-appearance/clinic-appearance').then(
            (m) => m.ClinicAppearance,
          ),
        title: 'Appearance | ClinicX Talent',
      },
      {
        path: 'opportunities',
        canActivate: [approvedClinicGuard],
        loadComponent: () =>
          import('./clinic-opportunities-list/clinic-opportunities-list').then(
            (m) => m.ClinicOpportunitiesList,
          ),
        title: 'My hiring links | ClinicX Talent',
      },
      {
        path: 'opportunities/new',
        canActivate: [approvedClinicGuard],
        loadComponent: () =>
          import('./clinic-opportunity-form/clinic-opportunity-form').then(
            (m) => m.ClinicOpportunityForm,
          ),
        title: 'Create hiring link | ClinicX Talent',
      },
    ],
  },
];
