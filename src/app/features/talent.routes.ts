import { Routes } from '@angular/router';
import { talentAccountGuard } from '../core/talent-account.guard';

export const TALENT_ROUTES: Routes = [
  {
    path: 'home',
    canActivate: [talentAccountGuard],
    loadComponent: () => import('./talent-home/talent-home').then((m) => m.TalentHome),
    title: 'Talent profile | ClinicX Talent',
  },
];
