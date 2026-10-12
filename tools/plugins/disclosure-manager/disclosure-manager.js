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

function parsePage(html) {
  disclosures = [];
  superscripts = [];

  const hasNumbered = /class="section-metadata"[\s\S]*?<p>disclosures<\/p>[\s\S]*?<p>numbered<\/p>/i
    .test(html);
  if (!hasNumbered) return;

  const metaIdx = html.search(
    /class="section-metadata"[\s\S]*?<p>disclosures<\/p>[\s\S]*?<p>numbered<\/p>/i,
  );
  const zone = html.slice(metaIdx);

  const pairRe = /<h3>(\d+)\.<\/h3>[\s\S]*?class="fragment"[\s\S]*?<p>([^<]+)<\/p>/g;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = pairRe.exec(zone)) !== null) {
    disclosures.push({
      path: m[2].trim(),
      headingNum: Number.parseInt(m[1], 10),
    });
  }

  // Match anchored superscripts: <a href="#N"><sup>N</sup></a>
  const supAnchoredRe = /<a href="(#\d+)"><sup>(\d+)<\/sup><\/a>/g;
  // eslint-disable-next-line no-cond-assign
  while ((m = supAnchoredRe.exec(html)) !== null) {
    superscripts.push({ href: m[1], text: m[2], isSub: false });
  }

  // Match bare superscripts not wrapped in an anchor: <sup>N</sup>
  // Use a two-pass approach: collect all <sup> positions, exclude those already matched
  const anchoredPositions = new Set();
  const anchorScanRe = /<a href="(#\d+)"><sup>(\d+)<\/sup><\/a>/g;
  // eslint-disable-next-line no-cond-assign
  while ((m = anchorScanRe.exec(html)) !== null) {
    for (let p = m.index; p < m.index + m[0].length; p += 1) {
      anchoredPositions.add(p);
    }
  }

  const bareSuperRe = /<sup>(\d+)<\/sup>/g;
  // eslint-disable-next-line no-cond-assign
  while ((m = bareSuperRe.exec(html)) !== null) {
    if (!anchoredPositions.has(m.index)) {
      superscripts.push({ href: null, text: m[1], isSub: false });
    }
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
    empty.textContent = 'No numbered disclosures found (needs section-metadata disclosures/numbered).';
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
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.classList.add('drag-over');
    });
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

  // Check every superscript has a matching disclosure and correct href
  sups.forEach((s) => {
    const num = Number.parseInt(s.text, 10);
    if (Number.isNaN(num)) {
      issues.push({ type: 'warn', msg: `Superscript "${s.text}" is not a number.` });
      return;
    }
    const disc = disclosures[num - 1];
    const expected = `#${num}`;
    if (!disc) {
      issues.push({
        type: 'error',
        msg: `Superscript ${num} has no matching disclosure (only ${disclosures.length} found).`,
      });
    } else if (!s.href) {
      issues.push({
        type: 'error',
        msg: `Superscript ${num} (${disc.path}) has no anchor link — wrap in <a href="${expected}">.`,
      });
    } else if (s.href !== expected) {
      issues.push({
        type: 'warn',
        msg: `Superscript ${num} links to "${s.href}" but expected "${expected}".`,
      });
    } else {
      oks.push(`Superscript ${num} → ${disc.path} ✓`);
    }
  });

  // Check every disclosure has at least one superscript referencing it
  disclosures.forEach((d, i) => {
    const num = i + 1;
    const hasSup = sups.some((s) => Number.parseInt(s.text, 10) === num);
    if (!hasSup) {
      issues.push({
        type: 'warn',
        msg: `Disclosure ${num} (${d.path}) has no superscript referencing it.`,
      });
    }
  });

  function makeSection(title, items) {
    if (!items.length) return;
    const sec = document.createElement('div');
    sec.className = 'audit-section';
    const h = document.createElement('h2');
    h.textContent = title;
    sec.appendChild(h);
    items.forEach((item) => {
      const el = document.createElement('div');
      el.className = `audit-item ${item.type}`;
      el.textContent = item.msg;
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

function buildNumberedSection(list) {
  const metaBlock = [
    '<div class="section-metadata">',
    '  <div><div><p>disclosures</p></div><div><p>numbered</p></div></div>',
    '</div>',
  ].join('\n');

  const pairs = list.map((d, i) => [
    `<h3>${i + 1}.</h3>`,
    '<div class="fragment">',
    '  <div><div>',
    `    <p>${d.path}</p>`,
    '  </div></div>',
    '</div>',
  ].join('\n')).join('\n');

  return `${metaBlock}\n${pairs}`;
}

function findSectionBounds(html) {
  const metaIdx = html.search(
    /class="section-metadata"[\s\S]*?<p>disclosures<\/p>[\s\S]*?<p>numbered<\/p>/i,
  );
  if (metaIdx === -1) return null;

  const before = html.slice(0, metaIdx);
  const sectionStart = before.lastIndexOf('<div>');
  if (sectionStart === -1) return null;

  let depth = 0;
  let i = sectionStart;
  while (i < html.length) {
    if (html.slice(i, i + 4) === '<div') {
      depth += 1;
      i = html.indexOf('>', i) + 1;
    } else if (html.slice(i, i + 6) === '</div>') {
      depth -= 1;
      i += 6;
      if (depth === 0) return { start: sectionStart, end: i };
    } else {
      i += 1;
    }
  }
  return null;
}

async function applyUpdates() {
  setStatus('Applying...', 'loading');
  let html = rawHtml;

  const bounds = findSectionBounds(html);
  if (!bounds) {
    setStatus('Could not locate disclosures section.', 'warn');
    return;
  }

  // Build old heading number → new index map BEFORE rebuilding HTML
  const oldToNew = {};
  disclosures.forEach((d, i) => {
    if (d.headingNum) oldToNew[d.headingNum] = i + 1;
  });

  const newSection = buildNumberedSection(disclosures);
  html = `${html.slice(0, bounds.start)}<div>\n${newSection}\n</div>${html.slice(bounds.end)}`;

  // Renumber all superscript anchors using the pre-built map
  html = html.replace(/<a href="#(\d+)"><sup>\d+<\/sup><\/a>/g, (match, oldNum) => {
    const n = Number.parseInt(oldNum, 10);
    const newNum = oldToNew[n];
    if (newNum === undefined) return match;
    return `<a href="#${newNum}"><sup>${newNum}</sup></a>`;
  });

  try {
    await actions.setHTML(html);
  } catch (e) {
    setStatus(`Save failed: ${e.message}`, 'warn');
    return;
  }

  rawHtml = html;
  parsePage(html);
  renderManage();
  renderAudit();
  setStatus('Done! Disclosures reordered and superscripts renumbered.', 'ok');
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

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const isManage = tab.dataset.tab === 'manage';
    document.getElementById('panel-manage').style.display = isManage ? '' : 'none';
    document.getElementById('panel-audit').style.display = isManage ? 'none' : '';
  });
});

document.getElementById('btn-refresh').addEventListener('click', fetchPage);
document.getElementById('btn-apply').addEventListener('click', applyUpdates);

fetchPage();
