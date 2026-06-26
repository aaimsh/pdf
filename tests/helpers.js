// Shared test helpers. Fixtures are generated *in the browser* using the app's
// own vendored libraries (so tests need no network and exercise the real code
// paths), then written to a temp file for setInputFiles().

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let counter = 0;
async function tmpFile(ext, bytes) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdftk-'));
  const file = path.join(dir, `fixture-${counter++}.${ext}`);
  await fs.writeFile(file, Buffer.from(bytes));
  return file;
}

/** Create an N-page PDF on disk; returns its path. */
export async function makePdf(page, n, label = 'P') {
  const bytes = await page.evaluate(async ({ n, label }) => {
    const { PDFDocument } = await import('/js/lib.js');
    const doc = await PDFDocument.create();
    for (let i = 0; i < n; i++) {
      const p = doc.addPage([300, 400]);
      p.drawText(`${label}${i + 1}`, { x: 20, y: 360, size: 18 });
    }
    return Array.from(await doc.save());
  }, { n, label });
  return tmpFile('pdf', bytes);
}

/** Create a PNG (or JPEG via type) image on disk; returns its path. */
export async function makeImage(page, { w = 120, h = 80, type = 'image/png' } = {}) {
  const bytes = await page.evaluate(async ({ w, h, type }) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#3344ff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.fillRect(10, 10, 30, 30);
    const blob = await new Promise((r) => c.toBlob(r, type));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, { w, h, type });
  return tmpFile(type === 'image/jpeg' ? 'jpg' : 'png', bytes);
}

/** Create a non-image, non-pdf file (for negative tests). */
export async function makeTextFile() {
  return tmpFile('txt', new TextEncoder().encode('not a pdf'));
}

/** Count pages of a downloaded PDF (Buffer/Uint8Array) using the page's pdf-lib. */
export async function pageCountOfBytes(page, bytes) {
  return page.evaluate(async (arr) => {
    const { PDFDocument } = await import('/js/lib.js');
    const doc = await PDFDocument.load(new Uint8Array(arr));
    return doc.getPageCount();
  }, Array.from(bytes));
}

/** Read a Playwright download into a Uint8Array. */
export async function downloadBytes(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return new Uint8Array(Buffer.concat(chunks));
}

/** Run `action`, capture the resulting download, return { download, bytes }. */
export async function captureDownload(page, action, timeout = 15_000) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout }),
    action(),
  ]);
  const bytes = await downloadBytes(download);
  return { download, name: download.suggestedFilename(), bytes };
}

/** Navigate to a tool route and wait for its heading. */
export async function gotoTool(page, id) {
  await page.goto(`/#/${id}`);
  await page.locator('.page-head h1').first().waitFor();
}

/** Set the UI language before the app boots (so default-Arabic tests are deterministic). */
export async function withLang(page, lang) {
  await page.addInitScript((l) => {
    try { localStorage.setItem('pdftk.lang', l); } catch {}
  }, lang);
}
