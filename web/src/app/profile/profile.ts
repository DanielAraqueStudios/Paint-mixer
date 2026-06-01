import { Component, signal, inject, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ApiService, ProfileData, SavedColor } from '../api.service'
import { AuthService } from '../auth/auth.service'

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  template: `
    <div class="page">

      @if (loading()) {
        <div class="loading">Cargando perfil...</div>
      } @else if (data()) {
        <div class="content">

          <!-- User card -->
          <div class="user-card">
            <div class="avatar">{{ data()!.email[0].toUpperCase() }}</div>
            <div class="user-info">
              <div class="user-email">{{ data()!.email }}</div>
              <div class="user-stats">
                <span class="stat"><strong>{{ data()!.totalMixes }}</strong> mezclas</span>
                <span class="sep">·</span>
                <span class="stat"><strong>{{ data()!.savedColors }}</strong> colores guardados</span>
              </div>
            </div>
          </div>

          <!-- Saved colors -->
          @if (colors().length > 0) {
            <section class="section">
              <h2 class="section-title">Colores guardados</h2>
              <div class="colors-grid">
                @for (c of colors(); track c.id) {
                  <div class="color-card">
                    <div class="color-swatch" [style.background]="c.hex">
                      @if (c.imageData) {
                        <img [src]="c.imageData" class="thumb-img" alt="">
                      }
                    </div>
                    <div class="color-info">
                      <span class="color-name">{{ c.name ?? c.hex.toUpperCase() }}</span>
                      <span class="color-hex" [style.color]="c.hex">{{ c.hex.toUpperCase() }}</span>
                    </div>
                    <button class="del-btn" (click)="deleteColor(c.id)" title="Eliminar">✕</button>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Device token -->
          <section class="section">
            <h2 class="section-title">Token de dispositivo (ESP32)</h2>
            @if (deviceToken()) {
              <div class="token-card">
                <div class="token-info">
                  <span class="token-label">Usuario MQTT</span>
                  <code class="token-value">{{ data()!.email }}</code>
                </div>
                <div class="token-info">
                  <span class="token-label">Contrasena MQTT</span>
                  <code class="token-value">{{ deviceToken() }}</code>
                </div>
                <div class="token-actions">
                  <button class="copy-btn" (click)="copyToken()">Copiar token</button>
                  <button class="regen-btn" (click)="regenToken()">Regenerar</button>
                </div>
                <p class="token-hint">Usa estos valores en el firmware del ESP32:<br>
                  <code>mqtt.setCredentials("{{ data()!.email }}", "{{ deviceToken() }}");</code>
                </p>
              </div>
            } @else {
              <button class="copy-btn" (click)="loadToken()">Mostrar token</button>
            }
          </section>

          <!-- Mix history -->
          @if (data()!.history.length > 0) {
            <section class="section">
              <h2 class="section-title">Historial de mezclas</h2>
              <div class="history-table">
                <div class="row header">
                  <span>Color</span><span>Blanca</span><span>Roja</span><span>Verde</span><span>Azul</span><span>Estado</span><span>Fecha</span>
                </div>
                @for (h of data()!.history; track h.id) {
                  <div class="row">
                    <span class="hcolor">{{ h.color }}</span>
                    <span>{{ h.mlBlanca | number:'1.0-0' }} ml</span>
                    <span>{{ h.mlRoja   | number:'1.0-0' }} ml</span>
                    <span>{{ h.mlVerde  | number:'1.0-0' }} ml</span>
                    <span>{{ h.mlAzul   | number:'1.0-0' }} ml</span>
                    <span class="status" [attr.data-s]="h.status">{{ h.status }}</span>
                    <span class="date">{{ h.createdAt ? (h.createdAt | date:'dd/MM HH:mm') : '—' }}</span>
                  </div>
                }
              </div>
            </section>
          }

        </div>
      }

    </div>
  `,
  styles: [`
    .page { flex: 1; overflow-y: auto; padding: 32px 40px; }
    .loading { color: #52525b; font-size: 13px; }
    .content { display: flex; flex-direction: column; gap: 32px; max-width: 900px; }

    .user-card { display: flex; align-items: center; gap: 20px; }
    .avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: #fbbf24; color: #18181b;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700; flex-shrink: 0;
    }
    .user-email { font-size: 18px; color: #f4f4f5; margin-bottom: 4px; }
    .user-stats { font-size: 13px; color: #71717a; display: flex; gap: 8px; }
    .stat strong { color: #e4e4e7; }
    .sep { color: #3f3f46; }

    .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color: #52525b; margin: 0 0 14px; }

    .colors-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .color-card {
      width: 120px; border-radius: 10px; border: 1px solid #27272a;
      background: #18181b; overflow: hidden; position: relative;
    }
    .color-swatch { width: 100%; height: 72px; position: relative; overflow: hidden; }
    .thumb-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
    .color-info { padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; }
    .color-name { font-size: 11px; color: #e4e4e7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .color-hex { font-size: 10px; font-family: monospace; }
    .del-btn {
      position: absolute; top: 4px; right: 4px;
      width: 18px; height: 18px; border-radius: 50%; border: none;
      background: rgba(0,0,0,.6); color: #a1a1aa; font-size: 9px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .del-btn:hover { background: #7f1d1d; color: #fca5a5; }

    .history-table { display: flex; flex-direction: column; border: 1px solid #27272a; border-radius: 10px; overflow: hidden; }
    .row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1.4fr; padding: 8px 14px; font-size: 12px; gap: 8px; }
    .row.header { background: #18181b; color: #52525b; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
    .row:not(.header) { color: #a1a1aa; border-top: 1px solid #1c1c1f; }
    .row:not(.header):hover { background: #18181b; }
    .hcolor { color: #e4e4e7; }
    .date { color: #52525b; font-family: monospace; }
    .status { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #27272a; color: #71717a; }
    .status[data-s="done"]    { background: #14532d; color: #4ade80; }
    .status[data-s="error"]   { background: #450a0a; color: #f87171; }
    .status[data-s="mixing"]  { background: #1e3a5f; color: #60a5fa; }
    .status[data-s="pending"] { background: #422006; color: #fbbf24; }

    .token-card { background: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; max-width: 600px; }
    .token-info { display: flex; flex-direction: column; gap: 3px; }
    .token-label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #52525b; }
    .token-value { font-family: monospace; font-size: 13px; color: #fbbf24; background: #09090b; padding: 4px 8px; border-radius: 4px; word-break: break-all; }
    .token-actions { display: flex; gap: 8px; }
    .copy-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #3f3f46; background: #27272a; color: #e4e4e7; font-size: 12px; cursor: pointer; }
    .copy-btn:hover { background: #3f3f46; }
    .regen-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #7f1d1d; background: transparent; color: #f87171; font-size: 12px; cursor: pointer; }
    .regen-btn:hover { background: #7f1d1d22; }
    .token-hint { font-size: 11px; color: #52525b; margin: 0; line-height: 1.6; }
    .token-hint code { color: #a1a1aa; font-size: 11px; }
  `]
})
export class Profile implements OnInit {
  private api  = inject(ApiService)
  private auth = inject(AuthService)

  loading     = signal(true)
  data        = signal<ProfileData | null>(null)
  colors      = signal<SavedColor[]>([])
  deviceToken = signal<string | null>(null)

  ngOnInit() {
    this.api.getProfile().subscribe({
      next: d => { this.data.set(d); this.loading.set(false) },
      error: () => this.loading.set(false),
    })
    this.api.getColors().subscribe(cs => this.colors.set(cs))
  }

  deleteColor(id: number) {
    this.api.deleteColor(id).subscribe(() =>
      this.colors.update(cs => cs.filter(c => c.id !== id))
    )
  }

  loadToken() {
    this.api.getDeviceToken().subscribe(r => this.deviceToken.set(r.token))
  }

  copyToken() {
    const t = this.deviceToken()
    if (t) navigator.clipboard.writeText(t)
  }

  regenToken() {
    this.api.regenerateDeviceToken().subscribe(r => this.deviceToken.set(r.token))
  }
}
