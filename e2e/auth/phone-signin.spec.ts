import { test, expect } from '@playwright/test';

test.describe('Phone sign-in', () => {
  test('shows phone option when "Sign in with phone" is clicked', async ({
    page,
  }) => {
    await page.goto('/signin');

    await page.locator('button:has-text("Sign in with phone instead")').click();

    // Phone input should appear
    await expect(page.locator('#phone')).toBeVisible({ timeout: 5000 });
  });

  test('completes phone sign-in flow with valid code', async ({ page }) => {
    await page.goto('/signin');

    // Click through to phone option
    await page.locator('button:has-text("Sign in with phone instead")').click();

    // Wait for phone input
    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0101');
    await page.locator('button:has-text("Send verification code")').click();

    // Wait for code input (mock code is always 123456)
    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('123456');
    await page.locator('button:has-text("Verify and continue")').click();

    // Should redirect to clinic dashboard (account-3125550101 is an approved clinic)
    await page.waitForURL((url) => !url.pathname.includes('/signin'), {
      timeout: 10000,
    });
    expect(page.url()).toMatch(/\/clinic\//);
  });
});
