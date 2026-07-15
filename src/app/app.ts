import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeManager } from './core/theme-manager';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly themeManager = inject(ThemeManager);
}
