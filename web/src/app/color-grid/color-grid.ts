import { Component, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Color, COLORS, toRgb, getMl } from '../colors'

@Component({
  selector: 'app-color-grid',
  imports: [CommonModule],
  template: `
    <div class="grid">
      @for (color of colors; track color.name; let i = $index) {
        <div class="card" [class.selected]="selectedIdx() === i" (click)="select.emit(i)">
          <div class="swatch" [style.background]="rgb(color)"></div>
          <div class="info">
            <div class="name">{{ color.name }}</div>
            <div class="ml">B:{{ ml(color).mlBlanca }} R:{{ ml(color).mlRoja }} G:{{ ml(color).mlVerde }} Az:{{ ml(color).mlAzul }}</div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 12px;
    }
    .card {
      border-radius: 12px;
      border: 1px solid #27272a;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.15s, transform 0.1s;
    }
    .card:hover { border-color: #52525b; transform: translateY(-2px); }
    .card.selected { border-color: #fbbf24; box-shadow: 0 0 0 1px #fbbf24; }
    .swatch { height: 64px; width: 100%; }
    .info { padding: 8px; background: #18181b; }
    .name { font-size: 12px; color: #f4f4f5; line-height: 1.3; }
    .ml { font-size: 10px; color: #71717a; font-family: monospace; margin-top: 2px; }
  `]
})
export class ColorGrid {
  selectedIdx = input<number | null>(null)
  select      = output<number>()
  colors      = COLORS
  rgb(c: Color) { return toRgb(c.r, c.g, c.b) }
  ml(c: Color)  { return getMl(c) }
}
