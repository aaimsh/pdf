import { test, expect } from '@playwright/test';
import { makePdf, gotoTool, withLang, captureDownload, pageCountOfBytes } from './helpers.js';

test.beforeEach(async ({ page }) => { await withLang(page, 'en'); });

async function load(page, n = 3) {
  await gotoTool(page, 'compress');
  const f = await makePdf(page, n);
  await page.locator('.dropzone input[type=file]').setInputFiles([f]);
  await expect(page.locator('#cmp-info')).toContainText(`${n} page`);
}

test.describe('Compress', () => {
  test('compresses a PDF, preserving page count, and shows a result', async ({ page }) => {
    await load(page, 3);
    await page.locator('input[value="high"]').check();
    const { name, bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(name).toBe('compressed.pdf');
    expect(await pageCountOfBytes(page, bytes)).toBe(3);
    // A before → after readout appears.
    await expect(page.locator('#cmp-result .result')).toBeVisible();
    await expect(page.locator('#cmp-result')).toContainText('Size:');
  });

  test('each level produces a valid PDF', async ({ page }) => {
    await load(page, 2);
    for (const level of ['low', 'medium', 'high']) {
      await page.locator(`input[value="${level}"]`).check();
      const { bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
      expect(await pageCountOfBytes(page, bytes)).toBe(2);
    }
  });

  test('errors when no file loaded', async ({ page }) => {
    await gotoTool(page, 'compress');
    await page.locator('.btn-primary').click();
    await expect(page.locator('.toast.err')).toBeVisible();
  });
});
