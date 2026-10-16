/* eslint-disable import/no-unresolved */

// ─── Helpers ────────────────────────────────────────────────────────────────

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'cls') node.className = v;
    else if (k === 'data') Object.entries(v).forEach(([dk, dv]) => { node.dataset[dk] = dv; });
    else node.setAttribute(k, v);
  });
  children.flat().forEach((c) => node.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}

function applyColors(node, { backgroundColor, textColor, buttonColor } = {}) {
  if (backgroundColor) node.style.backgroundColor = backgroundColor;
  if (textColor) node.style.color = textColor;
  if (buttonColor) {
    node.querySelectorAll('a.offer-cta').forEach((a) => {
      a.style.backgroundColor = buttonColor;
      a.style.color = '#ffffff';
    });
  }
}

// ─── Offer card builder ──────────────────────────────────────────────────────

function buildOfferCard(offer, size = 'normal') {
  const styles = offer.styles || {};
  const isSmall = size === 'strip';

  const cta = el('a', {
    href: offer.targetUrl || '#',
    cls: 'offer-cta',
    target: '_blank',
    rel: 'noopener',
  }, offer.ctaText || 'Learn More');

  const card = el(
    'div',
    { cls: `offer-card offer-card--${size}` },
    el(
      'div',
      { cls: 'offer-card-body' },
      ...(offer.headline ? [el(isSmall ? 'strong' : 'h3', { cls: 'offer-headline' }, offer.headline)] : []),
      ...(offer.subheading && !isSmall ? [el('p', { cls: 'offer-sub' }, offer.subheading)] : []),
      cta,
    ),
  );

  applyColors(card, styles);
  if (styles.textColor) card.querySelectorAll('h3, p').forEach((n) => { n.style.color = styles.textColor; });
  if (styles.buttonColor) {
    cta.style.backgroundColor = styles.buttonColor;
    cta.style.color = '#ffffff';
  }
  return card;
}

function buildSwatchBar(offer) {
  const styles = offer.styles || {};
  const swatches = [
    ['BG', styles.backgroundColor],
    ['Text', styles.textColor],
    ['Btn', styles.buttonColor],
  ].filter(([, v]) => v);

  if (!swatches.length) return el('p', { cls: 'offer-no-styles' }, 'No custom colors authored (fallback)');

  return el(
    'div',
    { cls: 'offer-swatches' },
    ...swatches.map(([label, hex]) => {
      const swatch = el('span', { cls: 'offer-swatch' });
      swatch.style.backgroundColor = hex;
      return el('span', { cls: 'offer-swatch-item' }, swatch, ` ${label}: ${hex}`);
    }),
  );
}

// ─── Layout renderers ────────────────────────────────────────────────────────

function renderBanner(offers, wrapper) {
  const [active] = offers.filter((o) => o.isActive !== false);
  const offer = active ? active.offerDetails : offers[0]?.offerDetails;
  if (!offer) return;
  const banner = buildOfferCard(offer, 'banner');
  banner.classList.add('offer-banner');
  wrapper.append(banner);
}

function renderCarousel(allOffers, fallback, wrapper) {
  const slides = [
    ...allOffers.map((s) => ({
      ...s.offerDetails,
      season: s.seasonName,
      offerWindow: `${s.startDate?.slice(0, 10)} – ${s.endDate?.slice(0, 10)}`,
    })),
    { ...fallback, season: 'Fallback Offer', offerWindow: 'Always-on' },
  ];

  let current = 0;

  const track = el('div', { cls: 'offer-carousel-track' });
  const meta = el('div', { cls: 'offer-carousel-meta' });
  const prev = el('button', { cls: 'offer-carousel-prev', 'aria-label': 'Previous offer' }, '‹');
  const next = el('button', { cls: 'offer-carousel-next', 'aria-label': 'Next offer' }, '›');
  const dots = el('div', { cls: 'offer-carousel-dots' });

  const dotEls = slides.map((_, i) => {
    const d = el('button', { cls: 'offer-carousel-dot', 'aria-label': `Offer ${i + 1}` });
    // eslint-disable-next-line no-use-before-define
    d.addEventListener('click', () => go(i));
    return d;
  });
  dotEls.forEach((d) => dots.append(d));

  function go(idx) {
    current = (idx + slides.length) % slides.length;
    const s = slides[current];
    track.innerHTML = '';
    track.append(buildOfferCard(s, 'carousel'));
    meta.innerHTML = '';
    meta.append(
      el('span', { cls: 'offer-season-label' }, s.season),
      el('span', { cls: 'offer-window-label' }, s.offerWindow),
      buildSwatchBar(s),
    );
    dotEls.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));

  const controls = el('div', { cls: 'offer-carousel-controls' }, prev, dots, next);
  wrapper.append(track, controls, meta);
  go(0);
}

function renderTabs(allOffers, fallback, wrapper) {
  const items = [
    ...allOffers.map((s) => ({
      label: s.seasonName,
      offer: s.offerDetails,
      offerWindow: `${s.startDate?.slice(0, 10)} – ${s.endDate?.slice(0, 10)}`,
    })),
    { label: 'Fallback', offer: fallback, offerWindow: 'Always-on' },
  ];

  const tabBar = el('div', { cls: 'offer-tab-bar', role: 'tablist' });
  const panels = el('div', { cls: 'offer-tab-panels' });

  items.forEach((item, i) => {
    const tab = el('button', {
      cls: 'offer-tab',
      role: 'tab',
      'aria-selected': i === 0 ? 'true' : 'false',
      'aria-controls': `offer-panel-${i}`,
    }, item.label);

    const panel = el(
      'div',
      {
        cls: 'offer-tab-panel',
        role: 'tabpanel',
        id: `offer-panel-${i}`,
      },
      buildOfferCard(item.offer, 'tab'),
      el(
        'div',
        { cls: 'offer-tab-meta' },
        el('span', { cls: 'offer-window-label' }, item.offerWindow),
        buildSwatchBar(item.offer),
      ),
    );
    if (i > 0) panel.hidden = true;

    const styles = item.offer?.styles || {};
    if (styles.buttonColor) {
      tab.style.borderBottomColor = styles.buttonColor;
    }

    tab.addEventListener('click', () => {
      tabBar.querySelectorAll('.offer-tab').forEach((t) => t.setAttribute('aria-selected', 'false'));
      panels.querySelectorAll('.offer-tab-panel').forEach((p) => { p.hidden = true; });
      tab.setAttribute('aria-selected', 'true');
      panel.hidden = false;
    });

    tabBar.append(tab);
    panels.append(panel);
  });

  wrapper.append(tabBar, panels);
}

function renderCards(allOffers, fallback, wrapper) {
  const grid = el('div', { cls: 'offer-cards-grid' });
  allOffers.forEach((s) => {
    const card = buildOfferCard(s.offerDetails, 'card');
    const info = el(
      'div',
      { cls: 'offer-card-info' },
      el('p', { cls: 'offer-window-label' }, `${s.startDate?.slice(0, 10)} – ${s.endDate?.slice(0, 10)}`),
      buildSwatchBar(s.offerDetails),
    );
    grid.append(el('div', { cls: 'offer-card-wrap' }, card, info));
  });
  const fbCard = buildOfferCard(fallback, 'card');
  const fbInfo = el(
    'div',
    { cls: 'offer-card-info' },
    el('p', { cls: 'offer-window-label' }, 'Fallback — always-on'),
    buildSwatchBar(fallback),
  );
  grid.append(el('div', { cls: 'offer-card-wrap offer-card-wrap--fallback' }, fbCard, fbInfo));
  wrapper.append(grid);
}

function renderStrip(allOffers, fallback, wrapper) {
  const items = [
    ...allOffers.map((s) => s.offerDetails),
    fallback,
  ];
  const strip = el('div', { cls: 'offer-strip' });
  items.forEach((offer) => {
    const pill = el(
      'div',
      { cls: 'offer-strip-pill' },
      el('span', { cls: 'offer-strip-headline' }, offer.headline || ''),
      el('a', {
        href: offer.targetUrl || '#',
        cls: 'offer-cta offer-strip-cta',
        target: '_blank',
        rel: 'noopener',
      }, offer.ctaText || 'Learn More'),
    );
    const styles = offer.styles || {};
    if (styles.backgroundColor) pill.style.backgroundColor = styles.backgroundColor;
    if (styles.textColor) pill.querySelector('.offer-strip-headline').style.color = styles.textColor;
    if (styles.buttonColor) {
      const cta = pill.querySelector('.offer-strip-cta');
      cta.style.backgroundColor = styles.buttonColor;
      cta.style.color = '#ffffff';
    }
    strip.append(pill);
  });
  wrapper.append(strip);
}

// ─── Offer Browser Panel ─────────────────────────────────────────────────────

function getBadgeLabel(item) {
  if (item.type === 'fallback') return 'fallback';
  return item.isActive ? 'active' : 'inactive';
}

function renderBrowser(data, srcUrl, wrapper) {
  const org = 'peterstolmar-vml';
  const site = 'eds';
  const scBase = 'https://da-sc.adobeaem.workers.dev/preview';
  const formBase = 'https://da.live/form#';
  const schemaBase = 'https://da.live/apps/schema#';

  const allOffers = [
    ...(data.seasonalOffers || []).map((s) => ({
      label: s.seasonName,
      offer: s.offerDetails,
      offerWindow: `${s.startDate?.slice(0, 10)} – ${s.endDate?.slice(0, 10)}`,
      isActive: s.isActive,
      type: 'seasonal',
    })),
    {
      label: 'Fallback Offer',
      offer: data.fallbackOffer,
      offerWindow: 'Always-on',
      isActive: true,
      type: 'fallback',
    },
  ];

  let filtered = [...allOffers];

  const searchInput = el('input', {
    cls: 'offer-browser-search',
    type: 'search',
    placeholder: 'Search offers…',
    'aria-label': 'Search offers',
  });

  const schemaLink = el('a', {
    href: `${schemaBase}/${org}/${site}`,
    cls: 'offer-browser-action',
    target: '_blank',
    rel: 'noopener',
    title: 'Open Schema Editor',
  }, '🗂 Schema Editor');

  const formLink = el('a', {
    href: `${formBase}/${org}/${site}/structured-content/seasonal-offer`,
    cls: 'offer-browser-action',
    target: '_blank',
    rel: 'noopener',
    title: 'Edit this offer in the Form Editor',
  }, '✏️ Edit Offer');

  const newFormLink = el('a', {
    href: `https://da.live/#/${org}/${site}/structured-content`,
    cls: 'offer-browser-action offer-browser-action--new',
    target: '_blank',
    rel: 'noopener',
    title: 'Browse structured content folder',
  }, '＋ New / Browse SC');

  const toolbar = el('div', { cls: 'offer-browser-toolbar' }, searchInput, schemaLink, formLink, newFormLink);

  const tooltip = el('div', { cls: 'offer-browser-tooltip', 'aria-live': 'polite', role: 'tooltip' });
  tooltip.hidden = true;
  let tooltipTimer;

  function showTooltip(offerItem, anchorEl) {
    clearTimeout(tooltipTimer);
    tooltip.innerHTML = '';
    const preview = buildOfferCard(offerItem.offer, 'banner');
    const meta = el(
      'div',
      { cls: 'offer-browser-tooltip-meta' },
      el('p', {}, el('strong', {}, offerItem.label)),
      el('p', { cls: 'offer-window-label' }, offerItem.offerWindow),
      buildSwatchBar(offerItem.offer),
    );
    tooltip.append(preview, meta);
    const rect = anchorEl.getBoundingClientRect();
    const wrapRect = wrapper.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom - wrapRect.top + 8}px`;
    tooltip.style.left = `${rect.left - wrapRect.left}px`;
    tooltip.hidden = false;
  }

  function hideTooltip() {
    tooltipTimer = setTimeout(() => { tooltip.hidden = true; }, 200);
  }

  const list = el('ul', { cls: 'offer-browser-list', role: 'list' });

  function renderList() {
    list.innerHTML = '';
    filtered.forEach((item) => {
      const styles = item.offer?.styles || {};
      const swatch = el('span', { cls: 'offer-browser-swatch' });
      if (styles.backgroundColor) swatch.style.backgroundColor = styles.backgroundColor;

      const badge = el('span', {
        cls: `offer-browser-badge offer-browser-badge--${item.type}`,
      }, getBadgeLabel(item));

      const row = el(
        'li',
        { cls: 'offer-browser-row' },
        swatch,
        el('span', { cls: 'offer-browser-label' }, item.offer?.headline || item.label),
        el('span', { cls: 'offer-browser-window' }, item.offerWindow),
        badge,
      );

      row.addEventListener('mouseenter', () => showTooltip(item, row));
      row.addEventListener('mouseleave', hideTooltip);
      list.append(row);
    });
  }

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    filtered = allOffers.filter((o) => `${o.label}${o.offer?.headline || ''}${o.offer?.id || ''}`.toLowerCase().includes(q));
    renderList();
  });

  renderList();

  const panel = el('div', { cls: 'offer-browser-panel' }, toolbar, list);
  wrapper.append(panel, tooltip);
  wrapper.style.position = 'relative';
}

// ─── CSS injection ───────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('offer-preview-styles')) return;
  const css = `
    .offer-card { border-radius: 8px; overflow: hidden; }
    .offer-card-body { padding: 40px 36px; display: flex; flex-direction: column; gap: 16px; }
    .offer-card--banner .offer-card-body { padding: 56px 48px; }
    .offer-card--strip .offer-card-body { padding: 12px 20px; flex-direction: row; align-items: center; gap: 12px; }
    .offer-headline { margin: 0; }
    .offer-card--banner .offer-headline { font-size: 2.2rem; }
    .offer-card--carousel .offer-headline { font-size: 2rem; text-align: center; }
    .offer-card--tab .offer-headline { font-size: 1.6rem; }
    .offer-sub { margin: 0; opacity: 0.85; }
    a.offer-cta {
      display: inline-block; padding: 12px 28px; border-radius: 4px;
      text-decoration: none; font-weight: 700; font-size: 0.95rem;
      background: #333; color: #fff; align-self: flex-start;
      transition: opacity 0.15s;
    }
    a.offer-cta:hover { opacity: 0.85; }
    .offer-card--carousel .offer-card-body { align-items: center; text-align: center; }
    .offer-card--carousel a.offer-cta { align-self: center; padding: 14px 36px; font-size: 1rem; }
    .offer-strip { display: flex; flex-direction: column; gap: 8px; }
    .offer-strip-pill {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 20px; border-radius: 24px; background: #eee;
    }
    .offer-strip-headline { flex: 1; font-weight: 600; font-size: 0.95rem; }
    a.offer-strip-cta { padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; }
    .offer-carousel-track { min-height: 200px; }
    .offer-carousel-controls {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      margin: 12px 0;
    }
    .offer-carousel-prev, .offer-carousel-next {
      background: none; border: 1px solid #ccc; border-radius: 50%;
      width: 36px; height: 36px; font-size: 1.2rem; cursor: pointer;
      line-height: 1; display: flex; align-items: center; justify-content: center;
    }
    .offer-carousel-dots { display: flex; gap: 8px; }
    .offer-carousel-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: #ccc; border: none; cursor: pointer; padding: 0;
      transition: background 0.2s;
    }
    .offer-carousel-dot.active { background: #333; }
    .offer-carousel-meta {
      display: flex; flex-direction: column; gap: 6px; padding: 12px 0;
    }
    .offer-season-label { font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; }
    .offer-window-label { font-size: 0.8rem; color: #666; }
    .offer-swatches { display: flex; gap: 16px; flex-wrap: wrap; padding: 4px 0; }
    .offer-swatch-item { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; }
    .offer-swatch {
      display: inline-block; width: 16px; height: 16px;
      border-radius: 3px; border: 1px solid rgba(0,0,0,0.15);
    }
    .offer-no-styles { font-size: 0.8rem; color: #999; font-style: italic; margin: 0; }
    .offer-tab-bar {
      display: flex; gap: 0; border-bottom: 2px solid #e0e0e0;
      overflow-x: auto;
    }
    .offer-tab {
      padding: 10px 20px; border: none; background: none; cursor: pointer;
      font-size: 0.9rem; border-bottom: 3px solid transparent;
      margin-bottom: -2px; white-space: nowrap;
      transition: border-color 0.15s;
    }
    .offer-tab[aria-selected="true"] { font-weight: 700; border-bottom-color: #333; }
    .offer-tab-panel { padding: 24px 0; }
    .offer-tab-meta { margin-top: 12px; display: flex; flex-direction: column; gap: 4px; }
    .offer-cards-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
    }
    .offer-card-wrap {
      display: flex; flex-direction: column; border-radius: 8px;
      overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .offer-card-wrap--fallback { border: 2px dashed #bbb; }
    .offer-card-info { padding: 12px 16px; background: #fafafa; display: flex; flex-direction: column; gap: 4px; }
    .offer-browser-panel { font-size: 0.9rem; }
    .offer-browser-toolbar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      padding: 12px 0; border-bottom: 1px solid #e0e0e0; margin-bottom: 12px;
    }
    .offer-browser-search {
      flex: 1; min-width: 180px; padding: 8px 12px;
      border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;
    }
    .offer-browser-action {
      padding: 7px 14px; border-radius: 4px; border: 1px solid #ccc;
      text-decoration: none; font-size: 0.82rem; color: #333;
      white-space: nowrap; background: #f5f5f5; transition: background 0.15s;
    }
    .offer-browser-action:hover { background: #e8e8e8; }
    .offer-browser-action--new { background: #7722ff; color: #fff; border-color: #5500cc; }
    .offer-browser-action--new:hover { background: #5500cc; }
    .offer-browser-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .offer-browser-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: 6px; cursor: default;
      transition: background 0.12s;
    }
    .offer-browser-row:hover { background: #f0f0f0; }
    .offer-browser-swatch {
      width: 20px; height: 20px; border-radius: 4px;
      border: 1px solid #ccc; flex-shrink: 0; background: #eee;
    }
    .offer-browser-label { flex: 1; font-weight: 600; }
    .offer-browser-window { font-size: 0.78rem; color: #888; white-space: nowrap; }
    .offer-browser-badge {
      padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .offer-browser-badge--seasonal.active { background: #e6f4ea; color: #1a7a3a; }
    .offer-browser-badge--seasonal.inactive { background: #fef3cd; color: #856404; }
    .offer-browser-badge--fallback { background: #e8e8f0; color: #444; }
    .offer-browser-tooltip {
      position: absolute; z-index: 100; min-width: 320px; max-width: 420px;
      background: #fff; border: 1px solid #ddd; border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.14); padding: 0 0 12px; overflow: hidden;
    }
    .offer-browser-tooltip-meta { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
  `;
  const style = document.createElement('style');
  style.id = 'offer-preview-styles';
  style.textContent = css;
  document.head.append(style);
}

// ─── Main block decorator ────────────────────────────────────────────────────

export default async function decorate(block) {
  injectStyles();

  const rows = [...block.querySelectorAll(':scope > div > div')];
  const srcUrl = rows[0]?.textContent?.trim();
  const variant = rows[1]?.textContent?.trim() || 'banner';

  if (!srcUrl) {
    block.textContent = 'offer-preview: no structured content URL provided.';
    return;
  }

  block.innerHTML = '';

  let data;
  try {
    const resp = await fetch(srcUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    data = json.data ?? json;
  } catch (e) {
    block.append(el('p', { cls: 'offer-error' }, `Could not load offer data: ${e.message}`));
    return;
  }

  const allOffers = data.seasonalOffers || [];
  const fallback = data.fallbackOffer || {};

  const wrapper = el('div', { cls: `offer-preview-wrapper offer-preview--${variant}` });

  if (variant === 'banner') renderBanner(allOffers, wrapper);
  else if (variant === 'carousel') renderCarousel(allOffers, fallback, wrapper);
  else if (variant === 'tabs') renderTabs(allOffers, fallback, wrapper);
  else if (variant === 'cards') renderCards(allOffers, fallback, wrapper);
  else if (variant === 'strip') renderStrip(allOffers, fallback, wrapper);
  else if (variant === 'browser') renderBrowser(data, srcUrl, wrapper);
  else wrapper.append(el('p', {}, `Unknown variant: "${variant}"`));

  block.append(wrapper);
}
