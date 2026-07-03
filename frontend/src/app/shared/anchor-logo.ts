import { Component, Input } from '@angular/core';

@Component({
  selector: 'anchor-logo',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Anchor logo"
    >
      <circle cx="50" cy="50" r="46" [attr.stroke]="ring" stroke-width="4" stroke-dasharray="5 4" fill="none" />
      <g [attr.fill]="color">
        <circle cx="50" cy="22" r="8" fill="none" [attr.stroke]="color" stroke-width="6" />
        <rect x="46" y="30" width="8" height="48" rx="3" />
        <rect x="34" y="38" width="32" height="7" rx="3.5" />
        <path
          d="M50 78 C30 78 20 64 19 50 L12 53 L18 38 L33 46 L26 49 C27 60 36 68 50 68 C64 68 73 60 74 49 L67 46 L82 38 L88 53 L81 50 C80 64 70 78 50 78 Z"
        />
      </g>
    </svg>
  `,
})
export class AnchorLogo {
  @Input() size = 64;
  @Input() color = '#ffffff';
  @Input() ring = '#c8102e';
}
