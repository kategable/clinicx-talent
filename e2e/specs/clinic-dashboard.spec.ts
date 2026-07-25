import { test, expect } from '@playwright/test';
import { clearState, signInViaUI } from '../seed';

test.describe('Clinic dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
    await signInViaUI(page, '(312) 555-0101', '246810');
  });

  test('renders sidenav with all navigation tabs', async ({ page }) => {
    // Should be on a clinic page after sign-in
    await expect(page.locator('mat-sidenav-container')).toBeVisible({
      timeout: 5000,
    });

    // Verify nav links in the sidenav
    const sidenav = page.locator('mat-sidenav');
    await expect(sidenav.locator('a:has-text("Home")')).toBeVisible();
    await expect(sidenav.locator('a:has-text("Talent search")')).toBeVisible();
    await expect(
      sidenav.locator('a:has-text("Create hiring link")'),
    ).toBeVisible();
    await expect(sidenav.locator('a:has-text("Appearance")')).toBeVisible();
    await expect(
      sidenav.locator('a:has-text("Account status")'),
    ).toBeVisible();
  });

  test('shows toolbar with clinic name and sign-out', async ({ page }) => {
    const toolbar = page.locator('mat-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Toolbar should show the clinic name
    await expect(toolbar.locator('.toolbar-clinic')).toBeVisible();

    // Sign out button should be visible
    await expect(
      toolbar.locator('button:has-text("Sign out")'),
    ).toBeVisible();
  });

  test('navigates between tabs via sidenav links', async ({ page }) => {
    // Navigate to Talent search
    await page.locator('a[routerlink="/clinic/talents"]').first().click();
    await expect(page).toHaveURL(/\/clinic\/talents/);

    // Navigate to Appearance
    await page.locator('a[routerlink="/clinic/appearance"]').first().click();
    await expect(page).toHaveURL(/\/clinic\/appearance/);

    // Navigate to Account status
    await page.locator('a[routerlink="/clinic/status"]').first().click();
    await expect(page).toHaveURL(/\/clinic\/status/);

    // Back to Home
    await page.locator('a[routerlink="/clinic/home"]').first().click();
    await expect(page).toHaveURL(/\/clinic\/home/);
  });

  test('hamburger menu toggles sidenav on mobile viewport', async ({
    page,
  }) => {
    // Set to mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    // On mobile, sidenav should be in 'over' mode (not persistent)
    const menuBtn = page.locator('button[aria-label="Toggle navigation"]');
    await expect(menuBtn).toBeVisible();

    // Click to open
    await menuBtn.click();

    // Sidenav overlay should be visible
    await expect(page.locator('mat-sidenav')).toBeVisible();
  });
});
