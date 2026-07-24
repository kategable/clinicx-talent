import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Store } from '@ngrx/store';
import { selectCurrentAccount, selectFounderCount } from '../../core/store/app.selectors';

@Component({
  selector: 'app-founders',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './founders.html',
  styleUrl: './founders.scss',
})
export class Founders {
  private readonly store = inject(Store);
  protected readonly currentAccount = this.store.selectSignal(selectCurrentAccount);
  protected readonly founderCount = this.store.selectSignal(selectFounderCount);
  protected readonly limit = 1000;

  protected remaining(): number {
    return Math.max(0, this.limit - this.founderCount());
  }
}
