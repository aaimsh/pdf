import { test, expect } from '@playwright/test';
import { makePdf, makeImage, gotoTool, withLang } from './helpers.js';

// These specs run only in the "mobile" project (iPhone 13 viewport, touch).
test.describe('@mobile', () => {
  test.beforeEach(async ({ page }) => { await withLang(page, 'en'); });

  const noHorizontalOverflow = async (page) =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

  test('home has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tool-card')).toHaveCount(6);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('split tool inputs do not overflow the viewport', async ({ page }) => {
    await gotoTool(page, 'split');
    const f = await makePdf(page, 3);
    await page.locator('.dropzone input[type=file]').setInputFiles([f]);
    await expect(page.locator('#split-info')).toContainText('3 page');
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('organize page grid fits the viewport', async ({ page }) => {
    await gotoTool(page, 'organize');
    const f = await makePdf(page, 4);
    await page.locator('.dropzone input[type=file]').setInputFiles([f]);
    await expect(page.locator('.thumb')).toHaveCount(4);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('reorder works via move buttons (no drag needed)', async ({ page }) => {
    await gotoTool(page, 'images');
    const i1 = await makeImage(page);
    const i2 = await makeImage(page);
    await page.locator('.dropzone input[type=file]').setInputFiles([i1, i2]);
    await expect(page.locator('.file-item')).toHaveCount(2);
    const before = await page.locator('.file-item .fname').allTextContents();
    await page.locator('.file-item').first().getByRole('button', { name: 'Move down' }).tap();
    const after = await page.locator('.file-item .fname').allTextContents();
    expect(after[0]).toBe(before[1]);
  });

  test('dropzone opens a file chooser on tap', async ({ page }) => {
    await gotoTool(page, 'merge');
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('.dropzone').tap(),
    ]);
    expect(chooser).toBeTruthy();
  });
});
