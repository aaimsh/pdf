import { test, expect } from '@playwright/test';
import { makePdf, gotoTool, withLang, captureDownload, pageCountOfBytes } from './helpers.js';

test.beforeEach(async ({ page }) => { await withLang(page, 'en'); });

async function load(page, n = 8) {
  await gotoTool(page, 'split');
  const f = await makePdf(page, n);
  await page.locator('.dropzone input[type=file]').setInputFiles([f]);
  await expect(page.locator('#split-info')).toContainText(`${n} page`);
}

test.describe('Split & Extract', () => {
  test('extract a range into one PDF', async ({ page }) => {
    await load(page, 8);
    await page.locator('input[value="extract"]').check();
    await page.locator('#split-range').fill('1-3, 5');
    const { name, bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(name).toBe('extracted.pdf');
    expect(await pageCountOfBytes(page, bytes)).toBe(4);
  });

  test('split each range to its own PDF (zip)', async ({ page }) => {
    await load(page, 8);
    await page.locator('input[value="split"]').check();
    await page.locator('#split-range').fill('1-2, 5-6');
    const { name, bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(name).toBe('split.zip');
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('split every page (zip)', async ({ page }) => {
    await load(page, 3);
    await page.locator('input[value="each"]').check();
    const { name, bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(name).toBe('pages.zip');
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('invalid range shows an error', async ({ page }) => {
    await load(page, 4);
    await page.locator('input[value="extract"]').check();
    await page.locator('#split-range').fill('abc');
    await page.locator('.btn-primary').click();
    await expect(page.locator('.toast.err')).toBeVisible();
  });

  test('errors when no file loaded', async ({ page }) => {
    await gotoTool(page, 'split');
    await page.locator('.btn-primary').click();
    await expect(page.locator('.toast.err')).toBeVisible();
  });
});
