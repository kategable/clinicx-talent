import { Component } from '@angular/core';

@Component({
  selector: 'app-brand-link',
  template: `<a href="#top" aria-label="ClinicX Talent home" class="brand"
    >Clinic<span>X</span> Talent</a
  >`,
  styles: [
    `
      :host {
        display: contents;
        --rust: var(--cx-accent);
      }
      .brand {
        font-family: Georgia, serif;
        color: var(--cx-text);
        font-size: 23px;
        text-decoration: none;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .brand span {
        color: var(--rust);
      }
    `,
  ],
})
export class BrandLink {}
