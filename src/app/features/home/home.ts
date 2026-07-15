import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectCurrentAccount } from '../../core/store/app.selectors';

interface Talent {
  name: string;
  title: string;
  location: string;
  match: number;
  color: string;
  highlights: string[];
  skills: string[];
}

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home.scss',
})
export class Home {
  private readonly store = inject(Store);
  protected readonly currentAccount = this.store.selectSignal(selectCurrentAccount);

  protected accountLink(): string {
    return this.currentAccount()?.type === 'clinic' ? '/clinic/home' : '/talent/home';
  }

  protected readonly talents: Talent[] = [
    {
      name: 'Maya Richardson',
      title: 'RN Injector',
      location: 'Chicago, IL',
      match: 96,
      color: '#d9a08f',
      highlights: ['6 years in aesthetics', 'Available immediately', 'Luxury retail background'],
      skills: ['Injectables', 'Morpheus8', 'Sales'],
    },
    {
      name: 'Elena Torres',
      title: 'Aesthetic RN',
      location: 'Evanston, IL',
      match: 91,
      color: '#8da6a0',
      highlights: ['4 years in aesthetics', 'Available in 2 weeks', 'Bilingual: English / Spanish'],
      skills: ['Injectables', 'Laser', 'CoolSculpting'],
    },
    {
      name: 'Jordan Lee',
      title: 'Nurse Practitioner',
      location: 'Oak Park, IL',
      match: 88,
      color: '#b0a2c0',
      highlights: [
        '7 years clinical experience',
        'Part-time availability',
        'Top performer in treatment sales',
      ],
      skills: ['Injectables', 'Consultations', 'Sales'],
    },
  ];

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('');
  }
}
