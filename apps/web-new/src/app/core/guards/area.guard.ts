import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { canAccessArea, getHomeRouteForRole } from '../utils/role-routes';

/**
 * Area-based access guard for route groups.
 * Ensures users can only access areas appropriate for their role.
 *
 * @param area - Area identifier (superadmin, admin, or app)
 * @returns CanActivateFn that returns true if authorized, UrlTree for redirect
 *
 * @example
 * // In routes configuration:
 * {
 *   path: 'superadmin',
 *   canActivate: [areaGuard('superadmin')],
 *   loadComponent: () => import('./features/superadmin/superadmin-layout.component')
 * }
 */
export function areaGuard(area: 'superadmin' | 'admin' | 'app'): CanActivateFn {
  return (): boolean | UrlTree => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/auth/login']);
    }

    const userRole = authService.role();
    if (canAccessArea(userRole, area)) {
      return true;
    }

    // Redirect to user's home route
    const homeRoute = getHomeRouteForRole(userRole);
    return router.createUrlTree([homeRoute]);
  };
}
