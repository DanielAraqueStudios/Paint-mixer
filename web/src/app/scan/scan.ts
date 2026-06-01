import { Component, signal, inject, ElementRef, viewChild, OnDestroy } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ApiService } from '../api.service'
import { LogService } from '../log.service'

function hexToMl(hex: string) {
  const r255 = parseInt(hex.slice(1, 3), 16)
  const g255 = parseInt(hex.slice(3, 5), 16)
  const b255 = parseInt(hex.slice(5, 7), 16)
  let r = r255 / 255 * 14
  let g = g255 / 255 * 14
  let b = b255 / 255 * 14
  const sum = r + g + b
  if (sum * 22 > 700) { const sc = 700 / (sum * 22); r *= sc; g *= sc; b *= sc }
  const mlRoja  = Math.round(r) * 22
  const mlVerde = Math.round(g) * 22
  const mlAzul  = Math.round(b) * 22
  return { mlRoja, mlVerde, mlAzul, mlBlanca: 700 - mlRoja - mlVerde - mlAzul }
}

@Component({
  selector: 'app-scan',
  imports: [FormsModule],
  template: `
    <div class="page">

      <div class="image-area">
        <div class="source-btns" [style.display]="mode() !== 'idle' ? 'none' : 'flex'">
          <button class="source-btn" (click)="startCamera()">📷 Cámara</button>
          <label class="source-btn">
            📁 Importar imagen
            <input type="file" accept="image/*" (change)="onFile($event)" style="display:none">
          </label>
        </div>

        <div class="video-wrap" [style.display]="mode() === 'camera' ? 'flex' : 'none'">
          <video #videoEl autoplay playsinline class="media"></video>
          <button class="capture-btn" (click)="capture()">Capturar foto</button>
        </div>

        <div class="canvas-wrap" [style.display]="(mode() === 'captured' || mode() === 'picked') ? 'flex' : 'none'">
          <canvas #canvasEl class="media" (click)="pickColor($event)"></canvas>
          <p class="canvas-hint">Toca la imagen para seleccionar un color</p>
        </div>

        @if (mode() !== 'idle') {
          <button class="reset-btn" (click)="reset()">↺ Nueva imagen</button>
        }
      </div>

      <div class="color-panel">
        <div class="swatch" [style.background]="pickedHex() ?? '#18181b'">
          @if (!pickedHex()) {
            <span class="swatch-hint">Sin color</span>
          }
        </div>

        @if (pickedHex()) {
          <div class="hex-code">{{ pickedHex()!.toUpperCase() }}</div>

          <div class="ml-list">
            <div class="ml-row"><span class="ml-label">Base blanca</span><span class="ml-val">{{ hexToMl(pickedHex()!).mlBlanca }} ml</span></div>
            <div class="ml-row"><span class="ml-label" style="color:#ef4444">Rojo</span><span class="ml-val">{{ hexToMl(pickedHex()!).mlRoja }} ml</span></div>
            <div class="ml-row"><span class="ml-label" style="color:#22c55e">Verde</span><span class="ml-val">{{ hexToMl(pickedHex()!).mlVerde }} ml</span></div>
            <div class="ml-row"><span class="ml-label" style="color:#3b82f6">Azul</span><span class="ml-val">{{ hexToMl(pickedHex()!).mlAzul }} ml</span></div>
          </div>

          <input class="name-input" [(ngModel)]="colorName" placeholder="Nombre del color (opcional)">

          <div class="action-row">
            <button class="save-btn" (click)="saveColor()" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : '♡ Guardar' }}
            </button>
            <button class="send-btn" (click)="sendToMixer()" [disabled]="sending()">
              {{ sending() ? 'Enviando...' : '→ Mezclar' }}
            </button>
          </div>
        } @else {
          <p class="panel-hint">Captura o importa una imagen, luego toca para extraer el color</p>
        }
      </div>

    </div>
  `,
  styles: [`
    .page { display: flex; flex: 1; overflow: hidden; height: 100%; }

    .image-area {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px; border-right: 1px solid #27272a; gap: 12px; overflow: hidden;
    }
    .source-btns { display: flex; gap: 12px; }
    .source-btn {
      padding: 14px 24px; border-radius: 10px;
      border: 1px solid #27272a; background: #18181b;
      color: #e4e4e7; font-size: 14px; cursor: pointer;
    }
    .source-btn:hover { border-color: #52525b; }
    .video-wrap, .canvas-wrap {
      flex-direction: column; align-items: center; gap: 10px; max-height: calc(100% - 80px);
    }
    .media { max-width: 100%; max-height: 400px; border-radius: 8px; display: block; }
    .media.picking { cursor: crosshair; }
    canvas.media { border: 2px solid #27272a; }
    .capture-btn {
      padding: 10px 28px; border-radius: 8px; border: none;
      background: #fbbf24; color: #18181b; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .canvas-hint { font-size: 11px; color: #52525b; margin: 0; text-align: center; }
    .reset-btn {
      padding: 6px 16px; border-radius: 6px; border: 1px solid #27272a;
      background: transparent; color: #71717a; font-size: 12px; cursor: pointer;
    }
    .reset-btn:hover { color: #a1a1aa; }

    .color-panel {
      width: 280px; flex-shrink: 0; display: flex; flex-direction: column;
      gap: 16px; padding: 24px; overflow-y: auto;
    }
    .swatch {
      width: 100%; height: 120px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid #27272a; transition: background 0.3s;
    }
    .swatch-hint { font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: .1em; }
    .hex-code { font-family: monospace; font-size: 22px; color: #f4f4f5; text-align: center; }
    .ml-list { display: flex; flex-direction: column; gap: 4px; }
    .ml-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px solid #1c1c1f; }
    .ml-label { color: #a1a1aa; }
    .ml-val { font-family: monospace; color: #d4d4d8; }
    .name-input {
      padding: 8px 12px; border-radius: 8px; border: 1px solid #27272a;
      background: #09090b; color: #f4f4f5; font-size: 13px; outline: none;
    }
    .name-input:focus { border-color: #52525b; }
    .action-row { display: flex; gap: 8px; }
    .save-btn, .send-btn {
      flex: 1; padding: 10px; border-radius: 8px; border: none;
      font-size: 13px; font-weight: 500; cursor: pointer;
    }
    .save-btn { background: #27272a; color: #e4e4e7; }
    .save-btn:hover:not(:disabled) { background: #3f3f46; }
    .send-btn { background: #fbbf24; color: #18181b; }
    .send-btn:hover:not(:disabled) { background: #fcd34d; }
    .save-btn:disabled, .send-btn:disabled { background: #1c1c1f; color: #3f3f46; cursor: not-allowed; }
    .panel-hint { font-size: 13px; color: #52525b; line-height: 1.6; margin: 0; }
  `]
})
export class Scan implements OnDestroy {
  private api = inject(ApiService)
  private log = inject(LogService)

  videoEl  = viewChild<ElementRef<HTMLVideoElement>>('videoEl')
  canvasEl = viewChild<ElementRef<HTMLCanvasElement>>('canvasEl')

  mode       = signal<'idle' | 'camera' | 'captured' | 'picked'>('idle')
  pickedHex  = signal<string | null>(null)
  colorName  = ''
  saving     = signal(false)
  sending    = signal(false)
  hexToMl    = hexToMl

  private stream: MediaStream | null = null
  private thumbData: string | null   = null

  async startCamera() {
    this.mode.set('camera')
    setTimeout(async () => {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        const v = this.videoEl()?.nativeElement
        if (v) { v.srcObject = this.stream; await v.play() }
      } catch (e) {
        this.log.error('No se pudo acceder a la cámara')
        this.mode.set('idle')
      }
    }, 50)
  }

  capture() {
    const v = this.videoEl()?.nativeElement
    const c = this.canvasEl()?.nativeElement
    if (!v || !c) return
    c.width  = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    this.thumbData = this._thumb(c)
    this.mode.set('captured')
    this.stopStream()
  }

  onFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const c = this.canvasEl()?.nativeElement
        if (!c) return
        c.width  = img.naturalWidth
        c.height = img.naturalHeight
        c.getContext('2d')!.drawImage(img, 0, 0)
        this.thumbData = this._thumb(c)
        this.mode.set('captured')
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  }

  pickColor(event: MouseEvent) {
    const c = this.canvasEl()?.nativeElement
    if (!c) return
    const rect   = c.getBoundingClientRect()
    const scaleX = c.width  / rect.width
    const scaleY = c.height / rect.height
    const x = Math.floor((event.clientX - rect.left) * scaleX)
    const y = Math.floor((event.clientY - rect.top)  * scaleY)
    const [r, g, b] = c.getContext('2d')!.getImageData(x, y, 1, 1).data
    this.pickedHex.set(`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`)
    this.mode.set('picked')
  }

  saveColor() {
    const hex = this.pickedHex()
    if (!hex) return
    this.saving.set(true)
    this.api.saveColor({ hex, name: this.colorName || undefined, imageData: this.thumbData ?? undefined }).subscribe({
      next:  () => this.saving.set(false),
      error: () => this.saving.set(false),
    })
  }

  sendToMixer() {
    const hex = this.pickedHex()
    if (!hex) return
    this.sending.set(true)
    const ml = hexToMl(hex)
    const name = this.colorName || hex.toUpperCase()
    this.api.sendCommand({ color: name, ...ml }).subscribe({
      next:  () => this.sending.set(false),
      error: () => this.sending.set(false),
    })
  }

  reset() {
    this.stopStream()
    this.mode.set('idle')
    this.pickedHex.set(null)
    this.colorName  = ''
    this.thumbData  = null
  }

  private stopStream() {
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
  }

  private _thumb(canvas: HTMLCanvasElement): string {
    const t = document.createElement('canvas')
    t.width  = 120
    t.height = 80
    t.getContext('2d')!.drawImage(canvas, 0, 0, 120, 80)
    return t.toDataURL('image/jpeg', 0.4)
  }

  ngOnDestroy() { this.stopStream() }
}
