/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

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

  // Only find paths inside disclosures numbered block
  const numberedMatch = html.match(
    /class="disclosures numbered"[\s\S]*?<\/div>\s*<\/div>/,
  );
  const searchZone = numberedMatch ? numberedMatch[0] : '';

  const pathRe = /<p>([^<]*\/demo\/disclosures\/[^<]*)<\/p>/g;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = pathRe.exec(searchZone)) !== null) {
    disclosures.push({ path: m[1].trim() });
  }

  const supRe = /<a href="(#disclosure-(\d+))"><sup>\d+<\/sup><\/a>/g;
  // eslint-disable-next-line no-cond-assign
  while ((m = supRe.exec(html)) !== null) {
    superscripts.push({ href: m[1], num: Number.parseInt(m[2], 10), isSub: false });
  }

  const subRe = /<sub>(\d+)<\/sub>/g;
  // eslint-disable-next-line no-cond-assign
  while ((m = subRe.exec(html)) !== null) {
    superscripts.push({ href: null, num: Number.parseInt(m[1], 10), isSub: true });
  }
}

function makeSection(title, items, out) {
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

function renderAudit() {
  const out = document.getElementById('audit-output');
  out.textContent = '';
  const issues = [];
  const oks = [];

  if (!disclosures.length) {
    issues.push({ type: 'warn', msg: 'No disclosures-numbered block found on this page.' });
  }

  superscripts.filter((s) => !s.isSub).forEach((s) => {
    const disc = disclosures[s.num - 1];
    if (!disc) {
      issues.push({
        type: 'error',
        msg: `Superscript ${s.num} has no matching disclosure. Only ${disclosures.length} found.`,
      });
    } else if (s.href !== `#disclosure-${s.num}`) {
      issues.push({
        type: 'warn',
        msg: `Superscript ${s.num} links to "${s.href}" but expected "#disclosure-${s.num}".`,
      });
    } else {
      oks.push(`Superscript ${s.num} -> ${disc.path} OK`);
    }
  });

  makeSection('Issues', issues, out);
  makeSection('Passing', oks.map((msg) => ({ type: 'ok', msg })), out);

  if (!issues.length && !oks.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No superscripts found on this page.';
    out.appendChild(empty);
  }
}

function renderManage() {
  const list = document.getElementById('disclosure-list');
  list.textContent = '';

  if (!disclosures.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No disclosure fragments found inside a disclosures-numbered block.';
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
    item.dataset.index = String(i);

    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.textContent = '⠿';

    const num = document.createElement('div');
    num.className = 'disc-num';
    num.textContent = String(i + 1);

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

async function applyUpdates(context, token) {
  setStatus('Applying...', 'loading');
  const { org, repo, path } = context;
  let html = rawHtml;

  const oldFragsRe = /(class="disclosures-numbered"[\s\S]*?<div>\s*<div>)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/div>)/;
  const newFrags = disclosures
    .map((d) => `<div class="fragment"><div><div><p>${d.path}</p></div></div></div>`)
    .join('\n');
  html = html.replace(oldFragsRe, (match, before, middle, after) => `${before}\n${newFrags}\n${after}`);

  const pathToNewNum = {};
  disclosures.forEach((d, i) => {
    const pm = d.path.match(/disclosure-(\d+)$/);
    if (pm) pathToNewNum[Number.parseInt(pm[1], 10)] = i + 1;
  });

  html = html.replace(/<a href="#disclosure-(\d+)"><sup>\d+<\/sup><\/a>/g, (match, oldNum) => {
    const newNum = pathToNewNum[Number.parseInt(oldNum, 10)];
    if (newNum === undefined) return match;
    return `<a href="#disclosure-${newNum}"><sup>${newNum}</sup></a>`;
  });

  const url = `https://content.da.live/${org}/${repo}${path}`;
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

async function fetchPage(context, token) {
  setStatus('Loading page...', 'loading');
  const { org, repo, path } = context;
  const url = `https://content.da.live/${org}/${repo}${path}`;
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

(async () => {
  const { context, token } = await DA_SDK;

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const isManage = tab.dataset.tab === 'manage';
      document.getElementById('panel-manage').style.display = isManage ? '' : 'none';
      document.getElementById('panel-audit').style.display = isManage ? 'none' : '';
    });
  });

  document.getElementById('btn-refresh').addEventListener('click', () => fetchPage(context, token));
  document.getElementById('btn-apply').addEventListener('click', () => applyUpdates(context, token));

  fetchPage(context, token);
})();
