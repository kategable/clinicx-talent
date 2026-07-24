import { booleanAttribute, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-founder-badge',
  imports: [RouterLink, MatTooltipModule],
  templateUrl: './founder-badge.html',
  styleUrl: './founder-badge.scss',
})
export class FounderBadge {
  readonly compact = input(false, { transform: booleanAttribute });
  readonly memberNumber = input<number | null>(null);
}
