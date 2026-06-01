import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, tap } from 'rxjs'
import { LogService } from './log.service'

export interface Command {
  id: number
  color: string
  mlBlanca: number
  mlRoja: number
  mlVerde: number
  mlAzul: number
  status: string
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient)
  private log  = inject(LogService)

  sendCommand(body: Omit<Command, 'id' | 'status'>): Observable<Command> {
    this.log.info(`Enviando comando → ${body.color}  B:${body.mlBlanca} R:${body.mlRoja} G:${body.mlVerde} Az:${body.mlAzul} ml`)
    return this.http.post<Command>('/api/command', body).pipe(
      tap({
        next:  c => this.log.ok(`Comando #${c.id} creado — estado: ${c.status}`),
        error: e => this.log.error(`Error enviando comando: ${e?.message ?? e}`),
      })
    )
  }

  latestCommand(): Observable<Command | null> {
    return this.http.get<Command | null>('/api/command')
  }
}
