import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

describe('roleGuard', () => {
  let mockAuthService: Partial<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockUrlTree: UrlTree;
  let isAuthenticatedSignal = signal(false);
  let roleSignal = signal<string | null>(null);

  beforeEach(() => {
    // Reset signals
    isAuthenticatedSignal = signal(false);
    roleSignal = signal<string | null>(null);
    mockUrlTree = {} as UrlTree;

    // Create mock auth service with actual signals
    mockAuthService = {
      isAuthenticated: isAuthenticatedSignal,
      role: roleSignal
    };

    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  const createRoute = (url: string = '/'): { route: ActivatedRouteSnapshot; state: RouterStateSnapshot } => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return { route, state };
  };

  it('should return UrlTree to login if user is not authenticated', () => {
    // Arrange
    isAuthenticatedSignal.set(false);
    const guard = roleGuard(['OrgAdmin']);

    // Act
    const { route, state } = createRoute('/admin');
    const result = TestBed.runInInjectionContext(() => guard(route, state));

    // Assert
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should allow access if user has required role', () => {
    // Arrange
    isAuthenticatedSignal.set(true);
    roleSignal.set('OrgAdmin');
    const guard = roleGuard(['OrgAdmin', 'SuperAdmin']);

    // Act
    const { route, state } = createRoute('/admin');
    const result = TestBed.runInInjectionContext(() => guard(route, state));

    // Assert
    expect(result).toBe(true);
  });

  it('should allow access if user has SuperAdmin role and SuperAdmin is allowed', () => {
    // Arrange
    isAuthenticatedSignal.set(true);
    roleSignal.set('SuperAdmin');
    const guard = roleGuard(['SuperAdmin']);

    // Act
    const { route, state } = createRoute('/superadmin');
    const result = TestBed.runInInjectionContext(() => guard(route, state));

    // Assert
    expect(result).toBe(true);
  });

  it('should return UrlTree to user home if user does not have required role', () => {
    // Arrange
    isAuthenticatedSignal.set(true);
    roleSignal.set('Coordinator');
    const guard = roleGuard(['OrgAdmin', 'SuperAdmin']);

    // Act
    const { route, state } = createRoute('/admin');
    const result = TestBed.runInInjectionContext(() => guard(route, state));

    // Assert
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/app/dashboard']);
  });

  it('should return UrlTree to login if role is null', () => {
    // Arrange
    isAuthenticatedSignal.set(true);
    roleSignal.set(null);
    const guard = roleGuard(['OrgAdmin']);

    // Act
    const { route, state } = createRoute('/admin');
    const result = TestBed.runInInjectionContext(() => guard(route, state));

    // Assert
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should work with multiple allowed roles', () => {
    // Arrange
    isAuthenticatedSignal.set(true);
    roleSignal.set('Coordinator');
    const guard = roleGuard(['OrgAdmin', 'Coordinator', 'Viewer']);

    // Act
    const { route, state } = createRoute('/admin');
    const result = TestBed.runInInjectionContext(() => guard(route, state));

    // Assert
    expect(result).toBe(true);
  });

  it('should redirect SuperAdmin to correct home when not authorized', () => {
    // Arrange
    isAuthenticatedSignal.set(true);
    roleSignal.set('SuperAdmin');
    const guard = roleGuard(['OrgAdmin']); // SuperAdmin not allowed

    // Act
    const { route, state } = createRoute('/admin');
    const result = TestBed.runInInjectionContext(() => guard(route, state));

    // Assert
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/superadmin/dashboard']);
  });

  it('should redirect Tenant to correct home when not authorized', () => {
    // Arrange
    isAuthenticatedSignal.set(true);
    roleSignal.set('Tenant');
    const guard = roleGuard(['SuperAdmin']);

    // Act
    const { route, state } = createRoute('/admin');
    const result = TestBed.runInInjectionContext(() => guard(route, state));

    // Assert
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/app/tickets']);
  });
});
