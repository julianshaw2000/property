import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { areaGuard } from './area.guard';
import { AuthService } from '../services/auth.service';

describe('areaGuard', () => {
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

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      isAuthenticatedSignal.set(false);
    });

    it('should return UrlTree to login for superadmin area', () => {
      const guard = areaGuard('superadmin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should return UrlTree to login for admin area', () => {
      const guard = areaGuard('admin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should return UrlTree to login for app area', () => {
      const guard = areaGuard('app');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('superadmin area access', () => {
    beforeEach(() => {
      isAuthenticatedSignal.set(true);
    });

    it('should allow SuperAdmin to access superadmin area', () => {
      roleSignal.set('SuperAdmin');
      const guard = areaGuard('superadmin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(true);
    });

    it('should deny OrgAdmin access to superadmin area', () => {
      roleSignal.set('OrgAdmin');
      const guard = areaGuard('superadmin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/admin/users']);
    });

    it('should deny Coordinator access to superadmin area', () => {
      roleSignal.set('Coordinator');
      const guard = areaGuard('superadmin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/app/dashboard']);
    });

    it('should deny Viewer access to superadmin area', () => {
      roleSignal.set('Viewer');
      const guard = areaGuard('superadmin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/app/dashboard']);
    });
  });

  describe('admin area access', () => {
    beforeEach(() => {
      isAuthenticatedSignal.set(true);
    });

    it('should allow SuperAdmin to access admin area', () => {
      roleSignal.set('SuperAdmin');
      const guard = areaGuard('admin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(true);
    });

    it('should allow OrgAdmin to access admin area', () => {
      roleSignal.set('OrgAdmin');
      const guard = areaGuard('admin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(true);
    });

    it('should deny Coordinator access to admin area', () => {
      roleSignal.set('Coordinator');
      const guard = areaGuard('admin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/app/dashboard']);
    });

    it('should deny Viewer access to admin area', () => {
      roleSignal.set('Viewer');
      const guard = areaGuard('admin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/app/dashboard']);
    });

    it('should deny Contractor access to admin area', () => {
      roleSignal.set('Contractor');
      const guard = areaGuard('admin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/app/work-orders']);
    });

    it('should deny Tenant access to admin area', () => {
      roleSignal.set('Tenant');
      const guard = areaGuard('admin');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/app/tickets']);
    });
  });

  describe('app area access', () => {
    beforeEach(() => {
      isAuthenticatedSignal.set(true);
    });

    it('should allow SuperAdmin to access app area', () => {
      roleSignal.set('SuperAdmin');
      const guard = areaGuard('app');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(true);
    });

    it('should allow OrgAdmin to access app area', () => {
      roleSignal.set('OrgAdmin');
      const guard = areaGuard('app');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(true);
    });

    it('should allow Coordinator to access app area', () => {
      roleSignal.set('Coordinator');
      const guard = areaGuard('app');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(true);
    });

    it('should allow Viewer to access app area', () => {
      roleSignal.set('Viewer');
      const guard = areaGuard('app');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(true);
    });

    it('should allow Contractor to access app area', () => {
      roleSignal.set('Contractor');
      const guard = areaGuard('app');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(true);
    });

    it('should allow Tenant to access app area', () => {
      roleSignal.set('Tenant');
      const guard = areaGuard('app');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      isAuthenticatedSignal.set(true);
    });

    it('should redirect to login if role is null', () => {
      roleSignal.set(null);
      const guard = areaGuard('app');
      const result = TestBed.runInInjectionContext(() => guard());

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
    });
  });
});
