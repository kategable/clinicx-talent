import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { MockAuthProvider } from './mock-auth.provider';
import { AuthProvider } from './auth-provider';
import { AuthService } from './auth.service';
import { AuthError } from './auth/models';
import { appReducer } from './store/app.reducer';

describe('AuthService', () => {
  let service: AuthService;
  let mockProvider: MockAuthProvider;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthProvider, useClass: MockAuthProvider },
        provideRouter([]),
        provideStore({ app: appReducer }),
      ],
    });

    service = TestBed.inject(AuthService);
    mockProvider = TestBed.inject(AuthProvider) as MockAuthProvider;
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  // -- Google OAuth ---------------------------------------------------------

  describe('signInWithGoogle', () => {
    it('should set auth state to authenticated on success', async () => {
      await service.signInWithGoogle();
      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentAccount()).toBeTruthy();
    });

    it('should persist tokens in sessionStorage on success', async () => {
      await service.signInWithGoogle();
      const raw = sessionStorage.getItem('clinicx.auth.tokens');
      expect(raw).toBeTruthy();
      const pair = JSON.parse(raw!);
      expect(pair.token).toContain('mock-jwt');
      expect(pair.refreshToken).toContain('mock-refresh');
    });
  });

  describe('handleGoogleCallback', () => {
    it('should call provider.exchangeGoogleToken with the id token', async () => {
      const spy = vi.spyOn(mockProvider, 'exchangeGoogleToken');
      await service.handleGoogleCallback('test-id-token');
      expect(spy).toHaveBeenCalledWith('test-id-token');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should set error state on token validation failure', async () => {
      vi.spyOn(mockProvider, 'exchangeGoogleToken').mockRejectedValueOnce(
        new AuthError('GOOGLE_TOKEN_INVALID', 'Invalid Google token.'),
      );
      await service.handleGoogleCallback('bad-token');
      expect(service.isAuthenticated()).toBe(false);
      expect(service.authError()).toContain('Invalid Google token');
    });
  });

  // -- Phone SMS ------------------------------------------------------------

  describe('sendSmsCode', () => {
    it('should call provider.sendSmsCode', async () => {
      const spy = vi.spyOn(mockProvider, 'sendSmsCode');
      await service.sendSmsCode('(312) 555-0199');
      expect(spy).toHaveBeenCalledWith('(312) 555-0199');
    });

    it('should handle rate limit errors', async () => {
      vi.spyOn(mockProvider, 'sendSmsCode').mockRejectedValueOnce(
        new AuthError('RATE_LIMITED', 'Too many requests.'),
      );
      await service.sendSmsCode('(312) 555-0199');
      expect(service.authError()).toContain('Too many requests');
    });
  });

  describe('verifySmsCode', () => {
    it('should set auth state to authenticated on valid code', async () => {
      // Set up the expected code in sessionStorage (what MockAuthProvider checks)
      sessionStorage.setItem('clinicx.mock.code', '123456');

      await service.verifySmsCode('(312) 555-0101', '123456');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.authState().phoneRequired).toBe(false);
    });

    it('should set auth state to error on invalid code', async () => {
      sessionStorage.setItem('clinicx.mock.code', '123456');

      await service.verifySmsCode('(312) 555-0101', '000000');
      expect(service.isAuthenticated()).toBe(false);
      expect(service.authError()).toBeTruthy();
    });

    it('should mark phoneRequired for new accounts', async () => {
      sessionStorage.setItem('clinicx.mock.code', '123456');

      // Use a phone that has no seed account
      await service.verifySmsCode('(999) 555-0101', '123456');
      // New account flow triggers phoneRequired state
      expect(service.authState().phoneRequired).toBe(true);
    });

    it('should handle max attempts exceeded', async () => {
      // Simulate 3 prior attempts
      sessionStorage.setItem('clinicx.mock.code', '123456');

      // Wrong code 3 times
      for (let i = 0; i < 3; i++) {
        await service.verifySmsCode('(312) 555-0101', '000000');
      }
      expect(service.authError()).toBeTruthy();
    });
  });

  // -- Token management -----------------------------------------------------

  describe('token management', () => {
    it('should persist token in sessionStorage on successful auth', async () => {
      await service.signInWithGoogle();
      const token = service.getToken();
      expect(token).toBeTruthy();
      expect(token).toContain('mock-jwt');
    });

    it('should return null for token when not authenticated', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should clear token on sign out', async () => {
      await service.signInWithGoogle();
      service.signOut();
      expect(service.getToken()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  // -- Admin ----------------------------------------------------------------

  describe('adminLogin', () => {
    it('should succeed with valid admin credentials', async () => {
      await service.adminLogin('admin', 'admin');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should fail with invalid admin credentials', async () => {
      await service.adminLogin('admin', 'wrong');
      expect(service.isAuthenticated()).toBe(false);
      expect(service.authError()).toContain('Incorrect');
    });
  });

  // -- Session --------------------------------------------------------------

  describe('session management', () => {
    it('should clear session on sign out', async () => {
      await service.signInWithGoogle();
      expect(service.isAuthenticated()).toBe(true);

      service.signOut();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentAccount()).toBeNull();
      expect(service.getToken()).toBeNull();
    });

    it('should clear session on admin logout', async () => {
      await service.adminLogin('admin', 'admin');
      service.adminLogout();
      expect(service.isAuthenticated()).toBe(false);
    });
  });
});
