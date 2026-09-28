/**
 * End-to-end test of the main journey (§40).
 *
 * This needs a running application and a real database — it is not part of
 * `npm test`, which is the unit suite. To run it:
 *
 *   npm run db:up
 *   npm run setup            # generate, push schema, seed
 *   npm run dev              # in another terminal
 *   npx playwright install   # once, to fetch browsers
 *   npm run test:e2e
 */
import { test, expect } from '@playwright/test';

const unique = Date.now();
const email = `e2e+${unique}@demo.doorkey.app`;
const password = 'OpenDoors2026!';

test.describe('signup through to a first message', () => {
  test('a founder can sign up, onboard, discover, connect and be replied to', async ({ page, browser }) => {
    // --- signup -----------------------------------------------------------
    await page.goto('/signup');
    await page.getByLabel('Building a company').check();
    await page.getByLabel('Your name').fill('E2E Founder');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create profile' }).click();

    await expect(page).toHaveURL(/\/onboarding/);

    // --- onboarding -------------------------------------------------------
    await page.getByLabel('I am building a company').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('Your name').fill('E2E Founder');
    await page.getByLabel('Headline').fill('Founder at Testworks');
    await page.getByLabel('Short bio').fill('Building tooling for automated testing of financial systems.');
    await page.getByLabel('Where are you based?').selectOption({ label: /London/ });
    await page.getByRole('button', { name: 'Save and continue' }).click();

    await page.getByLabel('Startup name').fill('Testworks');
    await page.getByLabel('One line on what you do').fill('Automated reconciliation testing for payment systems');
    await page.getByLabel('Industry').selectOption({ label: 'Financial services' });
    await page.getByLabel('Payments').check();
    await page.getByLabel('Where is the company based?').selectOption({ label: /London/ });
    await page.getByLabel('Stage').selectOption('SEED');
    await page.getByRole('button', { name: 'Save and continue' }).click();

    await page.getByLabel('Amount you are seeking').fill('800000');
    await page.getByRole('button', { name: 'Save and continue' }).click();

    await page.getByRole('button', { name: 'Save and continue' }).click(); // traction is optional

    await page.getByLabel('Funding').check();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Finish and see my matches' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('relevant to you');

    // --- discovery, with the reasoning shown ------------------------------
    await page.getByRole('link', { name: 'Discover' }).first().click();
    await expect(page).toHaveURL(/\/discover/);
    await expect(page.getByText('Why this may be relevant').first()).toBeVisible();

    // A seeded investor whose remit covers this company.
    await page.getByRole('link', { name: 'Amelia Whitcombe' }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Amelia Whitcombe');

    // --- connection request ------------------------------------------------
    await page.getByRole('button', { name: 'Connect' }).first().click();
    await expect(page.getByText('Request sent')).toBeVisible();

    // --- the other side accepts -------------------------------------------
    const investorContext = await browser.newContext();
    const investorPage = await investorContext.newPage();
    await investorPage.goto('/login');
    await investorPage.getByLabel('Email').fill('amelia.whitcombe@demo.doorkey.app');
    await investorPage.getByLabel('Password').fill('OpenDoors2026!');
    await investorPage.getByRole('button', { name: 'Sign in' }).click();

    await investorPage.goto('/connections');
    await investorPage.getByRole('button', { name: 'Accept' }).first().click();
    await expect(investorPage.getByText('Connected')).toBeVisible();

    // --- messaging ---------------------------------------------------------
    await investorPage.goto('/messages');
    await investorPage.getByRole('link').filter({ hasText: 'E2E Founder' }).first().click();
    await investorPage.getByLabel('Your message').fill('Read your profile. What does the round look like?');
    await investorPage.getByRole('button', { name: 'Send' }).click();
    await expect(investorPage.getByText('What does the round look like?')).toBeVisible();

    await page.goto('/messages');
    await expect(page.getByText('What does the round look like?')).toBeVisible();

    await investorContext.close();
  });

  test('messaging is refused between people who are not connected', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('amara.okonjo@demo.doorkey.app');
    await page.getByLabel('Password').fill('OpenDoors2026!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // A conversation id that belongs to somebody else must not open.
    await page.goto('/messages/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/not found|could not be found/i)).toBeVisible();
  });

  test('the admin panel is closed to ordinary accounts', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('amara.okonjo@demo.doorkey.app');
    await page.getByLabel('Password').fill('OpenDoors2026!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    const response = await page.goto('/admin');
    expect(response?.status()).toBeGreaterThanOrEqual(400);
  });
});
