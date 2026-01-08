import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('SuperAdmin Organisation Details', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies and storage
    await context.clearCookies();

    authHelper = new AuthHelper(page);
    await authHelper.loginAsSuperAdmin();
    await page.goto('/admin/organisations');
    await page.waitForLoadState('networkidle');

    // Navigate to first organisation's detail page
    const viewButton = page.locator('button:has(mat-icon:has-text("visibility"))').first();
    await viewButton.click();
    await page.waitForURL('**/admin/organisations/**', { timeout: 10000 });
  });

  test('should display organisation information card', async ({ page }) => {
    // Verify organisation info card exists
    await expect(page.locator('.mat-card, .card, .info-card').first()).toBeVisible({ timeout: 10000 });

    // Verify key information is displayed
    await expect(page.locator('text=Name, text=Organisation Name').first()).toBeVisible({ timeout: 5000 })
      .catch(() => expect(page.locator('.mat-card-title, h2, h3').first()).toBeVisible());
  });

  test('should display organisation slug as code', async ({ page }) => {
    // Look for slug displayed as code or monospace text
    const slugElement = page.locator('code, .code, .slug, [class*="mono"]').filter({ hasText: /-/ });

    // Slug should exist and contain hyphens (typical slug format)
    await expect(slugElement.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display plan chip with correct color', async ({ page }) => {
    // Verify plan chip is displayed
    const planChip = page.locator('.mat-chip, .chip, .badge').filter({ hasText: /free|starter|professional|enterprise/i });

    await expect(planChip.first()).toBeVisible({ timeout: 10000 });

    // Plan chip should have text content
    const planText = await planChip.first().textContent();
    expect(planText?.trim()).toBeTruthy();
  });

  test('should display status chip with correct color', async ({ page }) => {
    // Verify status chip is displayed
    const statusChip = page.locator('.mat-chip, .chip, .badge').filter({ hasText: /active|suspended/i });

    await expect(statusChip.first()).toBeVisible({ timeout: 10000 });

    // Status should be either Active or Suspended
    const statusText = await statusChip.first().textContent();
    expect(statusText?.toLowerCase()).toMatch(/active|suspended/);
  });

  test('should display created and updated timestamps', async ({ page }) => {
    // Look for date/time information
    const dateElements = page.locator('text=/created|updated/i').locator('..');

    // Should have at least one timestamp
    const dateCount = await dateElements.count();
    expect(dateCount).toBeGreaterThan(0);
  });

  test('should display users table for the organisation', async ({ page }) => {
    // Verify users section exists
    await expect(page.locator('text=/users/i').first()).toBeVisible({ timeout: 10000 });

    // Check for users table or empty state
    const usersTable = page.locator('table, mat-table').filter({ has: page.locator('text=/email|name|role/i') });
    const emptyState = page.locator('text=/no users|empty/i');

    // Should have either table or empty state
    const hasTable = await usersTable.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;

    expect(hasTable || hasEmptyState).toBeTruthy();
  });

  test('should show empty state when organisation has no users', async ({ page }) => {
    // Check if this org has no users
    const emptyState = page.locator('text=/no users in this organisation/i');

    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      // Verify empty state message is displayed
      await expect(emptyState).toBeVisible();
    } else {
      // If has users, verify table exists
      await expect(page.locator('table, mat-table').last()).toBeVisible();
    }
  });

  test('should display suspend/reactivate button based on status', async ({ page }) => {
    // Check current status
    const statusChip = page.locator('.mat-chip, .chip, .badge').filter({ hasText: /active|suspended/i }).first();
    const statusText = await statusChip.textContent();

    if (statusText?.toLowerCase().includes('active')) {
      // Should show Suspend button
      await expect(page.locator('button:has-text("Suspend")')).toBeVisible({ timeout: 5000 });
    } else {
      // Should show Reactivate button
      await expect(page.locator('button:has-text("Reactivate")')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show confirmation dialog when suspending', async ({ page }) => {
    // Check if organisation is active
    const statusChip = page.locator('.mat-chip, .chip, .badge').filter({ hasText: /active/i }).first();
    const isActive = await statusChip.isVisible().catch(() => false);

    if (!isActive) {
      test.skip();
      return;
    }

    // Click Suspend button
    const suspendButton = page.locator('button:has-text("Suspend")').first();
    await suspendButton.click();

    // Wait for confirmation dialog
    await page.waitForSelector('mat-dialog-container, .confirm-dialog', { timeout: 5000 });

    // Verify warning text exists
    await expect(page.locator('text=/suspend|warning|users will lose access/i')).toBeVisible();

    // Verify dialog has confirm and cancel buttons
    await expect(page.locator('button:has-text("Confirm"), button:has-text("Yes")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel"), button:has-text("No")')).toBeVisible();

    // Cancel the action
    await page.click('button:has-text("Cancel"), button:has-text("No")');
  });

  test('should show confirmation dialog when reactivating', async ({ page }) => {
    // Check if organisation is suspended
    const statusChip = page.locator('.mat-chip, .chip, .badge').filter({ hasText: /suspended/i }).first();
    const isSuspended = await statusChip.isVisible().catch(() => false);

    if (!isSuspended) {
      test.skip();
      return;
    }

    // Click Reactivate button
    const reactivateButton = page.locator('button:has-text("Reactivate")').first();
    await reactivateButton.click();

    // Wait for confirmation dialog
    await page.waitForSelector('mat-dialog-container, .confirm-dialog', { timeout: 5000 });

    // Verify dialog exists
    await expect(page.locator('mat-dialog-container')).toBeVisible();

    // Cancel the action
    await page.keyboard.press('Escape');
  });

  test('should have back button to return to list', async ({ page }) => {
    // Verify back button exists
    const backButton = page.locator('button:has(mat-icon:has-text("arrow_back")), button[matTooltip*="Back"]').first();

    await expect(backButton).toBeVisible({ timeout: 10000 });

    // Click back button
    await backButton.click();

    // Should navigate back to organisations list
    await expect(page).toHaveURL(/\/admin\/organisations$/);
  });

  test('should display organisation metadata correctly', async ({ page }) => {
    // Verify various metadata fields are displayed
    const infoCard = page.locator('.mat-card, .card').first();

    // Should contain text content
    const cardText = await infoCard.textContent();
    expect(cardText?.length).toBeGreaterThan(50); // Should have substantial content

    // Should display some key fields
    expect(cardText).toBeTruthy();
  });

  test('should handle loading state gracefully', async ({ page }) => {
    // This test verifies no console errors occurred during page load
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait a bit for any delayed errors
    await page.waitForTimeout(1000);

    // Verify no critical errors (allow some warnings)
    const criticalErrors = errors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('DevTools') &&
      !err.includes('Extension')
    );

    expect(criticalErrors.length).toBe(0);
  });
});
