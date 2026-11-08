import { expect, test } from '@playwright/test';

// Full user journey. Needs a real Supabase project with the migration applied and a confirmed
// test user, so it only runs when E2E_EMAIL and E2E_PASSWORD are set:
//   E2E_EMAIL=you@example.com E2E_PASSWORD=... npm run test:e2e
test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD');

test('sign in, add an asset, record a vulnerability and report an incident', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);

  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_EMAIL!);
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // First sign-in has no organization yet.
  if (page.url().includes('/onboarding')) {
    await page.getByLabel('Organization name').fill(`E2E Org ${suffix}`);
    await page.getByRole('button', { name: 'Create organization' }).click();
  }
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/assets/new');
  await page.getByLabel('Name').fill(`E2E server ${suffix}`);
  await page.getByRole('button', { name: 'Create asset' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`E2E server ${suffix}`);

  await page.goto('/vulnerabilities/new');
  await page.getByLabel('Title').fill(`E2E vulnerability ${suffix}`);
  await page.getByLabel('Affected asset').selectOption({ label: `E2E server ${suffix}` });
  await page.getByLabel('Severity').selectOption('high');
  await page.getByRole('button', { name: 'Record vulnerability' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`E2E vulnerability ${suffix}`);

  await page.goto('/incidents/new');
  await page.getByLabel('What happened?').fill(`E2E incident ${suffix}`);
  await page.getByRole('button', { name: 'Report incident' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`E2E incident ${suffix}`);
});
