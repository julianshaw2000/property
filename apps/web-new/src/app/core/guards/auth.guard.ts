import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Authentication guard that redirects to login if user is not authenticated.
 * Returns UrlTree for redirects instead of using router.navigate() to prevent redirect loops.
 */
export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Return UrlTree for redirect - prevents redirect loops
  return router.createUrlTree(['/auth/login']);
};

