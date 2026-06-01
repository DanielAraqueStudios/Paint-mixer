import { Component, signal, inject } from '@angular/core'
import { ColorGrid } from '../color-grid/color-grid'
import { MixSidebar } from '../mix-sidebar/mix-sidebar'
import { COLORS, getMl } from '../colors'
import { ApiService } from '../api.service'

@Component({
  selector: 'app-home',
  imports: [ColorGrid, MixSidebar],
  template: `
    <div class="body">
      <section class="catalog">
        <h2 class="section-title">Catálogo de colores</h2>
        <app-color-grid [selectedIdx]="selectedIdx()" (select)="selectedIdx.set($event)" />
      </section>
      <div class="sidebar-wrap">
        <app-mix-sidebar
          [color]="selectedColor()"
          [sending]="sending()"
          (send)="handleSend()" />
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex: 1; overflow: hidden; min-height: 0; }
    .body { display: flex; flex: 1; overflow: hidden; }
    .catalog { flex: 1; padding: 32px 40px; overflow-y: auto; }
    .section-title { font-size: 14px; color: #71717a; margin: 0 0 16px; }
    .sidebar-wrap { width: 300px; flex-shrink: 0; }

    @media (max-width: 768px) {
      .body { flex-direction: column; overflow-y: auto; }
      .catalog { padding: 20px 16px; overflow-y: unset; }
      .sidebar-wrap { width: 100%; flex-shrink: 0; border-top: 1px solid #27272a; }
    }

    @media (max-width: 640px) {
      .catalog { padding: 16px 12px; }
    }
  `]
})
export class Home {
  private api = inject(ApiService)
  selectedIdx = signal<number | null>(null)
  sending     = signal(false)

  selectedColor() {
    const i = this.selectedIdx()
    return i !== null ? COLORS[i] : null
  }

  handleSend() {
    const color = this.selectedColor()
    if (!color) return
    this.sending.set(true)
    const ml = getMl(color)
    this.api.sendCommand({ color: color.name, ...ml }).subscribe({
      next:  () => this.sending.set(false),
      error: () => this.sending.set(false),
    })
  }
}
