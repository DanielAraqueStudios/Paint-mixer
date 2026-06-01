import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, tap } from 'rxjs'
import { LogService } from './log.service'

export interface Command {
  id:        number
  color:     string
  mlBlanca:  number
  mlRoja:    number
  mlVerde:   number
  mlAzul:    number
  status:    string
  createdAt: string | null
}

export interface SavedColor {
  id:        number
  hex:       string
  name:      string | null
  imageData: string | null
  createdAt: string | null
}

export interface ProfileData {
  email:       string
  totalMixes:  number
  savedColors: number
  history:     Command[]
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient)
  private log  = inject(LogService)

  sendCommand(body: Omit<Command, 'id' | 'status' | 'createdAt'>): Observable<Command> {
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

  saveColor(body: { hex: string; name?: string; imageData?: string }): Observable<SavedColor> {
    return this.http.post<SavedColor>('/api/colors', body).pipe(
      tap({
        next:  () => this.log.ok(`Color ${body.hex} guardado`),
        error: e  => this.log.error(`Error guardando color: ${e?.message ?? e}`),
      })
    )
  }

  getColors(): Observable<SavedColor[]> {
    return this.http.get<SavedColor[]>('/api/colors')
  }

  deleteColor(id: number): Observable<void> {
    return this.http.delete<void>(`/api/colors/${id}`).pipe(
      tap({ next: () => this.log.info(`Color #${id} eliminado`) })
    )
  }

  getProfile(): Observable<ProfileData> {
    return this.http.get<ProfileData>('/api/profile')
  }
}
