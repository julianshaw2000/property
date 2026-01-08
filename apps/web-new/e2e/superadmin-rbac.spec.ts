import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('SuperAdmin Role-Based Access Control', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies and storage
    await context.clearCookies();

    authHelper = new AuthHelper(page);
    await authHelper.loginAsSuperAdmin();
  });

  test('should have access to Organisations tab (SuperAdmin only)', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Verify Organisations link is visible
    const orgsLink = page.locator('a[routerLink*="organisations"], a[href*="organisations"]').filter({ hasText: /organisations/i });
    await expect(orgsLink).toBeVisible({ timeout: 10000 });

    // Click and verify navigation works
    await orgsLink.click();
    await expect(page).toHaveURL(/\/admin\/organisations/);
  });

  test('should have access to Users tab', async ({ page }) => {
    await page.goto('/admin');

    // Verify Users link is visible
    const usersLink = page.locator('a[routerLink*="users"], a[href*="users"]').filter({ hasText: /users/i });
    await expect(usersLink).toBeVisible({ timeout: 10000 });

    // Click and verify navigation works
    await usersLink.click();
    await expect(page).toHaveURL(/\/admin\/users/);
  });

  test('should have access to Audit Logs tab', async ({ page }) => {
    await page.goto('/admin');

    // Verify Audit Logs link is visible
    const auditLink = page.locator('a[routerLink*="audit"], a[href*="audit"]').filter({ hasText: /audit/i });
    await expect(auditLink).toBeVisible({ timeout: 10000 });

    // Click and verify navigation works
    await auditLink.click();
    await expect(page).toHaveURL(/\/admin\/audit/);
  });

  test('should be able to create organisations (SuperAdmin only)', async ({ page }) => {
    await page.goto('/admin/organisations');
    await page.waitForLoadState('networkidle');

    // Verify Create Organisation button exists
    const createButton = page.locator('button:has-text("Create Organisation"), button:has-text("Create Org")');
    await expect(createButton.first()).toBeVisible({ timeout: 10000 });

    // Click to verify dialog opens
    await createButton.first().click();
    await expect(page.locator('mat-dialog-container, form').first()).toBeVisible({ timeout: 5000 });

    // Close dialog
    await page.keyboard.press('Escape');
  });

  test('should see all role options when creating users', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Click Create User button
    const createButton = page.locator('button:has-text("Create User"), button:has-text("Invite User")');
    await createButton.first().click();

    await page.waitForSelector('mat-dialog-container, form', { timeout: 5000 });

    // Open role dropdown
    await page.click('mat-select[formControlName="role"], select[name="role"]');
    await page.waitForTimeout(500);

    // Verify SuperAdmin role is available (SuperAdmin can create other SuperAdmins)
    const options = page.locator('mat-option, option');

    // Should have multiple role options
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(3); // At least Viewer, Coordinator, OrgAdmin, SuperAdmin

    // Close dialog
    await page.keyboard.press('Escape');
  });

  test('should be able to access all organisations (cross-org access)', async ({ page }) => {
    await page.goto('/admin/organisations');
    await page.waitForLoadState('networkidle');

    // Verify organisations table loads
    await expect(page.locator('table, mat-table')).toBeVisible({ timeout: 10000 });

    // SuperAdmin should see organisations (may be multiple or single)
    const rows = page.locator('table tbody tr, mat-row');
    const rowCount = await rows.count();

    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('should see Administration link in main navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify Administration link is visible in sidebar
    const adminLink = page.locator('a[routerLink="/admin"], a[href="/admin"]').filter({ hasText: /administration/i });
    await expect(adminLink).toBeVisible({ timeout: 10000 });
  });

  test('should be able to suspend and reactivate organisations', async ({ page }) => {
    await page.goto('/admin/organisations');
    await page.waitForLoadState('networkidle');

    // Click on first organisation
    const viewButton = page.locator('button:has(mat-icon:has-text("visibility"))').first();
    await viewButton.click();

    await page.waitForURL('**/admin/organisations/**');

    // Verify suspend or reactivate button exists (depending on current state)
    const actionButton = page.locator('button:has-text("Suspend"), button:has-text("Reactivate")').first();
    await expect(actionButton).toBeVisible({ timeout: 10000 });
  });

  test('should display user count for each organisation', async ({ page }) => {
    await page.goto('/admin/organisations');
    await page.waitForLoadState('networkidle');

    // Verify user count column exists
    const userCountCells = page.locator('td, .mat-cell').filter({ hasText: /^\d+$/ });

    // At least one numeric cell should exist (user count)
    const cellCount = await userCountCells.count();
    expect(cellCount).toBeGreaterThan(0);
  });

  test('should be able to manage users across organisations', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // SuperAdmin can manage users
    // Verify user table loads
    await expect(page.locator('table, mat-table')).toBeVisible({ timeout: 10000 });

    // Verify action buttons exist for users
    const roleDropdowns = page.locator('mat-select, select').filter({ hasText: /viewer|coordinator|admin/i });
    const actionButtons = page.locator('button[matTooltip], button mat-icon').filter({ hasText: /block|delete|edit/i });

    // Should have either role dropdowns or action buttons
    const hasControls = await roleDropdowns.count() > 0 || await actionButtons.count() > 0;
    expect(hasControls).toBeTruthy();
  });

  test('should navigate back to dashboard from admin section', async ({ page }) => {
    await page.goto('/admin/users');

    // Click "Back to Dashboard" link
    const backLink = page.locator('a, button').filter({ hasText: /back to dashboard|dashboard/i }).first();
    await backLink.click();

    // Should navigate back to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
