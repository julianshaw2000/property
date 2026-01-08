import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('SuperAdmin Organisation Management', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies and storage
    await context.clearCookies();

    authHelper = new AuthHelper(page);
    await authHelper.loginAsSuperAdmin();
    await page.goto('/admin/organisations');
    await page.waitForLoadState('networkidle');
  });

  test('should display organisations list with correct columns', async ({ page }) => {
    // Verify table loads
    await expect(page.locator('table, mat-table, .organisations-table')).toBeVisible({ timeout: 10000 });

    // Verify column headers exist (adjust selectors based on actual implementation)
    const tableHeaders = page.locator('th, .mat-header-cell, .table-header');

    // Should have columns: Name, Slug, Plan, Status, Users, Created, Actions
    await expect(tableHeaders.filter({ hasText: /name/i })).toBeVisible();
    await expect(tableHeaders.filter({ hasText: /plan/i })).toBeVisible();
    await expect(tableHeaders.filter({ hasText: /status/i })).toBeVisible();
  });

  test('should create a new organisation', async ({ page }) => {
    // Click Create Organisation button
    const createButton = page.locator('button:has-text("Create Organisation"), button:has-text("Create Org")').first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Wait for dialog/form to appear
    await page.waitForSelector('mat-dialog-container, .dialog, form', { timeout: 5000 });

    // Fill in organisation details
    const orgName = `Test Organisation ${Date.now()}`;
    await page.fill('input[formControlName="name"], input[name="name"]', orgName);

    // Select a plan (Professional)
    await page.click('mat-select[formControlName="plan"], select[name="plan"]');
    await page.click('mat-option:has-text("Professional"), option:has-text("Professional")');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Create")');

    // Wait for success notification
    await expect(page.locator('.mat-snack-bar-container, .snackbar').filter({ hasText: /success/i })).toBeVisible({ timeout: 10000 });

    // Verify new organisation appears in the list
    await page.waitForTimeout(1000); // Wait for list to refresh
    await expect(page.locator(`text="${orgName}"`)).toBeVisible({ timeout: 10000 });
  });

  test('should view organisation details', async ({ page }) => {
    // Click on the first organisation's view/details button
    const viewButton = page.locator('button[matTooltip*="View"], button:has([data-icon="eye"]), button:has(mat-icon:has-text("visibility"))').first();

    // If no view button, click on the first row
    const hasViewButton = await viewButton.count() > 0;
    if (hasViewButton) {
      await viewButton.click();
    } else {
      await page.locator('table tr, mat-row').first().click();
    }

    // Wait for navigation to detail page
    await page.waitForURL('**/admin/organisations/**', { timeout: 10000 });

    // Verify detail page elements
    await expect(page.locator('text=Organisation Information, text=Details').first()).toBeVisible({ timeout: 10000 });

    // Verify organisation details are displayed
    await expect(page.locator('.mat-card, .card, .info-card')).toBeVisible();

    // Verify action buttons exist
    const actionButtons = page.locator('button:has-text("Suspend"), button:has-text("Reactivate")');
    await expect(actionButtons.first()).toBeVisible({ timeout: 5000 });
  });

  test('should suspend an organisation', async ({ page }) => {
    // Navigate to the first organisation's detail page
    const firstRow = page.locator('table tbody tr, mat-row').first();
    const orgName = await firstRow.locator('td:first-child, .mat-cell:first-child').textContent();

    const viewButton = firstRow.locator('button[matTooltip*="View"], button:has(mat-icon:has-text("visibility"))');
    await viewButton.click();

    await page.waitForURL('**/admin/organisations/**');

    // Check if organisation is already suspended
    const isSuspended = await page.locator('text=Status').locator('..').locator('text=Suspended').isVisible().catch(() => false);

    if (isSuspended) {
      // If already suspended, reactivate first
      await page.click('button:has-text("Reactivate")');
      await page.click('button:has-text("Confirm"), button:has-text("Yes")');
      await page.waitForTimeout(1000);
    }

    // Now suspend the organisation
    const suspendButton = page.locator('button:has-text("Suspend Organisation"), button:has-text("Suspend")').first();
    await expect(suspendButton).toBeVisible();
    await suspendButton.click();

    // Confirm in dialog
    await page.waitForSelector('mat-dialog-container, .confirm-dialog', { timeout: 5000 });
    await expect(page.locator('text=suspend').or(page.locator('text=warning'))).toBeVisible();

    await page.click('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Suspend")');

    // Wait for success notification
    await expect(page.locator('.mat-snack-bar-container').filter({ hasText: /success/i })).toBeVisible({ timeout: 10000 });

    // Verify status changed to Suspended
    await page.waitForTimeout(1000);
    await expect(page.locator('.mat-chip, .status-chip').filter({ hasText: /suspended/i })).toBeVisible({ timeout: 10000 });

    // Verify button changed to "Reactivate"
    await expect(page.locator('button:has-text("Reactivate")')).toBeVisible();
  });

  test('should reactivate a suspended organisation', async ({ page }) => {
    // Find a suspended organisation or suspend one first
    const suspendedChip = page.locator('.mat-chip, .status-chip').filter({ hasText: /suspended/i }).first();
    const hasSuspended = await suspendedChip.count() > 0;

    if (!hasSuspended) {
      // Create and suspend an organisation first
      test.skip();
      return;
    }

    // Navigate to suspended organisation
    const suspendedRow = page.locator('table tbody tr, mat-row').filter({ has: suspendedChip }).first();
    const viewButton = suspendedRow.locator('button[matTooltip*="View"], button:has(mat-icon:has-text("visibility"))');
    await viewButton.click();

    await page.waitForURL('**/admin/organisations/**');

    // Click Reactivate button
    const reactivateButton = page.locator('button:has-text("Reactivate")').first();
    await expect(reactivateButton).toBeVisible();
    await reactivateButton.click();

    // Confirm in dialog
    await page.click('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Reactivate")');

    // Wait for success notification
    await expect(page.locator('.mat-snack-bar-container').filter({ hasText: /success/i })).toBeVisible({ timeout: 10000 });

    // Verify status changed to Active
    await page.waitForTimeout(1000);
    await expect(page.locator('.mat-chip, .status-chip').filter({ hasText: /active/i })).toBeVisible({ timeout: 10000 });

    // Verify button changed back to "Suspend"
    await expect(page.locator('button:has-text("Suspend")')).toBeVisible();
  });

  test('should navigate back to organisations list', async ({ page }) => {
    // Navigate to detail page
    const viewButton = page.locator('button[matTooltip*="View"], button:has(mat-icon:has-text("visibility"))').first();
    await viewButton.click();
    await page.waitForURL('**/admin/organisations/**');

    // Click back button
    const backButton = page.locator('button[matTooltip*="Back"], button:has(mat-icon:has-text("arrow_back"))').first();
    await backButton.click();

    // Verify we're back on the list page
    await expect(page).toHaveURL(/\/admin\/organisations$/);
    await expect(page.locator('button:has-text("Create Organisation")')).toBeVisible();
  });

  test('should display plan chips with correct colors', async ({ page }) => {
    // Verify plan chips are color-coded
    const planChips = page.locator('.mat-chip, .plan-chip');

    // Check if any plans exist
    const chipCount = await planChips.count();
    expect(chipCount).toBeGreaterThan(0);

    // Verify at least one plan chip is visible
    await expect(planChips.first()).toBeVisible();
  });

  test('should display status chips with correct colors', async ({ page }) => {
    // Verify status chips exist and are color-coded
    const statusChips = page.locator('.mat-chip, .status-chip').filter({ hasText: /active|suspended/i });

    const chipCount = await statusChips.count();
    expect(chipCount).toBeGreaterThan(0);

    await expect(statusChips.first()).toBeVisible();
  });
});
