// Hash router + per-tool view controllers.

import {
  el, toast, withBusy, downloadBlob, dropzone, parsePageRanges,
  makeSortable, moveButtons, moveItem, fmtBytes,
} from './ui.js';
import {
  mergePdfs, extractPages, splitRanges, splitEachPage, rebuildPages,
  imagesToPdf, pdfToImages, resizePages, pageCount, openWithPdfjs, renderThumb,
  PAGE_SIZES,
} from './pdf-utils.js';
import { zipSync } from './lib.js';
import { t, setLang, otherLang, applyDocumentChrome } from './i18n.js';

const PDF_ACCEPT = 'application/pdf,.pdf';
const IMG_ACCEPT = 'image/png,image/jpeg,.png,.jpg,.jpeg';

// Tool registry — titles/blurbs are resolved through i18n at render time.
const TOOLS = [
  { id: 'merge',    icon: '🧩' },
  { id: 'split',    icon: '✂️' },
  { id: 'organize', icon: '🗂️' },
  { id: 'images',   icon: '🖼️' },
  { id: 'topng',    icon: '📸' },
  { id: 'resize',   icon: '📐' },
];

const view = () => document.getElementById('view');

function clear() { view().replaceChildren(); }

function pageHead(titleKey, subtitleKey) {
  return el('div', { class: 'page-head' }, [
    el('a', { class: 'back-link', href: '#/' }, [el('span', { class: 'arrow' }, '←'), ' ', t('nav.back')]),
    el('h1', {}, t(titleKey)),
    subtitleKey ? el('p', {}, t(subtitleKey)) : null,
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
      el('h1', {}, t('home.title')),
      el('p', {}, t('home.subtitle')),
    ]),
    el('div', { class: 'tool-grid' },
      TOOLS.map((tool) => el('a', { class: 'tool-card', href: `#/${tool.id}` }, [
        el('span', { class: 'ico' }, tool.icon),
        el('h3', {}, t(`tool.${tool.id}.title`)),
        el('p', {}, t(`tool.${tool.id}.blurb`)),
      ])),
    ),
  );
}

/* ----------------------------- Merge ---------------------------- */
function renderMerge() {
  clear();
  let files = [];
  const listCard = el('div', { class: 'card' }, [
    el('h2', {}, t('merge.filesHeading')),
    el('div', { class: 'empty', id: 'merge-empty' }, t('merge.empty')),
  ]);
  const list = el('ul', { class: 'file-list', id: 'merge-list' });
  listCard.append(list);

  const refresh = () => {
    list.replaceChildren();
    document.getElementById('merge-empty').style.display = files.length ? 'none' : '';
    files.forEach((f, i) => {
      list.append(el('li', { class: 'file-item', draggable: 'true', dataset: { i } }, [
        el('span', { class: 'grip', title: t('reorder.grip') }, '⠿'),
        el('span', { class: 'fname' }, f.name),
        el('span', { class: 'fmeta' }, fmtBytes(f.size)),
        ...moveButtons({
          upLabel: t('move.up'), downLabel: t('move.down'),
          onUp: () => { moveItem(files, i, -1); refresh(); },
          onDown: () => { moveItem(files, i, 1); refresh(); },
        }),
        el('button', { class: 'btn btn-danger', title: t('item.remove'), 'aria-label': t('item.remove'), onClick: () => { files.splice(i, 1); refresh(); } }, '✕'),
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
    label: t('common.dropPdfs'), hint: t('merge.hint'),
    onFiles: (picked) => { files.push(...picked.filter((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name))); refresh(); },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (files.length < 2) return toast(t('merge.needTwo'), 'err');
    const bytes = await withBusy(t('merge.busy'), () => mergePdfs(files));
    if (bytes) { downloadBlob(bytes, 'merged.pdf'); toast(t('merge.done'), 'ok'); }
  } }, t('merge.action'));

  view().append(
    pageHead('tool.merge.title', 'merge.subtitle'),
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

  const info = el('div', { class: 'empty', id: 'split-info' }, t('common.noPdf'));
  const rangeInput = el('input', { type: 'text', placeholder: t('split.placeholder'), id: 'split-range' });

  const modeRow = el('div', { class: 'radio-row' }, [
    el('label', {}, [el('input', { type: 'radio', name: 'smode', value: 'extract', checked: true }), t('split.mode.extract')]),
    el('label', {}, [el('input', { type: 'radio', name: 'smode', value: 'split' }), t('split.mode.split')]),
    el('label', {}, [el('input', { type: 'radio', name: 'smode', value: 'each' }), t('split.mode.each')]),
  ]);

  const dz = dropzone({
    accept: PDF_ACCEPT, multiple: false, icon: '✂️',
    label: t('common.dropPdf'),
    onFiles: async ([f]) => {
      file = f;
      count = await withBusy(t('split.reading'), () => pageCount(f));
      info.className = 'hint';
      info.textContent = t('common.fileInfo', { name: f.name, n: count });
    },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (!file) return toast(t('common.loadFirst'), 'err');
    const mode = modeRow.querySelector('input:checked').value;
    if (mode === 'each') {
      const parts = await withBusy(t('split.busy'), () => splitEachPage(file, file.name.replace(/\.pdf$/i, '')));
      if (parts) { await zipDownload(parts, 'pages.zip'); toast(t('split.eachDone', { n: parts.length }), 'ok'); }
      return;
    }
    let indices;
    try { indices = parsePageRanges(rangeInput.value, count); }
    catch (e) { return toast(e.message, 'err'); }

    if (mode === 'extract') {
      const bytes = await withBusy(t('split.extractBusy'), () => extractPages(file, indices));
      if (bytes) { downloadBlob(bytes, 'extracted.pdf'); toast(t('split.extractDone'), 'ok'); }
    } else {
      // one file per comma-separated range
      const ranges = rangeInput.value.split(',').map((s) => s.trim()).filter(Boolean).map((part) => ({
        name: `${file.name.replace(/\.pdf$/i, '')}-${part.replace(/\s/g, '')}.pdf`,
        indices: parsePageRanges(part, count),
      }));
      const parts = await withBusy(t('split.busy'), () => splitRanges(file, ranges));
      if (parts) { await zipDownload(parts, 'split.zip'); toast(t('split.splitDone', { n: parts.length }), 'ok'); }
    }
  } }, t('common.run'));

  view().append(
    pageHead('tool.split.title', 'split.subtitle'),
    el('div', { class: 'card' }, [dz, info]),
    el('div', { class: 'card' }, [
      el('h2', {}, t('split.whatHeading')),
      modeRow,
      el('div', { class: 'field', style: 'margin-top:14px' }, [
        el('label', { for: 'split-range' }, t('split.rangesLabel')),
        rangeInput,
        el('div', { class: 'hint' }, t('split.rangesHint')),
      ]),
    ]),
    el('div', { class: 'btn-row' }, [go]),
  );
}

/* --------------------------- Organize --------------------------- */
function renderOrganize() {
  clear();
  let file = null;
  const grid = el('div', { class: 'thumb-grid', id: 'org-grid' });
  const gridCard = el('div', { class: 'card', style: 'display:none', id: 'org-card' }, [
    el('h2', {}, t('organize.heading')),
    grid,
  ]);

  // Keep each thumb's position <input> in sync with its DOM order.
  const renumber = () => {
    const thumbs = [...grid.querySelectorAll('.thumb')];
    thumbs.forEach((c, i) => {
      const inp = c.querySelector('.pos-input');
      if (inp) { inp.value = String(i + 1); inp.max = String(thumbs.length); }
    });
  };
  // Move a thumb so it becomes the `pos1`-th (1-based) among all thumbs.
  const moveThumbTo = (cell, pos1) => {
    const thumbs = [...grid.querySelectorAll('.thumb')];
    const others = thumbs.filter((c) => c !== cell);
    const target = Math.max(0, Math.min(others.length, pos1 - 1));
    grid.insertBefore(cell, others[target] || null);
    renumber();
  };
  const moveThumbBy = (cell, delta) => {
    const thumbs = [...grid.querySelectorAll('.thumb')];
    moveThumbTo(cell, thumbs.indexOf(cell) + 1 + delta);
  };

  const buildThumbs = async (f) => {
    const pdf = await openWithPdfjs(f);
    grid.replaceChildren();
    for (let n = 1; n <= pdf.numPages; n++) {
      const canvas = await renderThumb(pdf, n, 150);
      const state = { index: n - 1, rotate: 0, removed: false };
      const posInput = el('input', {
        type: 'number', class: 'pos-input', min: '1', max: String(pdf.numPages), value: String(n),
        'aria-label': t('organize.posLabel'), title: t('organize.posLabel'),
      });
      const cell = el('div', { class: 'thumb', draggable: 'true' }, [
        canvas,
        el('span', { class: 'pno' }, t('organize.page', { n })),
        el('div', { class: 'thumb-actions' }, [
          posInput,
          ...moveButtons({
            upLabel: t('move.up'), downLabel: t('move.down'),
            onUp: () => moveThumbBy(cell, -1), onDown: () => moveThumbBy(cell, 1),
          }),
          el('button', { type: 'button', title: t('organize.rotateLeft'), 'aria-label': t('organize.rotateLeft'), onClick: () => rotate(state, canvas, -90) }, '⟲'),
          el('button', { type: 'button', title: t('organize.rotateRight'), 'aria-label': t('organize.rotateRight'), onClick: () => rotate(state, canvas, 90) }, '⟳'),
          el('button', { type: 'button', title: t('organize.delete'), 'aria-label': t('organize.delete'), onClick: () => toggleRemove(state, cell) }, '🗑'),
        ]),
      ]);
      cell._state = state;
      posInput.addEventListener('change', () => {
        const v = parseInt(posInput.value, 10);
        if (Number.isNaN(v)) { renumber(); return; }
        moveThumbTo(cell, v);
      });
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

  makeSortable(grid, '.thumb', renumber);

  const currentOrder = () =>
    [...grid.querySelectorAll('.thumb')]
      .map((c) => c._state)
      .filter((s) => !s.removed)
      .map((s) => ({ index: s.index, rotate: s.rotate }));

  const dz = dropzone({
    accept: PDF_ACCEPT, multiple: false, icon: '🗂️',
    label: t('common.dropPdf'),
    onFiles: async ([f]) => { file = f; await withBusy(t('organize.rendering'), () => buildThumbs(f)); },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (!file) return toast(t('common.loadFirst'), 'err');
    const order = currentOrder();
    if (order.length === 0) return toast(t('organize.allDeleted'), 'err');
    const bytes = await withBusy(t('organize.building'), () => rebuildPages(file, order));
    if (bytes) { downloadBlob(bytes, 'organized.pdf'); toast(t('organize.done'), 'ok'); }
  } }, t('organize.action'));

  view().append(
    pageHead('tool.organize.title', 'organize.subtitle'),
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
  const listCard = el('div', { class: 'card' }, [
    el('h2', {}, t('images.heading')),
    el('div', { class: 'empty', id: 'img-empty' }, t('images.empty')),
    list,
  ]);

  const refresh = () => {
    list.replaceChildren();
    document.getElementById('img-empty').style.display = files.length ? 'none' : '';
    files.forEach((f, i) => {
      list.append(el('li', { class: 'file-item', draggable: 'true', dataset: { i } }, [
        el('span', { class: 'grip', title: t('reorder.grip') }, '⠿'),
        el('span', { class: 'fname' }, f.name),
        el('span', { class: 'fmeta' }, fmtBytes(f.size)),
        ...moveButtons({
          upLabel: t('move.up'), downLabel: t('move.down'),
          onUp: () => { moveItem(files, i, -1); refresh(); },
          onDown: () => { moveItem(files, i, 1); refresh(); },
        }),
        el('button', { class: 'btn btn-danger', title: t('item.remove'), 'aria-label': t('item.remove'), onClick: () => { files.splice(i, 1); refresh(); } }, '✕'),
      ]));
    });
  };
  makeSortable(list, '.file-item', () => {
    const order = [...list.querySelectorAll('.file-item')].map((li) => Number(li.dataset.i));
    files = order.map((idx) => files[idx]);
    refresh();
  });

  const sizeSel = el('select', { id: 'img-size' }, [
    el('option', { value: 'fit' }, t('images.size.fit')),
    el('option', { value: 'A4' }, 'A4'),
    el('option', { value: 'Letter' }, 'Letter'),
    el('option', { value: 'Legal' }, 'Legal'),
  ]);
  const orientSel = el('select', { id: 'img-orient' }, [
    el('option', { value: 'auto' }, t('images.orient.auto')),
    el('option', { value: 'portrait' }, t('images.orient.portrait')),
    el('option', { value: 'landscape' }, t('images.orient.landscape')),
  ]);
  const marginInput = el('input', { type: 'number', value: '0', min: '0', step: '4', id: 'img-margin' });

  const dz = dropzone({
    accept: IMG_ACCEPT, multiple: true, icon: '🖼️',
    label: t('common.dropImages'), hint: t('images.hint'),
    onFiles: (picked) => { files.push(...picked.filter((f) => /image\/(png|jpe?g)/i.test(f.type) || /\.(png|jpe?g)$/i.test(f.name))); refresh(); },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (files.length === 0) return toast(t('images.needOne'), 'err');
    const bytes = await withBusy(t('images.busy'), () => imagesToPdf(files, {
      pageSize: sizeSel.value,
      orientation: orientSel.value,
      margin: Number(marginInput.value) || 0,
    }));
    if (bytes) { downloadBlob(bytes, 'images.pdf'); toast(t('images.done'), 'ok'); }
  } }, t('images.action'));

  view().append(
    pageHead('tool.images.title', 'images.subtitle'),
    el('div', { class: 'card' }, [dz]),
    listCard,
    el('div', { class: 'card' }, [
      el('h2', {}, t('images.optionsHeading')),
      el('div', { class: 'controls' }, [
        el('div', { class: 'field' }, [el('label', { for: 'img-size' }, t('images.size')), sizeSel]),
        el('div', { class: 'field' }, [el('label', { for: 'img-orient' }, t('images.orient')), orientSel]),
        el('div', { class: 'field' }, [el('label', { for: 'img-margin' }, t('images.margin')), marginInput]),
      ]),
      el('div', { class: 'hint' }, t('images.optHint')),
    ]),
    el('div', { class: 'btn-row' }, [go]),
  );
  refresh();
}

/* ------------------------- PDF → Images ------------------------- */
function renderToPng() {
  clear();
  let file = null;
  const info = el('div', { class: 'empty', id: 'png-info' }, t('common.noPdf'));

  const fmtSel = el('select', { id: 'png-fmt' }, [
    el('option', { value: 'image/png' }, t('topng.format.png')),
    el('option', { value: 'image/jpeg' }, t('topng.format.jpg')),
  ]);
  const scaleSel = el('select', { id: 'png-scale' }, [
    el('option', { value: '1' }, '1× (72 dpi)'),
    el('option', { value: '2', selected: true }, '2× (144 dpi)'),
    el('option', { value: '3' }, '3× (216 dpi)'),
    el('option', { value: '4' }, '4× (288 dpi)'),
  ]);

  const dz = dropzone({
    accept: PDF_ACCEPT, multiple: false, icon: '📸',
    label: t('common.dropPdf'),
    onFiles: async ([f]) => {
      file = f;
      const c = await withBusy(t('split.reading'), () => pageCount(f));
      info.className = 'hint';
      info.textContent = t('common.fileInfo', { name: f.name, n: c });
    },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (!file) return toast(t('common.loadFirst'), 'err');
    const images = await withBusy(t('topng.busy'), () => pdfToImages(file, {
      scale: Number(scaleSel.value),
      type: fmtSel.value,
      baseName: file.name.replace(/\.pdf$/i, ''),
    }));
    if (!images) return;
    if (images.length === 1) downloadBlob(images[0].blob, images[0].name, fmtSel.value);
    else await zipDownload(images, 'images.zip');
    toast(t('topng.done', { n: images.length }), 'ok');
  } }, t('topng.action'));

  view().append(
    pageHead('tool.topng.title', 'topng.subtitle'),
    el('div', { class: 'card' }, [dz, info]),
    el('div', { class: 'card' }, [
      el('h2', {}, t('topng.outputHeading')),
      el('div', { class: 'controls' }, [
        el('div', { class: 'field' }, [el('label', { for: 'png-fmt' }, t('topng.format')), fmtSel]),
        el('div', { class: 'field' }, [el('label', { for: 'png-scale' }, t('topng.res')), scaleSel]),
      ]),
      el('div', { class: 'hint' }, t('topng.zipHint')),
    ]),
    el('div', { class: 'btn-row' }, [go]),
  );
}

/* --------------------------- Resize ----------------------------- */
function renderResize() {
  clear();
  let file = null;
  const info = el('div', { class: 'empty', id: 'rs-info' }, t('common.noPdf'));

  const modeRow = el('div', { class: 'radio-row' }, [
    el('label', {}, [el('input', { type: 'radio', name: 'rmode', value: 'preset', checked: true }), t('resize.mode.preset')]),
    el('label', {}, [el('input', { type: 'radio', name: 'rmode', value: 'scale' }), t('resize.mode.scale')]),
  ]);
  const presetSel = el('select', { id: 'rs-preset' }, Object.keys(PAGE_SIZES).map((k) => el('option', { value: k }, k)));
  const orientSel = el('select', { id: 'rs-orient' }, [
    el('option', { value: 'portrait' }, t('resize.orient.portrait')),
    el('option', { value: 'landscape' }, t('resize.orient.landscape')),
    el('option', { value: 'auto' }, t('resize.orient.auto')),
  ]);
  const scaleInput = el('input', { type: 'number', value: '0.5', min: '0.05', step: '0.05', id: 'rs-scale' });

  const presetFields = el('div', { class: 'controls', id: 'rs-preset-fields' }, [
    el('div', { class: 'field' }, [el('label', { for: 'rs-preset' }, t('resize.target')), presetSel]),
    el('div', { class: 'field' }, [el('label', { for: 'rs-orient' }, t('resize.orient')), orientSel]),
  ]);
  const scaleFields = el('div', { class: 'controls', id: 'rs-scale-fields', style: 'display:none' }, [
    el('div', { class: 'field' }, [el('label', { for: 'rs-scale' }, t('resize.factor')), scaleInput, el('div', { class: 'hint' }, t('resize.factorHint'))]),
  ]);

  modeRow.addEventListener('change', () => {
    const mode = modeRow.querySelector('input:checked').value;
    presetFields.style.display = mode === 'preset' ? '' : 'none';
    scaleFields.style.display = mode === 'scale' ? '' : 'none';
  });

  const dz = dropzone({
    accept: PDF_ACCEPT, multiple: false, icon: '📐',
    label: t('common.dropPdf'),
    onFiles: async ([f]) => {
      file = f;
      const c = await withBusy(t('split.reading'), () => pageCount(f));
      info.className = 'hint';
      info.textContent = t('common.fileInfo', { name: f.name, n: c });
    },
  });

  const go = el('button', { class: 'btn btn-primary', onClick: async () => {
    if (!file) return toast(t('common.loadFirst'), 'err');
    const mode = modeRow.querySelector('input:checked').value;
    const opts = mode === 'scale'
      ? { mode: 'scale', scale: Number(scaleInput.value) }
      : { mode: 'preset', preset: presetSel.value, orientation: orientSel.value };
    const bytes = await withBusy(t('resize.busy'), () => resizePages(file, opts));
    if (bytes) { downloadBlob(bytes, 'resized.pdf'); toast(t('resize.done'), 'ok'); }
  } }, t('resize.action'));

  view().append(
    pageHead('tool.resize.title', 'resize.subtitle'),
    el('div', { class: 'card' }, [dz, info]),
    el('div', { class: 'card' }, [el('h2', {}, t('resize.howHeading')), modeRow, el('div', { style: 'margin-top:14px' }, [presetFields, scaleFields])]),
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

let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  applyDocumentChrome();
  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.addEventListener('click', () => { setLang(otherLang()); route(); });
  route();
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', boot);
// In case the module loads after DOMContentLoaded already fired:
if (document.readyState !== 'loading') boot();
