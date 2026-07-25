import { test, expect } from '@playwright/test';
import { clearState, signInViaUI } from '../seed';

test.describe('Hiring links', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
    await signInViaUI(page, '(312) 555-0101', '123456');
  });

  test('creates a new hiring opportunity and shows success page', async ({
    page,
  }) => {
    // Navigate to Create hiring link
    await page.locator('a[routerlink="/clinic/opportunities/new"]').first().click();
    await expect(page).toHaveURL(/\/clinic\/opportunities\/new/);

    // Fill in the form
    const positionInput = page.locator('input[placeholder="RN Injector"]');
    await positionInput.fill('Lead Aesthetic RN');

    const locationInput = page.locator('input[placeholder*="River North" i]');
    await locationInput.fill('Wicker Park, Chicago, IL');

    const payInput = page.locator('input[placeholder*="$85" i]');
    await payInput.fill('$95,000–$120,000');

    // Select urgency
    await page.locator('select').selectOption('Within 30 days');

    // Fill hiring brief fields
    const skillsInput = page.locator(
      'textarea[placeholder*="Injectables" i]',
    );
    await skillsInput.fill('Injectables, laser, PRP, patient education');

    const benefitsInput = page.locator(
      'textarea[placeholder*="Health insurance" i]',
    );
    await benefitsInput.fill('Health, dental, 401k, CE allowance');

    const idealHireInput = page.locator(
      'textarea[placeholder*="Warm" i]',
    );
    await idealHireInput.fill(
      'Experienced RN with a passion for natural results and client education.',
    );

    // Submit
    await page.locator('button:has-text("Generate hiring link")').click();

    // Should show success page with generated link
    await expect(page.locator('.success-card')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.generated-link')).toBeVisible();
    await expect(page.locator('button:has-text("Copy link")')).toBeVisible();
  });

  test('public hiring page renders the opportunity', async ({ page }) => {
    // Use the seeded hiring link
    await page.goto('/join/lux-aesthetics-lounge/aesthetic-np');

    // Verify public page content
    await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Aesthetic NP')).toBeVisible();
    await expect(page.getByText('Lux Aesthetics Lounge')).toBeVisible();
  });

  test('displays the hiring link CTA for talent visitors', async ({ page }) => {
    await page.goto('/join/lux-aesthetics-lounge/aesthetic-np');

    // Should have a CTA for talent to apply
    await expect(
      page.locator('a:has-text("Apply"), button:has-text("Apply"), a:has-text("Sign in")'),
    ).toBeVisible({ timeout: 5000 });
  });
});
