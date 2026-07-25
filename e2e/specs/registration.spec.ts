import { test, expect } from '@playwright/test';
import { clearState } from '../seed';

test.describe('Registration flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
  });

  test('registers a new talent account with test credentials', async ({
    page,
  }) => {
    await page.goto('/register?type=talent');

    // Step 1: account type should be pre-selected via query param — phone step
    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0199');
    await page.locator('button:has-text("Send verification code")').click();

    // Step 2: enter code
    await page.waitForSelector('#code', { timeout: 5000 });
    await page.locator('#code').fill('112233');
    await page.locator('button:has-text("Verify and continue")').click();

    // New account redirects to onboarding
    await page.waitForURL('/onboarding', { timeout: 10000 });
    expect(page.url()).toContain('/onboarding');
  });

  test('registers a new clinic account', async ({ page }) => {
    await page.goto('/register?type=clinic');

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0199');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 5000 });
    await page.locator('#code').fill('112233');
    await page.locator('button:has-text("Verify and continue")').click();

    await page.waitForURL('/onboarding', { timeout: 10000 });
    expect(page.url()).toContain('/onboarding');
  });

  test('shows type selection when no type is in URL', async ({ page }) => {
    await page.goto('/register');

    // Should show type selection step (two type-choice buttons)
    await expect(page.locator('.type-choice').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.locator('button:has-text("I represent a clinic")'),
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("joining as talent")'),
    ).toBeVisible();
  });

  test('shows error for wrong verification code', async ({ page }) => {
    await page.goto('/register?type=talent');

    await page.locator('#phone').fill('(312) 555-0199');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 5000 });
    await page.locator('#code').fill('000000');
    await page.locator('button:has-text("Verify and continue")').click();

    await expect(page.locator('.field-error')).toBeVisible({ timeout: 5000 });
    expect(await page.locator('.field-error').textContent()).toContain(
      'does not match',
    );
  });

  test('returns to existing account if phone already registered', async ({
    page,
  }) => {
    // Use an already-seeded phone number
    await page.goto('/register?type=talent');

    await page.locator('#phone').fill('(312) 555-0102');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 5000 });
    await page.locator('#code').fill('135790');
    await page.locator('button:has-text("Verify and continue")').click();

    // Existing account — should redirect to talent area, not onboarding
    await page.waitForURL((url) => url.pathname !== '/register', {
      timeout: 10000,
    });
    expect(page.url()).not.toContain('/onboarding');
  });
});
