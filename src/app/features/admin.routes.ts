import { Routes } from '@angular/router';
import { adminGuard } from '../core/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./admin-login/admin-login').then((m) => m.AdminLogin),
    title: 'Admin sign in | ClinicX Admin',
  },
  {
    path: 'accounts',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin-accounts/admin-accounts').then((m) => m.AdminAccounts),
    title: 'Account review | ClinicX Admin',
  },
];
