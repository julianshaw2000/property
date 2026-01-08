import { test, expect } from '@playwright/test';

test.describe('Role-Based Routing', () => {
  test.describe('SuperAdmin routing', () => {
    test('should redirect SuperAdmin to /superadmin/dashboard after login', async ({ page }) => {
      // Navigate to login
      await page.goto('http://localhost:4200/auth/login');

      // Fill in SuperAdmin credentials
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to superadmin dashboard
      await page.waitForURL('**/superadmin/dashboard');
      expect(page.url()).toContain('/superadmin/dashboard');

      // Verify SuperAdmin layout is shown
      await expect(page.locator('text=Platform Admin')).toBeVisible();
    });

    test('should show SuperAdmin role badge in toolbar', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');

      await page.waitForURL('**/superadmin/dashboard');

      // Check for role badge
      await expect(page.locator('.role-badge')).toContainText('SuperAdmin');
    });

    test('should allow SuperAdmin to navigate to all areas', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');

      await page.waitForURL('**/superadmin/dashboard');

      // Navigate to admin area
      await page.click('text=Org Admin');
      await page.waitForURL('**/admin/users');
      expect(page.url()).toContain('/admin/users');

      // Navigate back to superadmin
      await page.click('text=Platform Admin');
      await page.waitForURL('**/superadmin/dashboard');

      // Navigate to app area
      await page.click('text=App Area');
      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');
    });
  });

  test.describe('OrgAdmin routing', () => {
    test.skip('should redirect OrgAdmin to /admin/users after login', async ({ page }) => {
      // Note: This test requires an OrgAdmin test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'orgadmin@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');

      await page.waitForURL('**/admin/users');
      expect(page.url()).toContain('/admin/users');
    });
  });

  test.describe('Coordinator routing', () => {
    test.skip('should redirect Coordinator to /app/dashboard after login', async ({ page }) => {
      // Note: This test requires a Coordinator test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'coordinator@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');

      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');
    });
  });

  test.describe('Viewer routing', () => {
    test.skip('should redirect Viewer to /app/dashboard after login', async ({ page }) => {
      // Note: This test requires a Viewer test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'viewer@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');

      await page.waitForURL('**/app/dashboard');
      expect(page.url()).toContain('/app/dashboard');
    });
  });

  test.describe('Root path redirect', () => {
    test('should redirect authenticated SuperAdmin from root to their home', async ({ page }) => {
      // Login first
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/superadmin/dashboard');

      // Navigate to root
      await page.goto('http://localhost:4200/');

      // Should redirect to superadmin dashboard
      await page.waitForURL('**/superadmin/dashboard');
      expect(page.url()).toContain('/superadmin/dashboard');
    });

    test('should redirect unauthenticated user from root to login', async ({ page }) => {
      await page.goto('http://localhost:4200/');
      await page.waitForURL('**/auth/login');
      expect(page.url()).toContain('/auth/login');
    });
  });

  test.describe('Logout flow', () => {
    test('should redirect to login after logout', async ({ page }) => {
      // Login first
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/superadmin/dashboard');

      // Click logout
      await page.click('button:has-text("My Account")');
      await page.click('button:has-text("Logout")');

      // Should redirect to login
      await page.waitForURL('**/auth/login');
      expect(page.url()).toContain('/auth/login');
    });

    test('should clear authentication state after logout', async ({ page }) => {
      // Login
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/superadmin/dashboard');

      // Logout
      await page.click('button:has-text("My Account")');
      await page.click('button:has-text("Logout")');
      await page.waitForURL('**/auth/login');

      // Try to access protected route
      await page.goto('http://localhost:4200/superadmin/dashboard');

      // Should redirect back to login
      await page.waitForURL('**/auth/login');
      expect(page.url()).toContain('/auth/login');
    });
  });
});
