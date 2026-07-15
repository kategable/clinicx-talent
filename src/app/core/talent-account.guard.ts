import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectCurrentAccount } from './store/app.selectors';

export const talentAccountGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);
  return store.select(selectCurrentAccount).pipe(
    take(1),
    map((account) => (account?.type === 'talent' ? true : router.createUrlTree(['/signin']))),
  );
};
