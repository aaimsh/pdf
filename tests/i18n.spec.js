import { test, expect } from '@playwright/test';
import { gotoTool, withLang } from './helpers.js';

test.describe('Internationalization', () => {
  test('tool titles are localized in Arabic by default', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.tool-card h3');
    await expect(cards.nth(0)).toHaveText('دمج ملفات PDF');
    await expect(cards.nth(2)).toHaveText('تنظيم الصفحات');
  });

  test('tool page heading + subtitle localized', async ({ page }) => {
    await gotoTool(page, 'merge');
    await expect(page.locator('.page-head h1')).toHaveText('دمج ملفات PDF');
    await expect(page.locator('.page-head p')).toHaveText('ادمج عدة ملفات PDF في مستند واحد.');
  });

  test('back-link arrow is mirrored under RTL', async ({ page }) => {
    await gotoTool(page, 'merge');
    const transform = await page.locator('.back-link .arrow').evaluate(
      (n) => getComputedStyle(n).transform,
    );
    // scaleX(-1) → matrix(-1, 0, 0, 1, 0, 0)
    expect(transform).toContain('matrix(-1');
  });

  test('English mode renders LTR English strings', async ({ page }) => {
    await withLang(page, 'en');
    await gotoTool(page, 'merge');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('.page-head h1')).toHaveText('Merge PDFs');
    await expect(page.locator('.btn-primary')).toHaveText('Merge & download');
  });
});
