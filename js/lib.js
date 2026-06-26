// Single place that pulls in third-party libraries. They are vendored under
// /vendor (not loaded from a CDN) so the app is fully self-contained, works
// offline, has no runtime third-party dependency, and loads fast.
//
//   pdf-lib  1.17.1  — create/modify PDFs            (MIT)
//   pdf.js   4.7.76  — render pages to canvas/images (Apache-2.0)
//   fflate   0.8.2   — zip multi-file outputs        (MIT)
//
// To update a library, replace the file in /vendor and bump the note above.
// Paths are resolved relative to THIS module via import.meta.url so they work
// no matter what base path the site is served from (e.g. /pdf/ on GitHub Pages).

export { PDFDocument, degrees, rgb } from '../vendor/pdf-lib.esm.min.js';
export { zipSync, strToU8 } from '../vendor/fflate.esm.js';

import * as pdfjsLib from '../vendor/pdfjs/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

export { pdfjsLib };
