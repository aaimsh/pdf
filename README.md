# 📄 PDF Toolkit

A fast, **100% client-side** PDF utility web app. Every operation runs in your
browser using WebAssembly/JavaScript — your files are **never uploaded** to any
server.

🔗 **Live site:** `https://aaimsh.github.io/pdf/` *(after the first deploy — see below)*

## Features

| Tool | What it does |
| --- | --- |
| 🧩 **Merge PDFs** | Combine several PDFs into one. Drag to reorder. |
| ✂️ **Split & Extract** | Pull out page ranges (`1-3, 5, 8-10`), split each range to its own file, or burst every page. |
| 🗂️ **Organize Pages** | Visual page grid — delete, rotate, and reorder pages by **typing a position**, with ▲/▼ buttons or drag. |
| 🖼️ **Images → PDF** | Turn JPG/PNG images into a PDF (fit-to-image or A4/Letter/Legal). |
| 📸 **PDF → Images** | Render every page to PNG or JPG at 1×–4× resolution (zipped). |
| 📐 **Resize Pages** | Fit pages to a standard paper size, or scale by a factor. |
| 🗜️ **Compress PDF** | Shrink file size by re-encoding pages as JPEG (Light / Balanced / Maximum). Best for scanned/image-heavy PDFs; pages become images, so text is no longer selectable. |

The UI is **bilingual** — Arabic (default, right-to-left) and English — switchable
from the header toggle, and the layout is **mobile-friendly** with touch-first
reordering (▲/▼ buttons and a type-a-position field, since HTML5 drag doesn't fire
on touchscreens).

## How it works

No build step, no bundler. The app is plain HTML/CSS and native ES modules. Its
dependencies are **vendored** under [`vendor/`](vendor) (self-hosted, not loaded
from a CDN) so the app is fully self-contained, works offline, has no runtime
third-party dependency, and loads fast:

- [**pdf-lib**](https://pdf-lib.js.org) 1.17.1 — create & modify PDFs (merge, split, rotate, resize, embed images). *MIT*
- [**pdf.js**](https://mozilla.github.io/pdf.js/) 4.7.76 — render page thumbnails and rasterize pages to images. *Apache-2.0*
- [**fflate**](https://github.com/101arrowz/fflate) 0.8.2 — zip multi-file outputs. *MIT*

All imports funnel through [`js/lib.js`](js/lib.js) — the single place to bump
versions (replace the file in `vendor/` and update the note).

```
index.html            # shell + tool grid
css/styles.css        # dark theme + RTL + mobile media query
js/lib.js             # vendored imports + pdf.js worker config
js/pdf-utils.js       # PDF operations (no DOM)
js/ui.js              # dropzone, toasts, downloads, page-range parser, move buttons
js/i18n.js            # Arabic/English strings + RTL handling
js/app.js             # hash router + tool views
vendor/               # self-hosted pdf-lib, pdf.js, fflate (+ licenses)
tests/                # Playwright e2e suite (desktop + mobile)
```

## Run locally

It's a static site — serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Open via `http://`, not `file://`, so ES module imports work.)

## Tests

End-to-end tests cover every tool and scenario with [Playwright](https://playwright.dev),
running against the real app — across a **desktop** and an emulated **mobile** (touch)
project. They're dev-only; the site itself stays build-free.

```bash
npm install                       # one-time
npx playwright install chromium   # one-time (CI does this automatically)
npm test                          # run the whole suite
```

CI runs the suite on every push/PR via
[`.github/workflows/tests.yml`](.github/workflows/tests.yml).

## Deploy to GitHub Pages

A workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))
publishes the repo root to Pages on every push to the development branch — no
build required.

**One-time setup:** in the repo, go to **Settings → Pages → Build and
deployment → Source** and choose **GitHub Actions**. After the next push the
workflow deploys automatically and the site is live at
`https://aaimsh.github.io/pdf/`.

## Privacy

All processing happens locally in your browser. Files never leave your device.
Because the libraries are self-hosted, the page makes **no third-party requests
at all** — everything is served from the same origin.

## Notes & limits

- "Resize Pages" changes page **dimensions** (and scales content to fit) without
  re-encoding content.
- "Compress PDF" rasterizes each page to a JPEG, so it's most effective on
  scanned/image-heavy documents and **replaces selectable text with an image**.
  For already-optimized or purely text PDFs the output may not be smaller.
- Encrypted PDFs are opened in best-effort mode; some may not load.
