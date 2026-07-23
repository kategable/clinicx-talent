import { Routes } from '@angular/router';
import { approvedClinicGuard } from '../core/approved-clinic.guard';
import { clinicAccountGuard } from '../core/clinic-account.guard';

export const CLINIC_ROUTES: Routes = [
  {
    path: 'home',
    canActivate: [clinicAccountGuard],
    loadComponent: () => import('./clinic-home/clinic-home').then((m) => m.ClinicHome),
    title: 'Clinic home | ClinicX Talent',
  },
  {
    path: 'talents',
    canActivate: [approvedClinicGuard],
    loadComponent: () => import('./clinic-talents/clinic-talents').then((m) => m.ClinicTalents),
    title: 'Talent search | ClinicX Talent',
  },
];
