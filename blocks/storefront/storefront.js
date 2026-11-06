/* eslint-disable import/no-unresolved */
/**
 * storefront.js — SkyLink Commerce Optimizer
 *
 * Block cell: Row 1 Col 1 = SC document path
 *   e.g. /structured-content/skylink-plans
 *
 * Flow:
 *   1. Fetch SC doc via .plain.html — no auth needed
 *   2. Parse satellite-plan fragment graph
 *   3. Render: ZIP check → plans → add-ons → checkout → confirmation
 *   4. Abandoned cart banner after 20 s inactivity if plan is selected
 */

// ─── SC fragment resolver ──────────────────────────────────────────────────

/**
 * Resolve a self://#class-id ref to the matching element in doc.
 * @param {Document} doc
 * @param {string} ref
 * @returns {Element|null}
 */
const resolveRef = (doc, ref) => {
  if (!ref.startsWith('self://#')) return null;
  const id = ref.replace('self://#', '');
  const parts = id.split('-');
  const base = parts[0];
  return doc.querySelector(`.${base}.${id}`) || doc.querySelector(`.${id}`);
};

/**
 * Parse key/value rows from an SC fragment element.
 * Recursively resolves list refs (self://#…) into child objects.
 * @param {Element} el
 * @param {Document} doc
 * @returns {Record<string, *>}
 */
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

/**
 * Resolve a single self ref to a parsed object.
 * @param {Document} doc
 * @param {string} ref
 * @returns {Record<string, *>}
 */
const resolveFragRef = (doc, ref) => {
  const el = resolveRef(doc, ref);
  return el ? parseFragment(el, doc) : {};
};

/**
 * Parse the full SC document into a plain JS object.
 * @param {string} html
 * @returns {Record<string, *>}
 */
const parseSCDoc = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.querySelector('.satellite-plan');
  if (!root) return {};
  return parseFragment(root, doc);
};

// ─── ZIP signal simulation ─────────────────────────────────────────────────

const HASH_MULT = 31;
const HASH_MOD = 100;
const SIGNAL_MIN = 40;
const SIGNAL_RANGE = 55;
const LATENCY_PENALTY_MAX = 300;
const BAR_COUNT = 5;
const ABANDON_DELAY_MS = 20000;
const ZIP_RE = /^\d{5}$/;

/**
 * Deterministic pseudo-random signal quality (0–100) from a ZIP string.
 * @param {string} zip
 * @returns {number}
 */
const zipToSignal = (zip) => {
  let h = 0;
  for (let i = 0; i < zip.length; i += 1) {
    h = (h * HASH_MULT + zip.charCodeAt(i)) % HASH_MOD;
  }
  return SIGNAL_MIN + (h % SIGNAL_RANGE);
};

/**
 * Estimate realistic latency for a plan + signal quality.
 * Poor signal adds up to LATENCY_PENALTY_MAX ms (satellite packet loss model).
 * @param {number} baseMs
 * @param {number} signalPct  0–100
 * @returns {number}
 */
const estimateLatency = (baseMs, signalPct) => {
  const penalty = Math.round(((100 - signalPct) / 100) * LATENCY_PENALTY_MAX);
  return baseMs + penalty;
};

/**
 * @param {number} pct  0–100
 * @returns {'Excellent'|'Good'|'Fair'}
 */
const signalLabel = (pct) => {
  if (pct >= 75) return 'Excellent';
  if (pct >= 55) return 'Good';
  return 'Fair';
};

/**
 * @param {number} ms
 * @returns {'good'|'ok'|'slow'}
 */
const latClass = (ms) => {
  if (ms < 250) return 'good';
  if (ms < 450) return 'ok';
  return 'slow';
};

/**
 * @param {number} ms
 * @returns {string}
 */
const latLabel = (ms) => {
  if (ms < 250) return 'Low';
  if (ms < 450) return 'Moderate';
  return 'High';
};

// ─── Cart helpers ──────────────────────────────────────────────────────────

const CART_KEY = 'skylink-cart';

/** @returns {{ plan: string|null, addons: string[] }|null} */
const getCart = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CART_KEY) || 'null');
  } catch {
    return null;
  }
};

/** @param {{ plan: string|null, addons: string[] }} cart */
const saveCart = (cart) => {
  sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
};

const clearCart = () => sessionStorage.removeItem(CART_KEY);

// ─── Tiny helpers ──────────────────────────────────────────────────────────

/** @param {number} n */
const usd = (n) => `$${n.toFixed(2)}`;

/**
 * Signal strength bars HTML.
 * @param {number} pct  0–100
 * @returns {string}
 */
const barsHtml = (pct) => {
  const lit = Math.round((pct / 100) * BAR_COUNT);
  const bars = Array.from(
    { length: BAR_COUNT },
    (_, i) => `<span class="sf-bar${i < lit ? ' active' : ''}"></span>`,
  ).join('');
  return `<span class="sf-signal-bars" aria-label="${pct}% signal">${bars}</span>`;
};

// ─── HTML renderers ────────────────────────────────────────────────────────

/**
 * @param {Record<string, *>} data
 * @returns {string}
 */
const plansHtml = (data) => {
  const plans = Array.isArray(data.plans) ? data.plans : [];
  const cards = plans.map((p) => {
    const badge = p.badge
      ? `<span class="sf-plan-badge">${p.badge}</span>`
      : '';
    const hlCls = p.highlighted ? ' sf-plan-card-highlight' : '';
    const feats = (Array.isArray(p.features) ? p.features : [])
      .map((f) => `<li>${f}</li>`)
      .join('');
    const setup = p.setupFee > 0
      ? `<p class="sf-plan-setup">+${usd(p.setupFee)} one-time setup</p>`
      : '<p class="sf-plan-setup sf-plan-setup-free">Free installation</p>';
    return `
      <div class="sf-plan-card${hlCls}" data-plan-id="${p.id}">
        ${badge}
        <h3 class="sf-plan-name">${p.name}</h3>
        <p class="sf-plan-tagline">${p.tagline}</p>
        <div class="sf-plan-speed">
          <span class="sf-plan-dl">${p.downloadMbps} Mbps</span>
          <span class="sf-plan-speed-label">download</span>
        </div>
        <div class="sf-plan-latency sf-latency-${latClass(p.latencyMs)}"
          data-base-lat="${p.latencyMs}">
          <span class="sf-latency-dot"></span>
          <span class="sf-latency-text">~${p.latencyMs} ms
            <em>(${latLabel(p.latencyMs)})</em></span>
        </div>
        <div class="sf-plan-price">
          <span class="sf-plan-price-amount">${usd(p.monthlyPrice)}</span>
          <span class="sf-plan-price-period">/mo</span>
        </div>
        ${setup}
        <ul class="sf-plan-features">${feats}</ul>
        <button class="sf-btn-select-plan sf-btn-primary" type="button"
          data-plan-id="${p.id}" aria-label="Select ${p.name}">
          Select Plan
        </button>
      </div>`;
  }).join('');
  return `
    <div class="sf-plans-heading">
      <h2>Plans for your location</h2>
      <p class="sf-plans-signal-note"></p>
    </div>
    <div class="sf-plans-grid">${cards}</div>`;
};

/**
 * @param {Record<string, *>} data
 * @returns {string}
 */
const zipSectionHtml = (data) => `
  <section class="sf-zip-section" id="sf-zip">
    <h2>Check availability at your address</h2>
    <p>Enter your ZIP code to see plans and estimated signal quality for your area.</p>
    <div class="sf-zip-form">
      <label for="sf-zip-input" class="sf-sr-only">ZIP code</label>
      <input id="sf-zip-input" class="sf-zip-input" type="text" inputmode="numeric"
        pattern="[0-9]{5}" maxlength="5" placeholder="Enter ZIP code"
        autocomplete="postal-code">
      <button class="sf-zip-btn sf-btn-primary" type="button">Check My Area</button>
    </div>
    <div class="sf-zip-result" aria-live="polite" hidden></div>
    <div class="sf-plans-wrap" hidden>
      ${plansHtml(data)}
    </div>
  </section>
`;

/**
 * @param {Record<string, *>} data
 * @returns {string}
 */
const addonsSectionHtml = (data) => {
  const addons = Array.isArray(data.addons) ? data.addons : [];
  const items = addons.map((a) => `
    <label class="sf-addon-item">
      <input class="sf-addon-cb" type="checkbox" value="${a.id}"
        aria-label="${a.name} — ${usd(a.monthlyPrice)}/mo">
      <span class="sf-addon-info">
        <strong>${a.name}</strong>
        <span>${a.description}</span>
      </span>
      <span class="sf-addon-price">${usd(a.monthlyPrice)}/mo</span>
    </label>`).join('');
  return `
    <section class="sf-addons-section" hidden>
      <h2>Enhance your plan</h2>
      <p>Optional add-ons — cancel any time.</p>
      <div class="sf-addons-list">${items}</div>
      <div class="sf-addons-cta">
        <button class="sf-btn-continue sf-btn-primary" type="button">
          Continue to checkout
        </button>
      </div>
    </section>`;
};

/**
 * @param {Record<string, *>} co  checkout object
 * @param {Record<string, *>} data  full root
 * @returns {string}
 */
const checkoutSectionHtml = (co, data) => {
  const plans = Array.isArray(data.plans) ? data.plans : [];
  const opts = plans.map(
    (p) => `<option value="${p.id}">${p.name} — ${usd(p.monthlyPrice)}/mo</option>`,
  ).join('');
  const legal = co.legalDisclaimer
    ? `<p class="sf-legal">${co.legalDisclaimer}</p>`
    : '';
  return `
    <section class="sf-checkout-section" hidden>
      <h2>${co.headline || 'Complete your order'}</h2>
      <form class="sf-checkout-form" novalidate>
        <fieldset class="sf-fieldset">
          <legend>Your information</legend>
          <div class="sf-field-row">
            <div class="sf-field">
              <label for="sf-fname">First name</label>
              <input id="sf-fname" name="firstname" type="text"
                autocomplete="given-name" required>
            </div>
            <div class="sf-field">
              <label for="sf-lname">Last name</label>
              <input id="sf-lname" name="lastname" type="text"
                autocomplete="family-name" required>
            </div>
          </div>
          <div class="sf-field">
            <label for="sf-email">Email address</label>
            <input id="sf-email" name="email" type="email"
              autocomplete="email" required>
          </div>
          <div class="sf-field">
            <label for="sf-phone">Phone number</label>
            <input id="sf-phone" name="phone" type="tel"
              autocomplete="tel" required>
          </div>
        </fieldset>
        <fieldset class="sf-fieldset">
          <legend>Service address</legend>
          <div class="sf-field">
            <label for="sf-address">Street address</label>
            <input id="sf-address" name="address" type="text"
              autocomplete="street-address" required>
          </div>
          <div class="sf-field-row">
            <div class="sf-field">
              <label for="sf-city">City</label>
              <input id="sf-city" name="city" type="text"
                autocomplete="address-level2" required>
            </div>
            <div class="sf-field sf-field-zip">
              <label for="sf-zip-co">ZIP code</label>
              <input id="sf-zip-co" name="zip" type="text" inputmode="numeric"
                maxlength="5" autocomplete="postal-code" required>
            </div>
          </div>
        </fieldset>
        <fieldset class="sf-fieldset">
          <legend>Plan &amp; installation</legend>
          <div class="sf-field">
            <label for="sf-plan-sel">Selected plan</label>
            <select id="sf-plan-sel" name="plan" required>${opts}</select>
          </div>
          <div class="sf-field">
            <label for="sf-install">Preferred installation date</label>
            <input id="sf-install" name="installdate" type="date" required>
          </div>
        </fieldset>
        <div class="sf-checkout-summary">
          <h3>Order summary</h3>
          <div class="sf-summary-lines"></div>
          <div class="sf-summary-total"></div>
        </div>
        ${legal}
        <button class="sf-btn-submit sf-btn-primary" type="submit">
          ${co.submitLabel || 'Place My Order'}
        </button>
      </form>
    </section>`;
};

/**
 * @param {Record<string, *>} co
 * @returns {string}
 */
const confirmationHtml = (co) => `
  <section class="sf-confirmation" hidden>
    <div class="sf-confirmation-icon" aria-hidden="true">🛰️</div>
    <h2>${co.successHeadline || 'Order confirmed!'}</h2>
    <p>${co.successBody || 'Thank you — we will be in touch shortly.'}</p>
    <button class="sf-btn-restart sf-btn-secondary" type="button">
      Start over
    </button>
  </section>`;

/**
 * @param {Record<string, *>} data
 * @returns {string}
 */
const abandonedCartHtml = (data) => `
  <aside class="sf-abandoned-cart" aria-live="assertive" hidden>
    <button class="sf-abandoned-close" type="button" aria-label="Dismiss">✕</button>
    <div class="sf-abandoned-body">
      <span class="sf-abandoned-icon" aria-hidden="true">🛸</span>
      <div>
        <strong>${data.abandonedCartHeadline || 'Still thinking it over?'}</strong>
        <p>${data.abandonedCartSubtext || 'Your plan is saved.'}</p>
      </div>
      <button class="sf-btn-abandoned-cta sf-btn-primary" type="button">
        ${data.abandonedCartCtaText || 'Complete My Order'}
      </button>
    </div>
  </aside>`;

// ─── Summary updater ───────────────────────────────────────────────────────

/**
 * @param {{ plan: string|null, addons: string[] }} cart
 * @param {Array<Record<string,*>>} allPlans
 * @param {Array<Record<string,*>>} allAddons
 * @param {Element} linesEl
 * @param {Element} totalEl
 */
const updateSummary = (cart, allPlans, allAddons, linesEl, totalEl) => {
  if (!cart?.plan) return;
  const plan = allPlans.find((p) => p.id === cart.plan);
  if (!plan) return;
  let total = plan.monthlyPrice;
  let html = `
    <div class="sf-summary-line">
      <span>${plan.name}</span><span>${usd(plan.monthlyPrice)}/mo</span>
    </div>`;
  if (plan.setupFee > 0) {
    html += `
      <div class="sf-summary-line sf-summary-line-muted">
        <span>Installation (one-time)</span><span>${usd(plan.setupFee)}</span>
      </div>`;
  }
  (cart.addons || []).forEach((aid) => {
    const addon = allAddons.find((a) => a.id === aid);
    if (!addon) return;
    total += addon.monthlyPrice;
    html += `
      <div class="sf-summary-line">
        <span>${addon.name}</span><span>+${usd(addon.monthlyPrice)}/mo</span>
      </div>`;
  });
  linesEl.innerHTML = html;
  totalEl.innerHTML = `
    <div class="sf-summary-total-line">
      <strong>Monthly total</strong><strong>${usd(total)}/mo</strong>
    </div>`;
};

// ─── Block entry point ─────────────────────────────────────────────────────

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const scPath = block.querySelector('div > div')?.textContent?.trim();
  block.innerHTML = '<div class="sf-loading" aria-live="polite">Loading plans…</div>';
  if (!scPath) {
    block.innerHTML = '<p class="sf-error">Storefront: no SC path configured.</p>';
    return;
  }

  let data;
  try {
    const res = await fetch(`${scPath}.plain.html`);
    if (!res.ok) throw new Error(`${res.status}`);
    data = parseSCDoc(await res.text());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[storefront] SC load error', err);
    block.innerHTML = '<p class="sf-error">Unable to load plans. Please try again shortly.</p>';
    return;
  }

  const co = (data.checkout && typeof data.checkout === 'object') ? data.checkout : {};
  const allPlans = Array.isArray(data.plans) ? data.plans : [];
  const allAddons = Array.isArray(data.addons) ? data.addons : [];

  block.innerHTML = `
    <div class="sf-root">
      ${zipSectionHtml(data)}
      ${addonsSectionHtml(data)}
      ${checkoutSectionHtml(co, data)}
      ${confirmationHtml(co)}
      ${abandonedCartHtml(data)}
    </div>`;

  // ── Element refs ───────────────────────────────────────────────────────
  const root = block.querySelector('.sf-root');
  const zipInput = root.querySelector('#sf-zip-input');
  const zipBtn = root.querySelector('.sf-zip-btn');
  const zipResult = root.querySelector('.sf-zip-result');
  const plansWrap = root.querySelector('.sf-plans-wrap');
  const signalNote = root.querySelector('.sf-plans-signal-note');
  const addonsSection = root.querySelector('.sf-addons-section');
  const checkoutSection = root.querySelector('.sf-checkout-section');
  const confirmSection = root.querySelector('.sf-confirmation');
  const abandonedEl = root.querySelector('.sf-abandoned-cart');
  const summaryLines = root.querySelector('.sf-summary-lines');
  const summaryTotal = root.querySelector('.sf-summary-total');
  const planSel = root.querySelector('#sf-plan-sel');
  const zipCo = root.querySelector('#sf-zip-co');
  const form = root.querySelector('.sf-checkout-form');

  let cart = getCart() || { plan: null, addons: [] };
  let abandonTimer = null;

  // ── Abandoned cart timer ───────────────────────────────────────────────
  const resetAbandonTimer = () => {
    clearTimeout(abandonTimer);
    if (!cart.plan) return;
    abandonTimer = setTimeout(() => {
      abandonedEl.hidden = false;
    }, ABANDON_DELAY_MS);
  };

  const activityEvents = ['mousemove', 'keydown', 'scroll', 'touchstart'];
  activityEvents.forEach((ev) => {
    document.addEventListener(ev, resetAbandonTimer, { passive: true });
  });

  // ── ZIP check ──────────────────────────────────────────────────────────
  const doZip = () => {
    const zip = zipInput.value.trim();
    if (!ZIP_RE.test(zip)) {
      zipResult.hidden = false;
      zipResult.innerHTML = '<p class="sf-zip-error">Please enter a valid 5-digit ZIP code.</p>';
      return;
    }
    if (zipCo) zipCo.value = zip;
    const sig = zipToSignal(zip);
    const lbl = signalLabel(sig);
    zipResult.hidden = false;
    zipResult.innerHTML = `
      <div class="sf-zip-signal">
        <p><strong>Coverage found for ${zip}!</strong>
          Signal: <strong>${lbl}</strong> ${barsHtml(sig)}</p>
        <p class="sf-zip-signal-sub">
          Latency estimates below reflect your signal conditions.
        </p>
      </div>`;
    if (signalNote) signalNote.textContent = `Signal at ${zip}: ${lbl} (${sig}%)`;

    root.querySelectorAll('.sf-plan-card').forEach((card) => {
      const baseLat = Number.parseInt(card.dataset.baseLat, 10);
      if (Number.isNaN(baseLat)) return;
      const est = estimateLatency(baseLat, sig);
      const latEl = card.querySelector('.sf-plan-latency');
      if (!latEl) return;
      latEl.className = `sf-plan-latency sf-latency-${latClass(est)}`;
      const txtEl = latEl.querySelector('.sf-latency-text');
      if (txtEl) txtEl.innerHTML = `~${est} ms <em>(${latLabel(est)})</em>`;
    });

    plansWrap.hidden = false;
    plansWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  zipBtn.addEventListener('click', doZip);
  zipInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doZip();
  });

  // ── Plan selection ─────────────────────────────────────────────────────
  root.querySelectorAll('.sf-btn-select-plan').forEach((btn) => {
    btn.addEventListener('click', () => {
      cart.plan = btn.dataset.planId;
      cart.addons = cart.addons || [];
      saveCart(cart);
      root.querySelectorAll('.sf-plan-card').forEach((c) => {
        c.classList.toggle('sf-plan-card-selected', c.dataset.planId === cart.plan);
      });
      if (planSel) planSel.value = cart.plan;
      addonsSection.hidden = false;
      addonsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      resetAbandonTimer();
    });
  });

  // ── Add-on toggles ─────────────────────────────────────────────────────
  root.querySelectorAll('.sf-addon-cb').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (!cart.addons.includes(cb.value)) cart.addons.push(cb.value);
      } else {
        cart.addons = cart.addons.filter((a) => a !== cb.value);
      }
      saveCart(cart);
    });
  });

  // ── Continue to checkout ───────────────────────────────────────────────
  root.querySelector('.sf-btn-continue').addEventListener('click', () => {
    updateSummary(cart, allPlans, allAddons, summaryLines, summaryTotal);
    checkoutSection.hidden = false;
    checkoutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    resetAbandonTimer();
  });

  // ── Plan select sync ───────────────────────────────────────────────────
  if (planSel) {
    planSel.addEventListener('change', () => {
      cart.plan = planSel.value;
      saveCart(cart);
      updateSummary(cart, allPlans, allAddons, summaryLines, summaryTotal);
    });
  }

  // ── Form submit ────────────────────────────────────────────────────────
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.querySelectorAll(':invalid').forEach((f) => f.classList.add('sf-invalid'));
      form.querySelector(':invalid')?.focus();
      return;
    }
    clearCart();
    clearTimeout(abandonTimer);
    abandonedEl.hidden = true;
    checkoutSection.hidden = true;
    confirmSection.hidden = false;
    confirmSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  form.querySelectorAll('input, select').forEach((f) => {
    f.addEventListener('input', () => f.classList.remove('sf-invalid'));
  });

  // ── Abandoned cart ─────────────────────────────────────────────────────
  root.querySelector('.sf-btn-abandoned-cta').addEventListener('click', () => {
    abandonedEl.hidden = true;
    updateSummary(cart, allPlans, allAddons, summaryLines, summaryTotal);
    checkoutSection.hidden = false;
    checkoutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  root.querySelector('.sf-abandoned-close').addEventListener('click', () => {
    abandonedEl.hidden = true;
  });

  // ── Start over ─────────────────────────────────────────────────────────
  root.querySelector('.sf-btn-restart').addEventListener('click', () => {
    clearCart();
    clearTimeout(abandonTimer);
    cart = { plan: null, addons: [] };
    form.reset();
    zipInput.value = '';
    zipResult.hidden = true;
    plansWrap.hidden = true;
    addonsSection.hidden = true;
    checkoutSection.hidden = true;
    confirmSection.hidden = true;
    abandonedEl.hidden = true;
    root.querySelectorAll('.sf-plan-card-selected').forEach((c) => {
      c.classList.remove('sf-plan-card-selected');
    });
    root.querySelector('#sf-zip')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ── Restore persisted cart ─────────────────────────────────────────────
  const saved = getCart();
  if (saved?.plan) {
    cart = saved;
    const card = root.querySelector(`.sf-plan-card[data-plan-id="${cart.plan}"]`);
    if (card) card.classList.add('sf-plan-card-selected');
    (cart.addons || []).forEach((aid) => {
      const cb = root.querySelector(`.sf-addon-cb[value="${aid}"]`);
      if (cb) cb.checked = true;
    });
    if (planSel) planSel.value = cart.plan;
  }
}
