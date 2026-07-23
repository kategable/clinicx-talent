import { booleanAttribute, Component, inject, input, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Store } from '@ngrx/store';
import { ThemePreference } from '../../core/account';
import { AppActions } from '../../core/store/app.actions';
import { selectThemePreference } from '../../core/store/app.selectors';

@Component({
  selector: 'app-theme-picker',
  imports: [MatButtonToggleModule],
  templateUrl: './theme-picker.html',
  styleUrl: './theme-picker.scss',
})
export class ThemePicker {
  private readonly store = inject(Store);
  readonly compact = input(false, { transform: booleanAttribute });
  protected readonly preference = this.store.selectSignal(selectThemePreference);
  protected readonly expanded = signal(false);

  protected toggleExpanded(): void {
    this.expanded.update((expanded) => !expanded);
  }

  protected setPreference(preference: ThemePreference): void {
    this.store.dispatch(AppActions.setThemePreference({ preference }));
  }
}
