import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { signal } from '@angular/core';

describe('authGuard', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockUrlTree: UrlTree;

  beforeEach(() => {
    // Create mock UrlTree
    mockUrlTree = {} as UrlTree;

    // Create spy objects
    mockAuthService = jasmine.createSpyObj('AuthService', [], {
      isAuthenticated: signal(false),
      userId: signal(null),
      orgId: signal(null),
      role: signal(null)
    });

    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('should return true if user is authenticated', () => {
    // Arrange
    Object.defineProperty(mockAuthService, 'isAuthenticated', {
      value: signal(true)
    });

    // Act
    const result = TestBed.runInInjectionContext(() => authGuard());

    // Assert
    expect(result).toBe(true);
    expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
  });

  it('should return UrlTree to login if user is not authenticated', () => {
    // Arrange
    Object.defineProperty(mockAuthService, 'isAuthenticated', {
      value: signal(false)
    });

    // Act
    const result = TestBed.runInInjectionContext(() => authGuard());

    // Assert
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should return UrlTree instance when not authenticated', () => {
    // Arrange
    Object.defineProperty(mockAuthService, 'isAuthenticated', {
      value: signal(false)
    });

    // Act
    const result = TestBed.runInInjectionContext(() => authGuard());

    // Assert
    expect(result).toBeInstanceOf(Object);
    expect(result).toBe(mockUrlTree);
  });

  it('should call isAuthenticated signal', () => {
    // Arrange
    const isAuthenticatedSpy = jasmine.createSpy('isAuthenticated').and.returnValue(true);
    Object.defineProperty(mockAuthService, 'isAuthenticated', {
      value: isAuthenticatedSpy
    });

    // Act
    TestBed.runInInjectionContext(() => authGuard());

    // Assert
    expect(isAuthenticatedSpy).toHaveBeenCalled();
  });
});
