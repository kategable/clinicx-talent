import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Store } from '@ngrx/store';
import { ClinicDetails } from '../../core/account';
import { AppActions } from '../../core/store/app.actions';
import { selectCurrentAccount } from '../../core/store/app.selectors';
import { ThemePicker } from '../../shared/theme-picker/theme-picker';

@Component({
  selector: 'app-clinic-home',
  imports: [
    FormField,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ThemePicker,
  ],
  templateUrl: './clinic-home.html',
  styleUrl: './clinic-home.scss',
})
export class ClinicHome {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  protected readonly saved = signal(false);
  protected readonly model = signal<ClinicDetails>({
    clinicName: this.account()?.clinicDetails?.clinicName ?? this.account()?.displayName ?? '',
    location: this.account()?.clinicDetails?.location ?? '',
    city: this.account()?.clinicDetails?.city ?? '',
    state: this.account()?.clinicDetails?.state ?? '',
    website: this.account()?.clinicDetails?.website ?? '',
    specialties: this.account()?.clinicDetails?.specialties ?? '',
    about: this.account()?.clinicDetails?.about ?? '',
    position: this.account()?.clinicDetails?.position ?? '',
    mustHaveSkills: this.account()?.clinicDetails?.mustHaveSkills ?? '',
    payRange: this.account()?.clinicDetails?.payRange ?? '',
    benefits: this.account()?.clinicDetails?.benefits ?? '',
    urgency: this.account()?.clinicDetails?.urgency ?? '',
    idealHire: this.account()?.clinicDetails?.idealHire ?? '',
  });
  protected readonly detailsForm = form(this.model, (path) => {
    required(path.clinicName, { message: 'Add your clinic name.' });
    maxLength(path.state, 2, { message: 'Use the two-letter state abbreviation.' });
  });

  protected saveDetails(): void {
    submit(this.detailsForm, async () => {
      this.store.dispatch(AppActions.saveClinicDetails({ details: this.model() }));
      this.saved.set(true);
    });
  }

  protected signOut(): void {
    this.store.dispatch(AppActions.signOut());
  }
}
