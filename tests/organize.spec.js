import { test, expect } from '@playwright/test';
import { makePdf, gotoTool, withLang, captureDownload, pageCountOfBytes } from './helpers.js';

test.beforeEach(async ({ page }) => { await withLang(page, 'en'); });

async function load(page, n = 4) {
  await gotoTool(page, 'organize');
  const f = await makePdf(page, n);
  await page.locator('.dropzone input[type=file]').setInputFiles([f]);
  await expect(page.locator('.thumb')).toHaveCount(n);
  return f;
}

test.describe('Organize', () => {
  test('renders a thumbnail per page', async ({ page }) => {
    await load(page, 4);
    await expect(page.locator('.thumb canvas')).toHaveCount(4);
    // Position inputs default to 1..N.
    await expect(page.locator('.thumb .pos-input').first()).toHaveValue('1');
  });

  test('type-a-position reorders pages', async ({ page }) => {
    await load(page, 4);
    const captions = () => page.locator('.thumb .pno').allTextContents();
    expect(await captions()).toEqual(['Page 1', 'Page 2', 'Page 3', 'Page 4']);
    // Move page 1 to position 3.
    await page.locator('.thumb').first().locator('.pos-input').fill('3');
    await page.locator('.thumb').first().locator('.pos-input').dispatchEvent('change');
    expect(await captions()).toEqual(['Page 2', 'Page 3', 'Page 1', 'Page 4']);
    // Position inputs renumber to DOM order.
    await expect(page.locator('.thumb .pos-input').first()).toHaveValue('1');
  });

  test('move buttons reorder pages', async ({ page }) => {
    await load(page, 3);
    const captions = () => page.locator('.thumb .pno').allTextContents();
    await page.locator('.thumb').first().getByRole('button', { name: 'Move down' }).click();
    expect(await captions()).toEqual(['Page 2', 'Page 1', 'Page 3']);
  });

  test('rotate updates the thumbnail', async ({ page }) => {
    await load(page, 1);
    await page.locator('.thumb').first().getByRole('button', { name: 'Rotate right' }).click();
    const transform = await page.locator('.thumb canvas').first().evaluate((n) => n.style.transform);
    expect(transform).toContain('rotate(90deg)');
  });

  test('delete excludes a page from the output', async ({ page }) => {
    await load(page, 4);
    await page.locator('.thumb').first().getByRole('button', { name: 'Delete / restore' }).click();
    await expect(page.locator('.thumb').first()).toHaveClass(/removed/);
    const { bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(await pageCountOfBytes(page, bytes)).toBe(3);
  });

  test('rebuild keeps all pages by default', async ({ page }) => {
    await load(page, 4);
    const { name, bytes } = await captureDownload(page, () => page.locator('.btn-primary').click());
    expect(name).toBe('organized.pdf');
    expect(await pageCountOfBytes(page, bytes)).toBe(4);
  });

  test('errors when every page is deleted', async ({ page }) => {
    await load(page, 2);
    for (const btn of await page.locator('.thumb').getByRole('button', { name: 'Delete / restore' }).all()) {
      await btn.click();
    }
    await page.locator('.btn-primary').click();
    await expect(page.locator('.toast.err')).toBeVisible();
  });
});
