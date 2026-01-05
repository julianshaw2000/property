import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, AuthResponse, LoginRequest } from './auth.service';
import { ApiService, ApiResponse } from './api.service';

describe('AuthService', () => {
  let service: AuthService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockAuthResponse: AuthResponse = {
    userId: 'user-123',
    orgId: 'org-456',
    accessToken: 'access-token-xyz',
    refreshToken: 'refresh-token-abc',
    expiresIn: 3600
  };

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['post', 'get']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Clear localStorage before each test
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isAuthenticated', () => {
    it('should return false when no token in storage', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should return true after successful login', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      apiServiceSpy.post.and.returnValue(of({ data: mockAuthResponse, error: null, traceId: 'trace-0' }));

      service.login(loginRequest).subscribe();

      expect(service.isAuthenticated()).toBeTrue();
    });
  });

  describe('login', () => {
    it('should call api.post with login credentials', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      apiServiceSpy.post.and.returnValue(of({ data: mockAuthResponse, error: null, traceId: 'trace-1' }));

      service.login(loginRequest).subscribe();

      expect(apiServiceSpy.post).toHaveBeenCalledWith('/auth/login', loginRequest);
    });

    it('should store tokens and set authenticated on successful login', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      apiServiceSpy.post.and.returnValue(of({ data: mockAuthResponse, error: null, traceId: 'trace-2' }));

      service.login(loginRequest).subscribe(() => {
        expect(localStorage.getItem('accessToken')).toBe('access-token-xyz');
        expect(localStorage.getItem('refreshToken')).toBe('refresh-token-abc');
        expect(localStorage.getItem('userId')).toBe('user-123');
        expect(localStorage.getItem('orgId')).toBe('org-456');
        expect(service.isAuthenticated()).toBeTrue();
        expect(service.userId()).toBe('user-123');
        expect(service.orgId()).toBe('org-456');
      });
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      // Set up authenticated state
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('refreshToken', 'refresh');
      localStorage.setItem('userId', 'user-123');
      localStorage.setItem('orgId', 'org-456');
    });

    it('should clear localStorage', () => {
      service.logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('userId')).toBeNull();
      expect(localStorage.getItem('orgId')).toBeNull();
    });

    it('should set isAuthenticated to false', () => {
      service.logout();

      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should navigate to login page', () => {
      service.logout();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should clear userId and orgId signals', () => {
      service.logout();

      expect(service.userId()).toBeNull();
      expect(service.orgId()).toBeNull();
    });
  });

  describe('getAccessToken', () => {
    it('should return null when no token exists', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('should return token when it exists', () => {
      localStorage.setItem('accessToken', 'my-token');

      expect(service.getAccessToken()).toBe('my-token');
    });
  });

  describe('refreshToken', () => {
    it('should call api.post with refresh token', () => {
      localStorage.setItem('refreshToken', 'refresh-token-abc');
      apiServiceSpy.post.and.returnValue(of({ data: mockAuthResponse, error: null, traceId: 'trace-3' }));

      service.refreshToken().subscribe();

      expect(apiServiceSpy.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'refresh-token-abc' });
    });
  });
});
