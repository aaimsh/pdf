import { test, expect } from '@playwright/test';
import { makePdf, gotoTool, withLang, captureDownload } from './helpers.js';

test.beforeEach(async ({ page }) => { await withLang(page, 'en'); });

async function load(page, n) {
  await gotoTool(page, 'topng');
  const f = await makePdf(page, n);
  await page.locator('.dropzone input[type=file]').setInputFiles([f]);
  await expect(page.locator('#png-info')).toContainText(`${n} page`);
}

test.describe('PDF → Images', () => {
  test('single page exports one PNG (not zipped)', async ({ page }) => {
    await load(page, 1);
    const { name, bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(name).toMatch(/\.png$/);
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('multiple pages export a ZIP', async ({ page }) => {
    await load(page, 3);
    const { name, bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(name).toBe('images.zip');
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('JPG format option produces a .jpg', async ({ page }) => {
    await load(page, 1);
    await page.locator('#png-fmt').selectOption('image/jpeg');
    const { name } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(name).toMatch(/\.jpg$/);
  });

  test('errors when no file loaded', async ({ page }) => {
    await gotoTool(page, 'topng');
    await page.locator('.btn-primary').click();
    await expect(page.locator('.toast.err')).toBeVisible();
  });
});
