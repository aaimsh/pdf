import { test, expect } from '@playwright/test';

const TOOLS = ['merge', 'split', 'organize', 'images', 'topng', 'resize', 'compress'];

test.describe('Home & navigation', () => {
  test('renders all tool cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tool-card')).toHaveCount(TOOLS.length);
  });

  test('defaults to Arabic + RTL', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    // Toggle offers the *other* language.
    await expect(page.locator('#lang-toggle')).toHaveText('English');
    await expect(page.locator('.hero h1')).toHaveText('صندوق أدوات PDF الخاص بك');
  });

  test('language toggle switches to English and persists', async ({ page }) => {
    await page.goto('/');
    await page.locator('#lang-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#lang-toggle')).toHaveText('العربية');
    await expect(page.locator('.hero h1')).toHaveText('Your private PDF toolkit');
    expect(await page.evaluate(() => localStorage.getItem('pdftk.lang'))).toBe('en');

    // Persisted across reload.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });

  for (const id of TOOLS) {
    test(`navigates into "${id}" and back`, async ({ page }) => {
      await page.goto('/');
      await page.locator(`.tool-card[href="#/${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#/${id}$`));
      await expect(page.locator('.page-head h1')).toBeVisible();
      await expect(page.locator('.dropzone')).toHaveCount(1);
      await page.locator('.back-link').click();
      await expect(page.locator('.hero')).toBeVisible();
    });
  }
});
