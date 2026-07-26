import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AccountDataSource } from './account-data.source';
import { AccountRecord } from './account';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpAccountDataSource implements AccountDataSource {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/accounts`;

  private cache: Record<string, AccountRecord> | null = null;
  private loadPromise: Promise<Record<string, AccountRecord>> | null = null;

  getAll(): Record<string, AccountRecord> {
    if (this.cache) return this.cache;

    // Kick off async load; return empty cache for first render.
    // Effects and components will get populated data on next change detection cycle.
    if (!this.loadPromise) {
      this.loadPromise = this.fetchAll();
      this.loadPromise.then((record) => {
        this.cache = record;
      });
    }

    return this.cache ?? {};
  }

  getById(id: string): AccountRecord | undefined {
    return this.getAll()[id];
  }

  invalidate(): void {
    this.cache = null;
    this.loadPromise = null;
  }

  private async fetchAll(): Promise<Record<string, AccountRecord>> {
    const list = await firstValueFrom(this.http.get<ApiAccount[]>(this.base));
    const record: Record<string, AccountRecord> = {};
    for (const a of list) {
      record[a.id] = toRecord(a);
    }
    return record;
  }
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

function toRecord(api: ApiAccount): AccountRecord {
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
