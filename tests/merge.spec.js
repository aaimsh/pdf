import { test, expect } from '@playwright/test';
import { makePdf, gotoTool, withLang, captureDownload, pageCountOfBytes } from './helpers.js';

test.beforeEach(async ({ page }) => { await withLang(page, 'en'); });

test.describe('Merge', () => {
  test('uploads, reorders, removes, merges', async ({ page }) => {
    await gotoTool(page, 'merge');
    const a = await makePdf(page, 3, 'A');
    const b = await makePdf(page, 2, 'B');
    await page.locator('.dropzone input[type=file]').setInputFiles([a, b]);
    await expect(page.locator('.file-item')).toHaveCount(2);

    // First item is fixture A (3 pages); move it down so B comes first.
    const names = () => page.locator('.file-item .fname').allTextContents();
    const before = await names();
    await page.locator('.file-item').first().getByRole('button', { name: 'Move down' }).click();
    const after = await names();
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[0]);

    // Merge → 3 + 2 = 5 pages.
    const { name, bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(name).toBe('merged.pdf');
    expect(await pageCountOfBytes(page, bytes)).toBe(5);
  });

  test('remove drops an item', async ({ page }) => {
    await gotoTool(page, 'merge');
    const a = await makePdf(page, 1);
    const b = await makePdf(page, 1);
    await page.locator('.dropzone input[type=file]').setInputFiles([a, b]);
    await expect(page.locator('.file-item')).toHaveCount(2);
    await page.locator('.file-item').first().getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator('.file-item')).toHaveCount(1);
  });

  test('errors when fewer than two files', async ({ page }) => {
    await gotoTool(page, 'merge');
    const a = await makePdf(page, 1);
    await page.locator('.dropzone input[type=file]').setInputFiles([a]);
    await page.locator('.btn-primary').click();
    await expect(page.locator('.toast.err')).toBeVisible();
  });
});
