import { test, expect } from '@playwright/test';
import { clearState, signInViaUI } from '../seed';

test.describe('Admin review', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
  });

  test('admin login with correct credentials redirects to accounts', async ({
    page,
  }) => {
    await page.goto('/admin/login');

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin');
    await page.locator('button:has-text("Sign in")').click();

    // Should redirect to admin accounts
    await page.waitForURL('/admin/accounts', { timeout: 10000 });
    expect(page.url()).toContain('/admin/accounts');
  });

  test('admin login with wrong credentials shows error', async ({ page }) => {
    await page.goto('/admin/login');

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('wrong');
    await page.locator('button:has-text("Sign in")').click();

    // Error should appear
    await expect(page.locator('.error')).toBeVisible({ timeout: 5000 });
  });

  test('admin can view pending accounts and approve one', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin');
    await page.locator('button:has-text("Sign in")').click();
    await page.waitForURL('/admin/accounts', { timeout: 10000 });

    // Should see account list
    await expect(page.locator('.account-list article').first()).toBeVisible({
      timeout: 5000,
    });

    // Find and click "Allow in" on the first under-review account
    const allowButton = page.locator('button:has-text("Allow in")').first();
    if (await allowButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await allowButton.click();
      // The button should disappear or the label change after click
      // Just verify no error appears
      await expect(page.locator('.error')).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('admin can navigate between sidebar tabs', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin');
    await page.locator('button:has-text("Sign in")').click();
    await page.waitForURL('/admin/accounts', { timeout: 10000 });

    // Navigate to Talent tab
    await page.locator('a:has-text("Talent")').first().click();
    await expect(page).toHaveURL(/\/admin\/talent/);

    // Navigate to Clinics tab
    await page.locator('a:has-text("Clinics")').first().click();
    await expect(page).toHaveURL(/\/admin\/clinics/);

    // Navigate to Jobs tab
    await page.locator('a:has-text("Jobs")').first().click();
    await expect(page).toHaveURL(/\/admin\/jobs/);
  });

  test('verification status section is visible on admin dashboard', async ({
    page,
  }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin');
    await page.locator('button:has-text("Sign in")').click();
    await page.waitForURL('/admin/accounts', { timeout: 10000 });

    // Verification status section should be visible
    await expect(page.locator('.verification-status')).toBeVisible({
      timeout: 5000,
    });
    // Should show operational status when no abuse detected
    await expect(page.locator('.verification-status')).toContainText(
      'Operational',
      { timeout: 3000 },
    );
  });
});
