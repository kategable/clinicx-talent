import { AccountRecord, AccountType } from '../account';

/** Result returned after any successful authentication. */
export interface AuthResult {
  token: string;
  refreshToken: string;
  account: AccountRecord;
  /** True when this phone has no existing account (registration flow). */
  isNewAccount: boolean;
  /** True when a Google-authenticated account still needs phone verification. */
  phoneRequired: boolean;
}

/** Token pair stored in sessionStorage so auth survives refreshes. */
export interface TokenPair {
  token: string;
  refreshToken: string;
}

/** Tracks the current auth flow state in AuthService. */
export interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  account: AccountRecord | null;
  error: string | null;
  /** When true the user must verify a phone number before continuing. */
  phoneRequired: boolean;
}

/** Structured error from auth operations. */
export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export type AuthErrorCode =
  | 'INVALID_CODE'
  | 'PHONE_LOCKED'
  | 'RATE_LIMITED'
  | 'INVALID_CREDENTIALS'
  | 'GOOGLE_TOKEN_INVALID'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';
