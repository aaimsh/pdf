// Shared DOM helpers: element builder, dropzone, toasts, busy overlay,
// download triggers, and a page-range parser. No library imports here.

/** Tiny hyperscript-style element builder. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const fmtBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

/** Show a transient toast. type: 'info' | 'err' | 'ok' */
export function toast(message, type = 'info', ms = 4000) {
  const host = document.getElementById('toast-host');
  const node = el('div', { class: `toast ${type === 'err' ? 'err' : type === 'ok' ? 'ok' : ''}`, role: 'status' }, message);
  host.append(node);
  setTimeout(() => {
    node.style.transition = 'opacity .25s';
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 260);
  }, ms);
}

let overlayEl = null;
/** Show/hide a full-screen busy overlay. Returns a function to dismiss. */
export function busy(label = 'Working…') {
  if (overlayEl) overlayEl.remove();
  overlayEl = el('div', { class: 'overlay' }, el('div', { class: 'box' }, [
    el('div', { class: 'spinner' }),
    el('span', {}, label),
  ]));
  document.body.append(overlayEl);
  return () => { if (overlayEl) { overlayEl.remove(); overlayEl = null; } };
}

/** Run an async task wrapped in a busy overlay + error toast. */
export async function withBusy(label, fn) {
  const done = busy(label);
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    toast(err?.message || 'Something went wrong.', 'err', 6000);
    return undefined;
  } finally {
    done();
  }
}

/** Trigger a browser download of bytes/blob. */
export function downloadBlob(data, filename, mime = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Build a dropzone that accepts files via click or drag/drop.
 * @param {object} opts { accept, multiple, label, hint, onFiles(File[]) }
 * @returns {HTMLElement}
 */
export function dropzone({ accept = '', multiple = true, label = 'Drop files here or click to browse', hint = '', icon = '📁', onFiles }) {
  const input = el('input', { type: 'file', accept, multiple: multiple || false, class: 'sr-only' });
  const zone = el('div', {
    class: 'dropzone',
    role: 'button',
    tabindex: '0',
    'aria-label': label,
  }, [
    el('span', { class: 'dz-ico' }, icon),
    el('strong', {}, label),
    hint ? el('small', {}, hint) : null,
    input,
  ]);

  const pick = (list) => {
    const files = Array.from(list || []);
    if (files.length) onFiles(files);
  };

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', () => { pick(input.files); input.value = ''; });

  ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('drag'); }));
  ['dragleave', 'dragend', 'drop'].forEach((ev) => zone.addEventListener(ev, () => zone.classList.remove('drag')));
  zone.addEventListener('drop', (e) => { e.preventDefault(); pick(e.dataTransfer.files); });

  return zone;
}

/**
 * Parse a page-range string like "1-3, 5, 8-10" into 0-indexed page numbers.
 * @param {string} input
 * @param {number} total  page count (for validation / open-ended ranges)
 * @returns {number[]} unique, in the order written
 */
export function parsePageRanges(input, total = Infinity) {
  if (!input || !input.trim()) throw new Error('Enter at least one page or range.');
  const out = [];
  const seen = new Set();
  for (const partRaw of input.split(',')) {
    const part = partRaw.trim();
    if (!part) continue;
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let a = parseInt(m[1], 10);
      let b = parseInt(m[2], 10);
      if (a < 1 || b < 1) throw new Error(`Page numbers start at 1 (got "${part}").`);
      const step = a <= b ? 1 : -1;
      for (let p = a; step > 0 ? p <= b : p >= b; p += step) {
        if (p <= total && !seen.has(p)) { seen.add(p); out.push(p - 1); }
      }
    } else if (/^\d+$/.test(part)) {
      const p = parseInt(part, 10);
      if (p < 1) throw new Error('Page numbers start at 1.');
      if (p <= total && !seen.has(p)) { seen.add(p); out.push(p - 1); }
    } else {
      throw new Error(`Couldn't understand "${part}". Use formats like 1-3, 5, 8-10.`);
    }
  }
  if (out.length === 0) throw new Error('No pages matched (are they within the document?).');
  return out;
}

/** Move an array element from index `i` by `delta` (in place). Returns the array. */
export function moveItem(arr, i, delta) {
  const j = i + delta;
  if (j < 0 || j >= arr.length) return arr;
  const [item] = arr.splice(i, 1);
  arr.splice(j, 0, item);
  return arr;
}

/**
 * Build ▲/▼ move buttons for an item. Touch-friendly + accessible alternative
 * to drag-to-reorder.
 * @param {object} o { upLabel, downLabel, onUp, onDown }
 * @returns {HTMLElement[]} two buttons
 */
export function moveButtons({ upLabel = 'Move up', downLabel = 'Move down', onUp, onDown }) {
  return [
    el('button', { class: 'btn btn-move', type: 'button', title: upLabel, 'aria-label': upLabel, onClick: onUp }, '▲'),
    el('button', { class: 'btn btn-move', type: 'button', title: downLabel, 'aria-label': downLabel, onClick: onDown }, '▼'),
  ];
}

/** Enable simple drag-to-reorder on a list container's direct children. */
export function makeSortable(container, itemSelector, onReorder) {
  let dragEl = null;
  container.addEventListener('dragstart', (e) => {
    const item = e.target.closest(itemSelector);
    if (!item) return;
    dragEl = item;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  container.addEventListener('dragend', () => {
    if (dragEl) dragEl.classList.remove('dragging');
    dragEl = null;
    onReorder?.();
  });
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!dragEl) return;
    const items = [...container.querySelectorAll(`${itemSelector}:not(.dragging)`)];
    let closest = null, closestDist = Infinity, before = true;
    for (const child of items) {
      const box = child.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = child;
        // Insert before when the pointer is above the row, or left within the row.
        const sameRow = Math.abs(e.clientY - cy) < box.height / 2;
        before = e.clientY < cy - box.height / 2 || (sameRow && e.clientX < cx);
      }
    }
    if (!closest) { container.append(dragEl); return; }
    container.insertBefore(dragEl, before ? closest : closest.nextSibling);
  });
}
