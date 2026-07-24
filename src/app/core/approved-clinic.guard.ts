import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectCurrentAccount } from './store/app.selectors';

export const approvedClinicGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);
  return store.select(selectCurrentAccount).pipe(
    take(1),
    map((account) => {
      if (account?.type === 'clinic' && account.status === 'approved') return true;
      return account
        ? router.createUrlTree(['/clinic/status'])
        : router.createUrlTree(['/signin']);
    }),
  );
};
