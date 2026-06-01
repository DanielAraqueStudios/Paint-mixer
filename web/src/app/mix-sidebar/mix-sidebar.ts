import { Component, input, output, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Color, getMl, toRgb } from '../colors'

const ROWS = [
  { label: 'Base blanca', key: 'mlBlanca' as const, bar: '#e4e4e7' },
  { label: 'Rojo',        key: 'mlRoja'   as const, bar: '#ef4444' },
  { label: 'Verde',       key: 'mlVerde'  as const, bar: '#22c55e' },
  { label: 'Azul',        key: 'mlAzul'   as const, bar: '#3b82f6' },
]

@Component({
  selector: 'app-mix-sidebar',
  imports: [CommonModule],
  template: `
    <aside class="sidebar">
      <div class="preview" [style.background]="rgb()">
        @if (!color()) {
          <span class="empty">sin selección</span>
        }
      </div>

      <h2 class="colorname">{{ color()?.name ?? '—' }}</h2>

      <div class="rows">
        @for (row of rows; track row.key) {
          <div class="row">
            <div class="row-header">
              <span class="row-label">{{ row.label }}</span>
              <span class="row-val">{{ ml() ? ml()![row.key] + ' ml' : '—' }}</span>
            </div>
            <div class="bar-bg">
              <div class="bar-fill" [style.background]="row.bar"
                   [style.width]="ml() ? (ml()![row.key] / 700 * 100) + '%' : '0%'"></div>
            </div>
          </div>
        }
      </div>

      <button class="send-btn" [disabled]="!color() || sending()" (click)="send.emit()">
        {{ sending() ? 'Enviando...' : 'Enviar a ESP32' }}
      </button>
    </aside>
  `,
  styles: [`
    .sidebar {
      border-left: 1px solid #27272a;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      height: 100%;
      overflow-y: auto;
      box-sizing: border-box;
    }
    .preview {
      width: 100%; height: 112px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.4s;
      background: #27272a;
    }
    .empty { font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: 0.1em; }
    .colorname { font-size: 24px; margin: 0; min-height: 32px; color: #f4f4f5; }
    .rows { display: flex; flex-direction: column; }
    .row { padding: 12px 0; border-top: 1px solid #27272a; }
    .row-header { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
    .row-label { color: #a1a1aa; }
    .row-val { color: #d4d4d8; font-family: monospace; font-size: 11px; }
    .bar-bg { height: 2px; background: #27272a; border-radius: 2px; }
    .bar-fill { height: 2px; border-radius: 2px; transition: width 0.4s; }
    .send-btn {
      padding: 12px;
      border-radius: 12px;
      border: none;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      background: #fbbf24;
      color: #18181b;
      transition: background 0.15s;
      margin-top: auto;
    }
    .send-btn:hover:not(:disabled) { background: #fcd34d; }
    .send-btn:disabled { background: #27272a; color: #52525b; cursor: not-allowed; }

    @media (max-width: 768px) {
      .sidebar { height: auto; border-left: none; padding: 20px 16px; }
      .preview { height: 80px; }
      .rows { flex-direction: row; flex-wrap: wrap; gap: 0 16px; }
      .row { flex: 1 1 45%; padding: 8px 0; }
      .send-btn { margin-top: 4px; }
    }

    @media (max-width: 640px) {
      .sidebar { padding: 16px 12px; }
      .rows { flex-direction: column; }
      .row { flex: unset; }
    }
  `]
})
export class MixSidebar {
  color   = input<Color | null>(null)
  sending = input<boolean>(false)
  send    = output<void>()

  rows = ROWS
  ml   = computed(() => this.color() ? getMl(this.color()!) : null)
  rgb  = computed(() => this.color() ? toRgb(this.color()!.r, this.color()!.g, this.color()!.b) : '#27272a')
}
