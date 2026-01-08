import { test, expect } from '@playwright/test';

test.describe('Navigation Visibility', () => {
  test.describe('SuperAdmin navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login as SuperAdmin
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/superadmin/dashboard');
    });

    test('should show SuperAdmin area navigation items', async ({ page }) => {
      // Verify SuperAdmin-specific navigation
      await expect(page.locator('text=Platform Admin')).toBeVisible();
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('text=Organisations')).toBeVisible();
      await expect(page.locator('text=Platform Settings')).toBeVisible();
    });

    test('should show links to other areas', async ({ page }) => {
      // SuperAdmin should see links to admin and app areas
      await expect(page.locator('text=Org Admin')).toBeVisible();
      await expect(page.locator('text=App Area')).toBeVisible();
    });

    test('should show role badge in toolbar', async ({ page }) => {
      // Verify role badge is displayed
      await expect(page.locator('.role-badge')).toBeVisible();
      await expect(page.locator('.role-badge')).toContainText('SuperAdmin');
    });

    test('should show user menu with logout', async ({ page }) => {
      // Click user menu
      await page.click('button:has-text("My Account")');

      // Verify logout option
      await expect(page.locator('button:has-text("Logout")')).toBeVisible();
    });

    test('should show all navigation items in app area', async ({ page }) => {
      // Navigate to app area
      await page.click('text=App Area');
      await page.waitForURL('**/app/dashboard');

      // SuperAdmin should see all app navigation items
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('a[href="/app/tickets"]')).toBeVisible();
      await expect(page.locator('a[href="/app/work-orders"]')).toBeVisible();
      await expect(page.locator('a[href="/app/quotes"]')).toBeVisible();
      await expect(page.locator('a[href="/app/invoices"]')).toBeVisible();
    });

    test('should show admin link in app area', async ({ page }) => {
      // Navigate to app area
      await page.click('text=App Area');
      await page.waitForURL('**/app/dashboard');

      // SuperAdmin should see link to admin area
      await expect(page.locator('text=Administration')).toBeVisible();
      await expect(page.locator('text=Platform Admin')).toBeVisible();
    });
  });

  test.describe('OrgAdmin navigation', () => {
    test.skip('should show admin area navigation items', async ({ page }) => {
      // Note: This test requires an OrgAdmin test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'orgadmin@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/users');

      // Verify admin navigation
      await expect(page.locator('text=Users')).toBeVisible();
      await expect(page.locator('text=Audit Logs')).toBeVisible();
    });

    test.skip('should NOT show superadmin link', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'orgadmin@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/users');

      // OrgAdmin should NOT see Platform Admin link
      await expect(page.locator('text=Platform Admin')).not.toBeVisible();
    });

    test.skip('should show link to app area', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'orgadmin@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/users');

      // OrgAdmin should see link to app area
      await expect(page.locator('text=App Area')).toBeVisible();
    });

    test.skip('should show role badge as OrgAdmin', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'orgadmin@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/users');

      // Verify role badge
      await expect(page.locator('.role-badge')).toBeVisible();
      await expect(page.locator('.role-badge')).toContainText('OrgAdmin');
    });
  });

  test.describe('Coordinator navigation', () => {
    test.skip('should show all operational navigation items', async ({ page }) => {
      // Note: This test requires a Coordinator test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'coordinator@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Coordinator should see full operational navigation
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('a[href="/app/tickets"]')).toBeVisible();
      await expect(page.locator('a[href="/app/work-orders"]')).toBeVisible();
      await expect(page.locator('a[href="/app/quotes"]')).toBeVisible();
      await expect(page.locator('a[href="/app/invoices"]')).toBeVisible();
    });

    test.skip('should NOT show admin or superadmin links', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'coordinator@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Coordinator should NOT see admin links
      await expect(page.locator('text=Administration')).not.toBeVisible();
      await expect(page.locator('text=Platform Admin')).not.toBeVisible();
    });

    test.skip('should show role badge as Coordinator', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'coordinator@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Verify role badge
      await expect(page.locator('.role-badge')).toBeVisible();
      await expect(page.locator('.role-badge')).toContainText('Coordinator');
    });
  });

  test.describe('Viewer navigation', () => {
    test.skip('should show read-only navigation items', async ({ page }) => {
      // Note: This test requires a Viewer test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'viewer@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Viewer should see navigation items
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('a[href="/app/tickets"]')).toBeVisible();
      await expect(page.locator('a[href="/app/work-orders"]')).toBeVisible();
      await expect(page.locator('a[href="/app/quotes"]')).toBeVisible();
      await expect(page.locator('a[href="/app/invoices"]')).toBeVisible();
    });

    test.skip('should NOT show admin links', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'viewer@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Viewer should NOT see admin links
      await expect(page.locator('text=Administration')).not.toBeVisible();
      await expect(page.locator('text=Platform Admin')).not.toBeVisible();
    });

    test.skip('should show role badge as Viewer', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'viewer@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/dashboard');

      // Verify role badge
      await expect(page.locator('.role-badge')).toBeVisible();
      await expect(page.locator('.role-badge')).toContainText('Viewer');
    });
  });

  test.describe('Contractor navigation', () => {
    test.skip('should show contractor-specific navigation', async ({ page }) => {
      // Note: This test requires a Contractor test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'contractor@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/work-orders');

      // Contractor should see work orders prominently
      await expect(page.locator('a[href="/app/work-orders"]')).toBeVisible();
    });

    test.skip('should show limited navigation items', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'contractor@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/work-orders');

      // Contractor should see work orders but not quotes/invoices
      await expect(page.locator('a[href="/app/work-orders"]')).toBeVisible();

      // These items should be visible to contractor
      await expect(page.locator('a[href="/app/quotes"]')).not.toBeVisible();
      await expect(page.locator('a[href="/app/invoices"]')).not.toBeVisible();
    });

    test.skip('should NOT show admin links', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'contractor@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/work-orders');

      // Contractor should NOT see admin links
      await expect(page.locator('text=Administration')).not.toBeVisible();
      await expect(page.locator('text=Platform Admin')).not.toBeVisible();
    });

    test.skip('should show role badge as Contractor', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'contractor@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/work-orders');

      // Verify role badge
      await expect(page.locator('.role-badge')).toBeVisible();
      await expect(page.locator('.role-badge')).toContainText('Contractor');
    });
  });

  test.describe('Tenant navigation', () => {
    test.skip('should show tenant-specific navigation', async ({ page }) => {
      // Note: This test requires a Tenant test account
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'tenant@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/tickets');

      // Tenant should see tickets prominently
      await expect(page.locator('a[href="/app/tickets"]')).toBeVisible();
    });

    test.skip('should show minimal navigation items', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'tenant@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/tickets');

      // Tenant should only see tickets
      await expect(page.locator('a[href="/app/tickets"]')).toBeVisible();

      // These items should NOT be visible to tenant
      await expect(page.locator('a[href="/app/work-orders"]')).not.toBeVisible();
      await expect(page.locator('a[href="/app/quotes"]')).not.toBeVisible();
      await expect(page.locator('a[href="/app/invoices"]')).not.toBeVisible();
    });

    test.skip('should NOT show admin links', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'tenant@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/tickets');

      // Tenant should NOT see admin links
      await expect(page.locator('text=Administration')).not.toBeVisible();
      await expect(page.locator('text=Platform Admin')).not.toBeVisible();
    });

    test.skip('should show role badge as Tenant', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'tenant@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app/tickets');

      // Verify role badge
      await expect(page.locator('.role-badge')).toBeVisible();
      await expect(page.locator('.role-badge')).toContainText('Tenant');
    });
  });

  test.describe('Common navigation elements', () => {
    test('should show user menu for all authenticated users', async ({ page }) => {
      // Login as SuperAdmin (can be any role)
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/superadmin/dashboard');

      // All users should have user menu
      await expect(page.locator('button:has-text("My Account")')).toBeVisible();
    });

    test('should show logout button for all authenticated users', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/superadmin/dashboard');

      // Click user menu
      await page.click('button:has-text("My Account")');

      // All users should have logout
      await expect(page.locator('button:has-text("Logout")')).toBeVisible();
    });

    test('should hide all navigation when not authenticated', async ({ page }) => {
      await page.goto('http://localhost:4200/auth/login');

      // No navigation should be visible on login page
      await expect(page.locator('text=Dashboard')).not.toBeVisible();
      await expect(page.locator('text=Administration')).not.toBeVisible();
      await expect(page.locator('text=Platform Admin')).not.toBeVisible();
    });
  });

  test.describe('Conditional navigation visibility', () => {
    test('should toggle navigation items based on permissions', async ({ page }) => {
      // Login as SuperAdmin
      await page.goto('http://localhost:4200/auth/login');
      await page.fill('input[type="email"]', 'julianshaw2000@gmail.com');
      await page.fill('input[type="password"]', 'Gl@ria100');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/superadmin/dashboard');

      // In SuperAdmin area - verify layout
      await expect(page.locator('text=Platform Admin')).toBeVisible();
      await expect(page.locator('text=Organisations')).toBeVisible();

      // Navigate to app area
      await page.click('text=App Area');
      await page.waitForURL('**/app/dashboard');

      // In App area - verify different layout
      await expect(page.locator('a[href="/app/tickets"]')).toBeVisible();
      await expect(page.locator('a[href="/app/work-orders"]')).toBeVisible();

      // Navigate to admin area
      await page.click('text=Administration');
      await page.waitForURL('**/admin/users');

      // In Admin area - verify different layout
      await expect(page.locator('text=Users')).toBeVisible();
      await expect(page.locator('text=Audit Logs')).toBeVisible();
    });
  });
});
