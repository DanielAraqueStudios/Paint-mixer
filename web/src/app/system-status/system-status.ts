import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { LogService } from '../log.service'
import { interval, Subscription, startWith, switchMap, catchError, of, timeout } from 'rxjs'

interface Check { label: string; ok: boolean | null; detail: string }

@Component({
  selector: 'app-system-status',
  imports: [CommonModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Estado del sistema</span>
        <span class="refresh" (click)="refresh()">↺</span>
      </div>
      <div class="checks">
        @for (c of checks(); track c.label) {
          <div class="check">
            <span class="indicator"
              [style.background]="c.ok === null ? '#3f3f46' : c.ok ? '#4ade80' : '#f87171'">
            </span>
            <div class="check-info">
              <span class="check-label">{{ c.label }}</span>
              <span class="check-detail">{{ c.detail }}</span>
            </div>
          </div>
        }
      </div>
      <div class="ready-badge" [class.ready]="allOk()">
        {{ allOk() ? '✔ Sistema listo' : '⚠ Revisar conexiones' }}
      </div>
    </div>
  `,
  styles: [`
    .panel { display: flex; flex-direction: column; height: 100%; background: #09090b; }
    .panel-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 16px; border-bottom: 1px solid #27272a; flex-shrink: 0;
    }
    .panel-title { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: #52525b; }
    .refresh { color: #52525b; cursor: pointer; font-size: 14px; user-select: none; }
    .refresh:hover { color: #a1a1aa; }
    .checks { flex: 1; padding: 8px 0; }
    .check {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 16px;
    }
    .indicator { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .check-info { display: flex; flex-direction: column; gap: 1px; }
    .check-label { font-size: 12px; color: #e4e4e7; }
    .check-detail { font-size: 10px; color: #52525b; font-family: monospace; }
    .ready-badge {
      margin: 8px 16px 12px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      text-align: center;
      background: #27272a;
      color: #71717a;
      transition: all 0.3s;
    }
    .ready-badge.ready { background: #14532d; color: #4ade80; }
  `]
})
export class SystemStatus implements OnInit, OnDestroy {
  private http = inject(HttpClient)
  private log  = inject(LogService)

  checks = signal<Check[]>([
    { label: 'API Backend',       ok: null, detail: 'Verificando...' },
    { label: 'Base de datos',     ok: null, detail: 'Verificando...' },
    { label: 'MQTT Broker',       ok: null, detail: 'Verificando...' },
  ])

  allOk = () => this.checks().every(c => c.ok === true)

  private sub?: Subscription

  ngOnInit() {
    this.runChecks()
    this.sub = interval(10000).subscribe(() => this.runChecks())
  }

  ngOnDestroy() { this.sub?.unsubscribe() }

  refresh() {
    this.checks.update(cs => cs.map(c => ({ ...c, ok: null, detail: 'Verificando...' })))
    this.runChecks()
    this.log.info('Verificando estado del sistema...')
  }

  private runChecks() {
    // API check
    this.http.get<any>('/api/command').pipe(
      timeout(3000),
      catchError(e => { throw e })
    ).subscribe({
      next: () => this.setCheck('API Backend', true, 'http://localhost:8000'),
      error: e => this.setCheck('API Backend', false, e?.message ?? 'Sin respuesta'),
    })

    // DB + MQTT health via a dedicated endpoint
    this.http.get<any>('/api/health').pipe(
      timeout(3000),
      catchError(() => of(null))
    ).subscribe(r => {
      if (r) {
        this.setCheck('Base de datos', r.db,   r.db   ? 'Conectado' : r.db_error   ?? 'Error')
        this.setCheck('MQTT Broker',   r.mqtt, r.mqtt ? 'Conectado' : r.mqtt_error ?? 'Sin conexión')
      } else {
        this.setCheck('Base de datos', false, 'No se pudo contactar /api/health')
        this.setCheck('MQTT Broker',   false, 'No se pudo contactar /api/health')
      }
    })
  }

  private setCheck(label: string, ok: boolean, detail: string) {
    const prev = this.checks().find(c => c.label === label)
    if (prev && prev.ok !== ok) {
      this.log[ok ? 'ok' : 'warn'](`${label}: ${detail}`)
    }
    this.checks.update(cs => cs.map(c => c.label === label ? { ...c, ok, detail } : c))
  }
}
