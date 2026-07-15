import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectAdminAuthenticated } from './store/app.selectors';

export const adminGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);
  return store.select(selectAdminAuthenticated).pipe(
    take(1),
    map((authenticated) => authenticated || router.createUrlTree(['/admin/login'])),
  );
};
