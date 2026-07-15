import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { AppActions } from '../../core/store/app.actions';
import { selectCurrentAccount } from '../../core/store/app.selectors';

@Component({
  selector: 'app-profile-setup',
  imports: [FormField, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './profile-setup.html',
  styleUrl: './profile-setup.scss',
})
export class ProfileSetup {
  private readonly store = inject(Store);
  protected readonly currentAccount = this.store.selectSignal(selectCurrentAccount);
  protected readonly saved = signal(false);
  protected readonly model = signal({ name: '', city: '', headline: '' });
  protected readonly profileForm = form(this.model, (path) => {
    required(path.name, { message: 'Add a name for your profile.' });
    required(path.city, { message: 'Add your primary city.' });
    required(path.headline, { message: 'Add a short headline.' });
  });

  protected saveProfile(): void {
    submit(this.profileForm, async () => {
      this.store.dispatch(AppActions.completeProfile({ displayName: this.model().name }));
      this.saved.set(true);
    });
  }
}
