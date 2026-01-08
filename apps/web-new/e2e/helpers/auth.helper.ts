import { Page, expect } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async clearAuth() {
    // Clear all browser storage
    try {
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      // Ignore SecurityError - happens on special pages like about:blank
      console.log('Could not clear storage (page may not be loaded yet)');
    }
  }

  async loginAsSuperAdmin(email: string = 'julianshaw2000@gmail.com', password: string = 'Gl@ria100') {
    // Navigate to login page first (so we have a valid context)
    await this.page.goto('/auth/login');
    await this.page.waitForLoadState('domcontentloaded');

    // Now clear auth state
    await this.clearAuth();

    // Check if already logged in (redirected to dashboard)
    if (this.page.url().includes('/dashboard')) {
      console.log('Already logged in, logging out first...');
      await this.logout();
      await this.page.goto('/auth/login');
      await this.page.waitForLoadState('networkidle');
    }

    // Wait for login form to be ready
    await this.page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });

    // Fill in login form
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await this.page.waitForURL('**/dashboard', { timeout: 15000 });

    // Verify login was successful
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async logout() {
    // Click user menu or logout button
    await this.page.click('[data-testid="user-menu"]', { timeout: 5000 }).catch(() => {
      // Fallback: look for logout button
      this.page.click('button:has-text("Logout")');
    });

    await this.page.click('button:has-text("Logout"), a:has-text("Logout")');
    await this.page.waitForURL('**/auth/login');
  }

  async verifyAuthenticated() {
    // Check for authenticated UI elements (adjust selectors as needed)
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 5000 })
      .catch(() => expect(this.page.locator('text=Dashboard')).toBeVisible());
  }

  async verifySuperAdminRole() {
    // Navigate to admin section to verify SuperAdmin access
    await this.page.goto('/admin/organisations');

    // SuperAdmin should be able to access organisations page
    await expect(this.page).toHaveURL(/\/admin\/organisations/);

    // Verify page loads successfully
    await expect(this.page.locator('h1, h2').filter({ hasText: /organisation/i })).toBeVisible({ timeout: 10000 });
  }
}
