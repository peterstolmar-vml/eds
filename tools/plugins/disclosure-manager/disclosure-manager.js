/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const { context, token, actions } = await DA_SDK;

let rawHtml = '';
let disclosures = [];
let superscripts = [];
let dragSrc = null;

function setStatus(msg, state) {
  document.getElementById('status-text').textContent = msg;
  document.getElementById('status-dot').className = `dot ${state || 'ok'}`;
}

async function fetchPage() {
  setStatus('Loading page...', 'loading');
  const url = `https://content.da.live/${context.org}/${context.repo}${context.path}`;
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    setStatus(`Network error: ${e.message}`, 'warn');
    return;
  }
  if (!res.ok) {
    setStatus(`Failed to load page (${res.status})`, 'warn');
    return;
  }
  rawHtml = await res.text();
  parsePage(rawHtml);
  renderManage();
  renderAudit();
  const n = disclosures.length;
  const s = superscripts.filter((x) => !x.isSub).length;
  setStatus(`Found ${n} disclosure(s), ${s} superscript(s)`, 'ok');
}

// Slugify heading text the same way EDS does
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parsePage(html) {
  disclosures = [];
  superscripts = [];

  // Find the numbered disclosures section:
  // section-metadata with disclosures/numbered key, then interleaved <h3>N.</h3> + fragment blocks
  // Strategy: find the section-metadata block, then scan forward for h3+fragment pairs
  const sectionMetaRe = /class="section-metadata"[\s\S]*?<p>disclosures<\/p>[\s\S]*?<p>numbered<\/p>/i;
  if (!sectionMetaRe.test(html)) {
    return;
  }

  // Extract from the section-metadata match onward to end of that section
  const metaIdx = html.search(sectionMetaRe);
  const sectionHtml = html.slice(metaIdx);

  // Match h3 + fragment pairs: <h3>N.</h3> ... <p>/path/to/disclosure</p>
  // eslint-disable-next-line no-cond-assign
  const pairRe = /<h3>(\d+)\.<\/h3>[\s\S]*?class="fragment"[\s\S]*?<p>([^<]+)<\/p>/g;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = pairRe.exec(sectionHtml)) !== null) {
    const path = m[2].trim();
    disclosures.push({ path, headingNum: Number.parseInt(m[1], 10) });
  }

  // Superscripts: <a href="#N"><sup>N</sup></a>
  const supRe = /<a href="(#[^"]+)"><sup>(\d+)<\/sup><\/a>/g;
  // eslint-disable-next-line no-cond-assign
  while ((m = supRe.exec(html)) !== null) {
    superscripts.push({ href: m[1], text: m[2], isSub: false });
  }

  // Subscripts: <sub>N</sub>
  const subRe = /<sub>(\d+)<\/sub>/g;
  // eslint-disable-next-line no-cond-assign
  while ((m = subRe.exec(html)) !== null) {
    superscripts.push({ href: null, text: m[1], isSub: true });
  }
}

function renderManage() {
  const list = document.getElementById('disclosure-list');
  list.textContent = '';

  if (!disclosures.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No numbered disclosure fragments found (section-metadata disclosures/numbered).';
    list.appendChild(empty);
    return;
  }

  const lbl = document.createElement('div');
  lbl.className = 'section-label';
  lbl.textContent = 'Numbered disclosures — drag to reorder';
  list.appendChild(lbl);

  disclosures.forEach((d, i) => {
    const item = document.createElement('div');
    item.className = 'disclosure-item';
    item.draggable = true;
    item.dataset.index = i;

    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.textContent = '\u283f';

    const num = document.createElement('div');
    num.className = 'disc-num';
    num.textContent = i + 1;

    const body = document.createElement('div');
    body.style.flex = '1';

    const pathEl = document.createElement('div');
    pathEl.className = 'disc-path';
    pathEl.textContent = d.path;
    body.appendChild(pathEl);

    item.appendChild(handle);
    item.appendChild(num);
    item.appendChild(body);
    list.appendChild(item);

    item.addEventListener('dragstart', (e) => {
      dragSrc = i;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('drag-over'); });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (dragSrc === null || dragSrc === i) return;
      const moved = disclosures.splice(dragSrc, 1)[0];
      disclosures.splice(i, 0, moved);
      dragSrc = null;
      renderManage();
    });
  });
}

function renderAudit() {
  const out = document.getElementById('audit-output');
  out.textContent = '';
  const issues = [];
  const oks = [];

  const sups = superscripts.filter((s) => !s.isSub);

  if (!disclosures.length) {
    issues.push({ type: 'warn', msg: 'No numbered disclosures section found on this page.' });
  }

  sups.forEach((s) => {
    const num = Number.parseInt(s.text, 10);
    if (Number.isNaN(num)) {
      issues.push({ type: 'warn', msg: `Superscript "${s.text}" is not a number.` });
      return;
    }
    const disc = disclosures[num - 1];
    const expectedHref = `#${num}`;
    if (!disc) {
      issues.push({
        type: 'error',
        msg: `Superscript ${num} has no matching disclosure. Only ${disclosures.length} found.`,
      });
    } else if (!s.href) {
      issues.push({ type: 'warn', msg: `Superscript ${num} (${disc.path}) has no anchor link.` });
    } else if (s.href !== expectedHref) {
      issues.push({
        type: 'warn',
        msg: `Superscript ${num} links to "${s.href}" but expected "${expectedHref}".`,
      });
    } else {
      oks.push(`Superscript ${num} → ${disc.path} ✓`);
    }
  });

  // Check for disclosures with no matching superscript
  disclosures.forEach((d, i) => {
    const num = i + 1;
    const hasSup = sups.some((s) => Number.parseInt(s.text, 10) === num);
    if (!hasSup) {
      issues.push({ type: 'warn', msg: `Disclosure ${num} (${d.path}) has no superscript referencing it.` });
    }
  });

  function makeSection(title, items, cls) {
    if (!items.length) return;
    const sec = document.createElement('div');
    sec.className = 'audit-section';
    const h = document.createElement('h2');
    h.textContent = title;
    sec.appendChild(h);
    items.forEach((item) => {
      const el = document.createElement('div');
      el.className = `audit-item ${item.type || cls}`;
      el.textContent = item.msg || item;
      sec.appendChild(el);
    });
    out.appendChild(sec);
  }

  makeSection('Issues', issues);
  makeSection('Passing', oks.map((msg) => ({ type: 'ok', msg })));

  if (!issues.length && !oks.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No superscripts found on this page.';
    out.appendChild(empty);
  }
}

function buildNumberedSection(disclosureList) {
  // Rebuild the numbered section: section-metadata block + h3+fragment pairs
  const metaBlock = [
    '<div class="section-metadata">',
    '  <div><div><p>disclosures</p></div><div><p>numbered</p></div></div>',
    '</div>',
  ].join('\n');

  const pairs = disclosureList.map((d, i) => [
    `<h3>${i + 1}.</h3>`,
    '<div class="fragment">',
    '  <div><div>',
    `    <p>${d.path}</p>`,
    '  </div></div>',
    '</div>',
  ].join('\n')).join('\n');

  return `${metaBlock}\n${pairs}`;
}

async function applyUpdates() {
  setStatus('Applying...', 'loading');
  let html = rawHtml;

  // Find and replace the entire numbered section block in the HTML
  // The section starts at section-metadata disclosures/numbered and ends before the next </div> that
  // closes the top-level section div — we match from section-metadata through all h3+fragment pairs
  const sectionRe = /(class="section-metadata"[\s\S]*?<p>disclosures<\/p>[\s\S]*?<p>numbered<\/p>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)([\s\S]*?)(<\/div>\s*(?=<div>|<\/main>))/i;

  // Simpler targeted approach: replace from first <h3>1.</h3> through last fragment </div></div></div>
  // by rebuilding the whole section between section-metadata and end of last fragment pair
  const rebuildRe = /(class="section-metadata"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)([\s\S]*?)(<\/div>\s*(?:<div class="metadata"|<\/main>))/i;

  const newSection = buildNumberedSection(disclosures);

  // Replace section-metadata block + everything after it up to next top-level section
  // Strategy: locate the section-metadata, then replace from there through the last fragment
  const smStart = html.search(/class="section-metadata"[\s\S]*?<p>disclosures<\/p>/i);
  if (smStart === -1) {
    setStatus('Could not locate disclosures section to update.', 'warn');
    return;
  }

  // Find the enclosing <div> that contains section-metadata (walk back to find opening <div>)
  const beforeSm = html.slice(0, smStart);
  const lastDivOpen = beforeSm.lastIndexOf('<div>');
  if (lastDivOpen === -1) {
    setStatus('Could not locate section container.', 'warn');
    return;
  }

  // Find the closing </div> of that section — it's the </div> matching the <div> at lastDivOpen
  // We count nesting from lastDivOpen forward
  let depth = 0;
  let pos = lastDivOpen;
  const openRe = /<div[^>]*>/g;
  const closeRe = /<\/div>/g;
  openRe.lastIndex = lastDivOpen;
  closeRe.lastIndex = lastDivOpen;
  let sectionEnd = -1;

  // Walk character by character using alternating regex is complex; use a linear scan instead
  let scanPos = lastDivOpen;
  while (scanPos < html.length) {
    if (html.slice(scanPos, scanPos + 4) === '<div') {
      depth += 1;
      scanPos = html.indexOf('>', scanPos) + 1;
    } else if (html.slice(scanPos, scanPos + 6) === '</div>') {
      depth -= 1;
      scanPos += 6;
      if (depth === 0) {
        sectionEnd = scanPos;
        break;
      }
    } else {
      scanPos += 1;
    }
  }

  if (sectionEnd === -1) {
    setStatus('Could not find end of disclosures section.', 'warn');
    return;
  }

  html = `${html.slice(0, lastDivOpen)}<div>\n${newSection}\n</div>${html.slice(sectionEnd)}`;

  // Renumber superscript anchors: <a href="#OLD"><sup>OLD</sup></a>
  // Build old-path → new-number map
  const pathToNewNum = {};
  disclosures.forEach((d, i) => {
    pathToNewNum[d.path] = i + 1;
  });

  // We need to renumber by old position. Store original positions before reorder.
  // The original heading numbers are in d.headingNum. After reorder, new number = index+1.
  const oldNumToNew = {};
  disclosures.forEach((d, i) => {
    if (d.headingNum) oldNumToNew[d.headingNum] = i + 1;
  });

  // Replace <a href="#N"><sup>N</sup></a>
  html = html.replace(/<a href="#(\d+)"><sup>\d+<\/sup><\/a>/g, (match, oldNum) => {
    const n = Number.parseInt(oldNum, 10);
    const newNum = oldNumToNew[n];
    if (newNum === undefined) return match;
    return `<a href="#${newNum}"><sup>${newNum}</sup></a>`;
  });

  const url = `https://content.da.live/${context.org}/${context.repo}${context.path}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/html' },
      body: html,
    });
  } catch (e) {
    setStatus(`Network error: ${e.message}`, 'warn');
    return;
  }
  if (!res.ok) {
    setStatus(`Save failed (${res.status})`, 'warn');
    return;
  }
  rawHtml = html;
  parsePage(html);
  renderManage();
  renderAudit();
  setStatus('Done! Disclosures reordered and superscripts renumbered.', 'ok');
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-manage').style.display = tab.dataset.tab === 'manage' ? '' : 'none';
    document.getElementById('panel-audit').style.display = tab.dataset.tab === 'audit' ? '' : 'none';
  });
});

document.getElementById('btn-refresh').addEventListener('click', fetchPage);
document.getElementById('btn-apply').addEventListener('click', applyUpdates);

fetchPage();
