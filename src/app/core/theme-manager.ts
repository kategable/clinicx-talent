import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { selectThemePreference } from './store/app.selectors';
import { ThemePreference } from './account';

export type EffectiveTheme = 'light' | 'dark';

export function resolveTheme(
  preference: ThemePreference,
  hour: number,
  override?: EffectiveTheme,
): EffectiveTheme {
  if (override) return override;
  if (preference !== 'auto') return preference;
  return hour >= 7 && hour < 19 ? 'light' : 'dark';
}

@Injectable({ providedIn: 'root' })
export class ThemeManager {
  private readonly document = inject(DOCUMENT);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const themeParameter = new URL(this.document.location.href).searchParams.get('theme');
    const themeOverride: EffectiveTheme | undefined =
      themeParameter === 'light' || themeParameter === 'dark' ? themeParameter : undefined;
    const clock$ = timer(0, 60_000).pipe(
      map(() => new Date().getHours()),
      startWith(new Date().getHours()),
    );
    combineLatest([this.store.select(selectThemePreference), clock$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([preference, hour]) => {
        const effectiveTheme = resolveTheme(preference, hour, themeOverride);
        const body = this.document.body;
        body.classList.toggle('theme-dark', effectiveTheme === 'dark');
        body.classList.toggle('theme-light', effectiveTheme === 'light');
        this.document.documentElement.style.colorScheme = effectiveTheme;
      });
  }
}
