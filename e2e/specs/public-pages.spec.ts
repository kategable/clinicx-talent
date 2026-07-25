import { test, expect } from '@playwright/test';
import { clearState } from '../seed';

test.describe('Public pages (unauthenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
  });

  test('home page renders hero and talent cards', async ({ page }) => {
    await page.goto('/');

    // Hero section
    await expect(page.locator('.hero')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.hero h1')).toContainText('Exceptional clinics');

    // Talent cards
    await expect(page.locator('.talent-card').first()).toBeVisible();

    // CTA buttons visible for unauthenticated users
    await expect(
      page.locator('a:has-text("Register your clinic")').first(),
    ).toBeVisible();
  });

  test('founders page renders', async ({ page }) => {
    await page.goto('/founders');

    await expect(page.locator('h1, h2').first()).toBeVisible({
      timeout: 5000,
    });
    // Should mention Founder 1000 Club or similar
    await expect(page.locator('body')).toContainText(/Founder/i);
  });

  test('public talent passport renders profile', async ({ page }) => {
    await page.goto('/talent/alex-morgan-rn');

    // Should show a talent profile
    await expect(page.locator('h1, h2').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('public clinic profile renders', async ({ page }) => {
    // The seeded clinic "Radiance Med Clinic" has slug "radiance-med-clinic"
    await page.goto('/c/radiance-med-clinic');

    await expect(page.locator('h1, h2').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/Radiance|clinic/i).first()).toBeVisible();
  });

  test('hiring opportunity page renders', async ({ page }) => {
    await page.goto('/join/lux-aesthetics-lounge/aesthetic-np');

    await expect(page.locator('h1, h2').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/Aesthetic NP/i).first()).toBeVisible();
  });

  test('sign-in page renders Google sign-in button', async ({ page }) => {
    await page.goto('/signin');

    // New sign-in page shows Google button prominently
    await expect(page.getByTestId('google-signin-button')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText('Sign in with Google')).toBeVisible();
  });

  test('contact page renders with mailto CTA', async ({ page }) => {
    await page.goto('/contact');

    await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/review your access|help with your account/i).first()).toBeVisible();
  });
});
