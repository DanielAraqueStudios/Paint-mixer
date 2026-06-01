import { Injectable, inject, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { tap } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient)
  private router = inject(Router)
  email          = signal<string | null>(this._emailFromToken())

  private _emailFromToken(): string | null {
    try {
      const token = localStorage.getItem('token')
      if (!token) return null
      return JSON.parse(atob(token.split('.')[1])).email ?? null
    } catch { return null }
  }

  getToken(): string | null {
    return localStorage.getItem('token')
  }

  isLoggedIn(): boolean {
    return !!this.getToken()
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string; email: string }>('/api/auth/login', { email, password }).pipe(
      tap(r => { localStorage.setItem('token', r.token); this.email.set(r.email) })
    )
  }

  register(email: string, password: string) {
    return this.http.post<{ token: string; email: string }>('/api/auth/register', { email, password }).pipe(
      tap(r => { localStorage.setItem('token', r.token); this.email.set(r.email) })
    )
  }

  logout() {
    localStorage.removeItem('token')
    this.email.set(null)
    this.router.navigate(['/login'])
  }
}
