import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { getHomeRouteForRole } from '../utils/role-routes';

/**
 * Role-based route guard with smart redirects.
 *
 * If user lacks required role, redirects to their role's home route
 * instead of a generic dashboard.
 *
 * @param allowedRoles - Array of role strings that are allowed to access the route
 * @returns CanActivateFn that returns true if authorized, UrlTree for redirect
 *
 * @example
 * // In routes configuration:
 * {
 *   path: 'admin',
 *   canActivate: [roleGuard(['SuperAdmin', 'OrgAdmin'])],
 *   component: AdminComponent
 * }
 */
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return (): boolean | UrlTree => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check authentication first
    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/auth/login']);
    }

    // Check role authorization
    const userRole = authService.role();
    if (userRole && allowedRoles.includes(userRole)) {
      return true; // Authorized
    }

    // User doesn't have required role - redirect to their home route
    const homeRoute = getHomeRouteForRole(userRole);
    return router.createUrlTree([homeRoute]);
  };
}
