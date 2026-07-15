import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppActions } from '../../core/store/app.actions';
import { selectError } from '../../core/store/app.selectors';

@Component({
  selector: 'app-admin-login',
  imports: [FormField, RouterLink],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
})
export class AdminLogin {
  private readonly store = inject(Store);
  protected readonly errorMessage = this.store.selectSignal(selectError);
  protected readonly model = signal({ username: '', password: '' });
  protected readonly loginForm = form(this.model, (path) => {
    required(path.username, { message: 'Enter the admin username.' });
    required(path.password, { message: 'Enter the admin password.' });
  });

  protected login(): void {
    submit(this.loginForm, async () => {
      this.store.dispatch(AppActions.adminLogin(this.model()));
    });
  }
}
