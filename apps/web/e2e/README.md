# E2E Tests for MaintainUK SuperAdmin Features

This directory contains end-to-end (E2E) tests for SuperAdmin features using Playwright.

## Test Coverage

The E2E test suite covers all SuperAdmin-exclusive features:

### 1. Authentication & Navigation (`superadmin-auth.spec.ts`)
- ✅ SuperAdmin login with credentials
- ✅ Administration link visibility in sidebar
- ✅ Navigation to admin section
- ✅ Admin sidebar showing all SuperAdmin links (Organisations, Users, Audit Logs)
- ✅ Access to organisations page (SuperAdmin only)

### 2. Organisation Management (`superadmin-organisations.spec.ts`)
- ✅ Display organisations list with correct columns
- ✅ Create new organisation
- ✅ View organisation details
- ✅ Suspend organisation with confirmation dialog
- ✅ Reactivate organisation with confirmation dialog
- ✅ Navigate back to organisations list
- ✅ Plan chips with color coding (Free, Starter, Professional, Enterprise)
- ✅ Status chips with color coding (Active, Suspended)

### 3. Organisation Details (`superadmin-organisation-details.spec.ts`)
- ✅ Display organisation information card
- ✅ Display organisation slug as code
- ✅ Display plan chip with correct color
- ✅ Display status chip with correct color
- ✅ Display created and updated timestamps
- ✅ Display users table for organisation
- ✅ Show empty state when organisation has no users
- ✅ Suspend/reactivate button based on status
- ✅ Confirmation dialogs for suspend/reactivate actions
- ✅ Back button to return to list
- ✅ Handle loading state gracefully

### 4. Audit Log Viewing (`superadmin-audit-logs.spec.ts`)
- ✅ Display audit logs with correct columns
- ✅ Show cross-org indicator for SuperAdmin ("Viewing all organisations")
- ✅ Display recent admin actions
- ✅ Color-coded action chips (Created, Updated, Deleted, etc.)
- ✅ Expand change details when clicked
- ✅ Show audit logs from multiple organisations
- ✅ Display user email for each audit entry
- ✅ Display entity types correctly
- ✅ Show IP addresses for audit entries
- ✅ Filter or search audit logs

### 5. Role-Based Access Control (`superadmin-rbac.spec.ts`)
- ✅ Access to Organisations tab (SuperAdmin only)
- ✅ Access to Users tab
- ✅ Access to Audit Logs tab
- ✅ Create organisations (SuperAdmin only)
- ✅ See all role options when creating users
- ✅ Access all organisations (cross-org access)
- ✅ Administration link in main navigation
- ✅ Suspend and reactivate organisations
- ✅ Display user count for each organisation
- ✅ Manage users across organisations
- ✅ Navigate back to dashboard from admin section

## Running the Tests

### Prerequisites

1. **API must be running** on http://localhost:5000
2. **Web app must be running** on http://localhost:4200 (or will be started automatically)
3. **SuperAdmin user must exist** with credentials:
   - Email: `julianshaw2000@gmail.com`
   - Password: `Gl@ria100`

### Commands

```bash
# Navigate to web app directory
cd apps/web

# Run all E2E tests (headless)
npm run e2e

# Run tests with UI mode (recommended for development)
npm run e2e:ui

# Run tests in headed mode (see browser)
npm run e2e:headed

# Debug tests (pause on each step)
npm run e2e:debug

# View test report after running
npm run e2e:report
```

### Run Specific Test Files

```bash
# Run only authentication tests
npx playwright test superadmin-auth

# Run only organisation management tests
npx playwright test superadmin-organisations

# Run only audit log tests
npx playwright test superadmin-audit-logs

# Run only RBAC tests
npx playwright test superadmin-rbac

# Run only organisation detail tests
npx playwright test superadmin-organisation-details
```

## Test Structure

### Helper Classes

**`helpers/auth.helper.ts`**
- `loginAsSuperAdmin(email, password)` - Login with SuperAdmin credentials
- `logout()` - Logout from the application
- `verifyAuthenticated()` - Verify user is logged in
- `verifySuperAdminRole()` - Verify SuperAdmin role access

### Test Organization

Each test file follows this structure:

```typescript
test.describe('Feature Category', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    // Setup: Login and navigate
    authHelper = new AuthHelper(page);
    await authHelper.loginAsSuperAdmin();
    await page.goto('/admin/...');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await expect(page.locator('...')).toBeVisible();
  });
});
```

## Configuration

**playwright.config.ts** settings:
- **Base URL**: http://localhost:4200
- **Test directory**: `./e2e`
- **Browser**: Chromium (Desktop Chrome)
- **Retries**: 2 retries on CI, 0 on local
- **Screenshots**: Only on failure
- **Trace**: On first retry
- **Reporter**: HTML report

## Troubleshooting

### Tests Failing with Login Errors

1. Verify API is running: `curl http://localhost:5000/health`
2. Verify web app is running: `curl http://localhost:4200`
3. Verify SuperAdmin user exists in database:
```sql
SELECT * FROM "Users" WHERE "Email" = 'julianshaw2000@gmail.com';
```

### Tests Timing Out

- Increase timeout in `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 10000,
  navigationTimeout: 30000,
}
```

### Selector Not Found Errors

- Run tests in headed mode to see what's happening:
```bash
npm run e2e:headed
```
- Use debug mode to pause and inspect:
```bash
npm run e2e:debug
```

### Port Already in Use

- Kill existing processes:
```bash
# Windows
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Angular Live Development Server"

# Linux/Mac
pkill -f "ng serve"
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E Tests
  run: npm run e2e
  working-directory: apps/web

- name: Upload Test Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: apps/web/playwright-report/
```

## Writing New Tests

1. Create a new test file in `e2e/` directory:
```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('New Feature Tests', () => {
  // Your tests here
});
```

2. Follow existing patterns for authentication and navigation
3. Use descriptive test names: `should [action] when [condition]`
4. Add assertions to verify expected behavior
5. Clean up after tests (logout, reset state if needed)

## Best Practices

1. **Use data-testid attributes** in components for stable selectors
2. **Wait for network idle** before interacting with elements
3. **Use explicit waits** instead of arbitrary timeouts
4. **Test user workflows** end-to-end, not just individual actions
5. **Mock external dependencies** (payment gateways, email services)
6. **Clean up test data** after test runs
7. **Run tests in parallel** where possible (use test.describe.parallel)

## Maintenance

- Update selectors when UI components change
- Add new tests when new features are added
- Keep helper functions DRY and reusable
- Review and update test data regularly
- Monitor test execution times and optimize slow tests
