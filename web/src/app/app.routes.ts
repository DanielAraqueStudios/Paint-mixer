import { Routes } from '@angular/router'
import { authGuard } from './auth/auth.guard'

export const routes: Routes = [
  { path: 'login',   loadComponent: () => import('./login/login').then(m => m.Login) },
  { path: '',        loadComponent: () => import('./home/home').then(m => m.Home),    canActivate: [authGuard] },
  { path: 'scan',    loadComponent: () => import('./scan/scan').then(m => m.Scan),    canActivate: [authGuard] },
  { path: 'profile', loadComponent: () => import('./profile/profile').then(m => m.Profile), canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
]
