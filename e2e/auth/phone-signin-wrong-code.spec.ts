import { test, expect } from '@playwright/test';

test.describe('Phone sign-in error handling', () => {
  test('shows error for wrong verification code', async ({ page }) => {
    await page.goto('/signin');

    await page.locator('button:has-text("Sign in with phone instead")').click();

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0101');
    await page.locator('button:has-text("Send verification code")').click();

    // Enter wrong code
    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('000000');
    await page.locator('button:has-text("Verify and continue")').click();

    // Error message should appear
    await expect(page.locator('.field-error')).toBeVisible({ timeout: 5000 });
  });

  test('allows retry after wrong code', async ({ page }) => {
    await page.goto('/signin');

    await page.locator('button:has-text("Sign in with phone instead")').click();

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0101');
    await page.locator('button:has-text("Send verification code")').click();

    // First attempt — wrong code
    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('000000');
    await page.locator('button:has-text("Verify and continue")').click();
    await expect(page.locator('.field-error')).toBeVisible({ timeout: 5000 });

    // Clear and retry with correct mock code
    await page.locator('#code').fill('');
    await page.locator('#code').fill('123456');
    await page.locator('button:has-text("Verify and continue")').click();

    // Should succeed on second try
    await page.waitForURL((url) => !url.pathname.includes('/signin'), {
      timeout: 10000,
    });
  });
});
