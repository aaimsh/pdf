import { test, expect } from '@playwright/test';
import { makePdf, gotoTool, withLang, captureDownload } from './helpers.js';

test.beforeEach(async ({ page }) => { await withLang(page, 'en'); });

async function load(page, n = 2) {
  await gotoTool(page, 'resize');
  const f = await makePdf(page, n);
  await page.locator('.dropzone input[type=file]').setInputFiles([f]);
  await expect(page.locator('#rs-info')).toContainText(`${n} page`);
}

async function firstPageSize(page, bytes) {
  return page.evaluate(async (arr) => {
    const { PDFDocument } = await import('/js/lib.js');
    const doc = await PDFDocument.load(new Uint8Array(arr));
    const p = doc.getPage(0);
    return { w: Math.round(p.getWidth()), h: Math.round(p.getHeight()) };
  }, Array.from(bytes));
}

test.describe('Resize', () => {
  test('scale by 0.5 halves the page (300x400 → 150x200)', async ({ page }) => {
    await load(page);
    await page.locator('input[value="scale"]').check();
    await page.locator('#rs-scale').fill('0.5');
    const { name, bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(name).toBe('resized.pdf');
    expect(await firstPageSize(page, bytes)).toEqual({ w: 150, h: 200 });
  });

  test('preset A4 fits pages to ~595x842', async ({ page }) => {
    await load(page);
    await page.locator('input[value="preset"]').check();
    await page.locator('#rs-preset').selectOption('A4');
    await page.locator('#rs-orient').selectOption('portrait');
    const { bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    const { w, h } = await firstPageSize(page, bytes);
    expect(Math.abs(w - 595)).toBeLessThanOrEqual(2);
    expect(Math.abs(h - 842)).toBeLessThanOrEqual(2);
  });

  test('invalid scale factor shows an error', async ({ page }) => {
    await load(page);
    await page.locator('input[value="scale"]').check();
    await page.locator('#rs-scale').fill('0');
    await page.locator('.btn-primary').click();
    await expect(page.locator('.toast.err')).toBeVisible();
  });
});
