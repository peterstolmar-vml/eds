/* eslint-disable import/no-unresolved */
/**
 * product-card.js
 *
 * Variants (set as extra class on the block):
 *   hero     — full-width hero treatment, one product per block
 *   compare  — side-by-side comparison table, two products in one block
 *   tile     — compact shelf tile, one product per block
 *
 * Block cell layout:
 *   Each row col 1 = SC document path  e.g. /demo/products/mondays-dark-roast
 *   compare variant: row 1 col 1 = product A, row 1 col 2 = product B
 */

const SC_BASE = 'https://main--eds--peterstolmar-vml.aem.page';

// ─── SC parser ─────────────────────────────────────────────────────────────

const resolveRef = (doc, ref) => {
  if (!ref.startsWith('self://#')) return null;
  const id = ref.replace('self://#', '');
  const parts = id.split('-');
  return doc.querySelector(`.${parts[0]}.${id}`) || doc.querySelector(`.${id}`);
};

const parseFragment = (el, doc) => {
  const obj = {};
  el.querySelectorAll(':scope > div').forEach((row) => {
    const keyEl = row.querySelector(':scope > div:first-child h3');
    const valEl = row.querySelector(':scope > div:last-child');
    if (!keyEl || !valEl) return;
    const key = keyEl.textContent.trim();
    const lis = [...valEl.querySelectorAll('li')];
    if (lis.length) {
      const vals = lis.map((li) => li.textContent.trim());
      const allRefs = vals.every((v) => v.startsWith('self://#'));
      if (allRefs) {
        // eslint-disable-next-line no-use-before-define
        obj[key] = vals.map((v) => resolveFragRef(doc, v));
      } else {
        obj[key] = vals;
      }
    } else {
      const txt = valEl.textContent.trim();
      if (txt.startsWith('self://#')) {
        // eslint-disable-next-line no-use-before-define
        obj[key] = resolveFragRef(doc, txt);
      } else if (txt === 'true') {
        obj[key] = true;
      } else if (txt === 'false') {
        obj[key] = false;
      } else if (txt !== '' && !Number.isNaN(Number(txt))) {
        obj[key] = Number(txt);
      } else {
        obj[key] = txt;
      }
    }
  });
  return obj;
};

const resolveFragRef = (doc, ref) => {
  const el = resolveRef(doc, ref);
  return el ? parseFragment(el, doc) : {};
};

const parseSCDoc = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.querySelector('.product');
  if (!root) return null;
  return parseFragment(root, doc);
};

const fetchProduct = async (scPath) => {
  const res = await fetch(`${SC_BASE}${scPath}.plain.html`);
  if (!res.ok) throw new Error(`${res.status}`);
  return parseSCDoc(await res.text());
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const usd = (n) => `$${Number(n).toFixed(2)}`;

const starsHtml = (rating) => {
  const full = Math.round(Number(rating));
  return Array.from(
    { length: 5 },
    (_, i) => `<span class="pc-star${i < full ? ' filled' : ''}">★</span>`,
  ).join('');
};

const pillsHtml = (notes) => (Array.isArray(notes) ? notes : [])
  .map((n) => `<span class="pc-pill">${n}</span>`)
  .join('');

const roastBarHtml = (level) => {
  const levels = ['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark'];
  const idx = levels.findIndex((l) => l.toLowerCase() === String(level).toLowerCase());
  const pct = idx >= 0 ? Math.round(((idx + 1) / levels.length) * 100) : 50;
  return `
    <div class="pc-roast-bar" title="${level} roast">
      <div class="pc-roast-fill" style="width:${pct}%"></div>
    </div>
    <span class="pc-roast-label">${level} roast</span>`;
};

// ─── Renderers ─────────────────────────────────────────────────────────────

const heroHtml = (p) => `
  <div class="pc-hero-inner">
    <div class="pc-hero-roast-band">${p.roastLevel || ''} roast</div>
    <h2 class="pc-hero-name">${p.name}</h2>
    <div class="pc-hero-meta">
      <span class="pc-hero-price">${usd(p.price)}</span>
      <span class="pc-hero-weight">${p.weightGrams}g</span>
      <span class="pc-hero-rating">${starsHtml(p.rating)} ${p.rating}</span>
    </div>
    <div class="pc-hero-notes">
      <span class="pc-notes-label">Tasting notes</span>
      <div class="pc-pills">${pillsHtml(p.tastingNotes)}</div>
    </div>
    <div class="pc-hero-brew">
      <span class="pc-brew-label">Brew method</span>
      <span class="pc-brew-value">${p.brewing?.method || 'Any'}</span>
    </div>
    <button class="pc-cta" type="button">Add to cart — ${usd(p.price)}</button>
  </div>`;

const tileHtml = (p) => `
  <div class="pc-tile-inner">
    <div class="pc-tile-roast">${roastBarHtml(p.roastLevel)}</div>
    <h3 class="pc-tile-name">${p.name}</h3>
    <div class="pc-tile-rating">${starsHtml(p.rating)}<span>${p.rating}</span></div>
    <div class="pc-pills">${pillsHtml(p.tastingNotes)}</div>
    <div class="pc-tile-footer">
      <span class="pc-tile-price">${usd(p.price)}</span>
      <button class="pc-cta-sm" type="button">Add to cart</button>
    </div>
  </div>`;

const compareHtml = (a, b) => {
  const rows = [
    ['Price', usd(a.price), usd(b.price)],
    ['Weight', `${a.weightGrams}g`, `${b.weightGrams}g`],
    ['Roast', a.roastLevel, b.roastLevel],
    ['Brew method', a.brewing?.method || 'Any', b.brewing?.method || 'Any'],
    ['Tasting notes', (a.tastingNotes || []).join(', '), (b.tastingNotes || []).join(', ')],
    ['Rating', `${starsHtml(a.rating)} ${a.rating}`, `${starsHtml(b.rating)} ${b.rating}`],
    ['In stock', a.inStock ? 'Yes' : 'No', b.inStock ? 'Yes' : 'No'],
  ];
  const rowsHtml = rows.map(([label, av, bv]) => `
    <tr>
      <th scope="row">${label}</th>
      <td>${av}</td>
      <td>${bv}</td>
    </tr>`).join('');
  return `
    <div class="pc-compare-wrap">
      <table class="pc-compare-table">
        <thead>
          <tr>
            <th></th>
            <th scope="col">${a.name}</th>
            <th scope="col">${b.name}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr>
            <td></td>
            <td><button class="pc-cta-sm" type="button">Add to cart</button></td>
            <td><button class="pc-cta-sm" type="button">Add to cart</button></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
};

// ─── Block entry point ─────────────────────────────────────────────────────

export default async function decorate(block) {
  const isHero = block.classList.contains('hero');
  const isCompare = block.classList.contains('compare');
  const isTile = block.classList.contains('tile');

  const paths = [...block.querySelectorAll('div > div')]
    .map((el) => el.textContent.trim())
    .filter((t) => t.startsWith('/'));

  block.innerHTML = '<div class="pc-loading">Loading…</div>';

  let products;
  try {
    products = await Promise.all(paths.map(fetchProduct));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[product-card] fetch error', err);
    block.innerHTML = '<p class="pc-error">Unable to load product.</p>';
    return;
  }

  if (isCompare && products.length >= 2) {
    block.innerHTML = compareHtml(products[0], products[1]);
    return;
  }

  if (isHero) {
    block.innerHTML = products.map(heroHtml).join('');
    return;
  }

  if (isTile) {
    block.innerHTML = `<div class="pc-tile-grid">${products.map(tileHtml).join('')}</div>`;
    return;
  }

  // default fallback — same as tile
  block.innerHTML = `<div class="pc-tile-grid">${products.map(tileHtml).join('')}</div>`;
}
