import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface AuthResponse {
  userId: string;
  orgId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
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
  role = signal<string | null>(null);
  expiresAt = signal<number | null>(null);

  // Computed role checks
  isSuperAdmin = computed(() => this.role() === 'SuperAdmin');
  isOrgAdmin = computed(() => {
    const r = this.role();
    return r === 'SuperAdmin' || r === 'OrgAdmin';
  });

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
    localStorage.removeItem('role');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    localStorage.removeItem('expiresAt');
    this.currentUserSubject.next(null);
    this.isAuthenticated.set(false);
    this.userId.set(null);
    this.orgId.set(null);
    this.role.set(null);
    this.expiresAt.set(null);
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

  isTokenExpired(): boolean {
    const expiresAt = this.expiresAt();
    if (!expiresAt) {
      return false;
    }
    return Date.now() >= expiresAt;
  }

  private setAuth(auth: AuthResponse): void {
    console.log('🔐 Setting auth with role:', auth.role);
    const now = Date.now();
    const expiresAt = now + (auth.expiresIn ?? 0) * 1000;

    localStorage.setItem('accessToken', auth.accessToken);
    localStorage.setItem('refreshToken', auth.refreshToken);
    localStorage.setItem('userId', auth.userId);
    localStorage.setItem('orgId', auth.orgId);
    localStorage.setItem('role', auth.role || 'Viewer');
    if (auth.firstName) {
      localStorage.setItem('firstName', auth.firstName);
    }
    if (auth.lastName) {
      localStorage.setItem('lastName', auth.lastName);
    }
    localStorage.setItem('expiresAt', expiresAt.toString());

    this.currentUserSubject.next(auth);
    this.isAuthenticated.set(true);
    this.userId.set(auth.userId);
    this.orgId.set(auth.orgId);
    this.role.set(auth.role || 'Viewer');
    this.expiresAt.set(expiresAt);
    console.log('✅ Role signal set to:', this.role());
    console.log('✅ isSuperAdmin():', this.isSuperAdmin());
    console.log('✅ isOrgAdmin():', this.isOrgAdmin());
  }

  private loadFromStorage(): void {
    const accessToken = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    const orgId = localStorage.getItem('orgId');
    const role = localStorage.getItem('role');
    const expiresAtRaw = localStorage.getItem('expiresAt');

    console.log('📦 Loading from storage - role:', role);

    if (accessToken && userId && orgId && expiresAtRaw) {
      const expiresAt = Number(expiresAtRaw);
      if (Number.isNaN(expiresAt) || Date.now() >= expiresAt) {
        // Expired or invalid stored session
        this.logout();
        return;
      }

      this.isAuthenticated.set(true);
      this.userId.set(userId);
      this.orgId.set(orgId);
      this.role.set(role || 'Viewer');
      this.expiresAt.set(expiresAt);
      console.log('✅ Loaded role signal:', this.role());
      console.log('✅ isSuperAdmin():', this.isSuperAdmin());
      console.log('✅ isOrgAdmin():', this.isOrgAdmin());
    }
  }
}

