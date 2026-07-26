import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthProvider } from './auth-provider';
import { AuthResult, AuthError } from './auth/models';
import { AccountRecord } from './account';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpAuthProvider implements AuthProvider {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/auth`;

  async exchangeGoogleToken(idToken: string): Promise<AuthResult> {
    const res = await firstValueFrom(
      this.http.post<ApiGoogleResponse>(`${this.base}/google`, {
        idToken,
      }),
    );

    if (!res.token) {
      throw new AuthError('GOOGLE_TOKEN_INVALID', 'Google sign-in failed.');
    }

    if (res.isNewAccount) {
      return {
        token: res.token,
        refreshToken: '',
        account: toAccountRecord(res.account!),
        isNewAccount: true,
        phoneRequired: res.phoneRequired ?? false,
      };
    }

    return {
      token: res.token,
      refreshToken: '',
      account: toAccountRecord(res.account!),
      isNewAccount: false,
      phoneRequired: false,
    };
  }

  async sendSmsCode(phone: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; code?: string; error?: string }>(
        `${this.base}/send-code`,
        { phone },
      ),
    );
    if (!res.success) {
      throw new AuthError('UNKNOWN', res.error ?? 'Failed to send code.');
    }
    // In dev mode the API returns the code — store for E2E tests
    if (res.code) {
      sessionStorage.setItem('clinicx.mock.code', res.code);
    }
  }

  async verifySmsCode(phone: string, code: string): Promise<AuthResult> {
    const res = await firstValueFrom(
      this.http.post<ApiVerifyResponse>(`${this.base}/verify-code`, {
        phone,
        code,
      }),
    );

    if (!res.token) {
      throw new AuthError('UNKNOWN', 'Verification failed.');
    }

    // New account flow
    if (res.isNewAccount) {
      return {
        token: res.token,
        refreshToken: '',
        account: {
          id: 'new',
          type: 'talent',
          phone,
          displayPhone: phone,
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
          founder: false,
        },
        isNewAccount: true,
        phoneRequired: true,
      };
    }

    // Existing account
    return {
      token: res.token,
      refreshToken: '',
      account: toAccountRecord(res.account!),
      isNewAccount: false,
      phoneRequired: false,
    };
  }

  async adminLogin(username: string, password: string): Promise<AuthResult> {
    const res = await firstValueFrom(
      this.http.post<{ token: string; error?: string }>(`${this.base}/admin/login`, {
        username,
        password,
      }),
    );

    if (!res.token) {
      throw new AuthError('INVALID_CREDENTIALS', res.error ?? 'Incorrect admin credentials.');
    }

    return {
      token: res.token,
      refreshToken: '',
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
}

/** Shape the API returns from POST /auth/verify-code. */
interface ApiGoogleResponse {
  token?: string;
  isNewAccount?: boolean;
  phoneRequired?: boolean;
  account?: ApiAccount;
  error?: string;
}

interface ApiVerifyResponse {
  token?: string;
  isNewAccount?: boolean;
  account?: ApiAccount;
  error?: string;
}

interface ApiAccount {
  id: string;
  type: string;
  phone: string;
  displayPhone?: string;
  email?: string;
  shareEmail?: boolean;
  sharePhone?: boolean;
  status: string;
  createdAt: string;
  profileComplete: boolean;
  displayName: string;
  founder: boolean;
  deletedAt?: string;
}

function toAccountRecord(api: ApiAccount): AccountRecord {
  return {
    id: api.id,
    type: api.type as AccountRecord['type'],
    phone: api.phone,
    displayPhone: api.displayPhone ?? '',
    email: api.email ?? '',
    shareEmail: api.shareEmail ?? false,
    sharePhone: api.sharePhone ?? false,
    status: api.status as AccountRecord['status'],
    createdAt: api.createdAt,
    profileComplete: api.profileComplete,
    displayName: api.displayName,
    founder: api.founder,
    deletedAt: api.deletedAt,
  };
}
