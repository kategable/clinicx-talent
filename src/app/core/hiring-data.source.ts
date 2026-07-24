import { Injectable } from '@angular/core';
import {
  HiringInvite,
  HiringOpportunity,
  SEEDED_APPLICATIONS,
  SEEDED_INVITES,
  SEEDED_OPPORTUNITIES,
  TalentApplication,
} from './hiring';
import { APP_STORAGE_KEY } from './store/app.effects';

/** Abstracts where hiring data comes from. */
export abstract class HiringDataSource {
  abstract getOpportunities(): HiringOpportunity[];
  abstract getInvites(): HiringInvite[];
  abstract getApplications(): TalentApplication[];
}

/** MVP: seeds merged with localStorage. */
@Injectable()
export class LocalHiringDataSource implements HiringDataSource {
  private cache: {
    opportunities: HiringOpportunity[];
    invites: HiringInvite[];
    applications: TalentApplication[];
  } | null = null;

  private load() {
    if (this.cache) return this.cache;

    let opps = [...SEEDED_OPPORTUNITIES];
    let invites = [...SEEDED_INVITES];
    let apps = [...SEEDED_APPLICATIONS];

    try {
      const saved = localStorage.getItem(APP_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as {
          hiring?: {
            opportunities?: HiringOpportunity[];
            invites?: HiringInvite[];
            applications?: TalentApplication[];
          };
        };
        if (state.hiring) {
          if (state.hiring.opportunities) opps = state.hiring.opportunities;
          if (state.hiring.invites) invites = state.hiring.invites;
          if (state.hiring.applications) apps = state.hiring.applications;
        }
      }
    } catch {
      // fall through to seeds
    }

    this.cache = { opportunities: opps, invites, applications: apps };
    return this.cache;
  }

  getOpportunities() {
    return this.load().opportunities;
  }

  getInvites() {
    return this.load().invites;
  }

  getApplications() {
    return this.load().applications;
  }
}
