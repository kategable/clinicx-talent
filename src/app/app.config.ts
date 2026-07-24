import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { AccountDataSource, LocalAccountDataSource } from './core/account-data.source';
import { HiringDataSource, LocalHiringDataSource } from './core/hiring-data.source';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { AppEffects } from './core/store/app.effects';
import { appReducer } from './core/store/app.reducer';
import { hydrationMetaReducer } from './core/store/storage';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: AccountDataSource, useClass: LocalAccountDataSource },
    { provide: HiringDataSource, useClass: LocalHiringDataSource },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideStore({ app: appReducer }, { metaReducers: [hydrationMetaReducer] }),
    provideEffects(AppEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: false }),
  ],
};
