import { Component, inject, OnInit, signal } from '@angular/core';
import { FormField, form, pattern, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AccountType, TEST_CREDENTIALS } from '../../core/account';
import { AppActions } from '../../core/store/app.actions';
import { selectError, selectRegistration } from '../../core/store/app.selectors';

@Component({
  selector: 'app-registration',
  imports: [FormField, RouterLink],
  templateUrl: './registration.html',
  styleUrl: './registration.scss',
})
export class Registration implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSignIn = this.route.snapshot.data['mode'] === 'signin';
  protected readonly registration = this.store.selectSignal(selectRegistration);
  protected readonly accountType = () => this.registration().accountType;
  protected readonly step = () => this.registration().step;
  protected readonly errorMessage = this.store.selectSignal(selectError);
  protected readonly credentials = TEST_CREDENTIALS;
  protected readonly phoneModel = signal({ phone: '' });
  protected readonly phoneForm = form(this.phoneModel, (path) => {
    required(path.phone, { message: 'Enter your mobile number.' });
    pattern(path.phone, /^\D*(?:\d\D*){10}$/, { message: 'Enter a 10-digit US phone number.' });
  });
  protected readonly codeModel = signal({ code: '' });
  protected readonly codeForm = form(this.codeModel, (path) => {
    required(path.code, { message: 'Enter the code from your text message.' });
    pattern(path.code, /^\d{6}$/, { message: 'The verification code must be 6 digits.' });
  });

  ngOnInit(): void {
    this.store.dispatch(
      AppActions.resetRegistration({ accountType: this.initialType(), signIn: this.isSignIn }),
    );
  }

  protected chooseType(type: AccountType): void {
    this.store.dispatch(AppActions.selectAccountType({ accountType: type }));
  }

  protected sendCode(): void {
    submit(this.phoneForm, async () => {
      this.store.dispatch(AppActions.requestSMSCode({ phone: this.phoneModel().phone }));
    });
  }

  protected maskPhone(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const digits = input.value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 6) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 3) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }

    input.value = formatted;
    this.phoneModel.set({ phone: formatted });
  }

  protected verifyCode(): void {
    submit(this.codeForm, async () => {
      if (this.isSignIn) {
        this.store.dispatch(AppActions.verifySignInCode({ code: this.codeModel().code }));
        return;
      }

      const type = this.accountType();
      if (!type) return;
      this.store.dispatch(AppActions.verifyRegistrationCode({ code: this.codeModel().code }));
    });
  }

  protected changePhone(): void {
    this.store.dispatch(AppActions.changePhone());
  }
  protected changeType(): void {
    this.store.dispatch(AppActions.changeAccountType());
  }

  private initialType(): AccountType | undefined {
    const type = this.route.snapshot.queryParamMap.get('type');
    return type === 'clinic' || type === 'talent' ? type : undefined;
  }
}
