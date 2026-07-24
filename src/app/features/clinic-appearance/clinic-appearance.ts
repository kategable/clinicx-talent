import { Component } from '@angular/core';
import { ThemePicker } from '../../shared/theme-picker/theme-picker';

@Component({
  selector: 'app-clinic-appearance',
  imports: [ThemePicker],
  templateUrl: './clinic-appearance.html',
  styleUrl: './clinic-appearance.scss',
})
export class ClinicAppearance {}
