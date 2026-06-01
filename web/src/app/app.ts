import { Component, signal, inject } from '@angular/core'
import { StatusBar } from './status-bar/status-bar'
import { ColorGrid } from './color-grid/color-grid'
import { MixSidebar } from './mix-sidebar/mix-sidebar'
import { LogPanel } from './log-panel/log-panel'
import { SystemStatus } from './system-status/system-status'
import { COLORS, getMl } from './colors'
import { ApiService } from './api.service'

@Component({
  selector: 'app-root',
  imports: [StatusBar, ColorGrid, MixSidebar, LogPanel, SystemStatus],
  template: `
    <div class="layout">
      <!-- top bar -->
      <header class="header">
        <h1 class="title">Pinturas <span class="accent">124345</span></h1>
        <span class="subtitle">Sistema de mezclado IoT</span>
      </header>

      <app-status-bar />

      <!-- main content -->
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

      <!-- bottom panels -->
      <div class="bottom-panels">
        <div class="bottom-panel status-panel">
          <app-system-status />
        </div>
        <div class="bottom-panel log-panel">
          <app-log-panel />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: flex; flex-direction: column; height: 100vh; background: #09090b; color: #f4f4f5; overflow: hidden; }
    .header { padding: 20px 40px; border-bottom: 1px solid #27272a; display: flex; align-items: baseline; gap: 16px; flex-shrink: 0; }
    .title { font-size: 22px; margin: 0; }
    .accent { color: #fbbf24; font-style: italic; }
    .subtitle { font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: 0.12em; }

    .body { display: flex; flex: 1; overflow: hidden; min-height: 0; }
    .catalog { flex: 1; padding: 32px 40px; overflow-y: auto; }
    .section-title { font-size: 14px; color: #71717a; margin: 0 0 16px; }
    .sidebar-wrap { width: 300px; flex-shrink: 0; }

    .bottom-panels {
      display: flex;
      height: 220px;
      flex-shrink: 0;
      border-top: 1px solid #27272a;
    }
    .bottom-panel { overflow: hidden; }
    .status-panel { width: 260px; flex-shrink: 0; border-right: 1px solid #27272a; }
    .log-panel { flex: 1; }
  `]
})
export class App {
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
