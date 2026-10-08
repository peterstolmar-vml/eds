import { renderField, getBuiltInHints } from '../../scripts/utils/schema-hints.js';
import { fetchStructured } from '../../scripts/utils/structured.js';

const SKIP = new Set(['_display', 'slug', 'currency', 'name', 'price', 'rating', 'inStock', 'featured']);

async function fetchSC(slug) {
  const mount = 'https://da-sc.adobeaem.workers.dev/live/peterstolmar-vml/eds/demo';
  const json = await fetchStructured(`${mount}/products/${encodeURIComponent(slug)}`);
  if (!json) throw new Error(`Could not load ${slug}`);
  return json;
}

function renderCardContent(container, json) {
  const { metadata = {}, data = {} } = json;
  const hints = getBuiltInHints(metadata.schemaName || '');
  container.dataset.schema = metadata.schemaName || '';

  const header = document.createElement('div');
  header.className = 'sc-header';
  if (data.name) {
    const h2 = document.createElement('h2');
    h2.textContent = data.name;
    header.append(h2);
  }
  if (data.price != null) header.append(renderField('price', data.price, hints.price, data));
  if (data.rating != null) header.append(renderField('rating', data.rating, hints.rating, data));
  if (data.inStock != null) header.append(renderField('inStock', data.inStock, hints.inStock, data));
  container.append(header);

  const body = document.createElement('div');
  body.className = 'sc-body';
  for (const [key, value] of Object.entries(data)) {
    if (!SKIP.has(key) && value != null) {
      body.append(renderField(key, value, hints[key], data));
    }
  }
  container.append(body);
}

function makeSchemaPanel(json, slug) {
  const details = document.createElement('details');
  details.className = 'sc-schema-panel';

  const summary = document.createElement('summary');
  const labelSpan = document.createElement('span');
  labelSpan.className = 'sc-schema-label';
  labelSpan.textContent = 'Show schema';
  const sourceSpan = document.createElement('span');
  sourceSpan.className = 'sc-schema-source';
  sourceSpan.textContent = slug || '';
  summary.append(labelSpan, sourceSpan);

  const pre = document.createElement('pre');
  pre.className = 'sc-code';
  pre.textContent = JSON.stringify(json, null, 2);

  details.append(summary, pre);
  return { details, pre, sourceSpan };
}

async function initSingle(el, slug) {
  el.textContent = '';
  el.classList.add('sc-loading');

  let json;
  try {
    json = await fetchSC(slug);
  } catch {
    el.classList.remove('sc-loading');
    el.textContent = `Could not load content: ${slug}`;
    return;
  }

  el.classList.remove('sc-loading');
  renderCardContent(el, json);

  const { details } = makeSchemaPanel(json, slug);
  el.append(details);
}

async function initMulti(el, slugs) {
  el.textContent = '';
  el.classList.add('sc-loading', 'sc-multi');

  const results = await Promise.allSettled(slugs.map(fetchSC));
  el.classList.remove('sc-loading');

  const items = results.map((r, i) => ({
    slug: slugs[i],
    json: r.status === 'fulfilled' ? r.value : null,
  }));

  const toggleBar = document.createElement('div');
  toggleBar.className = 'sc-toggle-bar';
  const btnSide = document.createElement('button');
  btnSide.type = 'button';
  btnSide.className = 'sc-toggle-btn is-active';
  btnSide.textContent = 'Side by Side';
  const btnTabs = document.createElement('button');
  btnTabs.type = 'button';
  btnTabs.className = 'sc-toggle-btn';
  btnTabs.textContent = 'Tabs';
  toggleBar.append(btnSide, btnTabs);
  el.append(toggleBar);

  const viewContainer = document.createElement('div');
  el.append(viewContainer);

  const initialItem = items.find((i) => String(i.json?.data?.featured) === 'true') || items.find((i) => i.json) || items[0];
  const { details: schemaDetails, pre: schemaPre, sourceSpan } = makeSchemaPanel(initialItem.json || {}, initialItem.slug);
  el.append(schemaDetails);

  function updateSchema(item) {
    if (!item.json) return;
    schemaPre.textContent = JSON.stringify(item.json, null, 2);
    sourceSpan.textContent = item.slug;
  }

  function renderSideBySide() {
    viewContainer.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'sc-grid';

    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'sc-card';
      card.setAttribute('tabindex', '0');

      if (!item.json) {
        card.textContent = `Could not load: ${item.slug}`;
        grid.append(card);
        return;
      }

      if (String(item.json.data?.featured) === 'true') card.classList.add('sc-card--featured');
      renderCardContent(card, item.json);

      card.addEventListener('mouseenter', () => updateSchema(item));
      card.addEventListener('focusin', () => updateSchema(item));

      grid.append(card);
    });

    viewContainer.append(grid);
    updateSchema(initialItem);
  }

  function renderTabs() {
    viewContainer.innerHTML = '';
    const nav = document.createElement('div');
    nav.className = 'sc-tabs-nav';
    const panels = [];

    items.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sc-tab-btn';
      btn.textContent = item.json?.data?.name || item.slug;
      if (i === 0) btn.classList.add('is-active');

      const panel = document.createElement('div');
      panel.className = 'sc-tab-panel';
      if (i === 0) panel.classList.add('is-active');
      panels.push(panel);

      if (!item.json) {
        panel.textContent = `Could not load: ${item.slug}`;
      } else {
        renderCardContent(panel, item.json);
      }

      btn.addEventListener('click', () => {
        nav.querySelectorAll('.sc-tab-btn').forEach((b) => b.classList.remove('is-active'));
        panels.forEach((p) => p.classList.remove('is-active'));
        btn.classList.add('is-active');
        panel.classList.add('is-active');
        updateSchema(item);
      });

      nav.append(btn);
    });

    viewContainer.append(nav, ...panels);
    updateSchema(items[0].json ? items[0] : initialItem);
  }

  btnSide.addEventListener('click', () => {
    btnSide.classList.add('is-active');
    btnTabs.classList.remove('is-active');
    renderSideBySide();
  });

  btnTabs.addEventListener('click', () => {
    btnTabs.classList.add('is-active');
    btnSide.classList.remove('is-active');
    renderTabs();
  });

  renderSideBySide();
}

export default async function init(el) {
  const text = (el.innerText || el.textContent || '').trim();
  const slugs = text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) return;

  if (slugs.length === 1) {
    await initSingle(el, slugs[0]);
  } else {
    await initMulti(el, slugs);
  }
}
