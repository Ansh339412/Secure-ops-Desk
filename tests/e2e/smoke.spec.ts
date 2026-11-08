import { expect, test } from '@playwright/test';

// These run without a Supabase project: they cover public pages and the auth redirect.
test('landing page explains the product and links to sign-up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('security problem');
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByLabel('Full name')).toBeVisible();
});

test('protected pages send signed-out visitors to the login page', async ({ page }) => {
  for (const path of [
    '/dashboard',
    '/assets',
    '/incidents',
    '/vulnerabilities',
    '/team',
    '/audit',
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
  }
});

test('login page has accessible fields', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
});

test('security headers are set', async ({ request }) => {
  const res = await request.get('/');
  expect(res.headers()['x-frame-options']).toBe('DENY');
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
});
