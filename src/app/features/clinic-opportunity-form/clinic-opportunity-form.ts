import { Component, inject, OnInit, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { generateSlug } from '../../core/hiring';
import { AppActions } from '../../core/store/app.actions';
import {
  selectCurrentAccount,
  selectInvites,
} from '../../core/store/app.selectors';
import { ThemePicker } from '../../shared/theme-picker/theme-picker';

interface OpportunityFormModel {
  position: string;
  location: string;
  payRange: string;
  mustHaveSkills: string;
  benefits: string;
  urgency: string;
  idealHire: string;
}

@Component({
  selector: 'app-clinic-opportunity-form',
  imports: [
    FormField,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ThemePicker,
  ],
  templateUrl: './clinic-opportunity-form.html',
  styleUrl: './clinic-opportunity-form.scss',
})
export class ClinicOpportunityForm implements OnInit {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  private readonly invites = this.store.selectSignal(selectInvites);
  protected readonly saved = signal(false);
  protected readonly shareLink = signal('');

  protected readonly model = signal<OpportunityFormModel>({
    position: '',
    location: '',
    payRange: '',
    mustHaveSkills: '',
    benefits: '',
    urgency: '',
    idealHire: '',
  });

  ngOnInit(): void {
    // Pre-fill from the clinic's hiring brief (available after store hydration)
    const details = this.account()?.clinicDetails;
    if (details) {
      this.model.set({
        position: details.position ?? '',
        location: details.location ?? '',
        payRange: details.payRange ?? '',
        mustHaveSkills: details.mustHaveSkills ?? '',
        benefits: details.benefits ?? '',
        urgency: details.urgency ?? '',
        idealHire: details.idealHire ?? '',
      });
    }
  }

  protected readonly opportunityForm = form(this.model, (path) => {
    required(path.position, { message: 'Add the position title.' });
    required(path.location, { message: 'Add a location.' });
  });

  protected createOpportunity(): void {
    submit(this.opportunityForm, async () => {
      const m = this.model();
      const clinicName = this.account()?.displayName ?? 'clinic';
      this.store.dispatch(
        AppActions.createOpportunity({
          clinicName,
          position: m.position,
          location: m.location,
          payRange: m.payRange,
          mustHaveSkills: m.mustHaveSkills,
          benefits: m.benefits,
          urgency: m.urgency,
          idealHire: m.idealHire,
        }),
      );

      // Read the invite token from the store (reducer runs synchronously)
      const latestInvite = this.invites()[0];
      const token = latestInvite?.token ?? '';
      const clinicSlug = generateSlug(clinicName);
      const positionSlug = generateSlug(m.position);
      this.shareLink.set(
        `${window.location.origin}/join/${clinicSlug}/${positionSlug}?invite=${token}`,
      );

      this.saved.set(true);
    });
  }

  protected copyLink(): void {
    void navigator.clipboard.writeText(this.shareLink());
  }
}
