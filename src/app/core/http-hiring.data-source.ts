import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HiringDataSource } from './hiring-data.source';
import { HiringOpportunity, HiringInvite, TalentApplication } from './hiring';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpHiringDataSource implements HiringDataSource {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/hiring`;

  private cache: {
    opportunities: HiringOpportunity[];
    invites: HiringInvite[];
    applications: TalentApplication[];
  } | null = null;

  private loadPromise: Promise<void> | null = null;

  getOpportunities(): HiringOpportunity[] {
    this.ensureLoad();
    return this.cache?.opportunities ?? [];
  }

  getInvites(): HiringInvite[] {
    this.ensureLoad();
    return this.cache?.invites ?? [];
  }

  getApplications(): TalentApplication[] {
    this.ensureLoad();
    return this.cache?.applications ?? [];
  }

  private ensureLoad(): void {
    if (this.cache) return;
    if (!this.loadPromise) {
      this.loadPromise = this.fetchAll();
    }
  }

  private async fetchAll(): Promise<void> {
    const [opps, apps] = await Promise.all([
      firstValueFrom(this.http.get<ApiOpportunity[]>(`${this.base}/opportunities`)),
      firstValueFrom(this.http.get<ApiApplication[]>(`${this.base}/applications`)),
    ]);

    this.cache = {
      opportunities: opps.map(toOpportunity),
      invites: [],
      applications: apps.map(toApplication),
    };
  }
}

interface ApiOpportunity {
  id: string;
  clinicAccountId: string;
  slug: string;
  positionSlug: string;
  title: string;
  location: string;
  payRange: string;
  mustHaveSkills: string;
  benefits: string;
  urgency: string;
  idealHire: string;
  status: string;
  createdAt: string;
  deletedAt?: string;
}

interface ApiApplication {
  id: string;
  opportunityId?: string;
  talentAccountId: string;
  clinicAccountId: string;
  source: string;
  status: string;
  acceptedAt: string;
  submittedAt: string;
}

function toOpportunity(api: ApiOpportunity): HiringOpportunity {
  return {
    id: api.id,
    clinicAccountId: api.clinicAccountId,
    slug: api.slug,
    positionSlug: api.positionSlug,
    title: api.title,
    location: api.location,
    payRange: api.payRange,
    mustHaveSkills: api.mustHaveSkills,
    benefits: api.benefits,
    urgency: api.urgency,
    idealHire: api.idealHire,
    status: api.status as HiringOpportunity['status'],
    createdAt: api.createdAt,
    deletedAt: api.deletedAt,
  };
}

function toApplication(api: ApiApplication): TalentApplication {
  return {
    id: api.id,
    opportunityId: api.opportunityId,
    talentAccountId: api.talentAccountId,
    clinicAccountId: api.clinicAccountId,
    source: api.source as TalentApplication['source'],
    status: api.status as TalentApplication['status'],
    acceptedAt: api.acceptedAt,
    submittedAt: api.submittedAt,
  };
}
