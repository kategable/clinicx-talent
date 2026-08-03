import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-contact',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {
  protected readonly reason =
    inject(ActivatedRoute).snapshot.queryParamMap.get('reason') ?? undefined;
}
