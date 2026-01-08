/**
 * Central role-to-route mapping for the application
 */
export const ROLE_HOME_ROUTES: Record<string, string> = {
  SuperAdmin: '/superadmin/dashboard',
  OrgAdmin: '/admin/users',
  Coordinator: '/app/dashboard',
  Viewer: '/app/dashboard',
  Contractor: '/app/work-orders',
  Tenant: '/app/tickets'
};

/**
 * Gets the home route for a given role
 * @param role - User role string
 * @returns Route path for the role's home page
 */
export function getHomeRouteForRole(role: string | null): string {
  if (!role) {
    return '/auth/login';
  }
  return ROLE_HOME_ROUTES[role] || '/app/dashboard';
}

/**
 * Checks if a role has access to an area
 * @param role - User role string
 * @param area - Area identifier (superadmin, admin, or app)
 * @returns True if the role can access the area
 */
export function canAccessArea(role: string | null, area: 'superadmin' | 'admin' | 'app'): boolean {
  if (!role) return false;

  switch (area) {
    case 'superadmin':
      return role === 'SuperAdmin';
    case 'admin':
      return role === 'SuperAdmin' || role === 'OrgAdmin';
    case 'app':
      return true; // All authenticated users can access app area
    default:
      return false;
  }
}
