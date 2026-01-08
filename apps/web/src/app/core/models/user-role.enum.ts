/**
 * User role enum matching backend UserRole enum
 */
export enum UserRole {
  SuperAdmin = 'SuperAdmin',
  OrgAdmin = 'OrgAdmin',
  Coordinator = 'Coordinator',
  Viewer = 'Viewer',
  Contractor = 'Contractor',
  Tenant = 'Tenant'
}

/**
 * Human-readable labels for user roles
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Super Administrator',
  [UserRole.OrgAdmin]: 'Organisation Administrator',
  [UserRole.Coordinator]: 'Coordinator',
  [UserRole.Viewer]: 'Viewer',
  [UserRole.Contractor]: 'Contractor',
  [UserRole.Tenant]: 'Tenant'
};
