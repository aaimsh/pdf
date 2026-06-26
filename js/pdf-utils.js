// Pure-ish async helpers wrapping pdf-lib and pdf.js. No DOM dependencies so
// these can be unit-tested in isolation. All functions take/return bytes
// (Uint8Array / ArrayBuffer) or simple structures.

import { PDFDocument, degrees, pdfjsLib } from './lib.js';

/** Standard page sizes in PDF points (1pt = 1/72 inch). */
export const PAGE_SIZES = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
  A3: [841.89, 1190.55],
};

const toBytes = async (file) =>
  file instanceof ArrayBuffer ? file
  : file instanceof Uint8Array ? file
  : await file.arrayBuffer();

const load = async (file) =>
  PDFDocument.load(await toBytes(file), { ignoreEncryption: true });

/** Number of pages in a PDF. */
export async function pageCount(file) {
  return (await load(file)).getPageCount();
}

/**
 * Merge several PDFs into one, in the given order.
 * @param {Array<File|ArrayBuffer|Uint8Array>} files
 * @returns {Promise<Uint8Array>}
 */
export async function mergePdfs(files) {
  if (!files || files.length < 1) throw new Error('Add at least one PDF to merge.');
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await load(f);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

/**
 * Extract a set of pages (0-indexed) into a new single PDF, preserving the
 * order given in `indices`.
 */
export async function extractPages(file, indices) {
  const src = await load(file);
  const total = src.getPageCount();
  const valid = indices.filter((i) => i >= 0 && i < total);
  if (valid.length === 0) throw new Error('No valid pages selected.');
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, valid);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

/**
 * Split a PDF into one new PDF per range.
 * @param {Array<{name:string, indices:number[]}>} ranges
 * @returns {Promise<Array<{name:string, bytes:Uint8Array}>>}
 */
export async function splitRanges(file, ranges) {
  const src = await load(file);
  const total = src.getPageCount();
  const results = [];
  for (const range of ranges) {
    const valid = range.indices.filter((i) => i >= 0 && i < total);
    if (valid.length === 0) continue;
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, valid);
    pages.forEach((p) => out.addPage(p));
    results.push({ name: range.name, bytes: await out.save() });
  }
  if (results.length === 0) throw new Error('No valid pages in the given ranges.');
  return results;
}

/** Split into N separate PDFs, one per page. */
export async function splitEachPage(file, baseName = 'page') {
  const src = await load(file);
  const total = src.getPageCount();
  const pad = String(total).length;
  const ranges = [];
  for (let i = 0; i < total; i++) {
    ranges.push({ name: `${baseName}-${String(i + 1).padStart(pad, '0')}.pdf`, indices: [i] });
  }
  return splitRanges(file, ranges);
}

/**
 * Rebuild a PDF from an explicit ordering of pages, applying per-page rotation.
 * Used by the Organize tool.
 * @param {Array<{index:number, rotate:number}>} order  source page index + extra rotation (deg)
 */
export async function rebuildPages(file, order) {
  if (!order || order.length === 0) throw new Error('The document would have no pages.');
  const src = await load(file);
  const out = await PDFDocument.create();
  const indices = order.map((o) => o.index);
  const pages = await out.copyPages(src, indices);
  pages.forEach((p, i) => {
    const extra = order[i].rotate || 0;
    if (extra) {
      const base = p.getRotation().angle || 0;
      p.setRotation(degrees((base + extra) % 360));
    }
    out.addPage(p);
  });
  return out.save();
}

/**
 * Convert image files (JPG/PNG) into a PDF, one image per page.
 * @param {File[]} imageFiles
 * @param {object} opts  { pageSize: 'fit'|'A4'|'Letter'..., margin: number, orientation:'auto'|'portrait'|'landscape' }
 */
export async function imagesToPdf(imageFiles, opts = {}) {
  const { pageSize = 'fit', margin = 0, orientation = 'auto' } = opts;
  if (!imageFiles || imageFiles.length === 0) throw new Error('Add at least one image.');
  const out = await PDFDocument.create();

  for (const file of imageFiles) {
    const bytes = await toBytes(file);
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    let img;
    if (type.includes('png') || name.endsWith('.png')) {
      img = await out.embedPng(bytes);
    } else if (type.includes('jpg') || type.includes('jpeg') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
      img = await out.embedJpg(bytes);
    } else {
      throw new Error(`Unsupported image type: ${file.name || type}. Use JPG or PNG.`);
    }

    if (pageSize === 'fit') {
      const page = out.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    } else {
      let [pw, ph] = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
      const landscape = orientation === 'landscape' || (orientation === 'auto' && img.width > img.height);
      if (landscape) [pw, ph] = [ph, pw];
      const page = out.addPage([pw, ph]);
      const avW = pw - margin * 2;
      const avH = ph - margin * 2;
      const scale = Math.min(avW / img.width, avH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    }
  }
  return out.save();
}

/**
 * Render each page of a PDF to a raster image using pdf.js.
 * @param {object} opts  { scale: number, type:'image/png'|'image/jpeg', quality: number }
 * @returns {Promise<Array<{name:string, blob:Blob}>>}
 */
export async function pdfToImages(file, opts = {}) {
  const { scale = 2, type = 'image/png', quality = 0.92, baseName = 'page' } = opts;
  const data = new Uint8Array(await toBytes(file));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pad = String(pdf.numPages).length;
  const ext = type === 'image/jpeg' ? 'jpg' : 'png';
  const results = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (type === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise((res) => canvas.toBlob(res, type, quality));
      results.push({ name: `${baseName}-${String(n).padStart(pad, '0')}.${ext}`, blob });
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }
  return results;
}

// Compression levels: a target render scale (1 = 72dpi) and JPEG quality.
export const COMPRESS_LEVELS = {
  low:    { scale: 2.0, quality: 0.75 }, // light compression, higher quality
  medium: { scale: 1.5, quality: 0.6 },  // balanced
  high:   { scale: 1.0, quality: 0.5 },  // strongest compression, smallest file
};

/**
 * Compress a PDF by rasterizing each page (pdf.js) and re-encoding it as JPEG
 * (pdf-lib). Most effective for scanned / image-heavy PDFs. Note: pages become
 * images, so selectable text is lost — this is the standard client-side method.
 * @param {object} opts  { level: 'low'|'medium'|'high' }
 * @returns {Promise<Uint8Array>}
 */
export async function compressPdf(file, opts = {}) {
  const { scale, quality } = COMPRESS_LEVELS[opts.level] || COMPRESS_LEVELS.medium;
  const data = new Uint8Array(await toBytes(file));
  const src = await pdfjsLib.getDocument({ data }).promise;
  const out = await PDFDocument.create();
  try {
    for (let n = 1; n <= src.numPages; n++) {
      const page = await src.getPage(n);
      const ptViewport = page.getViewport({ scale: 1 });   // page size in PDF points
      const viewport = page.getViewport({ scale });        // raster resolution
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
      const jpg = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      const outPage = out.addPage([ptViewport.width, ptViewport.height]);
      outPage.drawImage(jpg, { x: 0, y: 0, width: ptViewport.width, height: ptViewport.height });
      page.cleanup();
    }
  } finally {
    await src.destroy();
  }
  return out.save();
}

/**
 * Resize/scale every page.
 * @param {object} opts  { mode:'preset'|'scale', preset:'A4'..., orientation, scale:number }
 */
export async function resizePages(file, opts = {}) {
  const { mode = 'preset', preset = 'A4', orientation = 'portrait', scale = 1 } = opts;
  const doc = await load(file);
  const pages = doc.getPages();

  if (mode === 'scale') {
    const f = Number(scale);
    if (!(f > 0) || f === 1) {
      if (f === 1) return doc.save();
      throw new Error('Enter a scale factor greater than 0.');
    }
    pages.forEach((p) => p.scale(f, f));
    return doc.save();
  }

  // preset: fit existing content into the target page box, centered.
  let [tw, th] = PAGE_SIZES[preset] || PAGE_SIZES.A4;
  pages.forEach((p) => {
    const cw = p.getWidth();
    const ch = p.getHeight();
    const portraitContent = ch >= cw;
    let [pw, ph] = [tw, th];
    const wantLandscape = orientation === 'landscape' || (orientation === 'auto' && !portraitContent);
    if (wantLandscape) [pw, ph] = [th, tw];
    const factor = Math.min(pw / cw, ph / ch);
    p.scaleContent(factor, factor);
    const newW = cw * factor;
    const newH = ch * factor;
    p.setSize(pw, ph);
    // center content: translate by adjusting the page's content via scale origin
    // pdf-lib scaleContent scales from origin (0,0); translate using translateContent.
    p.translateContent((pw - newW) / 2, (ph - newH) / 2);
  });
  return doc.save();
}

/** Render a single PDF page to a canvas (used for organize thumbnails). */
export async function renderThumb(pdfProxy, pageNum, targetWidth = 150) {
  const page = await pdfProxy.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  const scale = targetWidth / base.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return canvas;
}

/** Open a PDF with pdf.js (caller destroys it). */
export async function openWithPdfjs(file) {
  const data = new Uint8Array(await toBytes(file));
  return pdfjsLib.getDocument({ data }).promise;
}
