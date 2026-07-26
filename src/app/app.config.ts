import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AccountDataSource, LocalAccountDataSource } from './core/account-data.source';
import { HttpAccountDataSource } from './core/http-account.data-source';
import { AuthProvider } from './core/auth-provider';
import { MockAuthProvider } from './core/mock-auth.provider';
import { HttpAuthProvider } from './core/http-auth.provider';
import { HiringDataSource, LocalHiringDataSource } from './core/hiring-data.source';
import { HttpHiringDataSource } from './core/http-hiring.data-source';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { jwtInterceptor } from './core/jwt-interceptor';
import { errorInterceptor } from './core/error-interceptor';
import { environment } from '../environments/environment';

import { routes } from './app.routes';
import { AppEffects } from './core/store/app.effects';
import { appReducer } from './core/store/app.reducer';
import { hydrationMetaReducer } from './core/store/storage';

export const appConfig: ApplicationConfig = {
  providers: [
    // Auth — flip to HttpAuthProvider when connecting to backend
    {
      provide: AuthProvider,
      useClass: environment.useMockAuth ? MockAuthProvider : HttpAuthProvider,
    },

    // Data sources — flip to HTTP implementations when backend is ready
    {
      provide: AccountDataSource,
      useClass: environment.useBackend ? HttpAccountDataSource : LocalAccountDataSource,
    },
    {
      provide: HiringDataSource,
      useClass: environment.useBackend ? HttpHiringDataSource : LocalHiringDataSource,
    },

    // HTTP with auth interceptors
    provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),

    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideStore({ app: appReducer }, { metaReducers: [hydrationMetaReducer] }),
    provideEffects(AppEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: false }),
  ],
};
