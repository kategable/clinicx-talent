import { Injectable } from '@angular/core';
import { AccountRecord, SEEDED_ACCOUNTS, formatPhone, normalizePhone } from './account';
import { canBecomeFounder } from './founder';
import { AuthResult, AuthError } from './auth/models';
import { MOCK_CODE_KEY } from './auth/constants';
import { AuthProvider } from './auth-provider';

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Development auth provider — simulates all auth flows without a backend.
 * Logs SMS codes to console and stores them in sessionStorage so tests
 * and manual QA can read them.
 */
@Injectable()
export class MockAuthProvider implements AuthProvider {
  async exchangeGoogleToken(_idToken: string): Promise<AuthResult> {
    await delay(800);

    // Return a simulated talent account as if Google auth succeeded.
    const account = this.findSeedAccount('(312) 555-0102') ?? this.buildDemoAccount();

    return {
      token: `mock-jwt-${Date.now().toString(36)}`,
      refreshToken: `mock-refresh-${Date.now().toString(36)}`,
      account,
      isNewAccount: false,
      phoneRequired: account.phone === '',
    };
  }

  async sendSmsCode(phone: string): Promise<void> {
    await delay(500);
    const normalized = normalizePhone(phone);
    const mockCode = '123456';
    console.warn(`[MOCK SMS] Code for ${formatPhone(phone)}: ${mockCode}`);
    sessionStorage.setItem(MOCK_CODE_KEY, mockCode);

    // Simulate per-phone rate limiting in memory
    const attemptsKey = `clinicx.mock.attempts.${normalized}`;
    const attempts = Number(sessionStorage.getItem(attemptsKey) ?? '0');
    if (attempts >= 3) {
      throw new AuthError(
        'PHONE_LOCKED',
        'This phone number has been temporarily locked due to too many attempts.',
      );
    }
    sessionStorage.setItem(attemptsKey, String(attempts + 1));
  }

  async verifySmsCode(phone: string, code: string): Promise<AuthResult> {
    await delay(500);
    const expectedCode = sessionStorage.getItem(MOCK_CODE_KEY) ?? '123456';

    if (code !== expectedCode) {
      throw new AuthError('INVALID_CODE', 'The code does not match this phone number.');
    }

    // Check if an account exists for this phone (simulating a DB lookup)
    const account = this.findSeedAccount(phone);
    if (account) {
      return {
        token: `mock-jwt-${Date.now().toString(36)}`,
        refreshToken: `mock-refresh-${Date.now().toString(36)}`,
        account,
        isNewAccount: false,
        phoneRequired: false,
      };
    }

    // No existing account — registration flow
    return {
      token: `mock-jwt-${Date.now().toString(36)}`,
      refreshToken: `mock-refresh-${Date.now().toString(36)}`,
      account: {
        id: `account-${Date.now()}`,
        type: 'talent', // caller overrides in AuthService
        phone: formatPhone(phone),
        displayPhone: '',
        email: '',
        shareEmail: false,
        sharePhone: false,
        status: 'under-review',
        createdAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        profileComplete: false,
        displayName: 'New talent',
        founder: canBecomeFounder(0), // will be recomputed in AuthService
      },
      isNewAccount: true,
      phoneRequired: false,
    };
  }

  async createAccount(phone: string, type: string): Promise<AuthResult> {
    await delay(300);
    const isClinic = type === 'clinic';
    const account: AccountRecord = {
      id: `account-${Date.now()}`,
      type: isClinic ? 'clinic' : 'talent',
      phone: formatPhone(phone),
      displayPhone: '',
      email: '',
      shareEmail: false,
      sharePhone: false,
      status: 'under-review',
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      profileComplete: false,
      displayName: isClinic ? 'New clinic' : 'New talent',
      founder: canBecomeFounder(0),
    };
    return {
      token: `mock-jwt-${Date.now().toString(36)}`,
      refreshToken: `mock-refresh-${Date.now().toString(36)}`,
      account,
      isNewAccount: true,
      phoneRequired: false,
    };
  }

  async adminLogin(username: string, password: string): Promise<AuthResult> {
    await delay(500);
    if (username === 'admin' && password === 'admin') {
      return {
        token: `mock-admin-jwt-${Date.now().toString(36)}`,
        refreshToken: `mock-admin-refresh-${Date.now().toString(36)}`,
        account: {
          id: 'admin',
          type: 'clinic',
          phone: '',
          displayPhone: '',
          email: '',
          shareEmail: false,
          sharePhone: false,
          status: 'approved',
          createdAt: '',
          profileComplete: false,
          displayName: 'Admin',
          founder: false,
        },
        isNewAccount: false,
        phoneRequired: false,
      };
    }
    throw new AuthError('INVALID_CREDENTIALS', 'Incorrect admin username or password.');
  }

  private findSeedAccount(phone: string): AccountRecord | undefined {
    const normalized = normalizePhone(phone);
    return SEEDED_ACCOUNTS.find((a: AccountRecord) => normalizePhone(a.phone) === normalized);
  }

  private buildDemoAccount(): AccountRecord {
    return {
      id: 'mock-google-account',
      type: 'talent',
      phone: '',
      displayPhone: '',
      email: 'demo@gmail.com',
      shareEmail: false,
      sharePhone: false,
      status: 'approved',
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      profileComplete: true,
      displayName: 'Demo User',
      founder: false,
    };
  }
}
