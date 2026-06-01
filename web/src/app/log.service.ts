import { Injectable, signal } from '@angular/core'

export type LogLevel = 'info' | 'ok' | 'warn' | 'error'

export interface LogEntry {
  id: number
  ts: string
  level: LogLevel
  msg: string
}

@Injectable({ providedIn: 'root' })
export class LogService {
  private _seq = 0
  logs = signal<LogEntry[]>([])

  private add(level: LogLevel, msg: string) {
    const now = new Date()
    const ts = now.toLocaleTimeString('es-CO', { hour12: false }) +
               '.' + String(now.getMilliseconds()).padStart(3, '0')
    const entry: LogEntry = { id: ++this._seq, ts, level, msg }
    this.logs.update(prev => [entry, ...prev].slice(0, 200))
  }

  info(msg: string)  { this.add('info',  msg) }
  ok(msg: string)    { this.add('ok',    msg) }
  warn(msg: string)  { this.add('warn',  msg) }
  error(msg: string) { this.add('error', msg) }
  clear()            { this.logs.set([]) }
}
