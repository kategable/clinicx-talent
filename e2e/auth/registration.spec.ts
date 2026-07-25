import { test, expect } from '@playwright/test';

test.describe('New account registration', () => {
  test('shows Google button and phone option on /register', async ({
    page,
  }) => {
    await page.goto('/register');

    // Should show Google sign-in button
    await expect(page.getByTestId('google-signin-button')).toBeVisible({
      timeout: 5000,
    });

    // Should show phone option
    await expect(
      page.locator('button:has-text("Sign up with phone instead")'),
    ).toBeVisible();
  });

  test('shows type selection after clicking phone option', async ({
    page,
  }) => {
    await page.goto('/register');

    // Click phone option
    await page.locator('button:has-text("Sign up with phone instead")').click();

    // Type selection should appear
    await expect(page.locator('.type-choice').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('registers a new talent account via phone', async ({ page }) => {
    await page.goto('/register');

    // Click phone option
    await page.locator('button:has-text("Sign up with phone instead")').click();

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

    // New account should redirect to onboarding
    await page.waitForURL('/onboarding', { timeout: 10000 });
  });

  test('can navigate back from type to start', async ({ page }) => {
    await page.goto('/register');

    // Go to phone option → type selection
    await page.locator('button:has-text("Sign up with phone instead")').click();
    await expect(page.locator('.type-choice').first()).toBeVisible({
      timeout: 5000,
    });

    // Go back to choose step
    await page.locator('button:has-text("Back to sign-up options")').click();
    await expect(page.getByTestId('google-signin-button')).toBeVisible({
      timeout: 5000,
    });
  });

  test('can navigate back from phone to type selection', async ({ page }) => {
    await page.goto('/register');

    await page.locator('button:has-text("Sign up with phone instead")').click();
    await page.locator('button:has-text("joining as talent")').click();
    await page.waitForSelector('#phone', { timeout: 5000 });

    // Go back to type
    await page.locator('button:has-text("Change account type")').click();
    await expect(page.locator('.type-choice').first()).toBeVisible({
      timeout: 5000,
    });
  });
});
