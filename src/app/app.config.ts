import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AccountDataSource, LocalAccountDataSource } from './core/account-data.source';
import { AuthProvider } from './core/auth-provider';
import { MockAuthProvider } from './core/mock-auth.provider';
import { HiringDataSource, LocalHiringDataSource } from './core/hiring-data.source';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { jwtInterceptor } from './core/jwt-interceptor';
import { errorInterceptor } from './core/error-interceptor';

import { routes } from './app.routes';
import { AppEffects } from './core/store/app.effects';
import { appReducer } from './core/store/app.reducer';
import { hydrationMetaReducer } from './core/store/storage';

export const appConfig: ApplicationConfig = {
  providers: [
    // Auth — mock provider until backend is ready
    { provide: AuthProvider, useClass: MockAuthProvider },

    // Data sources (still local until backend)
    { provide: AccountDataSource, useClass: LocalAccountDataSource },
    { provide: HiringDataSource, useClass: LocalHiringDataSource },

    // HTTP with auth interceptors
    provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),

    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideStore({ app: appReducer }, { metaReducers: [hydrationMetaReducer] }),
    provideEffects(AppEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: false }),
  ],
};
