import { Component, inject, signal, type OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { areDevtoolsEnabled, disableDevtools, enableDevtools } from '../../core/devtools-runtime';

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
export class AdminDeployments implements OnInit {
  private readonly http = inject(HttpClient);
  readonly info = signal<DeployInfo | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const url = `/deploy-info.json?_=${Date.now()}`;
    this.http.get<DeployInfo>(url).subscribe({
      next: (data) => this.info.set(data),
      error: () => this.error.set('Could not load deployment info.'),
    });
  }

  readonly devtoolsEnabled = signal(areDevtoolsEnabled());

  toggleDevtools(): void {
    if (this.devtoolsEnabled()) {
      disableDevtools();
    } else {
      enableDevtools();
    }
  }
}
