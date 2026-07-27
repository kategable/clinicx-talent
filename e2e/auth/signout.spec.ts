import { test, expect } from '@playwright/test';

test.describe('Sign out', () => {
  test('sign out clears session and returns to home', async ({ page }) => {
    // Sign in via phone first
    await page.goto('/signin');
    await page.locator('button:has-text("Sign in with phone instead")').click();

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0101');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('123456');
    await page.locator('button:has-text("Verify and continue")').click();

    // Wait for redirect to clinic dashboard
    await page.waitForURL((url) => !url.pathname.includes('/signin'), {
      timeout: 10000,
    });

    // Click sign out in the toolbar
    await page.locator('button:has-text("Sign out")').click();

    // Should return to home
    await page.waitForURL('/');
    await expect(page.locator('.hero')).toBeVisible({ timeout: 5000 });
  });

  test('protected route redirects to sign-in when not authenticated', async ({ page }) => {
    await page.goto('/clinic/home');
    // Should redirect to sign-in since not authenticated
    await expect(page).toHaveURL(/\/signin/, { timeout: 10000 });
  });
});
