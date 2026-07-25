import { Page } from '@playwright/test';

/**
 * Seed localStorage so the hydration meta-reducer restores `activeAccountId`
 * on the next page load. The account must exist in `SEEDED_ACCOUNTS`
 * (src/app/core/account.ts) — the hydration layer always resets accounts to
 * seeds, so only seed-account IDs survive a reload.
 *
 * Seed account IDs:
 *   account-3125550101  Radiance Med Clinic (approved clinic)
 *   account-3125550102  Sophia Chen, RN (approved talent)
 *   clinic-approved     Lux Aesthetics Lounge (approved clinic)
 *   clinic-demo         Lumen Aesthetics (under-review clinic)
 *   talent-demo         Alex Morgan, RN (on-hold talent)
 *
 * Test credentials (phone → code):
 *   (312) 555-0101 → 246810
 *   (312) 555-0102 → 135790
 *   (312) 555-0199 → 112233
 *   (773) 555-0142 → 445566
 *   (847) 555-0168 → 778899
 *   (312) 555-0200 → 998877
 */

/** Navigate to the app origin then clear all ClinicX state from storage. */
export async function clearState(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('clinicx.state.v1');
    sessionStorage.removeItem('clinicx.review-reminders');
    sessionStorage.removeItem('clinicx.guest-theme');
  });
}

/** Navigate to the app origin then seed signed-in state for a seed account. */
export async function seedSignedInAccount(
  page: Page,
  activeAccountId: string,
): Promise<void> {
  await page.goto('/');
  await page.evaluate((id) => {
    // Provide a minimal state that survives the hydration meta-reducer.
    // accounts must be a non-undefined object so Object.values() doesn't throw.
    localStorage.setItem(
      'clinicx.state.v1',
      JSON.stringify({
        activeAccountId: id,
        accounts: {},
        registration: { phone: '', step: 'type', isSignIn: false, accountCreated: false },
        hiring: { opportunities: [], invites: [], passportShares: [], applications: [] },
      }),
    );
  }, activeAccountId);
}

/**
 * Sign in via the UI by navigating through the sign-in form.
 * Returns once the page has redirected away from /signin.
 */
export async function signInViaUI(
  page: Page,
  phone: string,
  code: string,
): Promise<void> {
  await page.goto('/signin');

  // New sign-in page shows Google first — click phone option
  await page.locator('button:has-text("Sign in with phone instead")').click();

  await page.waitForSelector('#phone');

  // Enter phone
  await page.locator('#phone').fill(phone);
  await page
    .locator('button:has-text("Send verification code")')
    .click();

  // Wait for code step
  await page.waitForSelector('#code', { timeout: 10000 });
  await page.locator('#code').fill(code);
  await page
    .locator('button:has-text("Verify and continue")')
    .click();

  // Wait for navigation away from sign-in
  await page.waitForURL((url) => !url.pathname.includes('/signin'), {
    timeout: 10000,
  });
}
