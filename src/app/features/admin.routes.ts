import { Routes } from '@angular/router';
import { adminGuard } from '../core/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./admin-login/admin-login').then((m) => m.AdminLogin),
    title: 'Admin sign in | ClinicX Admin',
  },
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin-shell/admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'accounts' },
      {
        path: 'accounts',
        loadComponent: () =>
          import('./admin-accounts/admin-accounts').then(
            (m) => m.AdminAccounts,
          ),
        title: 'Account review | ClinicX Admin',
      },
      {
        path: 'talent',
        loadComponent: () =>
          import('./admin-accounts/admin-accounts').then(
            (m) => m.AdminAccounts,
          ),
        data: { typeFilter: 'talent' },
        title: 'Talent | ClinicX Admin',
      },
      {
        path: 'clinics',
        loadComponent: () =>
          import('./admin-accounts/admin-accounts').then(
            (m) => m.AdminAccounts,
          ),
        data: { typeFilter: 'clinic' },
        title: 'Clinics | ClinicX Admin',
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./admin-jobs/admin-jobs').then((m) => m.AdminJobs),
        title: 'Jobs | ClinicX Admin',
      },
      {
        path: 'placements',
        loadComponent: () =>
          import('./admin-placements/admin-placements').then(
            (m) => m.AdminPlacements,
          ),
        title: 'Placements | ClinicX Admin',
      },
    ],
  },
];
