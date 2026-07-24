import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'ClinicX Talent | Curated Aesthetics Talent',
  },
  {
    path: 'admins',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'Admin access | ClinicX Talent',
    data: { showAdminLink: true },
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
    path: 'clinic',
    loadChildren: () => import('./features/clinic.routes').then((m) => m.CLINIC_ROUTES),
  },
  {
    path: 'talent',
    pathMatch: 'full',
    redirectTo: 'talent/home',
  },
  {
    path: 'talent',
    loadChildren: () => import('./features/talent.routes').then((m) => m.TALENT_ROUTES),
  },
  {
    path: 'admin',
    pathMatch: 'full',
    redirectTo: 'admin/login',
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact').then((m) => m.Contact),
    title: 'Contact ClinicX Talent',
  },
  {
    path: 'join/:clinicSlug/:positionSlug',
    loadComponent: () =>
      import('./features/public-hiring-page/public-hiring-page').then(
        (m) => m.PublicHiringPage,
      ),
    title: 'Job opportunity | ClinicX Talent',
  },
  {
    path: 'talent/:talentSlug',
    loadComponent: () =>
      import('./features/public-talent-passport/public-talent-passport').then(
        (m) => m.PublicTalentPassport,
      ),
    title: 'Talent profile | ClinicX Talent',
  },
  {
    path: 'founders',
    loadComponent: () => import('./features/founders/founders').then((m) => m.Founders),
    title: 'Founder 1000 Club | ClinicX Talent',
  },
  {
    path: 'c/:clinicSlug',
    loadComponent: () =>
      import('./features/public-clinic-profile/public-clinic-profile').then(
        (m) => m.PublicClinicProfile,
      ),
    title: 'Clinic profile | ClinicX Talent',
  },
  { path: '**', redirectTo: '' },
];
