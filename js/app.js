// Hash router + per-tool view controllers.

import {
  el, toast, withBusy, downloadBlob, dropzone, parsePageRanges,
  makeSortable, fmtBytes,
} from './ui.js';
import {
  mergePdfs, extractPages, splitRanges, splitEachPage, rebuildPages,
  imagesToPdf, pdfToImages, resizePages, pageCount, openWithPdfjs, renderThumb,
  PAGE_SIZES,
} from './pdf-utils.js';
import { zipSync } from './lib.js';

const PDF_ACCEPT = 'application/pdf,.pdf';
const IMG_ACCEPT = 'image/png,image/jpeg,.png,.jpg,.jpeg';

const TOOLS = [
  { id: 'merge',    icon: '🧩', title: 'Merge PDFs',     blurb: 'Combine several PDFs into one. Drag to reorder.' },
  { id: 'split',    icon: '✂️', title: 'Split & Extract', blurb: 'Pull out page ranges or split into separate files.' },
  { id: 'organize', icon: '🗂️', title: 'Organize Pages',  blurb: 'Delete, reorder and rotate individual pages.' },
  { id: 'images',   icon: '🖼️', title: 'Images → PDF',    blurb: 'Turn JPG/PNG images into a PDF document.' },
  { id: 'topng',    icon: '📸', title: 'PDF → Images',    blurb: 'Render every page to a PNG or JPG image.' },
  { id: 'resize',   icon: '📐', title: 'Resize Pages',    blurb: 'Scale pages or fit them to A4, Letter, Legal…' },
];

const view = () => document.getElementById('view');

function clear() { view().replaceChildren(); }

function pageHead(title, subtitle) {
  return el('div', { class: 'page-head' }, [
    el('a', { class: 'back-link', href: '#/' }, ['← All tools']),
    el('h1', {}, title),
    subtitle ? el('p', {}, subtitle) : null,
  ]);
}

function zipDownload(items, zipName) {
  // items: [{name, bytes|blob}] → build a zip and download.
  return (async () => {
    const entries = {};
    for (const it of items) {
      const bytes = it.bytes instanceof Uint8Array
        ? it.bytes
        : new Uint8Array(await it.blob.arrayBuffer());
      entries[it.name] = bytes;
    }
    const zipped = zipSync(entries, { level: 6 });
    downloadBlob(zipped, zipName, 'application/zip');
  })();
}

/* ----------------------------- Home ----------------------------- */
function renderHome() {
  clear();
  view().append(
    el('section', { class: 'hero' }, [
      el('h1', {}, 'Your private PDF toolkit'),
      el('p', {}, 'Merge, split, organize, resize and convert PDFs right in your browser. Files are processed on your device and never uploaded.'),
    ]),
    el('div', { class: 'tool-grid' },
      TOOLS.map((t) => el('a', { class: 'tool-card', href: `#/${t.id}` }, [
        el('span', { class: 'ico' }, t.icon),
        el('h3', {}, t.title),
        el('p', {}, t.blurb),
      ])),
    ),
  );
}

/* ----------------------------- Merge ---------------------------- */
function renderMerge() {
  clear();
  let files = [];
  const listCard = el('div', { class: 'card' }, [el('h2', {}, 'Files to merge'), el('div', { class: 'empty', id: 'merge-empty' }, 'No files yet — add at least two PDFs.')]);
  const list = el('ul', { class: 'file-list', id: 'merge-list' });
  listCard.append(list);

  const refresh = () => {
    list.replaceChildren();
    document.getElementById('merge-empty').style.display = files.length ? 'none' : '';
    files.forEach((f, i) => {
      list.append(el('li', { class: 'file-item', draggable: 'true', dataset: { i } }, [
        el('span', { class: 'grip', title: 'Drag to reorder' }, '⠿'),
        el('span', { class: 'fname' }, f.name),
        el('span', { class: 'fmeta' }, fmtBytes(f.size)),
        el('button', { class: 'btn btn-danger', title: 'Remove', onClick: () => { files.splice(i, 1); refresh(); } }, '✕'),
      ]));
    });
  };

  makeSortable(list, '.file-item', () => {
    const order = [...list.querySelectorAll('.file-item')].map((li) => Number(li.dataset.i));
    files = order.map((idx) => files[idx]);
    refresh();
  });

  const dz = dropzone({
    accept: PDF_ACCEPT, multiple: true, icon: '🧩',
    label: 'Drop PDFs here or click to browse',
    hint: 'Add two or more PDF files',
    onFiles: (picked) => { files.push(...picked.filter((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name))); refresh(); },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (files.length < 2) return toast('Add at least two PDFs to merge.', 'err');
    const bytes = await withBusy('Merging…', () => mergePdfs(files));
    if (bytes) { downloadBlob(bytes, 'merged.pdf'); toast('Merged PDF downloaded.', 'ok'); }
  } }, 'Merge & download');

  view().append(
    pageHead('Merge PDFs', 'Combine multiple PDFs into a single document.'),
    el('div', { class: 'card' }, [dz]),
    listCard,
    el('div', { class: 'btn-row' }, [go]),
  );
  refresh();
}

/* -------------------------- Split / Extract --------------------- */
function renderSplit() {
  clear();
  let file = null;
  let count = 0;

  const info = el('div', { class: 'empty', id: 'split-info' }, 'No PDF loaded yet.');
  const rangeInput = el('input', { type: 'text', placeholder: 'e.g. 1-3, 5, 8-10', id: 'split-range' });

  const modeRow = el('div', { class: 'radio-row' }, [
    el('label', {}, [el('input', { type: 'radio', name: 'smode', value: 'extract', checked: true }), 'Extract to one PDF']),
    el('label', {}, [el('input', { type: 'radio', name: 'smode', value: 'split' }), 'Split each range to its own PDF']),
    el('label', {}, [el('input', { type: 'radio', name: 'smode', value: 'each' }), 'Split every page']),
  ]);

  const dz = dropzone({
    accept: PDF_ACCEPT, multiple: false, icon: '✂️',
    label: 'Drop a PDF here or click to browse',
    onFiles: async ([f]) => {
      file = f;
      count = await withBusy('Reading…', () => pageCount(f));
      info.className = 'hint';
      info.textContent = `${f.name} — ${count} page${count === 1 ? '' : 's'}.`;
    },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (!file) return toast('Load a PDF first.', 'err');
    const mode = modeRow.querySelector('input:checked').value;
    if (mode === 'each') {
      const parts = await withBusy('Splitting…', () => splitEachPage(file, file.name.replace(/\.pdf$/i, '')));
      if (parts) { await zipDownload(parts, 'pages.zip'); toast(`Split into ${parts.length} files.`, 'ok'); }
      return;
    }
    let indices;
    try { indices = parsePageRanges(rangeInput.value, count); }
    catch (e) { return toast(e.message, 'err'); }

    if (mode === 'extract') {
      const bytes = await withBusy('Extracting…', () => extractPages(file, indices));
      if (bytes) { downloadBlob(bytes, 'extracted.pdf'); toast('Extracted PDF downloaded.', 'ok'); }
    } else {
      // one file per comma-separated range
      const ranges = rangeInput.value.split(',').map((s) => s.trim()).filter(Boolean).map((part) => ({
        name: `${file.name.replace(/\.pdf$/i, '')}-${part.replace(/\s/g, '')}.pdf`,
        indices: parsePageRanges(part, count),
      }));
      const parts = await withBusy('Splitting…', () => splitRanges(file, ranges));
      if (parts) { await zipDownload(parts, 'split.zip'); toast(`Created ${parts.length} files.`, 'ok'); }
    }
  } }, 'Run');

  view().append(
    pageHead('Split & Extract', 'Extract page ranges or split a PDF into multiple files.'),
    el('div', { class: 'card' }, [dz, info]),
    el('div', { class: 'card' }, [
      el('h2', {}, 'What to do'),
      modeRow,
      el('div', { class: 'field', style: 'margin-top:14px' }, [
        el('label', { for: 'split-range' }, 'Page ranges'),
        rangeInput,
        el('div', { class: 'hint' }, 'Pages start at 1. Ignored when “Split every page” is selected.'),
      ]),
    ]),
    el('div', { class: 'btn-row' }, [go]),
  );
}

/* --------------------------- Organize --------------------------- */
function renderOrganize() {
  clear();
  let file = null;
  let pages = []; // {index, rotate, removed}
  const grid = el('div', { class: 'thumb-grid', id: 'org-grid' });
  const gridCard = el('div', { class: 'card', style: 'display:none', id: 'org-card' }, [
    el('h2', {}, 'Pages — drag to reorder, rotate or delete'),
    grid,
  ]);

  const buildThumbs = async (f) => {
    const pdf = await openWithPdfjs(f);
    grid.replaceChildren();
    pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const canvas = await renderThumb(pdf, n, 150);
      const idx = n - 1;
      const state = { index: idx, rotate: 0, removed: false };
      pages.push(state);
      const cell = el('div', { class: 'thumb', draggable: 'true', dataset: { idx } }, [
        canvas,
        el('span', { class: 'pno' }, `Page ${n}`),
        el('div', { class: 'thumb-actions' }, [
          el('button', { title: 'Rotate left',  onClick: () => rotate(state, canvas, -90) }, '⟲'),
          el('button', { title: 'Rotate right', onClick: () => rotate(state, canvas, 90) }, '⟳'),
          el('button', { title: 'Delete / restore', onClick: () => toggleRemove(state, cell) }, '🗑'),
        ]),
      ]);
      cell._state = state;
      grid.append(cell);
    }
    await pdf.destroy();
    gridCard.style.display = '';
  };

  const rotate = (state, canvas, delta) => {
    state.rotate = ((state.rotate + delta) % 360 + 360) % 360;
    canvas.style.transform = `rotate(${state.rotate}deg)`;
  };
  const toggleRemove = (state, cell) => {
    state.removed = !state.removed;
    cell.classList.toggle('removed', state.removed);
  };

  makeSortable(grid, '.thumb');

  const currentOrder = () =>
    [...grid.querySelectorAll('.thumb')]
      .map((c) => c._state)
      .filter((s) => !s.removed)
      .map((s) => ({ index: s.index, rotate: s.rotate }));

  const dz = dropzone({
    accept: PDF_ACCEPT, multiple: false, icon: '🗂️',
    label: 'Drop a PDF here or click to browse',
    onFiles: async ([f]) => { file = f; await withBusy('Rendering pages…', () => buildThumbs(f)); },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (!file) return toast('Load a PDF first.', 'err');
    const order = currentOrder();
    if (order.length === 0) return toast('All pages are deleted — keep at least one.', 'err');
    const bytes = await withBusy('Building PDF…', () => rebuildPages(file, order));
    if (bytes) { downloadBlob(bytes, 'organized.pdf'); toast('Organized PDF downloaded.', 'ok'); }
  } }, 'Save & download');

  view().append(
    pageHead('Organize Pages', 'Reorder, rotate and remove pages, then export.'),
    el('div', { class: 'card' }, [dz]),
    gridCard,
    el('div', { class: 'btn-row' }, [go]),
  );
}

/* ------------------------- Images → PDF ------------------------- */
function renderImages() {
  clear();
  let files = [];
  const list = el('ul', { class: 'file-list', id: 'img-list' });
  const listCard = el('div', { class: 'card' }, [el('h2', {}, 'Images'), el('div', { class: 'empty', id: 'img-empty' }, 'No images yet.'), list]);

  const refresh = () => {
    list.replaceChildren();
    document.getElementById('img-empty').style.display = files.length ? 'none' : '';
    files.forEach((f, i) => {
      list.append(el('li', { class: 'file-item', draggable: 'true', dataset: { i } }, [
        el('span', { class: 'grip' }, '⠿'),
        el('span', { class: 'fname' }, f.name),
        el('span', { class: 'fmeta' }, fmtBytes(f.size)),
        el('button', { class: 'btn btn-danger', onClick: () => { files.splice(i, 1); refresh(); } }, '✕'),
      ]));
    });
  };
  makeSortable(list, '.file-item', () => {
    const order = [...list.querySelectorAll('.file-item')].map((li) => Number(li.dataset.i));
    files = order.map((idx) => files[idx]);
    refresh();
  });

  const sizeSel = el('select', { id: 'img-size' }, [
    el('option', { value: 'fit' }, 'Fit page to image'),
    el('option', { value: 'A4' }, 'A4'),
    el('option', { value: 'Letter' }, 'Letter'),
    el('option', { value: 'Legal' }, 'Legal'),
  ]);
  const orientSel = el('select', { id: 'img-orient' }, [
    el('option', { value: 'auto' }, 'Auto'),
    el('option', { value: 'portrait' }, 'Portrait'),
    el('option', { value: 'landscape' }, 'Landscape'),
  ]);
  const marginInput = el('input', { type: 'number', value: '0', min: '0', step: '4', id: 'img-margin' });

  const dz = dropzone({
    accept: IMG_ACCEPT, multiple: true, icon: '🖼️',
    label: 'Drop images here or click to browse',
    hint: 'JPG or PNG',
    onFiles: (picked) => { files.push(...picked.filter((f) => /image\/(png|jpe?g)/i.test(f.type) || /\.(png|jpe?g)$/i.test(f.name))); refresh(); },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (files.length === 0) return toast('Add at least one image.', 'err');
    const bytes = await withBusy('Building PDF…', () => imagesToPdf(files, {
      pageSize: sizeSel.value,
      orientation: orientSel.value,
      margin: Number(marginInput.value) || 0,
    }));
    if (bytes) { downloadBlob(bytes, 'images.pdf'); toast('PDF downloaded.', 'ok'); }
  } }, 'Create PDF');

  view().append(
    pageHead('Images → PDF', 'Combine JPG/PNG images into a PDF, one image per page.'),
    el('div', { class: 'card' }, [dz]),
    listCard,
    el('div', { class: 'card' }, [
      el('h2', {}, 'Page options'),
      el('div', { class: 'controls' }, [
        el('div', { class: 'field' }, [el('label', { for: 'img-size' }, 'Page size'), sizeSel]),
        el('div', { class: 'field' }, [el('label', { for: 'img-orient' }, 'Orientation'), orientSel]),
        el('div', { class: 'field' }, [el('label', { for: 'img-margin' }, 'Margin (pt)'), marginInput]),
      ]),
      el('div', { class: 'hint' }, 'Orientation & margin apply only to fixed page sizes (not “Fit page to image”).'),
    ]),
    el('div', { class: 'btn-row' }, [go]),
  );
  refresh();
}

/* ------------------------- PDF → Images ------------------------- */
function renderToPng() {
  clear();
  let file = null;
  const info = el('div', { class: 'empty', id: 'png-info' }, 'No PDF loaded yet.');

  const fmtSel = el('select', { id: 'png-fmt' }, [
    el('option', { value: 'image/png' }, 'PNG (lossless)'),
    el('option', { value: 'image/jpeg' }, 'JPG (smaller)'),
  ]);
  const scaleSel = el('select', { id: 'png-scale' }, [
    el('option', { value: '1' }, '1× (72 dpi)'),
    el('option', { value: '2', selected: true }, '2× (144 dpi)'),
    el('option', { value: '3' }, '3× (216 dpi)'),
    el('option', { value: '4' }, '4× (288 dpi)'),
  ]);

  const dz = dropzone({
    accept: PDF_ACCEPT, multiple: false, icon: '📸',
    label: 'Drop a PDF here or click to browse',
    onFiles: async ([f]) => {
      file = f;
      const c = await withBusy('Reading…', () => pageCount(f));
      info.className = 'hint';
      info.textContent = `${f.name} — ${c} page${c === 1 ? '' : 's'}.`;
    },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (!file) return toast('Load a PDF first.', 'err');
    const images = await withBusy('Rendering pages…', () => pdfToImages(file, {
      scale: Number(scaleSel.value),
      type: fmtSel.value,
      baseName: file.name.replace(/\.pdf$/i, ''),
    }));
    if (!images) return;
    if (images.length === 1) downloadBlob(images[0].blob, images[0].name, fmtSel.value);
    else await zipDownload(images, 'images.zip');
    toast(`Exported ${images.length} image${images.length === 1 ? '' : 's'}.`, 'ok');
  } }, 'Export images');

  view().append(
    pageHead('PDF → Images', 'Render each page of a PDF to a PNG or JPG.'),
    el('div', { class: 'card' }, [dz, info]),
    el('div', { class: 'card' }, [
      el('h2', {}, 'Output'),
      el('div', { class: 'controls' }, [
        el('div', { class: 'field' }, [el('label', { for: 'png-fmt' }, 'Format'), fmtSel]),
        el('div', { class: 'field' }, [el('label', { for: 'png-scale' }, 'Resolution'), scaleSel]),
      ]),
      el('div', { class: 'hint' }, 'Multiple pages are bundled into a ZIP.'),
    ]),
    el('div', { class: 'btn-row' }, [go]),
  );
}

/* --------------------------- Resize ----------------------------- */
function renderResize() {
  clear();
  let file = null;
  const info = el('div', { class: 'empty', id: 'rs-info' }, 'No PDF loaded yet.');

  const modeRow = el('div', { class: 'radio-row' }, [
    el('label', {}, [el('input', { type: 'radio', name: 'rmode', value: 'preset', checked: true }), 'Fit to a standard size']),
    el('label', {}, [el('input', { type: 'radio', name: 'rmode', value: 'scale' }), 'Scale by a factor']),
  ]);
  const presetSel = el('select', { id: 'rs-preset' }, Object.keys(PAGE_SIZES).map((k) => el('option', { value: k }, k)));
  const orientSel = el('select', { id: 'rs-orient' }, [
    el('option', { value: 'portrait' }, 'Portrait'),
    el('option', { value: 'landscape' }, 'Landscape'),
    el('option', { value: 'auto' }, 'Match page'),
  ]);
  const scaleInput = el('input', { type: 'number', value: '0.5', min: '0.05', step: '0.05', id: 'rs-scale' });

  const presetFields = el('div', { class: 'controls', id: 'rs-preset-fields' }, [
    el('div', { class: 'field' }, [el('label', { for: 'rs-preset' }, 'Target size'), presetSel]),
    el('div', { class: 'field' }, [el('label', { for: 'rs-orient' }, 'Orientation'), orientSel]),
  ]);
  const scaleFields = el('div', { class: 'controls', id: 'rs-scale-fields', style: 'display:none' }, [
    el('div', { class: 'field' }, [el('label', { for: 'rs-scale' }, 'Scale factor'), scaleInput, el('div', { class: 'hint' }, '0.5 = half size, 2 = double size')]),
  ]);

  modeRow.addEventListener('change', () => {
    const mode = modeRow.querySelector('input:checked').value;
    presetFields.style.display = mode === 'preset' ? '' : 'none';
    scaleFields.style.display = mode === 'scale' ? '' : 'none';
  });

  const dz = dropzone({
    accept: PDF_ACCEPT, multiple: false, icon: '📐',
    label: 'Drop a PDF here or click to browse',
    onFiles: async ([f]) => {
      file = f;
      const c = await withBusy('Reading…', () => pageCount(f));
      info.className = 'hint';
      info.textContent = `${f.name} — ${c} page${c === 1 ? '' : 's'}.`;
    },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (!file) return toast('Load a PDF first.', 'err');
    const mode = modeRow.querySelector('input:checked').value;
    const opts = mode === 'scale'
      ? { mode: 'scale', scale: Number(scaleInput.value) }
      : { mode: 'preset', preset: presetSel.value, orientation: orientSel.value };
    const bytes = await withBusy('Resizing…', () => resizePages(file, opts));
    if (bytes) { downloadBlob(bytes, 'resized.pdf'); toast('Resized PDF downloaded.', 'ok'); }
  } }, 'Resize & download');

  view().append(
    pageHead('Resize Pages', 'Scale pages or fit them to a standard paper size.'),
    el('div', { class: 'card' }, [dz, info]),
    el('div', { class: 'card' }, [el('h2', {}, 'How to resize'), modeRow, el('div', { style: 'margin-top:14px' }, [presetFields, scaleFields])]),
    el('div', { class: 'btn-row' }, [go]),
  );
}

/* ----------------------------- Router --------------------------- */
const ROUTES = {
  '': renderHome,
  'merge': renderMerge,
  'split': renderSplit,
  'organize': renderOrganize,
  'images': renderImages,
  'topng': renderToPng,
  'resize': renderResize,
};

function route() {
  const id = (location.hash.replace(/^#\/?/, '') || '').trim();
  const render = ROUTES[id] || renderHome;
  render();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
// In case the module loads after DOMContentLoaded already fired:
if (document.readyState !== 'loading') route();
