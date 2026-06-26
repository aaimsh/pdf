import { test, expect } from '@playwright/test';
import { makeImage, makeTextFile, gotoTool, withLang, captureDownload, pageCountOfBytes } from './helpers.js';

test.beforeEach(async ({ page }) => { await withLang(page, 'en'); });

test.describe('Images → PDF', () => {
  test('combines two images into a 2-page PDF (fit)', async ({ page }) => {
    await gotoTool(page, 'images');
    const i1 = await makeImage(page, { type: 'image/png' });
    const i2 = await makeImage(page, { type: 'image/jpeg' });
    await page.locator('.dropzone input[type=file]').setInputFiles([i1, i2]);
    await expect(page.locator('.file-item')).toHaveCount(2);
    const { name, bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(name).toBe('images.pdf');
    expect(await pageCountOfBytes(page, bytes)).toBe(2);
  });

  test('respects a fixed page size (A4)', async ({ page }) => {
    await gotoTool(page, 'images');
    const i1 = await makeImage(page);
    await page.locator('.dropzone input[type=file]').setInputFiles([i1]);
    await page.locator('#img-size').selectOption('A4');
    await page.locator('#img-orient').selectOption('portrait');
    const { bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    const size = await page.evaluate(async (arr) => {
      const { PDFDocument } = await import('/js/lib.js');
      const doc = await PDFDocument.load(new Uint8Array(arr));
      const p = doc.getPage(0);
      return { w: Math.round(p.getWidth()), h: Math.round(p.getHeight()) };
    }, Array.from(bytes));
    expect(size.w).toBe(595);
    expect(size.h).toBe(842);
  });

  test('ignores unsupported file types', async ({ page }) => {
    await gotoTool(page, 'images');
    const txt = await makeTextFile();
    await page.locator('.dropzone input[type=file]').setInputFiles([txt]);
    await expect(page.locator('.file-item')).toHaveCount(0);
  });

  test('errors when no images added', async ({ page }) => {
    await gotoTool(page, 'images');
    await page.locator('.btn-primary').click();
    await expect(page.locator('.toast.err')).toBeVisible();
  });
});
