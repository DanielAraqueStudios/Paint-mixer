import { Component, inject, ElementRef, viewChild, effect } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LogService } from '../log.service'

@Component({
  selector: 'app-log-panel',
  imports: [CommonModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Registro de eventos</span>
        <button class="clear-btn" (click)="log.clear()">Limpiar</button>
      </div>
      <div class="panel-body" #body>
        @if (log.logs().length === 0) {
          <div class="empty">Sin eventos todavía...</div>
        }
        @for (entry of log.logs(); track entry.id) {
          <div class="entry" [class]="entry.level">
            <span class="ts">{{ entry.ts }}</span>
            <span class="dot">{{ icons[entry.level] }}</span>
            <span class="msg">{{ entry.msg }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .panel {
      display: flex; flex-direction: column;
      border-top: 1px solid #27272a;
      background: #09090b;
      height: 100%;
    }
    .panel-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid #27272a;
      flex-shrink: 0;
    }
    .panel-title { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: #52525b; }
    .clear-btn {
      font-size: 10px; padding: 2px 8px; border-radius: 4px;
      border: 1px solid #27272a; background: transparent;
      color: #71717a; cursor: pointer;
    }
    .clear-btn:hover { border-color: #52525b; color: #a1a1aa; }
    .panel-body {
      flex: 1; overflow-y: auto; padding: 6px 0;
      font-family: monospace; font-size: 11px;
      display: flex; flex-direction: column;
    }
    .empty { color: #3f3f46; padding: 12px 16px; }
    .entry {
      display: flex; align-items: baseline; gap: 8px;
      padding: 2px 16px;
      line-height: 1.6;
    }
    .entry:hover { background: #18181b; }
    .ts  { color: #3f3f46; flex-shrink: 0; }
    .dot { flex-shrink: 0; width: 12px; text-align: center; }
    .msg { color: #a1a1aa; word-break: break-word; }
    .entry.ok   .msg { color: #4ade80; }
    .entry.error .msg { color: #f87171; }
    .entry.warn  .msg { color: #fbbf24; }
    .entry.info  .msg { color: #a1a1aa; }
  `]
})
export class LogPanel {
  log  = inject(LogService)
  body = viewChild<ElementRef>('body')

  icons: Record<string, string> = {
    info: '·', ok: '✔', warn: '⚠', error: '✘'
  }
}
