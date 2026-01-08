import { test, expect } from '@playwright/test';

test.describe('Guard Behavior', () => {
  test.describe('Unauthenticated access attempts', () => {
    test('should redirect to login when accessing /superadmin without auth', async ({ page }) => {
      await page.goto('http://localhost:4200/superadmin/dashboard');
      await page.waitForURL('**/auth/login');
      expect(page.url()).toContain('/auth/login');
    });

    test('should redirect to login when accessing /admin without auth', async ({ page }) => {
      await page.goto('http://localhost:4200/admin/users');
      await page.waitForURL('**/auth/login');
      expect(page.url()).toContain('/auth/login');
    });

    test('should redirect to login when accessing /app without auth', async ({ page }) => {
      await page.goto('http://localhost:4200/app/dashboard');
      await page.waitForURL('**/auth/login');
      expect(page.url()).toContain('/auth/login');
    });
  });

  test.describe('SuperAdmin access control', () => {
    test.beforeEach(async ({ page }) => {
      // Login as SuperAdmin
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/superadmin/dashboard');
    });

    test('should allow SuperAdmin to access /superadmin area', async ({ page }) => {
      await page.goto('http://localhost:4200/superadmin/dashboard');
      await page.waitForURL('**/superadmin/dashboard');
      expect(page.url()).toContain('/superadmin/dashboard');
      await expect(page.locator('text=Platform Admin')).toBeVisible();
    });

    test('should allow SuperAdmin to access /admin area', async ({ page }) => {
      await page.goto('http://localhost:4200/admin/users');
      await page.waitForURL('**/admin/users');
      expect(page.url()).toContain('/admin/users');
    });

    test('should allow SuperAdmin to access /app area', async ({ page }) => {
      await page.goto('http://localhost:4200/app/dashboard');
      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');
    });
  });

  test.describe('OrgAdmin access control', () => {
    test.skip('should redirect OrgAdmin from /superadmin to /admin/users', async ({ page }) => {
      // Note: This test requires an OrgAdmin test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'orgadmin@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/users');

      // Try to access superadmin area
      await page.goto('http://localhost:4200/superadmin/dashboard');

      // Should be redirected to their home route
      await page.waitForURL('**/admin/users');
      expect(page.url()).toContain('/admin/users');
      expect(page.url()).not.toContain('/superadmin');
    });

    test.skip('should allow OrgAdmin to access /admin area', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'orgadmin@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/users');

      // Navigate to admin area
      await page.goto('http://localhost:4200/admin/users');
      await page.waitForURL('**/admin/users');
      expect(page.url()).toContain('/admin/users');
    });

    test.skip('should allow OrgAdmin to access /app area', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'orgadmin@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/users');

      // Navigate to app area
      await page.goto('http://localhost:4200/app/dashboard');
      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');
    });
  });

  test.describe('Coordinator access control', () => {
    test.skip('should redirect Coordinator from /superadmin to /app/dashboard', async ({ page }) => {
      // Note: This test requires a Coordinator test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'coordinator@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Try to access superadmin area
      await page.goto('http://localhost:4200/superadmin/dashboard');

      // Should be redirected to their home route
      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');
      expect(page.url()).not.toContain('/superadmin');
    });

    test.skip('should redirect Coordinator from /admin to /app/dashboard', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'coordinator@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Try to access admin area
      await page.goto('http://localhost:4200/admin/users');

      // Should be redirected to their home route
      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');
      expect(page.url()).not.toContain('/admin');
    });

    test.skip('should allow Coordinator to access /app area', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'coordinator@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Access app area
      await page.goto('http://localhost:4200/app/dashboard');
      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');
    });
  });

  test.describe('Viewer access control', () => {
    test.skip('should redirect Viewer from /superadmin to /app/dashboard', async ({ page }) => {
      // Note: This test requires a Viewer test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'viewer@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Try to access superadmin area
      await page.goto('http://localhost:4200/superadmin/dashboard');

      // Should be redirected to their home route
      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');
      expect(page.url()).not.toContain('/superadmin');
    });

    test.skip('should redirect Viewer from /admin to /app/dashboard', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'viewer@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Try to access admin area
      await page.goto('http://localhost:4200/admin/users');

      // Should be redirected to their home route
      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');
      expect(page.url()).not.toContain('/admin');
    });

    test.skip('should allow Viewer to access /app area', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'viewer@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Access app area
      await page.goto('http://localhost:4200/app/dashboard');
      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');
    });
  });

  test.describe('Contractor access control', () => {
    test.skip('should redirect Contractor from /superadmin to /app/work-orders', async ({ page }) => {
      // Note: This test requires a Contractor test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'contractor@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/work-orders');

      // Try to access superadmin area
      await page.goto('http://localhost:4200/superadmin/dashboard');

      // Should be redirected to their home route
      await page.waitForURL('**/app/work-orders');
      expect(page.url()).toContain('/app/work-orders');
      expect(page.url()).not.toContain('/superadmin');
    });

    test.skip('should redirect Contractor from /admin to /app/work-orders', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'contractor@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/work-orders');

      // Try to access admin area
      await page.goto('http://localhost:4200/admin/users');

      // Should be redirected to their home route
      await page.waitForURL('**/app/work-orders');
      expect(page.url()).toContain('/app/work-orders');
      expect(page.url()).not.toContain('/admin');
    });

    test.skip('should allow Contractor to access /app area', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'contractor@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/work-orders');

      // Access app area
      await page.goto('http://localhost:4200/app/work-orders');
      await page.waitForURL('**/app/work-orders');
      expect(page.url()).toContain('/app/work-orders');
    });
  });

  test.describe('Tenant access control', () => {
    test.skip('should redirect Tenant from /superadmin to /app/tickets', async ({ page }) => {
      // Note: This test requires a Tenant test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'tenant@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/tickets');

      // Try to access superadmin area
      await page.goto('http://localhost:4200/superadmin/dashboard');

      // Should be redirected to their home route
      await page.waitForURL('**/app/tickets');
      expect(page.url()).toContain('/app/tickets');
      expect(page.url()).not.toContain('/superadmin');
    });

    test.skip('should redirect Tenant from /admin to /app/tickets', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'tenant@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/tickets');

      // Try to access admin area
      await page.goto('http://localhost:4200/admin/users');

      // Should be redirected to their home route
      await page.waitForURL('**/app/tickets');
      expect(page.url()).toContain('/app/tickets');
      expect(page.url()).not.toContain('/admin');
    });

    test.skip('should allow Tenant to access /app area', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'tenant@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/tickets');

      // Access app area
      await page.goto('http://localhost:4200/app/tickets');
      await page.waitForURL('**/app/tickets');
      expect(page.url()).toContain('/app/tickets');
    });
  });

  test.describe('Cross-area navigation', () => {
    test('should maintain authentication state when navigating between areas', async ({ page }) => {
      // Login as SuperAdmin
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/superadmin/dashboard');

      // Navigate to admin
      await page.goto('http://localhost:4200/admin/users');
      await page.waitForURL('**/admin/users');
      expect(page.url()).toContain('/admin/users');

      // Navigate to app
      await page.goto('http://localhost:4200/app/dashboard');
      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');

      // Navigate back to superadmin
      await page.goto('http://localhost:4200/superadmin/dashboard');
      await page.waitForURL('**/superadmin/dashboard');
      expect(page.url()).toContain('/superadmin/dashboard');

      // Verify still authenticated
      await expect(page.locator('text=Platform Admin')).toBeVisible();
    });
  });

  test.describe('Direct URL access', () => {
    test('should handle direct URL access without navigation', async ({ page }) => {
      // Login
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/superadmin/dashboard');

      // Open new tab with direct URL (simulated by goto)
      await page.goto('http://localhost:4200/admin/users');
      await page.waitForURL('**/admin/users');
      expect(page.url()).toContain('/admin/users');

      // Should still be authenticated
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should redirect on direct URL access when not authenticated', async ({ page }) => {
      // Try to access protected route directly without login
      await page.goto('http://localhost:4200/superadmin/dashboard');

      // Should redirect to login
      await page.waitForURL('**/auth/login');
      expect(page.url()).toContain('/auth/login');
    });
  });
});
