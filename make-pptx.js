/**
 * CampusCoin — PowerPoint Generator
 * Team Flandek · November 2026
 *
 * Run:  node make-pptx.js
 * Output: CampusCoin-Flandek.pptx  (same folder)
 */

const PptxGenJS = require('pptxgenjs');
const fs  = require('fs');
const path = require('path');

const prs = new PptxGenJS();
prs.layout = 'LAYOUT_16x9';
prs.title  = 'CampusCoin — Team Flandek';
prs.author = 'Team Flandek';

/* ── colours ──────────────────────────────── */
const G   = '1c8f53';   // brand green
const GD  = '157a44';   // dark green
const GL  = 'edf7f1';   // light green bg
const TXT = '111827';   // near-black text
const MUT = '6b7280';   // muted grey
const BDR = 'e5e7eb';   // border
const BG  = 'f9fafb';   // slide bg tint
const WHT = 'ffffff';
const GLD = 'd97706';   // gold
const RED = 'dc2626';   // red

/* ── helpers ──────────────────────────────── */
const A = (p) => path.join(__dirname, 'pres-assets', p);

/** embed an image file as a base64 data-uri string */
function img(filename) {
  const full = A(filename);
  if (!fs.existsSync(full)) { console.warn('Missing:', full); return null; }
  const ext  = path.extname(filename).replace('.','').toLowerCase();
  const mime = ext === 'webp' ? 'image/webp'
             : ext === 'png'  ? 'image/png'
             : 'image/jpeg';
  const b64  = fs.readFileSync(full).toString('base64');
  return `data:${mime};base64,${b64}`;
}

/** shorthand: add a section label + heading pair */
function header(sld, label, title, titleSize = 22, y = 1.05) {
  sld.addText(label.toUpperCase(), {
    x: 0.6, y, w: 8.8, h: 0.22,
    fontSize: 7.5, bold: true, color: G, charSpacing: 2,
  });
  sld.addText(title, {
    x: 0.6, y: y + 0.22, w: 8.8, h: 0.7,
    fontSize: titleSize, bold: true, color: TXT,
  });
}

/** slide background + top green bar */
function base(sld, bgColor = WHT) {
  sld.background = { color: bgColor };
  sld.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.045,
    fill: { type: 'gradient', stops: [{ position: 0, color: G }, { position: 100, color: '34d399' }] },
    line: { type: 'none' },
  });
}

/** small branded top-left header (for inner slides) */
function brandBar(sld, tagText) {
  const logoData = img('logo.png');
  if (logoData) sld.addImage({ data: logoData, x: 0.35, y: 0.12, w: 0.36, h: 0.36 });
  sld.addText([
    { text: 'Campus', options: { color: TXT } },
    { text: 'Coin',   options: { color: G   } },
  ], { x: 0.78, y: 0.14, w: 1.8, h: 0.32, fontSize: 12, bold: true });

  sld.addShape(prs.ShapeType.roundRect, {
    x: 8.2, y: 0.14, w: 1.55, h: 0.25,
    fill: { color: GL }, line: { color: 'c8e6d4', pt: 1 }, rectRadius: 0.12,
  });
  sld.addText(tagText.toUpperCase(), {
    x: 8.2, y: 0.14, w: 1.55, h: 0.25,
    fontSize: 6.5, bold: true, color: G, align: 'center', charSpacing: 1.5,
  });
  // thin border under header
  sld.addShape(prs.ShapeType.rect, {
    x: 0, y: 0.55, w: 10, h: 0.012, fill: { color: BDR }, line: { type: 'none' },
  });
}

/** icon box — just a coloured square with a letter label (pptx has no lucide) */
function iconBox(sld, letter, x, y, color = G, bgColor = GL) {
  sld.addShape(prs.ShapeType.roundRect, {
    x, y, w: 0.32, h: 0.32,
    fill: { color: bgColor }, line: { color: bgColor, pt: 0 }, rectRadius: 0.06,
  });
  sld.addText(letter, {
    x, y, w: 0.32, h: 0.32,
    fontSize: 10, bold: true, color, align: 'center', valign: 'middle',
  });
}

/** a card-style background rect */
function cardRect(sld, x, y, w, h, fill = BG, lineColor = BDR, radius = 0.1) {
  sld.addShape(prs.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: fill }, line: { color: lineColor, pt: 1 }, rectRadius: radius,
  });
}


/* ════════════════════════════════════════════════════
   SLIDE 1 — TITLE
════════════════════════════════════════════════════ */
(function () {
  const sld = prs.addSlide();
  base(sld);

  // left white side (default)
  // right photo panel
  const heroData = img('herosld1.png');
  if (heroData) sld.addImage({ data: heroData, x: 4.85, y: 0, w: 5.15, h: 5.63, sizing: { type: 'cover' } });
  // gradient overlay on right side
  sld.addShape(prs.ShapeType.rect, {
    x: 4.85, y: 0, w: 1.5, h: 5.63,
    fill: { type: 'gradient', angle: 90, stops: [{ position: 0, color: 'ffffff', transparency: 0 }, { position: 100, color: 'ffffff', transparency: 100 }] },
    line: { type: 'none' },
  });

  // phone mockup over photo
  const phoneData = img('herophone.png');
  if (phoneData) sld.addImage({ data: phoneData, x: 6.2, y: 0.4, w: 2.1, h: 3.4 });

  // logo
  const logoData = img('logo.png');
  if (logoData) sld.addImage({ data: logoData, x: 0.55, y: 0.75, w: 0.75, h: 0.75 });

  // app name
  sld.addText([
    { text: 'Campus', options: { color: TXT } },
    { text: 'Coin',   options: { color: G   } },
  ], { x: 1.38, y: 0.75, w: 3.2, h: 0.72, fontSize: 38, bold: true });

  sld.addText('STUDENT FINANCE PLATFORM', {
    x: 1.38, y: 1.52, w: 3.2, h: 0.22,
    fontSize: 7, bold: true, color: MUT, charSpacing: 2,
  });

  sld.addText('A smart budgeting app built for students —\nno bank account or credit card required.', {
    x: 0.55, y: 1.95, w: 4.0, h: 0.65,
    fontSize: 11.5, color: MUT, lineSpacingMultiple: 1.3,
  });

  // chips row
  const chips = [
    { t: 'Team Flandek', bg: G, fg: WHT },
    { t: 'November 2026', bg: BG, fg: TXT },
    { t: 'Full-Stack Web App', bg: BG, fg: TXT },
  ];
  let cx = 0.55;
  chips.forEach(c => {
    const cw = c.t.length * 0.075 + 0.3;
    sld.addShape(prs.ShapeType.roundRect, { x: cx, y: 2.78, w: cw, h: 0.28, fill: { color: c.bg }, line: { color: BDR, pt: 1 }, rectRadius: 0.14 });
    sld.addText(c.t, { x: cx, y: 2.78, w: cw, h: 0.28, fontSize: 8.5, bold: true, color: c.fg, align: 'center' });
    cx += cw + 0.1;
  });

  // mini badges
  const badges = ['8 Currencies', 'AI-Powered', '100% Free', 'No Bank Needed'];
  cx = 0.55;
  badges.forEach(b => {
    const bw = b.length * 0.068 + 0.22;
    sld.addShape(prs.ShapeType.roundRect, { x: cx, y: 3.18, w: bw, h: 0.24, fill: { color: GL }, line: { color: 'c8e6d4', pt: 1 }, rectRadius: 0.12 });
    sld.addText(b, { x: cx, y: 3.18, w: bw, h: 0.24, fontSize: 7.5, bold: true, color: G, align: 'center' });
    cx += bw + 0.08;
  });

  sld.addText('"Smart money, Brighter Future."', {
    x: 0.55, y: 3.6, w: 4.0, h: 0.25,
    fontSize: 10, italic: true, color: MUT,
  });
})();


/* ════════════════════════════════════════════════════
   SLIDE 2 — PROBLEM / SOLUTION
════════════════════════════════════════════════════ */
(function () {
  const sld = prs.addSlide();
  base(sld);
  brandBar(sld, 'Problem → Solution');

  // ── LEFT: Problem ──
  header(sld, 'The Problem', "Students struggle with money\nevery semester.", 18, 0.72);

  const problems = [
    { icon: '👁', title: 'No Visibility', desc: 'Allowances, gigs, scholarships — no single place to track it all.' },
    { icon: '⛔', title: 'Wrong Tools',   desc: 'Existing apps assume a bank account and salary. Most students have neither.' },
    { icon: '❓', title: 'No Guidance',   desc: 'Nobody teaches finance in school. Students only notice overspending at month-end.' },
  ];

  problems.forEach((p, i) => {
    const y = 1.7 + i * 0.7;
    cardRect(sld, 0.35, y, 4.35, 0.58, BG, BDR);
    // red left accent
    sld.addShape(prs.ShapeType.rect, { x: 0.35, y, w: 0.03, h: 0.58, fill: { color: RED }, line: { type: 'none' } });
    sld.addText(p.title, { x: 0.55, y: y + 0.06, w: 4.0, h: 0.2, fontSize: 10, bold: true, color: TXT });
    sld.addText(p.desc,  { x: 0.55, y: y + 0.27, w: 4.0, h: 0.24, fontSize: 8.5, color: MUT, lineSpacingMultiple: 1.2 });
  });

  // quote box
  cardRect(sld, 0.35, 3.83, 4.35, 0.5, 'fef3c7', 'fcd34d');
  sld.addShape(prs.ShapeType.rect, { x: 0.35, y: 3.83, w: 0.03, h: 0.5, fill: { color: GLD }, line: { type: 'none' } });
  sld.addText('"100% of students handle money.\n0% of them were taught how."', {
    x: 0.55, y: 3.87, w: 4.0, h: 0.42,
    fontSize: 9.5, italic: true, bold: true, color: '92400e', lineSpacingMultiple: 1.3,
  });

  // ── RIGHT: Solution ──
  sld.addText('OUR ANSWER', { x: 5.1, y: 0.72, w: 4.5, h: 0.22, fontSize: 7.5, bold: true, color: G, charSpacing: 2 });
  sld.addText('Built for campus life.\nNo bank needed.', { x: 5.1, y: 0.94, w: 4.5, h: 0.72, fontSize: 18, bold: true, color: TXT });

  const pillars = [
    { n: '01', t: 'Track',   d: 'Log income and expenses in seconds with campus-tuned categories.' },
    { n: '02', t: 'Plan',    d: 'Set monthly budgets and savings goals with live progress tracking.' },
    { n: '03', t: 'Improve', d: 'AI insights and personalised tips from your actual spending habits.' },
  ];

  const pw = 1.38;
  pillars.forEach((p, i) => {
    const x = 5.1 + i * (pw + 0.1);
    cardRect(sld, x, 1.82, pw, 1.55, GL, 'c8e6d4');
    // top accent
    sld.addShape(prs.ShapeType.rect, { x, y: 1.82, w: pw, h: 0.035, fill: { color: G }, line: { type: 'none' } });
    sld.addText(p.n, { x, y: 1.88, w: pw, h: 0.35, fontSize: 22, bold: true, color: 'c8e6d4', align: 'center' });
    sld.addText(p.t, { x, y: 2.24, w: pw, h: 0.2,  fontSize: 10, bold: true, color: TXT, align: 'center' });
    sld.addText(p.d, { x: x + 0.1, y: 2.46, w: pw - 0.2, h: 0.75, fontSize: 8, color: MUT, align: 'center', lineSpacingMultiple: 1.25 });
  });

  // campus photo strip
  const campusData = img('herosld3.png');
  if (campusData) sld.addImage({ data: campusData, x: 5.1, y: 3.5, w: 4.5, h: 0.9, sizing: { type: 'cover' } });
  sld.addShape(prs.ShapeType.rect, { x: 5.1, y: 3.5, w: 2.0, h: 0.9, fill: { type: 'gradient', angle: 90, stops: [{ position: 0, color: 'ffffff', transparency: 0 }, { position: 100, color: 'ffffff', transparency: 100 }] }, line: { type: 'none' } });

  const badgesR = ['8 Currencies', 'No Bank Account'];
  let bx = 5.25;
  badgesR.forEach(b => {
    const bw = b.length * 0.068 + 0.22;
    sld.addShape(prs.ShapeType.roundRect, { x: bx, y: 4.08, w: bw, h: 0.24, fill: { color: WHT, transparency: 10 }, line: { color: BDR, pt: 1 }, rectRadius: 0.12 });
    sld.addText(b, { x: bx, y: 4.08, w: bw, h: 0.24, fontSize: 7.5, bold: true, color: G, align: 'center' });
    bx += bw + 0.12;
  });
})();


/* ════════════════════════════════════════════════════
   SLIDE 3 — 10 FEATURES
════════════════════════════════════════════════════ */
(function () {
  const sld = prs.addSlide();
  base(sld, BG);
  brandBar(sld, '10 Features');

  sld.addText('WHAT WE BUILT', { x: 0.5, y: 0.72, w: 9, h: 0.2, fontSize: 7.5, bold: true, color: G, charSpacing: 2 });
  sld.addText([
    { text: 'Everything a student needs. ', options: { color: TXT } },
    { text: "Nothing they don't.",          options: { color: G   } },
  ], { x: 0.5, y: 0.92, w: 9, h: 0.42, fontSize: 20, bold: true });

  const features = [
    { icon: '▦', t: 'Dashboard',       d: 'Balance, income, expenses & budgets at a glance' },
    { icon: '₿', t: 'Transactions',    d: 'Add, edit, search, filter, delete & restore' },
    { icon: '📅', t: 'Budgets',        d: 'Monthly limits with live progress bars' },
    { icon: '📈', t: 'Reports',        d: '6-month trends, heatmap, 5 export formats' },
    { icon: '🤖', t: 'AI Assistant',   d: 'Proposes changes — you approve first' },
    { icon: '🏆', t: 'Savings Goals',  d: 'Target + deadline + milestone badges' },
    { icon: '🔄', t: 'Recurring',      d: 'Auto-post daily/weekly/monthly transactions' },
    { icon: '↑', t: 'Import & Export', d: 'CSV, Excel, ODS, JSON in — 5 formats out' },
    { icon: '💡', t: 'Saving Tips',    d: 'Personalised tips from real spending' },
    { icon: '🔔', t: 'Notifications',  d: 'Budget alerts & announcements in one feed' },
  ];

  const cols = 5, cellW = 1.84, cellH = 1.42, startX = 0.35, startY = 1.48, gapX = 0.08, gapY = 0.08;
  features.forEach((f, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (cellW + gapX);
    const y = startY + row * (cellH + gapY);
    cardRect(sld, x, y, cellW, cellH, WHT, BDR);
    // icon box
    cardRect(sld, x + 0.14, y + 0.14, 0.34, 0.34, GL, 'c8e6d4', 0.07);
    sld.addText(f.icon, { x: x + 0.14, y: y + 0.14, w: 0.34, h: 0.34, fontSize: 11, align: 'center', valign: 'middle' });
    sld.addText(f.t, { x: x + 0.12, y: y + 0.56, w: cellW - 0.24, h: 0.22, fontSize: 10, bold: true, color: TXT });
    sld.addText(f.d, { x: x + 0.12, y: y + 0.8,  w: cellW - 0.24, h: 0.5,  fontSize: 8, color: MUT, lineSpacingMultiple: 1.25 });
  });
})();


/* ════════════════════════════════════════════════════
   SLIDE 4 — AI + TECH STACK
════════════════════════════════════════════════════ */
(function () {
  const sld = prs.addSlide();
  base(sld);
  brandBar(sld, 'AI + Tech Stack');

  // ── LEFT: AI ──
  sld.addText('AI ASSISTANT', { x: 0.4, y: 0.72, w: 4.4, h: 0.2, fontSize: 7.5, bold: true, color: G, charSpacing: 2 });
  sld.addText([
    { text: 'Ask anything.\n', options: { color: TXT } },
    { text: 'Let it do the work.', options: { color: G } },
  ], { x: 0.4, y: 0.92, w: 4.4, h: 0.7, fontSize: 18, bold: true, lineSpacingMultiple: 1.2 });

  const aiData = img('ai-assistant.webp');
  if (aiData) {
    sld.addShape(prs.ShapeType.roundRect, { x: 0.4, y: 1.72, w: 4.4, h: 2.45, fill: { color: BG }, line: { color: BDR, pt: 1 }, rectRadius: 0.1 });
    sld.addImage({ data: aiData, x: 0.41, y: 1.73, w: 4.38, h: 2.43, sizing: { type: 'cover', align: 'left', valign: 'top' } });
  }

  cardRect(sld, 0.4, 4.26, 4.4, 0.54, GL, 'c8e6d4');
  sld.addText('SAFEGUARD', { x: 0.55, y: 4.3, w: 4.1, h: 0.18, fontSize: 7, bold: true, color: G, charSpacing: 1.5 });
  sld.addText('The AI never saves anything without your explicit approval. Every proposed change is shown first.', {
    x: 0.55, y: 4.48, w: 4.1, h: 0.28, fontSize: 8.5, color: MUT, lineSpacingMultiple: 1.2,
  });

  // badges
  [['Groq (primary)', GL, G], ['Gemini (fallback)', BG, TXT]].forEach(([t, bg, fg], i) => {
    const bw = 1.3;
    const bx = 0.4 + i * (bw + 0.12);
    sld.addShape(prs.ShapeType.roundRect, { x: bx, y: 4.9, w: bw, h: 0.24, fill: { color: bg }, line: { color: BDR, pt: 1 }, rectRadius: 0.12 });
    sld.addText(t, { x: bx, y: 4.9, w: bw, h: 0.24, fontSize: 8, bold: true, color: fg, align: 'center' });
  });

  // ── RIGHT: Tech ──
  sld.addText('TECH STACK', { x: 5.2, y: 0.72, w: 4.4, h: 0.2, fontSize: 7.5, bold: true, color: G, charSpacing: 2 });

  const dashData = img('dashboard.webp');
  if (dashData) {
    sld.addShape(prs.ShapeType.roundRect, { x: 5.2, y: 0.92, w: 4.4, h: 1.55, fill: { color: BG }, line: { color: BDR, pt: 1 }, rectRadius: 0.1 });
    sld.addImage({ data: dashData, x: 5.21, y: 0.93, w: 4.38, h: 1.53, sizing: { type: 'cover', align: 'left', valign: 'top' } });
  }

  const techRows = [
    { section: 'FRONTEND', items: [
      ['React 18 + TypeScript 5.6', 'UI + types'],
      ['Vite 6 + Tailwind 3.4',    'Build + styles'],
      ['Framer Motion + Recharts',  'Animations + charts'],
      ['SheetJS 0.20',              'Excel/CSV'],
    ]},
    { section: 'BACKEND & INFRASTRUCTURE', items: [
      ['Node.js + Express 5',       'API server'],
      ['MongoDB Atlas + Mongoose',  'Database'],
      ['JWT + bcrypt + helmet',     'Auth + security'],
      ['pdfkit + nodemailer',       'PDF + email'],
      ['Vercel (frontend + fn)',    'Hosting'],
    ]},
  ];

  let ty = 2.62;
  techRows.forEach(sec => {
    sld.addText(sec.section, { x: 5.2, y: ty, w: 4.4, h: 0.2, fontSize: 7, bold: true, color: G, charSpacing: 1.5 });
    ty += 0.22;
    sec.items.forEach(([name, desc]) => {
      sld.addText(name, { x: 5.2,  y: ty, w: 2.7, h: 0.22, fontSize: 9, bold: true, color: TXT });
      sld.addText(desc, { x: 7.95, y: ty, w: 1.65, h: 0.22, fontSize: 8.5, color: MUT, align: 'right' });
      sld.addShape(prs.ShapeType.rect, { x: 5.2, y: ty + 0.21, w: 4.4, h: 0.008, fill: { color: BDR }, line: { type: 'none' } });
      ty += 0.27;
    });
    ty += 0.1;
  });

  // footer badges
  [['40+ endpoints', GL, G], ['Daily backup', GL, G]].forEach(([t, bg, fg], i) => {
    const bw = 1.2, bx = 5.2 + i * (bw + 0.12);
    sld.addShape(prs.ShapeType.roundRect, { x: bx, y: 5.2, w: bw, h: 0.24, fill: { color: bg }, line: { color: 'c8e6d4', pt: 1 }, rectRadius: 0.12 });
    sld.addText(t, { x: bx, y: 5.2, w: bw, h: 0.24, fontSize: 8, bold: true, color: fg, align: 'center' });
  });
})();


/* ════════════════════════════════════════════════════
   SLIDE 5 — ADMIN + TEST RESULTS
════════════════════════════════════════════════════ */
(function () {
  const sld = prs.addSlide();
  base(sld, BG);
  brandBar(sld, 'Admin + Deployment');

  // ── LEFT: Admin ──
  sld.addText('ADMIN CONSOLE', { x: 0.4, y: 0.72, w: 5.2, h: 0.2, fontSize: 7.5, bold: true, color: G, charSpacing: 2 });
  sld.addText([
    { text: 'Full platform management, ', options: { color: TXT } },
    { text: 'built in.',                   options: { color: G   } },
  ], { x: 0.4, y: 0.92, w: 5.2, h: 0.38, fontSize: 17, bold: true });

  // two screenshots side by side
  const rptData = img('reports.webp'), budData = img('budgets.webp');
  if (rptData) {
    cardRect(sld, 0.4,  1.38, 2.52, 1.3, WHT, BDR);
    sld.addImage({ data: rptData, x: 0.41, y: 1.39, w: 2.5,  h: 1.28, sizing: { type: 'cover', align: 'left', valign: 'top' } });
  }
  if (budData) {
    cardRect(sld, 3.04, 1.38, 2.52, 1.3, WHT, BDR);
    sld.addImage({ data: budData, x: 3.05, y: 1.39, w: 2.5,  h: 1.28, sizing: { type: 'cover', align: 'left', valign: 'top' } });
  }

  const admins = [
    { n:'01', t:'Overview',    d:'Platform stats & shortcuts' },
    { n:'02', t:'Users',       d:'Create, suspend, reset, delete, roles' },
    { n:'03', t:'Announce',    d:'Broadcast & tip library' },
    { n:'04', t:'Support',     d:'Real-time student chat' },
    { n:'05', t:'Statistics',  d:'Active users, top categories' },
    { n:'06', t:'System',      d:'Email health & backups' },
    { n:'07', t:'Categories',  d:'Default category library' },
    { n:'NW', t:'This Build',  d:'Create accounts · Route guard', isNew: true },
  ];

  const aw = 1.32, ah = 0.72, agx = 0.08, agy = 0.08;
  admins.forEach((a, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.4 + col * (aw + agx), y = 2.82 + row * (ah + agy);
    const bg = a.isNew ? GL : WHT, lc = a.isNew ? 'c8e6d4' : BDR;
    cardRect(sld, x, y, aw, ah, bg, lc);
    sld.addShape(prs.ShapeType.rect, { x, y, w: aw, h: 0.025, fill: { color: G }, line: { type: 'none' } });
    sld.addText(a.n, { x: x + 0.06, y: y + 0.06, w: 0.4, h: 0.18, fontSize: 7.5, bold: true, color: a.isNew ? G : G, opacity: a.isNew ? 100 : 60 });
    sld.addText(a.t, { x: x + 0.06, y: y + 0.25, w: aw - 0.12, h: 0.18, fontSize: 9, bold: true, color: a.isNew ? G : TXT });
    sld.addText(a.d, { x: x + 0.06, y: y + 0.44, w: aw - 0.12, h: 0.22, fontSize: 7.5, color: MUT, lineSpacingMultiple: 1.15 });
  });

  // ── RIGHT: Tests ──
  sld.addText('TEST RESULTS · 1 NOV 2026', { x: 5.7, y: 0.72, w: 4.0, h: 0.2, fontSize: 7.5, bold: true, color: G, charSpacing: 2 });
  sld.addText([
    { text: 'Live, tested,\n', options: { color: TXT } },
    { text: 'production-ready.', options: { color: G } },
  ], { x: 5.7, y: 0.92, w: 4.0, h: 0.72, fontSize: 18, bold: true, lineSpacingMultiple: 1.2 });

  // URL box
  cardRect(sld, 5.7, 1.72, 4.0, 0.78, GL, 'c8e6d4');
  sld.addText('FRONTEND', { x: 5.85, y: 1.76, w: 3.7, h: 0.18, fontSize: 7, bold: true, color: G, charSpacing: 1.5 });
  sld.addText('campuscointw7.vercel.app', { x: 5.85, y: 1.94, w: 3.7, h: 0.2, fontSize: 11, bold: true, color: GD });
  sld.addText('API', { x: 5.85, y: 2.18, w: 3.7, h: 0.16, fontSize: 7, bold: true, color: G, charSpacing: 1.5 });
  sld.addText('campuscoin-backend.vercel.app/api/v1', { x: 5.85, y: 2.34, w: 3.7, h: 0.16, fontSize: 9, bold: true, color: GD });

  const tests = [
    ['Registration & login', true],
    ['17 student pages', true],
    ['Transactions (CRUD + restore)', true],
    ['Budgets & savings goals', true],
    ['Reports + all exports', true],
    ['AI chat + insights', true],
    ['CSV import', true],
    ['Admin console', true],
    ['Responsive 390px–1440px', true],
    ['PDF export', null], // fixed
  ];

  tests.forEach(([name, pass], i) => {
    const ty = 2.64 + i * 0.27;
    sld.addText(name, { x: 5.7, y: ty, w: 3.2, h: 0.22, fontSize: 9.5, color: TXT });
    if (pass === true)  sld.addText('✓ Pass',  { x: 8.95, y: ty, w: 0.75, h: 0.22, fontSize: 9.5, bold: true, color: G,   align: 'right' });
    if (pass === null)  sld.addText('🔧 Fixed', { x: 8.85, y: ty, w: 0.85, h: 0.22, fontSize: 9,   bold: true, color: GLD, align: 'right' });
    sld.addShape(prs.ShapeType.rect, { x: 5.7, y: ty + 0.21, w: 4.0, h: 0.008, fill: { color: BDR }, line: { type: 'none' } });
  });
})();


/* ════════════════════════════════════════════════════
   SLIDE 6 — LIMITATIONS + THANK YOU
════════════════════════════════════════════════════ */
(function () {
  const sld = prs.addSlide();
  base(sld);
  brandBar(sld, 'Reflections');

  // ── LEFT: single limitation list ──
  sld.addText('HONEST ASSESSMENT', { x: 0.4, y: 0.72, w: 6.2, h: 0.2, fontSize: 7.5, bold: true, color: G, charSpacing: 2 });
  sld.addText('Limitations & what we\'d improve next.', { x: 0.4, y: 0.92, w: 6.2, h: 0.38, fontSize: 18, bold: true, color: TXT });

  const items = [
    {
      t: 'No native mobile app',
      d: 'The web app is fully responsive, but a native iOS/Android app would make on-the-go logging faster.',
      fix: 'Build with React Native + push notifications.',
    },
    {
      t: 'No offline mode',
      d: 'Requires internet — students without data can\'t log expenses in the moment.',
      fix: 'Add service worker + IndexedDB sync (PWA).',
    },
    {
      t: 'Single-user only',
      d: 'No shared budgets for housemates or groups splitting expenses.',
      fix: 'Introduce shared group budgets and expense splitting.',
    },
    {
      t: 'AI depends on third-party APIs',
      d: 'Groq & Gemini are external — falls back to rule-based answers if both are down.',
      fix: 'Embed a lightweight on-device model for offline AI.',
    },
  ];

  items.forEach((item, i) => {
    const y = 1.44 + i * 0.93;
    sld.addShape(prs.ShapeType.rect, { x: 0.4, y, w: 6.2, h: 0.008, fill: { color: BDR }, line: { type: 'none' } });
    sld.addText(item.t, { x: 0.4, y: y + 0.07, w: 6.2, h: 0.22, fontSize: 11, bold: true, color: TXT });
    sld.addText(item.d, { x: 0.4, y: y + 0.3,  w: 6.2, h: 0.24, fontSize: 9, color: MUT, lineSpacingMultiple: 1.2 });
    sld.addText([
      { text: '→ ', options: { color: G, bold: true } },
      { text: item.fix, options: { color: G } },
    ], { x: 0.4, y: y + 0.55, w: 6.2, h: 0.2, fontSize: 9, bold: true });
  });
  sld.addShape(prs.ShapeType.rect, { x: 0.4, y: 1.44 + items.length * 0.93, w: 6.2, h: 0.008, fill: { color: BDR }, line: { type: 'none' } });

  // ── RIGHT: Thank you ──
  const logoData = img('logo.png');
  if (logoData) sld.addImage({ data: logoData, x: 7.45, y: 0.9, w: 1.1, h: 1.1 });

  sld.addText('Thank\nYou', {
    x: 7.1, y: 2.1, w: 2.6, h: 1.2,
    fontSize: 40, bold: true, color: TXT, align: 'center', lineSpacingMultiple: 1.1,
  });

  sld.addText('campuscointw7.vercel.app', {
    x: 7.1, y: 3.38, w: 2.6, h: 0.28,
    fontSize: 10, bold: true, color: G, align: 'center',
  });

  sld.addText('"Smart money, Brighter Future."', {
    x: 7.1, y: 3.7, w: 2.6, h: 0.22,
    fontSize: 8.5, italic: true, color: MUT, align: 'center',
  });

  sld.addShape(prs.ShapeType.roundRect, { x: 7.2, y: 4.02, w: 2.4, h: 0.38, fill: { color: G }, line: { type: 'none' }, rectRadius: 0.1 });
  sld.addText('Team Flandek', { x: 7.2, y: 4.02, w: 2.4, h: 0.38, fontSize: 12, bold: true, color: WHT, align: 'center', valign: 'middle' });

  sld.addShape(prs.ShapeType.roundRect, { x: 7.2, y: 4.5, w: 2.4, h: 0.3, fill: { color: BG }, line: { color: BDR, pt: 1 }, rectRadius: 0.1 });
  sld.addText('November 2026', { x: 7.2, y: 4.5, w: 2.4, h: 0.3, fontSize: 10, color: MUT, align: 'center', valign: 'middle' });

  const phoneData = img('herophone.png');
  if (phoneData) sld.addImage({ data: phoneData, x: 7.85, y: 4.9, w: 1.1, h: 0.75 });
})();


/* ════════════════════════════════════════════════════
   WRITE FILE
════════════════════════════════════════════════════ */
const outPath = path.join(__dirname, 'CampusCoin-Flandek.pptx');
prs.writeFile({ fileName: outPath })
  .then(() => console.log('\n✅  Saved:', outPath, '\n'))
  .catch(e  => console.error('❌  Error:', e));
