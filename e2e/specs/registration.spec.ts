import { test, expect } from '@playwright/test';
import { clearState } from '../seed';

async function startPhoneFlow(page: any): Promise<void> {
  await page.goto('/register');
  // Select talent type
  await page.locator('button:has-text("joining as talent")').click();
  // Click phone option
  await page.locator('button:has-text("Sign up with phone instead")').click();
}

test.describe('Registration flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
  });

  test('registers a new talent account', async ({ page }) => {
    await startPhoneFlow(page);

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0199');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('123456');
    await page.locator('button:has-text("Verify and continue")').click();

    await page.waitForURL('/onboarding', { timeout: 10000 });
    expect(page.url()).toContain('/onboarding');
  });

  test('registers a new clinic account', async ({ page }) => {
    await page.goto('/register');
    await page.locator('button:has-text("I represent a clinic")').click();
    await page.locator('button:has-text("Sign up with phone instead")').click();

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0199');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('123456');
    await page.locator('button:has-text("Verify and continue")').click();

    await page.waitForURL('/onboarding', { timeout: 10000 });
  });

  test('shows type selection on /register', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('.type-choice').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=How will you use ClinicX?')).toBeVisible();
  });

  test('shows error for wrong verification code', async ({ page }) => {
    await startPhoneFlow(page);

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0199');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('000000');
    await page.locator('button:has-text("Verify and continue")').click();

    await expect(page.locator('.field-error')).toBeVisible({ timeout: 5000 });
  });

  test('returns to existing account if phone already registered', async ({ page }) => {
    await startPhoneFlow(page);

    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0102');
    await page.locator('button:has-text("Send verification code")').click();

    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('123456');
    await page.locator('button:has-text("Verify and continue")').click();

    await page.waitForURL((url) => url.pathname !== '/register', {
      timeout: 10000,
    });
    expect(page.url()).not.toContain('/onboarding');
  });
});
