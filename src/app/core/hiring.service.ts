import { inject, Injectable } from '@angular/core';
import { HiringDataSource } from './hiring-data.source';
import { isInviteValid } from './hiring';

@Injectable({ providedIn: 'root' })
export class HiringService {
  private readonly source = inject(HiringDataSource);

  getOpportunities() {
    return this.source.getOpportunities();
  }

  getInvites() {
    return this.source.getInvites();
  }

  getApplications() {
    return this.source.getApplications();
  }

  /** Returns invite status: active, expired, or none. */
  inviteStatus(token: string): 'active' | 'expired' | 'none' {
    const invite = this.source.getInvites().find((i) => i.token === token);
    if (!invite) return 'none';
    return isInviteValid(invite) ? 'active' : 'expired';
  }
}
