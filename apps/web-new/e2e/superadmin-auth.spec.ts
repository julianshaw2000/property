import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('SuperAdmin Authentication & Navigation', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies and storage
    await context.clearCookies();

    authHelper = new AuthHelper(page);
  });

  test('should successfully login as SuperAdmin', async ({ page }) => {
    await authHelper.loginAsSuperAdmin();

    // Verify we're on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify user is authenticated
    await authHelper.verifyAuthenticated();
  });

  test('should show Administration link in sidebar for SuperAdmin', async ({ page }) => {
    await authHelper.loginAsSuperAdmin();

    // Look for Administration link in the sidebar
    const adminLink = page.locator('a[routerLink="/admin"], a[href="/admin"]').first();
    await expect(adminLink).toBeVisible({ timeout: 10000 });
    await expect(adminLink).toContainText(/administration/i);
  });

  test('should navigate to admin section and show all admin links', async ({ page }) => {
    await authHelper.loginAsSuperAdmin();

    // Click Administration link
    await page.click('a[routerLink="/admin"], a[href="/admin"]');

    // Should redirect to /admin/users (default route)
    await page.waitForURL('**/admin/**', { timeout: 10000 });

    // Verify admin sidebar shows all SuperAdmin links
    await expect(page.locator('text=Organisations')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('text=Audit Logs')).toBeVisible();
    await expect(page.locator('text=Back to Dashboard')).toBeVisible();
  });

  test('should access organisations page (SuperAdmin only)', async ({ page }) => {
    await authHelper.loginAsSuperAdmin();

    // Verify SuperAdmin can access organisations
    await authHelper.verifySuperAdminRole();

    // Verify organisations list loads
    await expect(page.locator('h1, h2').filter({ hasText: /organisation/i })).toBeVisible();
  });
});
