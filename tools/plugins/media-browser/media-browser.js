/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif']);
const BASE_CONTENT = 'https://content.da.live';
const BASE_ADMIN = 'https://admin.da.live';
const SORT_MODES = ['name-asc', 'name-desc', 'date-desc', 'date-asc'];
const SORT_LABELS = {
  'name-asc': 'Name A-Z',
  'name-desc': 'Name Z-A',
  'date-desc': 'Newest',
  'date-asc': 'Oldest',
};

let daActions = null;
let daOrg = '';
let daRepo = '';
let currentPath = '/media';
let allItems = [];
let sortMode = 'name-asc';
let viewMode = 'grid';
const selectedItems = new Set();
let activeInsertItem = null;
let searchVal = '';

const gridArea = document.getElementById('grid-area');
const breadcrumbEl = document.getElementById('breadcrumb');
const searchEl = document.getElementById('search');
const sortBtn = document.getElementById('sort-btn');
const viewGridBtn = document.getElementById('view-grid');
const viewListBtn = document.getElementById('view-list');
const selBar = document.getElementById('sel-bar');
const selLabel = document.getElementById('sel-label');
const btnDeselect = document.getElementById('btn-deselect');
const btnCopyUrl = document.getElementById('btn-copy-url');
const btnInsert = document.getElementById('btn-insert');
const modal = document.getElementById('modal');
const modalThumb = document.getElementById('modal-thumb');
const altInput = document.getElementById('alt-input');
const modalCancel = document.getElementById('modal-cancel');
const modalInsert = document.getElementById('modal-insert');

const isImage = (ext) => IMAGE_EXTS.has((ext || '').toLowerCase());

const formatDate = (ms) => {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
};

const guessAlt = (name) => name
  .replace(/[-_]/g, ' ')
  .replace(/\.[^.]+$/, '')
  .replace(/\b\w/g, (c) => c.toUpperCase());

const contentUrl = (itemPath) => `${BASE_CONTENT}/${daOrg}/${daRepo}${itemPath}`;

const sortItems = (items) => [...items].sort((a, b) => {
  if (sortMode === 'name-asc') return a.name.localeCompare(b.name);
  if (sortMode === 'name-desc') return b.name.localeCompare(a.name);
  if (sortMode === 'date-desc') return (b.lastModified || 0) - (a.lastModified || 0);
  return (a.lastModified || 0) - (b.lastModified || 0);
});

const filterItems = (items) => {
  if (!searchVal) return items;
  const q = searchVal.toLowerCase();
  return items.filter((i) => i.name.toLowerCase().includes(q));
};

const updateSelBar = () => {
  const count = selectedItems.size;
  if (count === 0) {
    selBar.classList.remove('visible');
  } else {
    selBar.classList.add('visible');
    selLabel.textContent = `${count} image${count > 1 ? 's' : ''} selected`;
  }
};

const buildImageHtml = (url, alt) =>
  `<p><picture><source srcset="${url}"><img src="${url}" alt="${alt}"></picture></p>`;

const openInsertModal = (item) => {
  activeInsertItem = item;
  modalThumb.src = contentUrl(item.path);
  modalThumb.alt = guessAlt(item.name);
  altInput.value = guessAlt(item.name);
  modal.classList.add('open');
  setTimeout(() => altInput.focus(), 50);
};

const insertAll = () => {
  const html = [...selectedItems].map((p) => {
    const item = allItems.find((i) => i.path === p);
    const alt = item ? guessAlt(item.name) : '';
    return buildImageHtml(contentUrl(p), alt);
  }).join('');
  daActions.sendHTML(html);
  selectedItems.clear();
  updateSelBar();
};

const buildBreadcrumb = () => {
  breadcrumbEl.textContent = '';
  const parts = currentPath.replace(/^\//, '').split('/');
  parts.forEach((part, idx) => {
    if (idx > 0) {
      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '>';
      breadcrumbEl.appendChild(sep);
    }
    const span = document.createElement('span');
    span.textContent = part;
    if (idx < parts.length - 1) {
      const targetPath = `/${parts.slice(0, idx + 1).join('/')}`;
      // navigateTo is a const defined below — arrow functions are not hoisted
      // but buildBreadcrumb is only ever CALLED after navigateTo is defined,
      // so this reference is safe at call time
      span.addEventListener('click', () => navigateTo(targetPath)); // eslint-disable-line no-use-before-define
    }
    breadcrumbEl.appendChild(span);
  });
};

const renderGrid = () => {
  gridArea.textContent = '';
  gridArea.className = `grid-area${viewMode === 'list' ? ' list-view' : ''}`;

  const visible = filterItems(sortItems(allItems));
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = searchVal ? 'No results.' : 'This folder is empty.';
    gridArea.appendChild(empty);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid';

  visible.forEach((item) => {
    const isFolder = !item.ext;
    const img = isImage(item.ext);
    const card = document.createElement('div');
    card.className = `media-card${selectedItems.has(item.path) ? ' selected' : ''}`;

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'thumb-wrap';

    if (isFolder) {
      const icon = document.createElement('span');
      icon.className = 'folder-icon';
      icon.textContent = '[folder]';
      thumbWrap.appendChild(icon);
    } else if (img) {
      const image = document.createElement('img');
      image.src = contentUrl(item.path);
      image.alt = guessAlt(item.name);
      image.loading = 'lazy';
      thumbWrap.appendChild(image);
    } else {
      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.textContent = '[file]';
      thumbWrap.appendChild(icon);
    }

    const label = document.createElement('div');
    label.className = 'card-label';
    label.textContent = item.name;
    label.title = item.name;
    card.appendChild(thumbWrap);
    card.appendChild(label);

    if (viewMode === 'list') {
      const meta = document.createElement('span');
      meta.className = 'card-meta';
      meta.textContent = formatDate(item.lastModified);
      card.appendChild(meta);
    }

    card.addEventListener('click', () => {
      if (isFolder) {
        navigateTo(item.name); // eslint-disable-line no-use-before-define
        return;
      }
      if (!img) return;
      if (selectedItems.has(item.path)) {
        selectedItems.delete(item.path);
        card.classList.remove('selected');
      } else {
        selectedItems.add(item.path);
        card.classList.add('selected');
      }
      updateSelBar();
    });

    card.addEventListener('dblclick', () => {
      if (!img) return;
      openInsertModal(item);
    });

    grid.appendChild(card);
  });

  gridArea.appendChild(grid);
};

const loadFolder = async () => {
  gridArea.textContent = '';
  const loading = document.createElement('div');
  loading.className = 'loader';
  loading.textContent = 'Loading...';
  gridArea.appendChild(loading);
  buildBreadcrumb();

  const url = `${BASE_ADMIN}/list/${daOrg}/${daRepo}${currentPath}`;
  // eslint-disable-next-line no-console
  console.log('[media-browser] fetching:', url);
  try {
    const res = await daActions.daFetch(url, { headers: { Accept: 'application/json' } });
    // eslint-disable-next-line no-console
    console.log('[media-browser] status:', res.status, 'type:', res.headers.get('content-type'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // eslint-disable-next-line no-console
    console.log('[media-browser] raw:', text.slice(0, 300));
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Not JSON: ${text.slice(0, 80)}`);
    }
    const raw = Array.isArray(data) ? data : (data.items || []);
    allItems = raw.map((item) => {
      const parts = item.path.split('/');
      const fullName = parts[parts.length - 1];
      const dotIdx = fullName.lastIndexOf('.');
      const ext = dotIdx > 0 ? fullName.slice(dotIdx + 1) : '';
      const name = dotIdx > 0 ? fullName.slice(0, dotIdx) : fullName;
      return {
        path: item.path,
        name: item.name || name,
        ext: item.ext || ext,
        lastModified: item.lastModified,
      };
    });
    // eslint-disable-next-line no-console
    console.log('[media-browser] items:', allItems);
    renderGrid();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[media-browser] error:', err);
    gridArea.textContent = '';
    const errEl = document.createElement('div');
    errEl.className = 'empty';
    errEl.textContent = `Error: ${err.message}`;
    gridArea.appendChild(errEl);
  }
};

const navigateTo = (path) => {
  currentPath = path;
  selectedItems.clear();
  searchEl.value = '';
  searchVal = '';
  updateSelBar();
  loadFolder();
};

// ── Event listeners ────────────────────────────────────────────────────────

btnDeselect.addEventListener('click', () => {
  selectedItems.clear();
  updateSelBar();
  renderGrid();
});

btnCopyUrl.addEventListener('click', () => {
  const urls = [...selectedItems].map((p) => contentUrl(p)).join('\n');
  navigator.clipboard.writeText(urls).catch(() => {});
});

btnInsert.addEventListener('click', () => {
  if (selectedItems.size === 1) {
    const path = [...selectedItems][0];
    const item = allItems.find((i) => i.path === path);
    if (item) {
      openInsertModal(item);
      return;
    }
  }
  insertAll();
});

modalCancel.addEventListener('click', () => {
  modal.classList.remove('open');
  activeInsertItem = null;
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('open');
    activeInsertItem = null;
  }
});

modalInsert.addEventListener('click', () => {
  if (!activeInsertItem) return;
  const alt = altInput.value.trim() || guessAlt(activeInsertItem.name);
  const url = contentUrl(activeInsertItem.path);
  daActions.sendHTML(buildImageHtml(url, alt));
  modal.classList.remove('open');
  activeInsertItem = null;
  selectedItems.clear();
  updateSelBar();
  renderGrid();
});

searchEl.addEventListener('input', (e) => {
  searchVal = e.target.value.trim();
  renderGrid();
});

sortBtn.addEventListener('click', () => {
  const idx = SORT_MODES.indexOf(sortMode);
  sortMode = SORT_MODES[(idx + 1) % SORT_MODES.length];
  sortBtn.textContent = SORT_LABELS[sortMode];
  renderGrid();
});

viewGridBtn.addEventListener('click', () => {
  viewMode = 'grid';
  viewGridBtn.classList.add('active');
  viewListBtn.classList.remove('active');
  renderGrid();
});

viewListBtn.addEventListener('click', () => {
  viewMode = 'list';
  viewListBtn.classList.add('active');
  viewGridBtn.classList.remove('active');
  renderGrid();
});

// ── Init ───────────────────────────────────────────────────────────────────
(async () => {
  const { context, actions } = await DA_SDK;
  daActions = actions;
  daOrg = context.org || 'peterstolmar-vml';
  daRepo = context.repo || 'eds';
  // eslint-disable-next-line no-console
  console.log('[media-browser] context:', JSON.stringify(context));
  loadFolder();
})();
