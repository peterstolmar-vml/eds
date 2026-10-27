/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const BRAND_TARGETS = [
  { name: 'Confident', target: 80, color: '#7155fa' },
  { name: 'Empathetic', target: 65, color: '#b539c8' },
  { name: 'Precise', target: 75, color: '#3b63fb' },
  { name: 'Energetic', target: 55, color: '#e07b00' },
  { name: 'Accessible', target: 90, color: '#007a40' },
];

const QUOTE_TEMPLATES = {
  pullquote: (text) => '<blockquote style="border-left:4px solid #7155fa;padding:16px 20px;'
    + 'background:#f8f8ff;border-radius:0 8px 8px 0;margin:24px 0;">'
    + `<p style="font-style:italic;font-size:1.2em;color:#333;margin:0;">\u201c${text}\u201d</p>`
    + '</blockquote>',

  blockquote: (text) => '<blockquote style="background:linear-gradient(135deg,#1a1a2e,#2e1a4a);'
    + 'color:#fff;border-radius:12px;padding:24px 28px;margin:24px 0;">'
    + `<p style="font-style:italic;font-size:1.25em;margin:0 0 12px;">\u201c${text}\u201d</p>`
    + '<p style="font-size:0.8em;opacity:0.6;margin:0;letter-spacing:0.05em;">&#8212; Selected highlight</p>'
    + '</blockquote>',

  callout: (text) => '<div style="border:1px solid #f0e0ff;background:#fdf6ff;'
    + 'border-radius:8px;padding:16px 20px;margin:24px 0;border-top:4px solid #b539c8;">'
    + '<p style="font-weight:800;font-size:0.85em;color:#b539c8;'
    + 'text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Key Insight</p>'
    + `<p style="margin:0;color:#333;line-height:1.6;">${text}</p>`
    + '</div>',

  editorial: (text) => '<p style="font-size:2em;font-weight:800;color:#1a1a2e;'
    + 'line-height:1.15;letter-spacing:-0.03em;border-bottom:3px solid #7155fa;'
    + `padding-bottom:8px;margin:28px 0;">${text}</p>`,
};

const PLACEHOLDER_TEXT = {
  pullquote: 'Your pull quote goes here.',
  blockquote: 'Bold ideas deserve bold design.',
  callout: 'Enter your key insight or highlight here.',
  editorial: 'Words that stop the scroll.',
};

let daActions = null;
let selectedHlColor = '#FFE066';
let selectedHlName = 'Yellow';
let kernLs = 0;
let kernWs = 0;

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

const quoteCards = document.querySelectorAll('.quote-card');
const btnDivider = document.getElementById('btn-divider');
const btnCta = document.getElementById('btn-cta');
const insertStatus = document.getElementById('insert-status');

const hlSwatches = document.querySelectorAll('.hl-swatch');
const hlLabel = document.getElementById('hl-label');
const btnHighlight = document.getElementById('btn-highlight');
const kernPreview = document.getElementById('kern-preview');
const kernLsInput = document.getElementById('kern-ls');
const kernWsInput = document.getElementById('kern-ws');
const kernLsVal = document.getElementById('kern-ls-val');
const kernWsVal = document.getElementById('kern-ws-val');
const btnApplyKern = document.getElementById('btn-apply-kern');
const formatStatus = document.getElementById('format-status');

const btnValidate = document.getElementById('btn-validate');
const validateResult = document.getElementById('validate-result');
const btnBulkValidate = document.getElementById('btn-bulk-validate');
const bulkResult = document.getElementById('bulk-result');
const validateStatus = document.getElementById('validate-status');

const btnAnalyzeTone = document.getElementById('btn-analyze-tone');
const toneResults = document.getElementById('tone-results');
const toneBars = document.getElementById('tone-bars');
const toneOverall = document.getElementById('tone-overall');
const toneSuggestions = document.getElementById('tone-suggestions');
const btnRewrite = document.getElementById('btn-rewrite');
const brandTargetsEl = document.getElementById('brand-targets');
const toneStatus = document.getElementById('tone-status');

const COLOR_NAMES = {
  '#FFE066': 'Yellow',
  '#FF6B6B': 'Red',
  '#69DB7C': 'Green',
  '#74C0FC': 'Blue',
  '#E599F7': 'Purple',
};

// ── Tab switching ──────────────────────────────────────────────────────────
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    panels.forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────
function countWords(text) {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

function setStatus(el, msg, type) {
  el.textContent = msg;
  el.className = `footer-status${type ? ` ${type}` : ''}`;
}

function makeToneScore(targetPct) {
  const variance = Math.floor(Math.random() * 30) - 15;
  return Math.max(0, Math.min(100, targetPct + variance));
}

async function getSelection() {
  const sel = await daActions.getSelection();
  return (sel && sel.trim()) ? sel.trim() : '';
}

function updateKernPreview(text) {
  kernPreview.className = 'kern-preview';
  kernPreview.textContent = text || 'Preview text here';
  kernPreview.style.letterSpacing = `${kernLs}px`;
  kernPreview.style.wordSpacing = `${kernWs}px`;
}

// ── INSERT panel ───────────────────────────────────────────────────────────
quoteCards.forEach((card) => {
  card.addEventListener('click', async () => {
    const style = card.dataset.quote;
    const tpl = QUOTE_TEMPLATES[style];
    if (!tpl) return;
    const sel = await getSelection();
    const text = sel || PLACEHOLDER_TEXT[style];
    daActions.sendHTML(tpl(text));
    setStatus(
      insertStatus,
      `${style.charAt(0).toUpperCase() + style.slice(1)} inserted`,
      'ok',
    );
    setTimeout(
      () => setStatus(insertStatus, 'Select a style — uses selected text or placeholder'),
      3000,
    );
  });
});

btnDivider.addEventListener('click', () => {
  const html = '<hr><div style="text-align:center;margin:-12px 0 24px;">'
    + '<span style="background:#f5f4fe;padding:0 16px;'
    + 'font-size:0.75em;letter-spacing:0.12em;color:#aaa;text-transform:uppercase;">'
    + '&#9670;</span></div>';
  daActions.sendHTML(html);
  setStatus(insertStatus, 'Section divider inserted', 'ok');
  setTimeout(
    () => setStatus(insertStatus, 'Select a style — uses selected text or placeholder'),
    3000,
  );
});

btnCta.addEventListener('click', async () => {
  const sel = await getSelection();
  const label = sel || 'Get Started';
  const html = '<p><a href="#" style="display:inline-block;padding:12px 28px;'
    + 'background:linear-gradient(95deg,#b539c8,#7155fa);color:#fff;'
    + 'border-radius:24px;font-weight:700;text-decoration:none;'
    + `font-size:0.95em;letter-spacing:0.02em;">${label} &#8594;</a></p>`;
  daActions.sendHTML(html);
  setStatus(insertStatus, 'CTA button inserted', 'ok');
  setTimeout(
    () => setStatus(insertStatus, 'Select a style — uses selected text or placeholder'),
    3000,
  );
});

// ── FORMAT — Highlight ─────────────────────────────────────────────────────
hlSwatches.forEach((swatch) => {
  swatch.addEventListener('click', () => {
    hlSwatches.forEach((s) => s.classList.remove('active'));
    swatch.classList.add('active');
    selectedHlColor = swatch.dataset.color;
    selectedHlName = COLOR_NAMES[selectedHlColor] || selectedHlColor;
    hlLabel.textContent = `${selectedHlName} selected`;
  });
});

btnHighlight.addEventListener('click', async () => {
  const sel = await getSelection();
  const text = sel || 'highlighted text';
  const html = `<mark style="background:${selectedHlColor};padding:1px 3px;`
    + `border-radius:3px;">${text}</mark>`;
  daActions.sendHTML(html);
  setStatus(formatStatus, `${selectedHlName} highlight applied`, 'ok');
  setTimeout(() => setStatus(formatStatus, 'Select text in the editor first'), 3000);
});

// ── FORMAT — Kerning ───────────────────────────────────────────────────────
kernLsInput.addEventListener('input', () => {
  kernLs = Number.parseInt(kernLsInput.value, 10);
  kernLsVal.textContent = `${kernLs}px`;
  updateKernPreview();
});

kernWsInput.addEventListener('input', () => {
  kernWs = Number.parseInt(kernWsInput.value, 10);
  kernWsVal.textContent = `${kernWs}px`;
  updateKernPreview();
});

btnApplyKern.addEventListener('click', async () => {
  const sel = await getSelection();
  const text = sel || 'Your text';
  updateKernPreview(text);
  const html = `<span style="letter-spacing:${kernLs}px;`
    + `word-spacing:${kernWs}px;">${text}</span>`;
  daActions.sendHTML(html);
  setStatus(formatStatus, `Spacing applied (ls:${kernLs}px ws:${kernWs}px)`, 'ok');
  setTimeout(() => setStatus(formatStatus, 'Select text in the editor first'), 3000);
});

// ── VALIDATE ───────────────────────────────────────────────────────────────
function simulateValidateApi(text) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const words = countWords(text);
      resolve({ pass: words === 4, wordCount: words, text });
    }, 600);
  });
}

btnValidate.addEventListener('click', async () => {
  const text = await getSelection();
  if (!text) {
    validateResult.className = 'validate-result fail';
    validateResult.textContent = 'No text selected. Highlight a phrase in the editor first.';
    setStatus(validateStatus, 'Select text first', 'err');
    return;
  }
  setStatus(validateStatus, 'Validating...');
  validateResult.className = 'validate-result';
  validateResult.textContent = 'Checking...';

  const result = await simulateValidateApi(text);

  if (result.pass) {
    validateResult.className = 'validate-result pass';
    validateResult.textContent = `PASS — "${text}" (${result.wordCount} words) meets compliance rules.`;
    setStatus(validateStatus, 'Claim passed', 'ok');
  } else {
    validateResult.className = 'validate-result fail';
    validateResult.textContent = `FAIL — ${result.wordCount} words (need exactly 4). Phrase struck through.`;
    daActions.sendHTML(`<span><s>${text}</s></span>`);
    setStatus(validateStatus, 'Claim failed — struck through', 'err');
  }
});

btnBulkValidate.addEventListener('click', async () => {
  bulkResult.textContent = 'Scanning page for unvalidated claims...';
  await new Promise((resolve) => { setTimeout(resolve, 900); });
  const mockFindings = [
    { words: 4, pass: true },
    { words: 8, pass: false },
    { words: 3, pass: false },
    { words: 4, pass: true },
  ];
  const passed = mockFindings.filter((f) => f.pass).length;
  const failed = mockFindings.filter((f) => !f.pass).length;
  bulkResult.textContent = `Scan complete: ${passed} passed, ${failed} flagged.`;
  setStatus(validateStatus, `Scan: ${passed} ok  ${failed} flagged`);
});

// ── TONE ───────────────────────────────────────────────────────────────────
function renderBrandTargets() {
  brandTargetsEl.textContent = '';
  BRAND_TARGETS.forEach((dim) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';

    const name = document.createElement('span');
    name.style.cssText = 'font-size:11px;color:#444;width:76px;flex-shrink:0;font-weight:600;';
    name.textContent = dim.name;

    const barBg = document.createElement('div');
    barBg.style.cssText = 'flex:1;height:6px;background:#f0eeff;border-radius:3px;overflow:hidden;';
    const barFill = document.createElement('div');
    barFill.style.cssText = `height:100%;width:${dim.target}%;background:${dim.color};border-radius:3px;`;
    barBg.appendChild(barFill);

    const val = document.createElement('span');
    val.style.cssText = 'font-size:10px;font-family:monospace;color:#999;width:28px;text-align:right;';
    val.textContent = `${dim.target}%`;

    row.appendChild(name);
    row.appendChild(barBg);
    row.appendChild(val);
    brandTargetsEl.appendChild(row);
  });
}

function getArrowStyle(delta) {
  if (Math.abs(delta) <= 10) return '#007a40';
  if (delta > 0) return '#e07b00';
  return '#c00';
}

function getArrowText(delta) {
  if (Math.abs(delta) <= 10) return 'ok';
  if (delta > 0) return 'hi';
  return 'lo';
}

function renderToneBars(scores) {
  toneBars.textContent = '';
  scores.forEach((score) => {
    const row = document.createElement('div');
    row.className = 'tone-bar-row';

    const name = document.createElement('span');
    name.className = 'tone-name';
    name.textContent = score.name;

    const bg = document.createElement('div');
    bg.className = 'tone-bar-bg';
    const fill = document.createElement('div');
    fill.className = 'tone-bar-fill';
    fill.style.width = '0%';
    bg.appendChild(fill);

    const pct = document.createElement('span');
    pct.className = 'tone-pct';
    pct.textContent = `${score.score}%`;

    const delta = score.score - score.target;
    const arrow = document.createElement('span');
    arrow.style.cssText = `font-size:10px;width:16px;text-align:center;color:${getArrowStyle(delta)};`;
    arrow.textContent = getArrowText(delta);

    row.appendChild(name);
    row.appendChild(bg);
    row.appendChild(pct);
    row.appendChild(arrow);
    toneBars.appendChild(row);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => { fill.style.width = `${score.score}%`; });
    });
  });
}

function buildToneSuggestions(scores) {
  const below = scores.filter((s) => s.score < s.target - 10);
  const above = scores.filter((s) => s.score > s.target + 10);
  const parts = [];
  if (below.length) {
    parts.push(`Boost ${below.map((s) => s.name.toLowerCase()).join(' and ')} tone.`);
  }
  if (above.length) {
    parts.push(`Dial back ${above.map((s) => s.name.toLowerCase()).join(' and ')} slightly.`);
  }
  return parts.length
    ? `Suggestions: ${parts.join(' ')}`
    : 'Tone is well-aligned with brand targets.';
}

btnAnalyzeTone.addEventListener('click', async () => {
  const text = await getSelection();
  if (!text) {
    setStatus(toneStatus, 'Select text first', 'err');
    return;
  }
  setStatus(toneStatus, 'Analyzing tone...');
  toneResults.style.display = 'none';

  await new Promise((resolve) => { setTimeout(resolve, 800); });

  const scores = BRAND_TARGETS.map((dim) => ({
    name: dim.name,
    target: dim.target,
    score: makeToneScore(dim.target),
    color: dim.color,
  }));

  const avgDelta = scores.reduce((acc, s) => acc + Math.abs(s.score - s.target), 0) / scores.length;
  const overallPass = avgDelta < 12;

  toneResults.style.display = 'block';
  renderToneBars(scores);

  toneOverall.textContent = overallPass ? 'On Brand' : 'Needs Tuning';
  toneOverall.style.cssText = overallPass
    ? 'background:#e8fff2;color:#007a40;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;'
    : 'background:#fff8e1;color:#886600;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;';

  toneSuggestions.textContent = buildToneSuggestions(scores);
  setStatus(toneStatus, overallPass ? 'On Brand' : 'Tune required', overallPass ? 'ok' : 'err');
});

btnRewrite.addEventListener('click', () => {
  const rewrites = [
    'Empower your teams with precision-built solutions that scale confidently.',
    "Unlock your brand's potential with tools designed for modern marketing.",
    'Drive measurable results with content that connects and converts.',
    'Lead with clarity. Engage with purpose. Grow with confidence.',
  ];
  const pick = rewrites[Math.floor(Math.random() * rewrites.length)];
  daActions.sendHTML(`<p>${pick}</p>`);
  setStatus(toneStatus, 'On-brand rewrite inserted', 'ok');
  setTimeout(() => setStatus(toneStatus, 'Select text, then click Analyze Tone'), 3000);
});

// ── Init ───────────────────────────────────────────────────────────────────
(async () => {
  const { actions } = await DA_SDK;
  daActions = actions;
  renderBrandTargets();
  updateKernPreview();
})();
