import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface AuthResponse {
  userId: string;
  orgId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  orgName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  isAuthenticated = signal(false);
  userId = signal<string | null>(null);
  orgId = signal<string | null>(null);

  constructor() {
    this.loadFromStorage();
  }

  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.api.post<AuthResponse>('/auth/login', request).pipe(
      tap(response => {
        if (response.data) {
          this.setAuth(response.data);
        }
      })
    );
  }

  register(request: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.api.post<AuthResponse>('/auth/register', request).pipe(
      tap(response => {
        if (response.data) {
          this.setAuth(response.data);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('orgId');
    this.currentUserSubject.next(null);
    this.isAuthenticated.set(false);
    this.userId.set(null);
    this.orgId.set(null);
    this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.api.post<AuthResponse>('/auth/refresh', { refreshToken }).pipe(
      tap(response => {
        if (response.data) {
          this.setAuth(response.data);
        }
      })
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private setAuth(auth: AuthResponse): void {
    localStorage.setItem('accessToken', auth.accessToken);
    localStorage.setItem('refreshToken', auth.refreshToken);
    localStorage.setItem('userId', auth.userId);
    localStorage.setItem('orgId', auth.orgId);
    this.currentUserSubject.next(auth);
    this.isAuthenticated.set(true);
    this.userId.set(auth.userId);
    this.orgId.set(auth.orgId);
  }

  private loadFromStorage(): void {
    const accessToken = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    const orgId = localStorage.getItem('orgId');

    if (accessToken && userId && orgId) {
      this.isAuthenticated.set(true);
      this.userId.set(userId);
      this.orgId.set(orgId);
    }
  }
}

