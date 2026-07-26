import { test, expect } from '@playwright/test';

test.describe('New account registration', () => {
  test('shows type picker on /register', async ({ page }) => {
    await page.goto('/register');

    // Step 1: type selection
    await expect(page.locator('.type-choice').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=How will you use ClinicX?')).toBeVisible();
  });

  test('navigates to signup step after selecting type', async ({ page }) => {
    await page.goto('/register');

    // Select a type
    await page.locator('button:has-text("joining as talent")').click();

    // Should now be at auth step
    await expect(page.getByText('Sign up for ClinicX')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId('google-signin-button')).toBeVisible();
  });

  test('registers a new talent account via phone', async ({ page }) => {
    await page.goto('/register');

    // Step 1: pick type
    await page.locator('button:has-text("joining as talent")').click();

    // Step 2: choose phone
    await page.locator('button:has-text("Sign up with phone instead")').click();

    // Step 3: enter phone
    await page.waitForSelector('#phone', { timeout: 5000 });
    await page.locator('#phone').fill('(312) 555-0199');
    await page.locator('button:has-text("Send verification code")').click();

    // Step 4: enter code
    await page.waitForSelector('#code', { timeout: 10000 });
    await page.locator('#code').fill('123456');
    await page.locator('button:has-text("Verify and continue")').click();

    // New account should redirect to onboarding
    await page.waitForURL('/onboarding', { timeout: 10000 });
  });

  test('can go back to type selection', async ({ page }) => {
    await page.goto('/register');

    // Pick type, go to auth step
    await page.locator('button:has-text("joining as talent")').click();

    // Click "Change account type" to go back
    await page.locator('button:has-text("Change account type")').click();

    // Should be back at type picker
    await expect(page.locator('text=How will you use ClinicX?')).toBeVisible({
      timeout: 5000,
    });
  });

  test('pre-selected type from /register/clinic goes to auth step', async ({ page }) => {
    await page.goto('/register/clinic');

    // Should skip type picker, go directly to auth step
    await expect(page.getByText('Sign up for ClinicX')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId('google-signin-button')).toBeVisible();
  });
});
