// CampusCoin — "Match the app"
//
// 1. Copies the current page to "<page> — original (backup)" so nothing is lost.
// 2. Restyles the current page towards the live app: app greens, dark
//    brand-950 sidebar, near-white background, Plus Jakarta Sans, white cards
//    with a 14px radius, hairline border and soft shadow, rounder buttons.
//    Only exact colours listed in COLOR_MAP change; images, icons, layout
//    and text content are left alone. The style guide frame is skipped.
// 3. Adds the app's loader (light, dark, mobile, and a two-frame Smart
//    Animate prototype of the coin flip) plus an "App style" tokens frame.
//
// Everything is one undo step (Ctrl/Cmd+Z), and the backup page stays.

var TARGET_FAMILY = 'Plus Jakarta Sans';
var SWAP_FAMILIES = ['Inter', 'Poppins'];
var BACKUP_SUFFIX = ' — original (backup)';
var ADDED_SECTION = 'Loader & app style (added)';

// Old design colour -> app colour (hex without #).
var COLOR_MAP = {
  // Primary action greens -> app primary (#16a34a) / accent
  '007755': '16a34a',
  '05a40f': '16a34a',
  '06a30e': '16a34a',
  '26c733': '22c55e',
  // Sidebar / dark greens -> brand-950 (app sidebar)
  '014c37': '052e16',
  '005238': '052e16',
  '004c36': '052e16',
  // Light green chips -> brand-100
  'b1fdb6': 'dcfce7',
  'd2fad5': 'dcfce7',
  'ccfacc': 'dcfce7',
  // Mint page backgrounds -> app background
  'e8f9e7': 'f8faf8',
  'e9f9e8': 'f8faf8',
  'edfaeb': 'f8faf8',
  'eafbee': 'f8faf8',
  // Pinkish off-whites -> the app's pure white cards
  'fbf8f8': 'ffffff',
  'fef8f8': 'ffffff',
  'fff8f8': 'ffffff',
  'fffbfb': 'ffffff',
  'fff6f6': 'ffffff',
  // Text
  '0f241c': '0f1712',
  '14211a': '0f1712',
  '14291f': '0f1712',
  '6b8079': '64766c',
  '576e5e': '64766c',
};
// Pure black is only swapped on text (icons and the phone mock keep theirs).
var TEXT_ONLY_MAP = { '000000': '0f1712' };

var APP = {
  primary: '16a34a',
  primaryHover: '15803d',
  sidebar: '052e16',
  background: 'f8faf8',
  surface: 'ffffff',
  text: '0f1712',
  textSecondary: '37473e',
  muted: '64766c',
  border: 'e3ebe6',
  brand100: 'dcfce7',
  accent: 'f59e0b',
  danger: 'ef4444',
  darkBg: '09120d',
  darkSurface: '13241a',
};

// ---------------------------------------------------------------- helpers

function hexOf(c) {
  return [c.r, c.g, c.b].map(function (v) {
    var s = Math.round(v * 255).toString(16);
    return s.length < 2 ? '0' + s : s;
  }).join('');
}

function rgb(hex) {
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

function solid(hex, opacity) {
  return { type: 'SOLID', color: rgb(hex), opacity: opacity === undefined ? 1 : opacity };
}

function hasBoundVariables(p) {
  return p.boundVariables && Object.keys(p.boundVariables).length > 0;
}

/** Returns a remapped copy of the paints, or null when nothing changes. */
function remapPaints(paints, isText) {
  if (!Array.isArray(paints) || paints.length === 0) return null;
  var changed = false;
  var out = paints.map(function (p) {
    if (p.type !== 'SOLID' || hasBoundVariables(p)) return p;
    var hex = hexOf(p.color);
    var to = COLOR_MAP[hex] || (isText ? TEXT_ONLY_MAP[hex] : undefined);
    if (!to) return p;
    changed = true;
    var copy = JSON.parse(JSON.stringify(p));
    copy.color = rgb(to);
    return copy;
  });
  return changed ? out : null;
}

function styleIdIsSet(id) {
  return id === figma.mixed || (typeof id === 'string' && id !== '');
}

function isInside(node, root) {
  var n = node;
  while (n) {
    if (n === root) return true;
    n = n.parent;
  }
  return false;
}

var WEIGHTS = [
  ['extralight', 200], ['ultralight', 200], ['thin', 100], ['light', 300],
  ['semibold', 600], ['demibold', 600], ['extrabold', 800], ['ultrabold', 800],
  ['bold', 700], ['medium', 500], ['black', 900], ['heavy', 900],
];

function weightOf(style) {
  var s = style.toLowerCase().replace(/[\s_-]/g, '');
  for (var i = 0; i < WEIGHTS.length; i++) if (s.indexOf(WEIGHTS[i][0]) !== -1) return WEIGHTS[i][1];
  return 400;
}

function isItalic(style) {
  return /italic|oblique/i.test(style);
}

/** Picks the Plus Jakarta Sans style closest in weight (same italic-ness). */
function makeFontMapper(targetStyles) {
  var cache = {};
  return function (fontName) {
    var key = fontName.style;
    if (cache[key]) return cache[key];
    var w = weightOf(fontName.style);
    var it = isItalic(fontName.style);
    var pool = targetStyles.filter(function (s) { return isItalic(s) === it; });
    if (!pool.length) pool = targetStyles;
    var best = pool[0];
    var bestDiff = Infinity;
    pool.forEach(function (s) {
      var d = Math.abs(weightOf(s) - w);
      if (d < bestDiff) { best = s; bestDiff = d; }
    });
    cache[key] = { family: TARGET_FAMILY, style: best };
    return cache[key];
  };
}

var loadedFonts = {};
async function loadFont(f) {
  var k = f.family + '/' + f.style;
  if (!(k in loadedFonts)) {
    try {
      await figma.loadFontAsync(f);
      loadedFonts[k] = true;
    } catch (e) {
      loadedFonts[k] = false;
    }
  }
  return loadedFonts[k];
}

async function targetFontStyles() {
  var all = await figma.listAvailableFontsAsync();
  return all
    .filter(function (f) { return f.fontName.family === TARGET_FAMILY; })
    .map(function (f) { return f.fontName.style; });
}

// ---------------------------------------------------------------- backup

async function backupPage(page) {
  var name = page.name + BACKUP_SUFFIX;
  for (var i = 0; i < figma.root.children.length; i++) {
    if (figma.root.children[i].name === name) return 'kept existing backup';
  }
  try {
    var copy = page.clone();
    copy.name = name;
    return 'backed up';
  } catch (e) {
    // Older API without PageNode.clone(): copy the top-level layers instead.
    var p = figma.createPage();
    p.name = name;
    page.children.forEach(function (child) {
      var c = child.clone();
      p.appendChild(c);
      c.x = child.x;
      c.y = child.y;
    });
    return 'backed up';
  }
}

// ---------------------------------------------------------------- restyle

async function remapLocalStyles(fontFor) {
  var n = 0;
  var paintStyles = await figma.getLocalPaintStylesAsync();
  paintStyles.forEach(function (s) {
    var next = remapPaints(s.paints, false);
    if (next) { s.paints = next; n++; }
  });
  var textStyles = await figma.getLocalTextStylesAsync();
  for (var i = 0; i < textStyles.length; i++) {
    var s = textStyles[i];
    if (!fontFor || SWAP_FAMILIES.indexOf(s.fontName.family) === -1) continue;
    var to = fontFor(s.fontName);
    if (await loadFont(to)) { s.fontName = to; n++; }
  }
  return n;
}

function remapNodePaints(node, stats) {
  var isText = node.type === 'TEXT';
  if ('fills' in node && !styleIdIsSet(node.fillStyleId)) {
    if (node.fills === figma.mixed) {
      // Mixed text colours: remap each run on its own.
      node.getStyledTextSegments(['fills', 'fillStyleId']).forEach(function (seg) {
        if (seg.fillStyleId) return;
        var next = remapPaints(seg.fills, true);
        if (next) { node.setRangeFills(seg.start, seg.end, next); stats.colors++; }
      });
    } else {
      var nf = remapPaints(node.fills, isText);
      if (nf) { node.fills = nf; stats.colors++; }
    }
  }
  if ('strokes' in node && !styleIdIsSet(node.strokeStyleId)) {
    var ns = remapPaints(node.strokes, false);
    if (ns) { node.strokes = ns; stats.colors++; }
  }
}

/** Text edits need every font in the layer loaded first. */
async function loadTextFonts(node) {
  if (node.hasMissingFont) return false;
  var len = node.characters.length;
  if (!len) return true;
  var existing = node.getRangeAllFontNames(0, len);
  for (var i = 0; i < existing.length; i++) {
    if (!(await loadFont(existing[i]))) return false;
  }
  return true;
}

function swapFonts(node, fontFor, stats) {
  if (!node.characters.length) return;
  var segs = node.getStyledTextSegments(['fontName', 'textStyleId']);
  var todo = segs.filter(function (s) { return !s.textStyleId && SWAP_FAMILIES.indexOf(s.fontName.family) !== -1; });
  if (!todo.length) return;
  for (var j = 0; j < todo.length; j++) {
    var seg = todo[j];
    var to = fontFor(seg.fontName);
    if (!loadedFonts[to.family + '/' + to.style]) continue;
    node.setRangeFontName(seg.start, seg.end, to);
    // Keep ₦ in its original font so the double-bar glyph survives.
    for (var k = 0; k < seg.characters.length; k++) {
      if (seg.characters[k] === '₦') node.setRangeFontName(seg.start + k, seg.start + k + 1, seg.fontName);
    }
  }
  stats.fonts++;
}

function isPlainWhite(node) {
  if (!('fills' in node) || node.fills === figma.mixed) return false;
  var f = node.fills.filter(function (p) { return p.visible !== false; });
  if (f.length !== 1 || f[0].type !== 'SOLID') return false;
  var c = f[0].color;
  return c.r > 0.985 && c.g > 0.985 && c.b > 0.985 && (f[0].opacity === undefined || f[0].opacity > 0.9);
}

function isPrimaryFill(node) {
  if (!('fills' in node) || node.fills === figma.mixed || node.fills.length !== 1) return false;
  var p = node.fills[0];
  return p.type === 'SOLID' && hexOf(p.color) === APP.primary;
}

var CARD_SHADOW = {
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.06 },
  offset: { x: 0, y: 1 },
  radius: 3,
  spread: 0,
  visible: true,
  blendMode: 'NORMAL',
};

/** White panels become app cards; green rectangles become rounder buttons. */
function polishShape(node, isTopLevel, stats) {
  if (isTopLevel) return;
  if (node.type !== 'RECTANGLE' && node.type !== 'FRAME') return;
  if (node.cornerRadius === figma.mixed) return;
  var w = node.width;
  var h = node.height;
  if (isPlainWhite(node) && w >= 80 && h >= 50 && !(w > 1000 && h > 700)) {
    if (node.cornerRadius < 12) node.cornerRadius = 14;
    if (!node.strokes.length) {
      node.strokes = [solid(APP.border)];
      node.strokeWeight = 1;
      node.strokeAlign = 'INSIDE';
    }
    if (!node.effects.length && !styleIdIsSet(node.effectStyleId)) node.effects = [CARD_SHADOW];
    stats.cards++;
  } else if (isPrimaryFill(node) && w >= 40 && h >= 16 && h <= 56 && w > h * 1.6) {
    var r = Math.round(Math.min(12, h * 0.28));
    if (node.cornerRadius < r) { node.cornerRadius = r; stats.buttons++; }
  }
}

async function restyle(page) {
  await page.loadAsync();
  var styleGuides = page.children.filter(function (n) { return /style guide/i.test(n.name); });
  var skip = function (n) {
    for (var i = 0; i < styleGuides.length; i++) if (isInside(n, styleGuides[i])) return true;
    return n.name === ADDED_SECTION || (n.parent && n.parent.name === ADDED_SECTION);
  };

  var styles = await targetFontStyles();
  var fontFor = styles.length ? makeFontMapper(styles) : null;
  if (fontFor) {
    // Load every Plus Jakarta Sans style up front so swaps never wait.
    for (var s = 0; s < styles.length; s++) await loadFont({ family: TARGET_FAMILY, style: styles[s] });
  }
  var stats = { colors: 0, fonts: 0, cards: 0, buttons: 0, skippedText: 0, styles: 0 };
  stats.styles = await remapLocalStyles(fontFor);

  var nodes = page.findAll(function (n) { return !skip(n); });
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    try {
      if (n.type === 'TEXT') {
        if (!(await loadTextFonts(n))) { stats.skippedText++; continue; }
        remapNodePaints(n, stats);
        if (fontFor) swapFonts(n, fontFor, stats);
      } else {
        remapNodePaints(n, stats);
        polishShape(n, n.parent === page, stats);
      }
    } catch (e) {
      console.warn('Skipped ' + n.name + ': ' + e.message);
    }
  }
  stats.noTargetFont = !fontFor;
  return stats;
}

// ---------------------------------------------------------------- loader

var NAIRA_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="23" height="18" viewBox="-3 0 26 20">' +
  '<path fill="#FFFFFF" d="M0 0H4.6L15.4 13.2V0H20V20H15.4L4.6 6.8V20H0Z"/>' +
  '<rect fill="#FFFFFF" x="-3" y="6" width="26" height="2.3"/>' +
  '<rect fill="#FFFFFF" x="-3" y="11.7" width="26" height="2.3"/>' +
  '</svg>';

function coin() {
  var c = figma.createFrame();
  c.name = 'Coin';
  c.resize(56, 56);
  c.fills = [];
  c.clipsContent = false;

  var face = figma.createEllipse();
  face.name = 'Face';
  face.resize(56, 56);
  // CSS linear-gradient(135deg, #6ee7a8 0%, #16a34a 55%, #0f5c30 100%)
  face.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0.5, 0.5, 0], [-0.5, 0.5, 0.5]],
    gradientStops: [
      { position: 0, color: { r: 0x6e / 255, g: 0xe7 / 255, b: 0xa8 / 255, a: 1 } },
      { position: 0.55, color: { r: 0x16 / 255, g: 0xa3 / 255, b: 0x4a / 255, a: 1 } },
      { position: 1, color: { r: 0x0f / 255, g: 0x5c / 255, b: 0x30 / 255, a: 1 } },
    ],
  }];
  face.strokes = [solid('0b3b20')];
  face.strokeWeight = 2;
  face.strokeAlign = 'INSIDE';
  face.effects = [{
    type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.24 }, offset: { x: 0, y: 8 },
    radius: 14, spread: 0, visible: true, blendMode: 'NORMAL',
  }];
  c.appendChild(face);

  var ring = figma.createEllipse();
  ring.name = 'Rim';
  ring.resize(52, 52);
  ring.x = 2;
  ring.y = 2;
  ring.fills = [];
  ring.strokes = [solid('ffffff', 0.28)];
  ring.strokeWeight = 5;
  ring.strokeAlign = 'INSIDE';
  c.appendChild(ring);

  var glyph = figma.createNodeFromSvg(NAIRA_SVG);
  glyph.name = '₦';
  glyph.fills = [];
  c.appendChild(glyph);
  glyph.x = Math.round((56 - glyph.width) / 2);
  glyph.y = Math.round((56 - glyph.height) / 2);
  return c;
}

function text(chars, size, style, hex, opts) {
  var t = figma.createText();
  t.fontName = { family: opts.family, style: style };
  t.characters = chars;
  t.fontSize = size;
  t.fills = [solid(hex)];
  if (opts.letterSpacing) t.letterSpacing = { unit: 'PERCENT', value: opts.letterSpacing };
  t.textAlignHorizontal = 'CENTER';
  return t;
}

function loaderFrame(name, w, h, dark, fonts) {
  var f = figma.createFrame();
  f.name = name;
  f.fills = [solid(dark ? '071c14' : 'e5f1e8')];
  f.layoutMode = 'VERTICAL';
  f.resize(w, h);
  f.layoutSizingHorizontal = 'FIXED';
  f.layoutSizingVertical = 'FIXED';
  f.primaryAxisAlignItems = 'CENTER';
  f.counterAxisAlignItems = 'CENTER';
  f.itemSpacing = 4;

  var wrap = figma.createFrame();
  wrap.name = 'Coin + shadow';
  wrap.resize(64, 80);
  wrap.fills = [];
  wrap.clipsContent = false;
  var c = coin();
  wrap.appendChild(c);
  c.x = 4;
  c.y = 0;
  var shadow = figma.createEllipse();
  shadow.name = 'Shadow';
  shadow.resize(36, 8);
  shadow.x = 14;
  shadow.y = 68;
  shadow.fills = [solid('000000', 0.3)];
  shadow.effects = [{ type: 'LAYER_BLUR', radius: 3, visible: true }];
  wrap.appendChild(shadow);
  f.appendChild(wrap);

  f.appendChild(text('CAMPUS COIN', 13, fonts.heavy, dark ? 'f1f7f3' : '176c42', { family: fonts.family, letterSpacing: 14 }));
  f.appendChild(text('Getting your campus wallet ready', 14, fonts.regular, dark ? 'a8bbb1' : '5c7568', { family: fonts.family }));
  return f;
}

/** Second state of the flip: coin edge-on, lifted 5px, shadow shrunk. */
function flipState(frame) {
  var wrap = frame.findOne(function (n) { return n.name === 'Coin + shadow'; });
  var c = wrap.findOne(function (n) { return n.name === 'Coin'; });
  c.y = -5;
  ['Face', 'Rim'].forEach(function (nm) {
    var e = c.findOne(function (n) { return n.name === nm; });
    var cx = e.x + e.width / 2;
    e.resize(nm === 'Face' ? 6 : 4, e.height);
    e.x = cx - e.width / 2;
  });
  c.findOne(function (n) { return n.name === '₦'; }).opacity = 0;
  var s = wrap.findOne(function (n) { return n.name === 'Shadow'; });
  s.resize(27, 8);
  s.x = 32 - 13.5;
  s.opacity = 0.55;
}

async function linkFlip(a, b) {
  function go(dest) {
    return {
      trigger: { type: 'AFTER_TIMEOUT', timeout: 0.6 },
      actions: [{
        type: 'NODE',
        destinationId: dest.id,
        navigation: 'NAVIGATE',
        transition: { type: 'SMART_ANIMATE', easing: { type: 'EASE_IN_AND_OUT' }, duration: 0.6 },
      }],
    };
  }
  await a.setReactionsAsync([go(b)]);
  await b.setReactionsAsync([go(a)]);
  var flows = figma.currentPage.flowStartingPoints.slice();
  flows.push({ nodeId: a.id, name: 'Loader' });
  figma.currentPage.flowStartingPoints = flows;
}

function swatch(label, hex, fonts) {
  var row = figma.createFrame();
  row.name = label;
  row.layoutMode = 'HORIZONTAL';
  row.counterAxisAlignItems = 'CENTER';
  row.layoutSizingHorizontal = 'HUG';
  row.layoutSizingVertical = 'HUG';
  row.itemSpacing = 12;
  row.fills = [];
  var chip = figma.createRectangle();
  chip.resize(40, 40);
  chip.cornerRadius = 10;
  chip.fills = [solid(hex)];
  chip.strokes = [solid(APP.border)];
  chip.strokeAlign = 'INSIDE';
  row.appendChild(chip);
  var t = figma.createText();
  t.fontName = { family: fonts.family, style: fonts.regular };
  t.characters = label + '\n#' + hex.toUpperCase();
  t.fontSize = 12;
  t.lineHeight = { unit: 'PIXELS', value: 17 };
  t.fills = [solid(APP.textSecondary)];
  row.appendChild(t);
  return row;
}

function tokensFrame(fonts) {
  var f = figma.createFrame();
  f.name = 'App style — tokens';
  f.layoutMode = 'VERTICAL';
  f.resize(720, 100);
  f.layoutSizingHorizontal = 'FIXED';
  f.layoutSizingVertical = 'HUG';
  f.paddingTop = f.paddingBottom = 40;
  f.paddingLeft = f.paddingRight = 40;
  f.itemSpacing = 20;
  f.cornerRadius = 20;
  f.fills = [solid(APP.surface)];
  f.strokes = [solid(APP.border)];
  f.strokeAlign = 'INSIDE';
  f.effects = [CARD_SHADOW];

  var title = figma.createText();
  title.fontName = { family: fonts.family, style: fonts.heavy };
  title.characters = 'CampusCoin app style';
  title.fontSize = 24;
  title.fills = [solid(APP.text)];
  f.appendChild(title);

  var sub = figma.createText();
  sub.fontName = { family: fonts.family, style: fonts.regular };
  sub.characters = 'Font: ' + fonts.family + ' (400–800). Cards: white, 14px radius, 1px #E3EBE6 border, soft shadow. Buttons: primary green, 12px radius. Sidebar: brand-950 with white/70 labels.';
  sub.fontSize = 14;
  sub.lineHeight = { unit: 'PIXELS', value: 21 };
  sub.fills = [solid(APP.muted)];
  f.appendChild(sub);
  sub.layoutSizingHorizontal = 'FILL';
  sub.textAutoResize = 'HEIGHT';

  var grid = figma.createFrame();
  grid.name = 'Swatches';
  grid.layoutMode = 'HORIZONTAL';
  grid.layoutWrap = 'WRAP';
  grid.itemSpacing = 24;
  grid.counterAxisSpacing = 18;
  grid.fills = [];
  f.appendChild(grid);
  grid.layoutSizingHorizontal = 'FILL';
  grid.layoutSizingVertical = 'HUG';
  [
    ['Primary', APP.primary], ['Primary hover', APP.primaryHover], ['Sidebar', APP.sidebar],
    ['Background', APP.background], ['Surface', APP.surface], ['Text', APP.text],
    ['Text secondary', APP.textSecondary], ['Muted', APP.muted], ['Brand 100', APP.brand100],
    ['Accent', APP.accent], ['Danger', APP.danger], ['Dark background', APP.darkBg],
    ['Dark surface', APP.darkSurface], ['Loader mint', 'e5f1e8'],
  ].forEach(function (s) { grid.appendChild(swatch(s[0], s[1], fonts)); });
  return f;
}

async function pickFonts() {
  var styles = await targetFontStyles();
  if (styles.length) {
    var map = makeFontMapper(styles);
    var heavy = map({ family: 'x', style: 'ExtraBold' }).style;
    var regular = map({ family: 'x', style: 'Regular' }).style;
    if ((await loadFont({ family: TARGET_FAMILY, style: heavy })) && (await loadFont({ family: TARGET_FAMILY, style: regular }))) {
      return { family: TARGET_FAMILY, heavy: heavy, regular: regular };
    }
  }
  await loadFont({ family: 'Inter', style: 'Extra Bold' });
  await loadFont({ family: 'Inter', style: 'Regular' });
  return { family: 'Inter', heavy: 'Extra Bold', regular: 'Regular' };
}

async function addLoader(page) {
  await page.loadAsync();
  for (var i = 0; i < page.children.length; i++) {
    if (page.children[i].name === ADDED_SECTION) return 'loader already added';
  }
  var fonts = await pickFonts();

  var minX = Infinity;
  var minY = Infinity;
  page.children.forEach(function (n) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
  });
  if (minX === Infinity) { minX = 0; minY = 0; }

  var gap = 120;
  var light = loaderFrame('Loader — Light', 1440, 900, false, fonts);
  var flip = loaderFrame('Loader — Light (flip)', 1440, 900, false, fonts);
  flipState(flip);
  var dark = loaderFrame('Loader — Dark', 1440, 900, true, fonts);
  var mobile = loaderFrame('Loader — Mobile', 390, 844, false, fonts);
  var tokens = tokensFrame(fonts);

  var section = figma.createSection();
  section.name = ADDED_SECTION;
  page.appendChild(section);
  var x = 80;
  [light, flip, dark, mobile, tokens].forEach(function (f) {
    section.appendChild(f);
    f.x = x;
    f.y = 120;
    x += f.width + gap;
  });

  var note = figma.createText();
  note.name = 'Note';
  note.fontName = { family: fonts.family, style: fonts.regular };
  note.characters = 'Loader matches the app (index.html #initial-page-loader). Present “Loader — Light” to see the coin flip: the two light frames Smart Animate into each other every 0.6s.';
  note.fontSize = 16;
  note.fills = [solid(APP.muted)];
  section.appendChild(note);
  note.x = 80;
  note.y = 48;

  var height = 120 + Math.max(900, tokens.height) + 120;
  section.resizeWithoutConstraints(x - gap + 80, height);
  section.x = minX;
  section.y = minY - height - 200;

  try {
    await linkFlip(light, flip);
  } catch (e) {
    console.warn('Could not wire the flip prototype: ' + e.message);
  }
  figma.viewport.scrollAndZoomIntoView([section]);
  return 'loader added';
}

// ---------------------------------------------------------------- run

if (typeof figma === 'undefined') {
  // Someone ran `node code.js`: this file only works inside Figma.
  console.log('This is a Figma plugin, not a Node script. In the Figma desktop app open your file, then use\n' +
    'Menu > Plugins > Development > Import plugin from manifest... and pick manifest.json from this folder.\n' +
    'Then run it from Menu > Plugins > Development > CampusCoin — Match the app.');
} else (async function main() {
  var page = figma.currentPage;
  try {
    if (page.name.indexOf(BACKUP_SUFFIX) !== -1) {
      figma.closePlugin('This is the backup page — open the page you want to restyle and run it there.');
      return;
    }
    if (figma.command === 'loader') {
      var r = await addLoader(page);
      figma.closePlugin('CampusCoin: ' + r + '.');
      return;
    }
    figma.notify('CampusCoin: backing up “' + page.name + '”…');
    var b = await backupPage(page);
    var s = await restyle(page);
    var l = await addLoader(page);
    var parts = [
      b,
      s.colors + ' colours',
      s.fonts + ' text layers → ' + TARGET_FAMILY,
      s.cards + ' cards',
      s.buttons + ' buttons',
      l,
    ];
    if (s.noTargetFont) parts.push('Plus Jakarta Sans not found, fonts left as they were');
    if (s.skippedText) parts.push(s.skippedText + ' text layers skipped (missing fonts)');
    figma.closePlugin('CampusCoin: ' + parts.join(' · ') + '. Undo with Ctrl/Cmd+Z.');
  } catch (e) {
    figma.closePlugin('CampusCoin: stopped — ' + e.message + '. Undo with Ctrl/Cmd+Z; the backup page is untouched.');
  }
})();
