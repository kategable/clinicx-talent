import { test, expect } from '@playwright/test';

test.describe('Google sign-in', () => {
  test('shows Google sign-in button on signin page', async ({ page }) => {
    await page.goto('/signin');

    const googleButton = page.getByTestId('google-signin-button');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toContainText('Sign in with Google');
  });

  test('Google button shows loading state when clicked', async ({ page }) => {
    await page.goto('/signin');

    const googleButton = page.getByTestId('google-signin-button');
    await googleButton.click();

    // The button should switch to loading state
    await expect(googleButton.locator('mat-spinner, .spinner')).toBeVisible({
      timeout: 5000,
    });
  });
});
