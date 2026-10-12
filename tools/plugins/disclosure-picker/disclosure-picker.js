/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const { context, token, actions } = await DA_SDK;

const DISCLOSURES_FOLDER = '/demo/disclosures';
const previewCache = {};

async function listDisclosures() {
  const url = `https://content.da.live/${context.org}/${context.repo}${DISCLOSURES_FOLDER}/`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const items = await res.json();
  return items
    .filter((item) => item.ext === 'html')
    .map((item) => ({
      name: item.name,
      path: `${DISCLOSURES_FOLDER}/${item.name}`,
      lastModified: item.lastModified,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function extractText(html) {
  // Strip tags, collapse whitespace — no DOMParser (CSP blocked)
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

async function fetchPreview(path) {
  if (previewCache[path]) return previewCache[path];
  const url = `https://content.da.live/${context.org}/${context.repo}${path}.html`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return '';
    const html = await res.text();
    const text = extractText(html);
    previewCache[path] = text;
    return text;
  } catch (e) {
    return '';
  }
}

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

function renderList(items, query) {
  const list = document.getElementById('picker-list');
  list.textContent = '';

  const filtered = query
    ? items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
    : items;

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = query ? `No results for "${query}"` : 'No disclosures found.';
    list.appendChild(empty);
    return;
  }

  filtered.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'picker-item';

    const nameEl = document.createElement('div');
    nameEl.className = 'picker-name';
    nameEl.textContent = item.name;

    const excerptEl = document.createElement('div');
    excerptEl.className = 'picker-excerpt';
    excerptEl.textContent = 'Hover to preview…';

    const insertBtn = document.createElement('button');
    insertBtn.className = 'insert-btn';
    insertBtn.textContent = 'Insert';
    insertBtn.addEventListener('click', async () => {
      insertBtn.disabled = true;
      insertBtn.textContent = '…';
      await actions.sendText(item.path);
      insertBtn.textContent = '✓';
      setTimeout(() => {
        insertBtn.disabled = false;
        insertBtn.textContent = 'Insert';
      }, 1500);
    });

    row.appendChild(nameEl);
    row.appendChild(excerptEl);
    row.appendChild(insertBtn);
    list.appendChild(row);

    // Lazy fetch preview on hover
    let fetched = false;
    row.addEventListener('mouseenter', async () => {
      if (fetched) return;
      fetched = true;
      excerptEl.textContent = 'Loading…';
      const text = await fetchPreview(item.path);
      excerptEl.textContent = text || '(no preview available)';
    });
  });
}

(async () => {
  setStatus('Loading disclosures…');
  const items = await listDisclosures();
  setStatus(`${items.length} disclosures in ${DISCLOSURES_FOLDER}`);
  renderList(items, '');

  document.getElementById('search').addEventListener('input', (e) => {
    renderList(items, e.target.value);
  });
})();
