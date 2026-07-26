import { test, expect } from '@playwright/test';

test.describe('Google sign-in', () => {
  test('shows Google sign-in button on signin page', async ({ page }) => {
    await page.goto('/signin');

    const googleButton = page.getByTestId('google-signin-button');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toContainText('Sign in with Google');
  });

  test('mock Google button stays visible after click', async ({ page }) => {
    await page.goto('/signin');

    const googleButton = page.getByTestId('google-signin-button');
    await googleButton.click();

    // In mock mode the button remains visible (no real loading spinner)
    await expect(googleButton).toBeVisible({ timeout: 5000 });
  });
});
