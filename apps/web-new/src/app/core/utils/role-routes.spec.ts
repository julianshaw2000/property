import { getHomeRouteForRole, canAccessArea, ROLE_HOME_ROUTES } from './role-routes';

describe('Role Routes Utility', () => {
  describe('ROLE_HOME_ROUTES', () => {
    it('should have correct route mappings for all roles', () => {
      expect(ROLE_HOME_ROUTES['SuperAdmin']).toBe('/superadmin/dashboard');
      expect(ROLE_HOME_ROUTES['OrgAdmin']).toBe('/admin/users');
      expect(ROLE_HOME_ROUTES['Coordinator']).toBe('/app/dashboard');
      expect(ROLE_HOME_ROUTES['Viewer']).toBe('/app/dashboard');
      expect(ROLE_HOME_ROUTES['Contractor']).toBe('/app/work-orders');
      expect(ROLE_HOME_ROUTES['Tenant']).toBe('/app/tickets');
    });
  });

  describe('getHomeRouteForRole', () => {
    it('should return superadmin dashboard for SuperAdmin role', () => {
      expect(getHomeRouteForRole('SuperAdmin')).toBe('/superadmin/dashboard');
    });

    it('should return admin users for OrgAdmin role', () => {
      expect(getHomeRouteForRole('OrgAdmin')).toBe('/admin/users');
    });

    it('should return app dashboard for Coordinator role', () => {
      expect(getHomeRouteForRole('Coordinator')).toBe('/app/dashboard');
    });

    it('should return app dashboard for Viewer role', () => {
      expect(getHomeRouteForRole('Viewer')).toBe('/app/dashboard');
    });

    it('should return app work-orders for Contractor role', () => {
      expect(getHomeRouteForRole('Contractor')).toBe('/app/work-orders');
    });

    it('should return app tickets for Tenant role', () => {
      expect(getHomeRouteForRole('Tenant')).toBe('/app/tickets');
    });

    it('should return login route for null role', () => {
      expect(getHomeRouteForRole(null)).toBe('/auth/login');
    });

    it('should return app dashboard for unknown role', () => {
      expect(getHomeRouteForRole('UnknownRole')).toBe('/app/dashboard');
    });

    it('should return login route for empty string role', () => {
      expect(getHomeRouteForRole('')).toBe('/auth/login');
    });
  });

  describe('canAccessArea', () => {
    describe('superadmin area', () => {
      it('should allow SuperAdmin to access superadmin area', () => {
        expect(canAccessArea('SuperAdmin', 'superadmin')).toBe(true);
      });

      it('should deny OrgAdmin access to superadmin area', () => {
        expect(canAccessArea('OrgAdmin', 'superadmin')).toBe(false);
      });

      it('should deny Coordinator access to superadmin area', () => {
        expect(canAccessArea('Coordinator', 'superadmin')).toBe(false);
      });

      it('should deny Viewer access to superadmin area', () => {
        expect(canAccessArea('Viewer', 'superadmin')).toBe(false);
      });

      it('should deny Contractor access to superadmin area', () => {
        expect(canAccessArea('Contractor', 'superadmin')).toBe(false);
      });

      it('should deny Tenant access to superadmin area', () => {
        expect(canAccessArea('Tenant', 'superadmin')).toBe(false);
      });

      it('should deny null role access to superadmin area', () => {
        expect(canAccessArea(null, 'superadmin')).toBe(false);
      });
    });

    describe('admin area', () => {
      it('should allow SuperAdmin to access admin area', () => {
        expect(canAccessArea('SuperAdmin', 'admin')).toBe(true);
      });

      it('should allow OrgAdmin to access admin area', () => {
        expect(canAccessArea('OrgAdmin', 'admin')).toBe(true);
      });

      it('should deny Coordinator access to admin area', () => {
        expect(canAccessArea('Coordinator', 'admin')).toBe(false);
      });

      it('should deny Viewer access to admin area', () => {
        expect(canAccessArea('Viewer', 'admin')).toBe(false);
      });

      it('should deny Contractor access to admin area', () => {
        expect(canAccessArea('Contractor', 'admin')).toBe(false);
      });

      it('should deny Tenant access to admin area', () => {
        expect(canAccessArea('Tenant', 'admin')).toBe(false);
      });

      it('should deny null role access to admin area', () => {
        expect(canAccessArea(null, 'admin')).toBe(false);
      });
    });

    describe('app area', () => {
      it('should allow SuperAdmin to access app area', () => {
        expect(canAccessArea('SuperAdmin', 'app')).toBe(true);
      });

      it('should allow OrgAdmin to access app area', () => {
        expect(canAccessArea('OrgAdmin', 'app')).toBe(true);
      });

      it('should allow Coordinator to access app area', () => {
        expect(canAccessArea('Coordinator', 'app')).toBe(true);
      });

      it('should allow Viewer to access app area', () => {
        expect(canAccessArea('Viewer', 'app')).toBe(true);
      });

      it('should allow Contractor to access app area', () => {
        expect(canAccessArea('Contractor', 'app')).toBe(true);
      });

      it('should allow Tenant to access app area', () => {
        expect(canAccessArea('Tenant', 'app')).toBe(true);
      });

      it('should deny null role access to app area', () => {
        expect(canAccessArea(null, 'app')).toBe(false);
      });
    });
  });
});
