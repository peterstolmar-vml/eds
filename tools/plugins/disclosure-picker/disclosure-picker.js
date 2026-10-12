/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const { context, actions } = await DA_SDK;

const DISCLOSURES_FOLDER = '/demo/disclosures';
const previewCache = {};

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

function extractText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

async function fetchPreview(path) {
  if (previewCache[path]) return previewCache[path];
  const url = `https://content.da.live/${context.org}/${context.repo}${path}.html`;
  try {
    const res = await actions.daFetch(url);
    if (!res.ok) return '';
    const html = await res.text();
    const text = extractText(html);
    previewCache[path] = text;
    return text;
  } catch (e) {
    return '';
  }
}

function buildFragmentHtml(path) {
  return [
    '<div class="fragment">',
    '  <div>',
    '    <div>',
    `      <p>${path}</p>`,
    '    </div>',
    '  </div>',
    '</div>',
  ].join('\n');
}

async function insertDisclosure(path, btn) {
  const label = btn;
  label.disabled = true;
  label.textContent = '…';
  try {
    await actions.sendHTML(buildFragmentHtml(path));
    label.textContent = '✓ Inserted';
    setTimeout(() => {
      label.disabled = false;
      label.textContent = 'Insert';
    }, 1500);
  } catch (e) {
    label.disabled = false;
    label.textContent = 'Error';
    setTimeout(() => { label.textContent = 'Insert'; }, 1500);
  }
}

async function listDisclosures() {
  const url = `https://content.da.live/${context.org}/${context.repo}${DISCLOSURES_FOLDER}/`;
  try {
    const res = await actions.daFetch(url);
    if (!res.ok) return [];
    const raw = await res.json();
    console.log('folder response:', JSON.stringify(raw).slice(0, 500));
    const items = Array.isArray(raw) ? raw : (raw.data || raw.items || []);
    return items
      .filter((item) => item.ext === 'html')
      .map((item) => {
        const name = item.name.replace(/\.html$/, '');
        return {
          name,
          path: `${DISCLOSURES_FOLDER}/${name}`,
          lastModified: item.lastModified,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  } catch (e) {
    setStatus(`Error: ${e.message}`);
    return [];
  }
}

function renderList(items, query) {
  const list = document.getElementById('picker-list');
  list.textContent = '';

  const q = query ? query.toLowerCase() : '';
  const filtered = q ? items.filter((item) => item.name.toLowerCase().includes(q)) : items;

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

    const top = document.createElement('div');
    top.className = 'picker-item-top';

    const nameEl = document.createElement('div');
    nameEl.className = 'picker-name';
    nameEl.textContent = item.name;

    const insertBtn = document.createElement('button');
    insertBtn.className = 'insert-btn';
    insertBtn.textContent = 'Insert';
    insertBtn.addEventListener('click', () => insertDisclosure(item.path, insertBtn));

    top.appendChild(nameEl);
    top.appendChild(insertBtn);

    const excerptEl = document.createElement('div');
    excerptEl.className = 'picker-excerpt';
    excerptEl.textContent = 'Hover to preview…';

    row.appendChild(top);
    row.appendChild(excerptEl);
    list.appendChild(row);

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
  if (!items.length) {
    setStatus('No disclosures found — check console for API response shape.');
    return;
  }
  setStatus(`${items.length} disclosures`);
  renderList(items, '');

  document.getElementById('search').addEventListener('input', (e) => {
    renderList(items, e.target.value);
  });
})();
