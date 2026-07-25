import { test, expect, Page } from '@playwright/test';
import { clearState } from '../seed';

async function startPhoneRegistration(page: Page): Promise<void> {
  await page.goto('/register');
  await page.locator('button:has-text("Sign up with phone instead")').click();
}

test.describe('Registration flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
  });

  test('registers a new talent account', async ({ page }) => {
    await startPhoneRegistration(page);

    // Select talent type
    await page.locator('button:has-text("joining as talent")').click();

    // Enter phone
    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0199');
    await page.locator('button:has-text("Send verification code")').click();

    // Enter mock code
    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('123456');
    await page.locator('button:has-text("Verify and continue")').click();

    // New account redirects to onboarding
    await page.waitForURL('/onboarding', { timeout: 10000 });
    expect(page.url()).toContain('/onboarding');
  });

  test('registers a new clinic account', async ({ page }) => {
    await startPhoneRegistration(page);

    // Select clinic type
    await page.locator('button:has-text("I represent a clinic")').click();

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0199');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('123456');
    await page.locator('button:has-text("Verify and continue")').click();

    await page.waitForURL('/onboarding', { timeout: 10000 });
    expect(page.url()).toContain('/onboarding');
  });

  test('shows type selection when choosing phone registration', async ({
    page,
  }) => {
    await page.goto('/register');

    // Google button visible first
    await expect(page.getByTestId('google-signin-button')).toBeVisible({
      timeout: 5000,
    });

    // Click phone option
    await page.locator('button:has-text("Sign up with phone instead")').click();

    // Type selection should appear
    await expect(page.locator('.type-choice').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('shows error for wrong verification code', async ({ page }) => {
    await startPhoneRegistration(page);

    await page.locator('button:has-text("joining as talent")').click();

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0199');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('000000');
    await page.locator('button:has-text("Verify and continue")').click();

    await expect(page.locator('.field-error')).toBeVisible({ timeout: 5000 });
  });

  test('returns to existing account if phone already registered', async ({
    page,
  }) => {
    await startPhoneRegistration(page);

    // Select talent type
    await page.locator('button:has-text("joining as talent")').click();

    await page.waitForSelector('#phone', { timeout: 5000 });
    // Use a phone that matches a seed account
    await page.locator('#phone').fill('(312) 555-0102');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('123456');
    await page.locator('button:has-text("Verify and continue")').click();

    // Existing account — should redirect to talent area, not onboarding
    await page.waitForURL((url) => url.pathname !== '/register', {
      timeout: 10000,
    });
    expect(page.url()).not.toContain('/onboarding');
  });
});
