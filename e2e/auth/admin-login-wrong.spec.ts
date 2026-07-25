import { test, expect } from '@playwright/test';

test.describe('Admin login error', () => {
  test('admin login with wrong password shows error', async ({ page }) => {
    await page.goto('/admin/login');

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('wrong');
    await page.locator('button:has-text("Sign in")').click();

    // Error message should appear
    await expect(page.locator('.error')).toBeVisible({ timeout: 5000 });
  });
});
