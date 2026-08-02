import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { areDevtoolsEnabled, disableDevtools, enableDevtools } from '../../core/devtools-runtime';
import { environment } from '../../../environments/environment';

interface DeployInfo {
  environment: string;
  deployedAt: string; // ISO 8601
  gitSha?: string;
}

@Component({
  selector: 'app-admin-deployments',
  templateUrl: './admin-deployments.html',
  styleUrl: './admin-deployments.scss',
  imports: [DatePipe, MatButtonModule],
})
export class AdminDeployments {
  private readonly http = inject(HttpClient);

  private readonly deployInfoResult = toSignal(
    this.http.get<DeployInfo>('/deploy-info.json').pipe(
      map((data): { data: DeployInfo; error: null } => ({ data, error: null })),
      catchError(() =>
        of({ data: null as DeployInfo | null, error: 'Could not load deployment info.' }),
      ),
      startWith({ data: null as DeployInfo | null, error: null as string | null }),
    ),
    { initialValue: { data: null as DeployInfo | null, error: null as string | null } },
  );

  readonly info = computed(() => this.deployInfoResult().data);
  readonly error = computed(() => this.deployInfoResult().error);

  /** Parsed to a Date so the date pipe always renders in local time. */
  readonly deployedAtDate = computed(() => {
    const raw = this.info()?.deployedAt;
    return raw ? new Date(raw) : null;
  });

  /** GitHub commit URL for the deployed SHA. Falls back to repo base for dev placeholders. */
  readonly commitUrl = computed(() => {
    const sha = this.info()?.gitSha;
    if (!sha) return null;
    // Real SHAs are exactly 40 hex chars — link to the commit. Otherwise link to the repo.
    return /^[0-9a-f]{40}$/.test(sha)
      ? `${environment.commitBaseUrl}/${sha}`
      : environment.commitBaseUrl;
  });

  /** Short (7-char) commit SHA for display. */
  readonly shortSha = computed(() => this.info()?.gitSha?.slice(0, 7) ?? null);

  readonly devtoolsEnabled = signal(areDevtoolsEnabled());

  toggleDevtools(): void {
    if (this.devtoolsEnabled()) {
      disableDevtools();
    } else {
      enableDevtools();
    }
  }
}
