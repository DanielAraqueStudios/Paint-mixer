import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ApiService, Command } from '../api.service'
import { LogService } from '../log.service'
import { interval, Subscription, startWith, switchMap, catchError, of } from 'rxjs'

const STATUS: Record<string, { label: string; dot: string; pulse: boolean }> = {
  pending:  { label: 'Orden pendiente',        dot: '#fbbf24', pulse: true  },
  received: { label: 'ESP32 recibió la orden', dot: '#60a5fa', pulse: true  },
  mixing:   { label: 'Mezclando...',            dot: '#60a5fa', pulse: true  },
  done:     { label: 'Mezcla completada',       dot: '#4ade80', pulse: false },
  error:    { label: 'Error en ESP32',          dot: '#f87171', pulse: false },
}

@Component({
  selector: 'app-status-bar',
  imports: [CommonModule],
  template: `
    <div class="status-bar">
      <span class="dot" [class.pulse]="s()?.pulse" [style.background]="s()?.dot ?? '#52525b'"></span>
      <span>{{ s() ? s()!.label + (cmd()?.color ? ' — ' + cmd()!.color : '') : 'Sin actividad reciente' }}</span>
    </div>
  `,
  styles: [`
    .status-bar {
      padding: 10px 40px;
      background: #18181b;
      border-bottom: 1px solid #27272a;
      display: flex; align-items: center; gap: 10px;
      font-family: monospace; font-size: 12px; color: #a1a1aa;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; transition: background 0.3s; }
    .pulse { animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  `]
})
export class StatusBar implements OnInit, OnDestroy {
  private api  = inject(ApiService)
  private log  = inject(LogService)
  cmd          = signal<Command | null>(null)
  s            = signal<{ label: string; dot: string; pulse: boolean } | null>(null)
  private sub?: Subscription
  private lastStatus = ''

  ngOnInit() {
    this.sub = interval(2000).pipe(
      startWith(0),
      switchMap(() => this.api.latestCommand().pipe(catchError(() => of(null))))
    ).subscribe(c => {
      this.cmd.set(c)
      this.s.set(c?.status ? (STATUS[c.status] ?? { label: c.status, dot: '#52525b', pulse: false }) : null)

      // log status transitions
      if (c && c.status !== this.lastStatus) {
        const s = STATUS[c.status]
        const level = c.status === 'error' ? 'error' : c.status === 'done' ? 'ok' : 'info'
        this.log[level](`Comando #${c.id} (${c.color}) → ${s?.label ?? c.status}`)
        this.lastStatus = c.status
      }
    })
  }

  ngOnDestroy() { this.sub?.unsubscribe() }
}
