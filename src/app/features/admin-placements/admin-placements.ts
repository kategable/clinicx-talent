import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-placements',
  template: `
    <div class="placeholder">
      <h2>Placements</h2>
      <p>Successful hires and active interview requests will appear here.</p>
      <small>Coming soon — placement tracking, commission reporting, and outcome analytics.</small>
    </div>
  `,
  styles: [
    `
      .placeholder {
        padding: 3rem 2rem;
        text-align: center;
      }
      h2 {
        font: 500 1.5rem Georgia, serif;
        margin: 0 0 0.5rem;
      }
      p {
        color: #6b7a75;
        margin: 0;
      }
      small {
        display: block;
        margin-top: 0.5rem;
        color: #aaa396;
        font-size: 0.75rem;
      }
    `,
  ],
})
export class AdminPlacements {}
