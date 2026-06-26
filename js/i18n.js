// Lightweight i18n. Arabic is the default language; English is available via a
// toggle. Strings are keyed; `t(key, vars)` interpolates {name} placeholders.
// Digits stay Western (0-9) in both languages by design.

const STORE_KEY = 'pdftk.lang';

const STR = {
  ar: {
    'doc.title': 'أدوات PDF — أدوات PDF خاصة داخل المتصفح',
    'doc.desc': 'دمج وتقسيم وتنظيم وتغيير حجم ملفات PDF وتحويل الصور — كل ذلك داخل متصفحك. ملفاتك لا تغادر جهازك أبدًا.',
    'brand.tag': '100% داخل متصفحك · لا يتم رفع أي شيء',
    'footer.tech': 'يعمل بالكامل داخل المتصفح باستخدام pdf-lib و pdf.js.',
    'footer.privacy': 'ملفاتك تبقى على جهازك.',
    'lang.toggle': 'English',
    'lang.toggle.aria': 'التبديل إلى الإنجليزية',

    'home.title': 'صندوق أدوات PDF الخاص بك',
    'home.subtitle': 'ادمج وقسّم ونظّم وغيّر حجم وحوّل ملفات PDF داخل متصفحك مباشرة. تتم معالجة الملفات على جهازك ولا يتم رفعها أبدًا.',
    'nav.back': 'كل الأدوات',

    'tool.merge.title': 'دمج ملفات PDF',
    'tool.merge.blurb': 'ادمج عدة ملفات PDF في ملف واحد. اسحب لإعادة الترتيب.',
    'tool.split.title': 'تقسيم واستخراج',
    'tool.split.blurb': 'استخرج نطاقات صفحات أو قسّم إلى ملفات منفصلة.',
    'tool.organize.title': 'تنظيم الصفحات',
    'tool.organize.blurb': 'حذف وإعادة ترتيب وتدوير الصفحات.',
    'tool.images.title': 'صور ← PDF',
    'tool.images.blurb': 'حوّل صور JPG/PNG إلى مستند PDF.',
    'tool.topng.title': 'PDF ← صور',
    'tool.topng.blurb': 'حوّل كل صفحة إلى صورة PNG أو JPG.',
    'tool.resize.title': 'تغيير حجم الصفحات',
    'tool.resize.blurb': 'غيّر حجم الصفحات أو لائمها مع A4 أو Letter أو Legal…',
    'tool.compress.title': 'ضغط PDF',
    'tool.compress.blurb': 'قلّل حجم الملف بإعادة ضغط الصفحات.',

    'common.dropPdf': 'أفلت ملف PDF هنا أو انقر للاختيار',
    'common.dropPdfs': 'أفلت ملفات PDF هنا أو انقر للاختيار',
    'common.dropImages': 'أفلت الصور هنا أو انقر للاختيار',
    'common.browse': 'انقر للاختيار',
    'common.noPdf': 'لم يتم تحميل أي ملف PDF بعد.',
    'common.fileInfo': '{name} — {n} صفحة.',
    'common.loadFirst': 'حمّل ملف PDF أولًا.',
    'common.run': 'تشغيل',
    'move.up': 'تحريك لأعلى',
    'move.down': 'تحريك لأسفل',
    'item.remove': 'إزالة',
    'reorder.grip': 'اسحب لإعادة الترتيب',

    'merge.subtitle': 'ادمج عدة ملفات PDF في مستند واحد.',
    'merge.filesHeading': 'الملفات المراد دمجها',
    'merge.empty': 'لا توجد ملفات بعد — أضف ملفين PDF على الأقل.',
    'merge.hint': 'أضف ملفين PDF أو أكثر',
    'merge.action': 'دمج وتنزيل',
    'merge.needTwo': 'أضف ملفين PDF على الأقل للدمج.',
    'merge.busy': 'جارٍ الدمج…',
    'merge.done': 'تم تنزيل ملف PDF المدموج.',

    'split.subtitle': 'استخرج نطاقات صفحات أو قسّم ملف PDF إلى عدة ملفات.',
    'split.whatHeading': 'ماذا تريد أن تفعل',
    'split.mode.extract': 'استخراج إلى ملف PDF واحد',
    'split.mode.split': 'تقسيم كل نطاق إلى ملف خاص به',
    'split.mode.each': 'تقسيم كل صفحة',
    'split.rangesLabel': 'نطاقات الصفحات',
    'split.placeholder': 'مثال: 1-3، 5، 8-10',
    'split.rangesHint': 'تبدأ الصفحات من 1. يتم تجاهله عند اختيار «تقسيم كل صفحة».',
    'split.busy': 'جارٍ التقسيم…',
    'split.extractBusy': 'جارٍ الاستخراج…',
    'split.extractDone': 'تم تنزيل ملف PDF المستخرج.',
    'split.splitDone': 'تم إنشاء {n} ملف.',
    'split.eachDone': 'تم التقسيم إلى {n} ملف.',
    'split.reading': 'جارٍ القراءة…',

    'organize.subtitle': 'أعد ترتيب وتدوير وحذف الصفحات ثم صدّر.',
    'organize.heading': 'الصفحات — اكتب رقم الموضع أو اسحب لإعادة الترتيب، ودوّر أو احذف',
    'organize.rendering': 'جارٍ عرض الصفحات…',
    'organize.building': 'جارٍ إنشاء PDF…',
    'organize.action': 'حفظ وتنزيل',
    'organize.done': 'تم تنزيل ملف PDF المنظّم.',
    'organize.allDeleted': 'تم حذف كل الصفحات — أبقِ صفحة واحدة على الأقل.',
    'organize.rotateLeft': 'تدوير لليسار',
    'organize.rotateRight': 'تدوير لليمين',
    'organize.delete': 'حذف / استعادة',
    'organize.page': 'صفحة {n}',
    'organize.posLabel': 'موضع الصفحة',

    'images.subtitle': 'اجمع صور JPG/PNG في ملف PDF، صورة واحدة لكل صفحة.',
    'images.heading': 'الصور',
    'images.empty': 'لا توجد صور بعد.',
    'images.hint': 'JPG أو PNG',
    'images.optionsHeading': 'خيارات الصفحة',
    'images.size': 'حجم الصفحة',
    'images.size.fit': 'ملاءمة الصفحة للصورة',
    'images.orient': 'الاتجاه',
    'images.orient.auto': 'تلقائي',
    'images.orient.portrait': 'عمودي',
    'images.orient.landscape': 'أفقي',
    'images.margin': 'الهامش (نقطة)',
    'images.optHint': 'الاتجاه والهامش يطبّقان فقط على أحجام الصفحات الثابتة (وليس «ملاءمة الصفحة للصورة»).',
    'images.action': 'إنشاء PDF',
    'images.needOne': 'أضف صورة واحدة على الأقل.',
    'images.busy': 'جارٍ إنشاء PDF…',
    'images.done': 'تم تنزيل ملف PDF.',

    'topng.subtitle': 'حوّل كل صفحة من ملف PDF إلى صورة PNG أو JPG.',
    'topng.outputHeading': 'الإخراج',
    'topng.format': 'الصيغة',
    'topng.format.png': 'PNG (بدون فقد)',
    'topng.format.jpg': 'JPG (أصغر حجمًا)',
    'topng.res': 'الدقة',
    'topng.zipHint': 'يتم تجميع الصفحات المتعددة في ملف ZIP.',
    'topng.action': 'تصدير الصور',
    'topng.busy': 'جارٍ عرض الصفحات…',
    'topng.done': 'تم تصدير {n} صورة.',

    'resize.subtitle': 'غيّر حجم الصفحات أو لائمها مع حجم ورق قياسي.',
    'resize.howHeading': 'طريقة تغيير الحجم',
    'resize.mode.preset': 'الملاءمة مع حجم قياسي',
    'resize.mode.scale': 'التغيير بمعامل',
    'resize.target': 'الحجم المستهدف',
    'resize.orient': 'الاتجاه',
    'resize.orient.portrait': 'عمودي',
    'resize.orient.landscape': 'أفقي',
    'resize.orient.auto': 'مطابقة الصفحة',
    'resize.factor': 'معامل التغيير',
    'resize.factorHint': '0.5 = نصف الحجم، 2 = ضعف الحجم',
    'resize.action': 'تغيير الحجم وتنزيل',
    'resize.busy': 'جارٍ تغيير الحجم…',
    'resize.done': 'تم تنزيل ملف PDF بعد تغيير الحجم.',

    'compress.subtitle': 'قلّل حجم الملف بإعادة ترميز الصفحات كصور. مناسب للملفات الممسوحة ضوئيًا أو الغنية بالصور.',
    'compress.levelHeading': 'مستوى الضغط',
    'compress.level.low': 'خفيف (جودة أعلى)',
    'compress.level.medium': 'متوازن',
    'compress.level.high': 'أقصى (أصغر حجمًا)',
    'compress.note': 'ملاحظة: تتحول الصفحات إلى صور، لذا يُفقد تحديد النص.',
    'compress.action': 'ضغط وتنزيل',
    'compress.busy': 'جارٍ الضغط…',
    'compress.result': 'الحجم: {before} ← {after} (توفير {pct}%)',
    'compress.done': 'تم تنزيل ملف PDF المضغوط.',
    'compress.larger': 'لم يصغر الملف — قد يكون مضغوطًا بالفعل أو نصيًا بالكامل. جرّب مستوى ضغط أعلى.',

    'err.generic': 'حدث خطأ ما.',
  },

  en: {
    'doc.title': 'PDF Toolkit — private, in-browser PDF tools',
    'doc.desc': 'Merge, split, organize, resize PDFs and convert images to PDF — all in your browser. Your files never leave your device.',
    'brand.tag': '100% in your browser · nothing uploaded',
    'footer.tech': 'Runs entirely client-side with pdf-lib & pdf.js.',
    'footer.privacy': 'Your files stay on your device.',
    'lang.toggle': 'العربية',
    'lang.toggle.aria': 'Switch to Arabic',

    'home.title': 'Your private PDF toolkit',
    'home.subtitle': 'Merge, split, organize, resize and convert PDFs right in your browser. Files are processed on your device and never uploaded.',
    'nav.back': 'All tools',

    'tool.merge.title': 'Merge PDFs',
    'tool.merge.blurb': 'Combine several PDFs into one. Drag to reorder.',
    'tool.split.title': 'Split & Extract',
    'tool.split.blurb': 'Pull out page ranges or split into separate files.',
    'tool.organize.title': 'Organize Pages',
    'tool.organize.blurb': 'Delete, reorder and rotate individual pages.',
    'tool.images.title': 'Images → PDF',
    'tool.images.blurb': 'Turn JPG/PNG images into a PDF document.',
    'tool.topng.title': 'PDF → Images',
    'tool.topng.blurb': 'Render every page to a PNG or JPG image.',
    'tool.resize.title': 'Resize Pages',
    'tool.resize.blurb': 'Scale pages or fit them to A4, Letter, Legal…',
    'tool.compress.title': 'Compress PDF',
    'tool.compress.blurb': 'Shrink file size by re-compressing the pages.',

    'common.dropPdf': 'Drop a PDF here or click to browse',
    'common.dropPdfs': 'Drop PDFs here or click to browse',
    'common.dropImages': 'Drop images here or click to browse',
    'common.browse': 'click to browse',
    'common.noPdf': 'No PDF loaded yet.',
    'common.fileInfo': '{name} — {n} page(s).',
    'common.loadFirst': 'Load a PDF first.',
    'common.run': 'Run',
    'move.up': 'Move up',
    'move.down': 'Move down',
    'item.remove': 'Remove',
    'reorder.grip': 'Drag to reorder',

    'merge.subtitle': 'Combine multiple PDFs into a single document.',
    'merge.filesHeading': 'Files to merge',
    'merge.empty': 'No files yet — add at least two PDFs.',
    'merge.hint': 'Add two or more PDF files',
    'merge.action': 'Merge & download',
    'merge.needTwo': 'Add at least two PDFs to merge.',
    'merge.busy': 'Merging…',
    'merge.done': 'Merged PDF downloaded.',

    'split.subtitle': 'Extract page ranges or split a PDF into multiple files.',
    'split.whatHeading': 'What to do',
    'split.mode.extract': 'Extract to one PDF',
    'split.mode.split': 'Split each range to its own PDF',
    'split.mode.each': 'Split every page',
    'split.rangesLabel': 'Page ranges',
    'split.placeholder': 'e.g. 1-3, 5, 8-10',
    'split.rangesHint': 'Pages start at 1. Ignored when “Split every page” is selected.',
    'split.busy': 'Splitting…',
    'split.extractBusy': 'Extracting…',
    'split.extractDone': 'Extracted PDF downloaded.',
    'split.splitDone': 'Created {n} files.',
    'split.eachDone': 'Split into {n} files.',
    'split.reading': 'Reading…',

    'organize.subtitle': 'Reorder, rotate and remove pages, then export.',
    'organize.heading': 'Pages — type a position or drag to reorder, rotate or delete',
    'organize.rendering': 'Rendering pages…',
    'organize.building': 'Building PDF…',
    'organize.action': 'Save & download',
    'organize.done': 'Organized PDF downloaded.',
    'organize.allDeleted': 'All pages are deleted — keep at least one.',
    'organize.rotateLeft': 'Rotate left',
    'organize.rotateRight': 'Rotate right',
    'organize.delete': 'Delete / restore',
    'organize.page': 'Page {n}',
    'organize.posLabel': 'Page position',

    'images.subtitle': 'Combine JPG/PNG images into a PDF, one image per page.',
    'images.heading': 'Images',
    'images.empty': 'No images yet.',
    'images.hint': 'JPG or PNG',
    'images.optionsHeading': 'Page options',
    'images.size': 'Page size',
    'images.size.fit': 'Fit page to image',
    'images.orient': 'Orientation',
    'images.orient.auto': 'Auto',
    'images.orient.portrait': 'Portrait',
    'images.orient.landscape': 'Landscape',
    'images.margin': 'Margin (pt)',
    'images.optHint': 'Orientation & margin apply only to fixed page sizes (not “Fit page to image”).',
    'images.action': 'Create PDF',
    'images.needOne': 'Add at least one image.',
    'images.busy': 'Building PDF…',
    'images.done': 'PDF downloaded.',

    'topng.subtitle': 'Render each page of a PDF to a PNG or JPG.',
    'topng.outputHeading': 'Output',
    'topng.format': 'Format',
    'topng.format.png': 'PNG (lossless)',
    'topng.format.jpg': 'JPG (smaller)',
    'topng.res': 'Resolution',
    'topng.zipHint': 'Multiple pages are bundled into a ZIP.',
    'topng.action': 'Export images',
    'topng.busy': 'Rendering pages…',
    'topng.done': 'Exported {n} image(s).',

    'resize.subtitle': 'Scale pages or fit them to a standard paper size.',
    'resize.howHeading': 'How to resize',
    'resize.mode.preset': 'Fit to a standard size',
    'resize.mode.scale': 'Scale by a factor',
    'resize.target': 'Target size',
    'resize.orient': 'Orientation',
    'resize.orient.portrait': 'Portrait',
    'resize.orient.landscape': 'Landscape',
    'resize.orient.auto': 'Match page',
    'resize.factor': 'Scale factor',
    'resize.factorHint': '0.5 = half size, 2 = double size',
    'resize.action': 'Resize & download',
    'resize.busy': 'Resizing…',
    'resize.done': 'Resized PDF downloaded.',

    'compress.subtitle': 'Shrink file size by re-encoding pages as images. Best for scanned or image-heavy PDFs.',
    'compress.levelHeading': 'Compression level',
    'compress.level.low': 'Light (higher quality)',
    'compress.level.medium': 'Balanced',
    'compress.level.high': 'Maximum (smallest)',
    'compress.note': 'Note: pages become images, so selectable text is lost.',
    'compress.action': 'Compress & download',
    'compress.busy': 'Compressing…',
    'compress.result': 'Size: {before} → {after} ({pct}% saved)',
    'compress.done': 'Compressed PDF downloaded.',
    'compress.larger': 'File didn’t get smaller — it may already be optimized or text-only. Try a higher level.',

    'err.generic': 'Something went wrong.',
  },
};

let lang = (() => {
  try { return localStorage.getItem(STORE_KEY) || 'ar'; } catch { return 'ar'; }
})();

/** Translate a key, interpolating {name} placeholders from `vars`. */
export function t(key, vars) {
  let s = (STR[lang] && STR[lang][key]) ?? STR.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function getLang() { return lang; }
export function dir() { return lang === 'ar' ? 'rtl' : 'ltr'; }
export const otherLang = () => (lang === 'ar' ? 'en' : 'ar');

export function setLang(l) {
  if (l !== 'ar' && l !== 'en') return;
  lang = l;
  try { localStorage.setItem(STORE_KEY, l); } catch { /* ignore */ }
  applyDocumentChrome();
}

/** Apply <html lang/dir>, document title/description, static [data-i18n] nodes and toggle. */
export function applyDocumentChrome() {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = dir();
  document.title = t('doc.title');

  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t('doc.desc'));

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.getAttribute('data-i18n'));
  });

  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.textContent = t('lang.toggle');
    toggle.setAttribute('aria-label', t('lang.toggle.aria'));
  }
}
