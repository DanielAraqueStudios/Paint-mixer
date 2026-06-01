import { Component, inject } from '@angular/core'
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'
import { StatusBar } from './status-bar/status-bar'
import { SystemStatus } from './system-status/system-status'
import { LogPanel } from './log-panel/log-panel'
import { AuthService } from './auth/auth.service'

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, StatusBar, SystemStatus, LogPanel],
  template: `
    <div class="layout">

      <nav class="nav">
        <span class="brand">Pinturas <span class="accent">124345</span></span>
        <div class="nav-links">
          <a routerLink="/"        routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Catálogo</a>
          <a routerLink="/scan"    routerLinkActive="active">Scanner</a>
          <a routerLink="/profile" routerLinkActive="active">Perfil</a>
        </div>
        @if (auth.email()) {
          <div class="nav-user">
            <span class="user-email">{{ auth.email() }}</span>
            <button class="logout-btn" (click)="auth.logout()">Salir</button>
          </div>
        }
      </nav>

      <app-status-bar />

      <div class="content">
        <router-outlet />
      </div>

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

    .nav {
      display: flex; align-items: center; gap: 24px;
      padding: 0 32px; height: 52px; flex-shrink: 0;
      border-bottom: 1px solid #27272a; background: #09090b;
    }
    .brand { font-size: 16px; font-weight: 600; white-space: nowrap; }
    .accent { color: #fbbf24; font-style: italic; }
    .nav-links { display: flex; gap: 4px; flex: 1; }
    .nav-links a {
      padding: 6px 14px; border-radius: 6px; font-size: 13px;
      color: #71717a; text-decoration: none;
    }
    .nav-links a:hover { color: #e4e4e7; background: #18181b; }
    .nav-links a.active { color: #f4f4f5; background: #27272a; }
    .nav-user { display: flex; align-items: center; gap: 12px; margin-left: auto; }
    .user-email { font-size: 12px; color: #52525b; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .logout-btn {
      padding: 5px 12px; border-radius: 6px; border: 1px solid #27272a;
      background: transparent; color: #71717a; font-size: 12px; cursor: pointer;
    }
    .logout-btn:hover { border-color: #52525b; color: #a1a1aa; }

    .content { display: flex; flex: 1; overflow: hidden; min-height: 0; }

    .bottom-panels { display: flex; height: 220px; flex-shrink: 0; border-top: 1px solid #27272a; }
    .bottom-panel { overflow: hidden; }
    .status-panel { width: 260px; flex-shrink: 0; border-right: 1px solid #27272a; }
    .log-panel { flex: 1; }
  `]
})
export class App {
  auth = inject(AuthService)
}
