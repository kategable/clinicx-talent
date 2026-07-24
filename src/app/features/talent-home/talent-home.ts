import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Store } from '@ngrx/store';
import { TalentDetails } from '../../core/account';
import { AppActions } from '../../core/store/app.actions';
import { selectCurrentAccount } from '../../core/store/app.selectors';

@Component({
  selector: 'app-talent-home',
  imports: [
    FormField,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './talent-home.html',
  styleUrl: './talent-home.scss',
})
export class TalentHome {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
  protected readonly saved = signal(false);
  protected readonly contactSaved = signal(false);
  protected readonly contactEmail = signal(this.account()?.email ?? '');
  protected readonly contactDisplayPhone = signal(this.account()?.displayPhone ?? '');
  protected readonly contactShareEmail = signal(this.account()?.shareEmail ?? false);
  protected readonly contactSharePhone = signal(this.account()?.sharePhone ?? false);

  protected readonly model = signal<TalentDetails>({
    professionalName:
      this.account()?.talentDetails?.professionalName ?? this.account()?.displayName ?? '',
    photoName: this.account()?.talentDetails?.photoName ?? '',
    videoName: this.account()?.talentDetails?.videoName ?? '',
    role: this.account()?.talentDetails?.role ?? '',
    location: this.account()?.talentDetails?.location ?? '',
    yearsExperience: this.account()?.talentDetails?.yearsExperience ?? '',
    experienceTimeline: this.account()?.talentDetails?.experienceTimeline ?? '',
    skills: this.account()?.talentDetails?.skills ?? '',
    certificateNames: this.account()?.talentDetails?.certificateNames ?? [],
    availability: this.account()?.talentDetails?.availability ?? '',
    salaryExpectation: this.account()?.talentDetails?.salaryExpectation ?? '',
    languages: this.account()?.talentDetails?.languages ?? '',
    portfolioUrl: this.account()?.talentDetails?.portfolioUrl ?? '',
    galleryNames: this.account()?.talentDetails?.galleryNames ?? [],
    introduction: this.account()?.talentDetails?.introduction ?? '',
  });
  protected readonly profileForm = form(this.model, (path) => {
    required(path.professionalName, { message: 'Add your professional name.' });
  });

  protected saveProfile(): void {
    submit(this.profileForm, async () => {
      this.store.dispatch(AppActions.saveTalentDetails({ details: this.model() }));
      this.saved.set(true);
    });
  }

  protected selectFiles(
    event: Event,
    field: 'photoName' | 'videoName' | 'certificateNames' | 'galleryNames',
  ): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files) return;
    const names = Array.from(input.files, (file) => file.name);
    this.model.update((details) => ({
      ...details,
      [field]: field === 'photoName' || field === 'videoName' ? (names[0] ?? '') : names,
    }));
    this.saved.set(false);
  }

  protected saveContact(): void {
    this.store.dispatch(
      AppActions.saveAccountContact({
        email: this.contactEmail(),
        displayPhone: this.contactDisplayPhone(),
        shareEmail: this.contactShareEmail(),
        sharePhone: this.contactSharePhone(),
      }),
    );
    this.contactSaved.set(true);
  }

  protected signOut(): void {
    this.store.dispatch(AppActions.signOut());
  }
}
