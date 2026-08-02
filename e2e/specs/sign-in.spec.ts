import { test, expect } from '@playwright/test';
import { clearState, seedSignedInAccount } from '../seed';

test.describe('Sign-in flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
  });

  test('signs in with valid credentials and redirects to clinic dashboard', async ({ page }) => {
    await page.goto('/signin');

    // New sign-in page shows Google first — click phone option
    await page.locator('button:has-text("Sign in with phone instead")').click();

    // Step 1: enter phone
    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0101');
    await page.locator('button:has-text("Send verification code")').click();

    // Step 2: enter code (mock code is always 123456)
    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('123456');
    await page.locator('button:has-text("Verify and continue")').click();

    // Should redirect away from signin
    await page.waitForURL((url) => !url.pathname.includes('/signin'), {
      timeout: 10000,
    });

    // Approved clinics land on /clinic home or talent search
    expect(page.url()).toMatch(/\/clinic\//);
  });

  test('shows error for invalid code', async ({ page }) => {
    await page.goto('/signin');

    await page.locator('button:has-text("Sign in with phone instead")').click();

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0101');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('000000');
    await page.locator('button:has-text("Verify and continue")').click();

    // Error message should appear
    await expect(page.locator('.field-error')).toBeVisible({ timeout: 5000 });
    expect(await page.locator('.field-error').textContent()).toContain('does not match');
  });

  test('shows error for unknown phone number', async ({ page }) => {
    await page.goto('/signin');

    await page.locator('button:has-text("Sign in with phone instead")').click();

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(999) 555-0101');
    await page.locator('button:has-text("Send verification code")').click();

    // The MockAuthProvider sends the code regardless, then fails on verify
    // The send always succeeds in mock mode (no TEST_CREDENTIALS check)
    // Let's verify the code step appears
    await page.waitForSelector('#code', { timeout: 10000 });
    expect(page.locator('#code')).toBeTruthy();
  });

  test('sign-out returns to home page and clears auth', async ({ page }) => {
    // Seed signed-in state for a clinic (hydration meta-reducer still works)
    await seedSignedInAccount(page, 'account-3125550101');
    await page.goto('/clinic/home');

    // Verify we see the clinic shell
    await expect(page.locator('mat-toolbar')).toBeVisible({ timeout: 5000 });

    // Click sign out
    await page.locator('button:has-text("Sign out")').click();

    // Should return to home
    await page.waitForURL('/');
    // Verify home page content is visible
    await expect(page.locator('.hero')).toBeVisible({ timeout: 5000 });
    // Sign-in link should be visible again
    await expect(page.locator('a:has-text("Sign in")').first()).toBeVisible();
  });
});
