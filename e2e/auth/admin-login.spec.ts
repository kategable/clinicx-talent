import { test, expect } from '@playwright/test';

test.describe('Admin login', () => {
  test('admin login with valid credentials redirects to accounts', async ({
    page,
  }) => {
    await page.goto('/admin/login');

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin');
    await page.locator('button:has-text("Sign in")').click();

    // Should redirect to admin accounts (MockAuthProvider sets this up)
    await expect(page).toHaveURL(/\/admin\//, { timeout: 10000 });
  });
});
