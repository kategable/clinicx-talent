import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectCurrentAccount } from '../../core/store/app.selectors';

@Component({
  selector: 'app-clinic-talents',
  imports: [RouterLink],
  templateUrl: './clinic-talents.html',
  styleUrl: './clinic-talents.scss',
})
export class ClinicTalents {
  private readonly store = inject(Store);
  protected readonly account = this.store.selectSignal(selectCurrentAccount);
}
