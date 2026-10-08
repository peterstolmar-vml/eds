const BUILT_IN_HINTS = {
  coffee: {
    rating: 'stars',
    tastingNotes: 'pills',
    price: 'price-badge',
    faqs: 'accordion',
    brewing: 'spec-table',
    status: 'badge',
    inStock: 'boolean',
  },
  'pricing-tier': {
    price: 'price-badge',
    features: 'pills',
    limitations: 'pills',
    support: 'spec-table',
    cta: 'cta-button',
    featured: 'boolean',
  },
};

export function getBuiltInHints(schemaName) {
  return BUILT_IN_HINTS[schemaName] || {};
}

function renderStars(value) {
  const num = parseFloat(value);
  const full = Math.floor(num);
  const half = num - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const el = document.createElement('span');
  el.className = 'sc-stars';
  el.setAttribute('aria-label', `${num} out of 5 stars`);
  el.textContent = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  return el;
}

function renderPills(value) {
  const items = Array.isArray(value) ? value : [value];
  const el = document.createElement('ul');
  el.className = 'sc-pills';
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    el.append(li);
  }
  return el;
}

function renderPriceBadge(value, _key, data) {
  const currency = data.currency || 'USD';
  const el = document.createElement('span');
  el.className = 'sc-price-badge';
  el.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  return el;
}

function renderAccordion(value) {
  const items = Array.isArray(value) ? value : [value];
  const el = document.createElement('dl');
  el.className = 'sc-accordion';
  for (const { question, answer } of items) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = question;
    const p = document.createElement('p');
    p.textContent = answer;
    details.append(summary, p);
    el.append(details);
  }
  return el;
}

function renderSpecTable(value) {
  const el = document.createElement('dl');
  el.className = 'sc-spec-table';
  for (const [k, v] of Object.entries(value)) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    el.append(dt, dd);
  }
  return el;
}

function renderBadge(value) {
  const el = document.createElement('span');
  el.className = 'sc-badge';
  el.textContent = value;
  return el;
}

function renderBoolean(value) {
  const el = document.createElement('span');
  el.className = `sc-boolean sc-boolean--${value ? 'true' : 'false'}`;
  el.textContent = value ? 'In Stock' : 'Out of Stock';
  return el;
}

function renderCtaButton(value) {
  const a = document.createElement('a');
  a.className = 'sc-cta btn btn-accent';
  a.href = value.url || '#';
  a.textContent = value.label || 'Learn More';
  return a;
}

function renderDefault(key, value) {
  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  const el = document.createElement('div');
  el.className = 'sc-field';
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = Array.isArray(value) ? value.join(', ') : String(value);
  el.append(dt, dd);
  return el;
}

const RENDERERS = {
  stars: (v) => renderStars(v),
  pills: (v) => renderPills(v),
  'price-badge': (v, k, d) => renderPriceBadge(v, k, d),
  accordion: (v) => renderAccordion(v),
  'spec-table': (v) => renderSpecTable(v),
  badge: (v) => renderBadge(v),
  boolean: (v) => renderBoolean(v),
  'cta-button': (v) => renderCtaButton(v),
};

export function renderField(key, value, hint, data) {
  if (hint && RENDERERS[hint]) return RENDERERS[hint](value, key, data);
  return renderDefault(key, value);
}
