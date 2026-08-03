import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/public/home/home').then((m) => m.Home),
    title: 'ClinicX Talent | Curated Aesthetics Talent',
  },
  {
    path: 'admins',
    loadComponent: () => import('./features/public/home/home').then((m) => m.Home),
    title: 'Admin access | ClinicX Talent',
    data: { showAdminLink: true },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/registration/registration').then((m) => m.Registration),
    title: 'Create an account | ClinicX Talent',
  },
  {
    path: 'register/:type',
    loadComponent: () =>
      import('./features/auth/registration/registration').then((m) => m.Registration),
    title: 'Create an account | ClinicX Talent',
  },
  {
    path: 'signin',
    loadComponent: () => import('./features/auth/signin/signin').then((m) => m.Signin),
    title: 'Sign in | ClinicX Talent',
  },
  {
    path: 'onboarding',
    redirectTo: '/talent/onboarding',
  },
  {
    path: 'account/status',
    loadComponent: () =>
      import('./features/accounts/account-status/account-status').then((m) => m.AccountStatus),
    title: 'Account status | ClinicX Talent',
  },
  {
    path: 'clinic',
    pathMatch: 'full',
    redirectTo: 'clinic/home',
  },
  {
    path: 'clinic',
    loadChildren: () => import('./features/clinic/clinic.routes').then((m) => m.CLINIC_ROUTES),
  },
  {
    path: 'talent',
    pathMatch: 'full',
    redirectTo: 'talent/home',
  },
  {
    path: 'talent',
    loadChildren: () => import('./features/talent/talent.routes').then((m) => m.TALENT_ROUTES),
  },
  {
    path: 'admin',
    pathMatch: 'full',
    redirectTo: 'admin/login',
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/public/contact/contact').then((m) => m.Contact),
    title: 'Contact ClinicX Talent',
  },
  {
    path: 'join/:clinicSlug/:positionSlug',
    loadComponent: () =>
      import('./features/public/public-hiring-page/public-hiring-page').then(
        (m) => m.PublicHiringPage,
      ),
    title: 'Job opportunity | ClinicX Talent',
  },
  {
    path: 'talent/:talentSlug',
    loadComponent: () =>
      import('./features/public/public-talent-passport/public-talent-passport').then(
        (m) => m.PublicTalentPassport,
      ),
    title: 'Talent profile | ClinicX Talent',
  },
  {
    path: 'founders',
    loadComponent: () => import('./features/public/founders/founders').then((m) => m.Founders),
    title: 'Founder 1000 Club | ClinicX Talent',
  },
  {
    path: 'c/:clinicSlug',
    loadComponent: () =>
      import('./features/public/public-clinic-profile/public-clinic-profile').then(
        (m) => m.PublicClinicProfile,
      ),
    title: 'Clinic profile | ClinicX Talent',
  },
  { path: '**', redirectTo: '' },
];
