import { Component, signal, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../auth/auth.service'

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="card">
        <h1 class="brand">Pintu<span class="accent">col</span></h1>
        <p class="tagline">Sistema de mezclado IoT</p>

        <div class="tabs">
          <button [class.active]="mode() === 'login'"    (click)="mode.set('login')">Iniciar sesión</button>
          <button [class.active]="mode() === 'register'" (click)="mode.set('register')">Registrarse</button>
        </div>

        <form (ngSubmit)="submit()" #f="ngForm">
          <label>
            <span>Correo electrónico</span>
            <input type="email" [(ngModel)]="email" name="email" required placeholder="usuario@ejemplo.com" autocomplete="email">
          </label>
          <label>
            <span>Contraseña</span>
            <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••" autocomplete="current-password">
          </label>

          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }

          <button type="submit" class="submit-btn" [disabled]="loading()">
            {{ loading() ? 'Cargando...' : (mode() === 'login' ? 'Entrar' : 'Crear cuenta') }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page {
      height: 100dvh; background: #09090b;
      display: flex; align-items: center; justify-content: center;
      padding: 16px; box-sizing: border-box;
    }
    .card {
      width: 100%; max-width: 380px; background: #18181b;
      border: 1px solid #27272a; border-radius: 16px;
      padding: 36px 32px; box-sizing: border-box;
    }
    .brand { font-size: 24px; margin: 0 0 4px; color: #f4f4f5; }
    .accent { color: #fbbf24; font-style: italic; }
    .tagline { font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: .12em; margin: 0 0 28px; }
    .tabs { display: flex; gap: 4px; margin-bottom: 24px; }
    .tabs button {
      flex: 1; padding: 9px 4px; border-radius: 8px; border: 1px solid #27272a;
      background: transparent; color: #71717a; cursor: pointer; font-size: 13px;
      white-space: nowrap; min-width: 0;
    }
    .tabs button.active { background: #27272a; color: #f4f4f5; }
    form { display: flex; flex-direction: column; gap: 16px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #a1a1aa; }
    input {
      padding: 10px 12px; border-radius: 8px;
      border: 1px solid #27272a; background: #09090b;
      color: #f4f4f5; font-size: 14px; outline: none;
      width: 100%; box-sizing: border-box;
    }
    input:focus { border-color: #52525b; }
    .error-msg { background: #450a0a; border: 1px solid #7f1d1d; color: #fca5a5; padding: 10px 12px; border-radius: 8px; font-size: 13px; }
    .submit-btn {
      padding: 13px; border-radius: 10px; border: none;
      background: #fbbf24; color: #18181b; font-size: 14px;
      font-weight: 600; cursor: pointer; margin-top: 4px;
      width: 100%; box-sizing: border-box;
    }
    .submit-btn:hover:not(:disabled) { background: #fcd34d; }
    .submit-btn:disabled { background: #27272a; color: #52525b; cursor: not-allowed; }

    @media (max-width: 400px) {
      .card { padding: 28px 20px; border-radius: 12px; }
      .brand { font-size: 20px; }
    }
  `]
})
export class Login {
  private auth   = inject(AuthService)
  private router = inject(Router)

  mode     = signal<'login' | 'register'>('login')
  email    = ''
  password = ''
  loading  = signal(false)
  error    = signal('')

  submit() {
    if (!this.email || !this.password) return
    this.loading.set(true)
    this.error.set('')
    const call = this.mode() === 'login'
      ? this.auth.login(this.email, this.password)
      : this.auth.register(this.email, this.password)

    call.subscribe({
      next:  () => this.router.navigate(['/']),
      error: e  => { this.error.set(e?.error?.detail ?? 'Error de conexión'); this.loading.set(false) },
    })
  }
}
