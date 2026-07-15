import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { approvedClinicGuard } from './core/approved-clinic.guard';
import { clinicAccountGuard } from './core/clinic-account.guard';
import { talentAccountGuard } from './core/talent-account.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'ClinicX Talent | Curated Aesthetics Talent',
  },
  {
    path: 'register',
    loadComponent: () => import('./features/registration/registration').then((m) => m.Registration),
    title: 'Create an account | ClinicX Talent',
  },
  {
    path: 'signin',
    loadComponent: () => import('./features/registration/registration').then((m) => m.Registration),
    title: 'Sign in | ClinicX Talent',
    data: { mode: 'signin' },
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/profile-setup/profile-setup').then((m) => m.ProfileSetup),
    title: 'Build your profile | ClinicX Talent',
  },
  {
    path: 'account/status',
    loadComponent: () =>
      import('./features/account-status/account-status').then((m) => m.AccountStatus),
    title: 'Account status | ClinicX Talent',
  },
  {
    path: 'clinic',
    pathMatch: 'full',
    redirectTo: 'clinic/home',
  },
  {
    path: 'clinic/home',
    canActivate: [clinicAccountGuard],
    loadComponent: () => import('./features/clinic-home/clinic-home').then((m) => m.ClinicHome),
    title: 'Clinic home | ClinicX Talent',
  },
  {
    path: 'clinic/talents',
    canActivate: [approvedClinicGuard],
    loadComponent: () =>
      import('./features/clinic-talents/clinic-talents').then((m) => m.ClinicTalents),
    title: 'Talent search | ClinicX Talent',
  },
  {
    path: 'talent',
    pathMatch: 'full',
    redirectTo: 'talent/home',
  },
  {
    path: 'talent/home',
    canActivate: [talentAccountGuard],
    loadComponent: () => import('./features/talent-home/talent-home').then((m) => m.TalentHome),
    title: 'Talent profile | ClinicX Talent',
  },
  {
    path: 'admin',
    pathMatch: 'full',
    redirectTo: 'admin/login',
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin-login/admin-login').then((m) => m.AdminLogin),
    title: 'Admin sign in | ClinicX Admin',
  },
  {
    path: 'admin/accounts',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin-accounts/admin-accounts').then((m) => m.AdminAccounts),
    title: 'Account review | ClinicX Admin',
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact').then((m) => m.Contact),
    title: 'Contact ClinicX Talent',
  },
  { path: '**', redirectTo: '' },
];
