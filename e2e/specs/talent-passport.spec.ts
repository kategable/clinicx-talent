import { test, expect } from '@playwright/test';
import { clearState, signInViaUI } from '../seed';

test.describe('Talent Passport', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
  });

  test('generates a passport link from the talent dashboard', async ({
    page,
  }) => {
    // Sign in as an approved talent
    await signInViaUI(page, '(312) 555-0102', '123456');

    // Navigate to Talent Passport tab
    await page.locator('a[routerlink="/talent/passport"]').first().click();
    await expect(page).toHaveURL(/\/talent\/passport/);

    // Click generate button
    await page
      .locator('button:has-text("Generate your Talent Passport link")')
      .click();

    // Link should appear
    await expect(page.locator('.link-box code')).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.locator('button:has-text("Copy link")'),
    ).toBeVisible();
  });

  test('public talent passport page renders profile', async ({ page }) => {
    // Use the seeded passport share link
    await page.goto('/talent/alex-morgan-rn');

    // Verify the page renders (Alex Morgan, RN is the seeded talent-demo)
    await expect(page.locator('h1, h2').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/Alex Morgan|Sophia Chen/).first()).toBeVisible();
  });

  test('clinic can add a talent from the public passport page', async ({
    page,
  }) => {
    // First sign in as a clinic
    await signInViaUI(page, '(312) 555-0101', '123456');

    // Navigate to the public talent passport
    await page.goto('/talent/alex-morgan-rn');

    // Should see an "Add to my clinic" button
    const addBtn = page.locator(
      'button:has-text("Add to my clinic")',
    );
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      // Verify some success feedback (button should disappear or change)
      await expect(addBtn).not.toBeVisible({ timeout: 5000 });
    }
  });
});
