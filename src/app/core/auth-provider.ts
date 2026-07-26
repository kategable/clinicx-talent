import { Injectable } from '@angular/core';
import { AuthResult } from './auth/models';

/**
 * Abstract auth provider — all authentication operations go through this
 * interface. Swap implementations at the DI level:
 *
 *   { provide: AuthProvider, useClass: MockAuthProvider }   // dev
 *   { provide: AuthProvider, useClass: HttpAuthProvider }   // prod (future)
 */
@Injectable()
export abstract class AuthProvider {
  /** Exchange a Google ID token for a ClinicX JWT + account. */
  abstract exchangeGoogleToken(idToken: string): Promise<AuthResult>;

  /** Send a 6-digit SMS verification code to the given phone. */
  abstract sendSmsCode(phone: string): Promise<void>;

  /** Verify a 6-digit SMS code for the given phone. */
  abstract verifySmsCode(phone: string, code: string): Promise<AuthResult>;

  /** Admin username/password login. */
  /** Create a new account after phone verification (with chosen type). */
  abstract createAccount(phone: string, type: string): Promise<AuthResult>;

  abstract adminLogin(username: string, password: string): Promise<AuthResult>;
}
