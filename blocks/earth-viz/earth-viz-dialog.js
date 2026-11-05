/* eslint-disable import/no-unresolved */

const TABS = [
  { id: 'data', label: 'Data' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'animation', label: 'Animation' },
  { id: 'labels', label: 'Labels' },
];

const FIELD_DEFS = {
  data: [
    {
      key: 'data', label: 'Data URL', type: 'text', placeholder: 'https://… or /data/file.csv',
    },
    {
      key: 'lat-field', label: 'Latitude field', type: 'text', placeholder: 'latitude',
    },
    {
      key: 'lng-field', label: 'Longitude field', type: 'text', placeholder: 'longitude',
    },
    {
      key: 'magnitude-field', label: 'Magnitude field', type: 'text', placeholder: 'mag',
    },
    {
      key: 'time-field', label: 'Time field', type: 'text', placeholder: 'time',
    },
    {
      key: 'label-field', label: 'Label field', type: 'text', placeholder: 'place',
    },
  ],
  appearance: [
    {
      key: 'globe-mode',
      label: 'Globe mode',
      type: 'select',
      options: ['color', 'monochrome', 'relief', 'wireframe'],
    },
    { key: 'point-color', label: 'Point color', type: 'color' },
    {
      key: 'point-size', label: 'Point size', type: 'number', placeholder: '0.015',
    },
    {
      key: 'point-opacity', label: 'Point opacity (0–1)', type: 'number', placeholder: '0.85',
    },
  ],
  animation: [
    {
      key: 'animation',
      label: 'Auto-rotate',
      type: 'select',
      options: ['true', 'false'],
    },
    {
      key: 'time-window-hours', label: 'Time window (hours)', type: 'number', placeholder: '24',
    },
    {
      key: 'min-magnitude', label: 'Min magnitude', type: 'number', placeholder: '2.0',
    },
  ],
  labels: [
    {
      key: 'show-labels',
      label: 'Show labels',
      type: 'select',
      options: ['false', 'true'],
    },
    {
      key: 'panel-title', label: 'Side panel title', type: 'text', placeholder: 'Recent Earthquakes',
    },
  ],
};

const injectDialogStyles = () => {
  if (document.getElementById('earth-viz-dialog-styles')) return;
  const css = `
    .ev-dialog-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.55);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
    }
    .ev-dialog {
      background: #d0d0d0; border: 1px solid #999; border-radius: 3px;
      width: 520px; max-width: 96vw; max-height: 90vh;
      display: flex; flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.45); font-family: Arial, sans-serif;
      font-size: 13px; color: #222;
    }
    .ev-dialog-header {
      background: linear-gradient(180deg,#5a5a5a 0%,#3a3a3a 100%);
      color: #fff; padding: 8px 12px; border-radius: 2px 2px 0 0;
      display: flex; align-items: center; justify-content: space-between;
      font-size: 13px; font-weight: bold; letter-spacing: 0.02em;
    }
    .ev-dialog-close {
      background: none; border: none; color: #ccc; font-size: 18px;
      cursor: pointer; line-height: 1; padding: 0 2px;
    }
    .ev-dialog-close:hover { color: #fff; }
    .ev-dialog-tabs {
      display: flex; background: #bdbdbd; border-bottom: 1px solid #999;
      padding: 6px 8px 0; gap: 2px;
    }
    .ev-dialog-tab {
      padding: 5px 14px; border: 1px solid #999; border-bottom: none;
      background: #c8c8c8; cursor: pointer; border-radius: 2px 2px 0 0;
      font-size: 12px; color: #333;
    }
    .ev-dialog-tab:hover { background: #d8d8d8; }
    .ev-dialog-tab.active {
      background: #ececec; color: #000; font-weight: bold;
      border-bottom: 1px solid #ececec; margin-bottom: -1px;
    }
    .ev-dialog-body {
      padding: 16px; overflow-y: auto; flex: 1; background: #ececec;
    }
    .ev-dialog-field { margin-bottom: 12px; }
    .ev-dialog-field label {
      display: block; margin-bottom: 3px; font-weight: bold; font-size: 12px; color: #444;
    }
    .ev-dialog-field input[type="text"],
    .ev-dialog-field input[type="number"],
    .ev-dialog-field select {
      width: 100%; padding: 5px 7px; border: 1px solid #aaa;
      border-radius: 2px; font-size: 12px; background: #fff;
      box-sizing: border-box;
    }
    .ev-dialog-field input[type="color"] {
      height: 28px; width: 60px; padding: 1px; border: 1px solid #aaa;
      border-radius: 2px; cursor: pointer;
    }
    .ev-dialog-footer {
      padding: 10px 12px; background: #d0d0d0;
      border-top: 1px solid #aaa; display: flex;
      justify-content: flex-end; gap: 8px;
    }
    .ev-dialog-btn {
      padding: 5px 18px; border-radius: 2px; font-size: 12px; cursor: pointer;
      border: 1px solid #888;
    }
    .ev-dialog-btn-submit {
      background: linear-gradient(180deg,#5a5a5a 0%,#3a3a3a 100%);
      color: #fff; font-weight: bold;
    }
    .ev-dialog-btn-submit:hover { background: linear-gradient(180deg,#444 0%,#222 100%); }
    .ev-dialog-btn-cancel { background: #e0e0e0; color: #333; }
    .ev-dialog-btn-cancel:hover { background: #ccc; }
    .ev-tab-panel { display: none; }
    .ev-tab-panel.active { display: block; }
  `;
  const style = document.createElement('style');
  style.id = 'earth-viz-dialog-styles';
  style.textContent = css;
  document.head.append(style);
};

const buildField = (def, currentVal) => {
  const wrap = document.createElement('div');
  wrap.className = 'ev-dialog-field';
  const label = document.createElement('label');
  label.textContent = def.label;
  wrap.append(label);
  let input;
  if (def.type === 'select') {
    input = document.createElement('select');
    input.dataset.key = def.key;
    def.options.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (opt === String(currentVal)) o.selected = true;
      input.append(o);
    });
  } else {
    input = document.createElement('input');
    input.type = def.type;
    input.dataset.key = def.key;
    if (def.placeholder) input.placeholder = def.placeholder;
    input.value = currentVal ?? '';
  }
  wrap.append(input);
  return wrap;
};

/**
 * Open the authoring dialog.
 * @param {object} config  current block config
 * @param {Function} onSubmit  called with updated config object
 */
const openDialog = (config, onSubmit) => {
  injectDialogStyles();

  const overlay = document.createElement('div');
  overlay.className = 'ev-dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'ev-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Earth Visualizer Settings');

  // Header
  const header = document.createElement('div');
  header.className = 'ev-dialog-header';
  header.textContent = 'Earth Visualizer — Configure';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ev-dialog-close';
  closeBtn.setAttribute('aria-label', 'Close dialog');
  closeBtn.textContent = '✕';
  header.append(closeBtn);

  // Tabs
  const tabBar = document.createElement('div');
  tabBar.className = 'ev-dialog-tabs';
  const body = document.createElement('div');
  body.className = 'ev-dialog-body';

  TABS.forEach((tab, i) => {
    const tabBtn = document.createElement('button');
    tabBtn.className = `ev-dialog-tab${i === 0 ? ' active' : ''}`;
    tabBtn.textContent = tab.label;
    tabBtn.dataset.tab = tab.id;
    tabBar.append(tabBtn);

    const panel = document.createElement('div');
    panel.className = `ev-tab-panel${i === 0 ? ' active' : ''}`;
    panel.dataset.panel = tab.id;

    (FIELD_DEFS[tab.id] || []).forEach((def) => {
      panel.append(buildField(def, config[def.key]));
    });
    body.append(panel);
  });

  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.ev-dialog-tab');
    if (!btn) return;
    tabBar.querySelectorAll('.ev-dialog-tab').forEach((t) => t.classList.remove('active'));
    body.querySelectorAll('.ev-tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    body.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.add('active');
  });

  // Footer
  const footer = document.createElement('div');
  footer.className = 'ev-dialog-footer';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'ev-dialog-btn ev-dialog-btn-cancel';
  cancelBtn.textContent = 'Cancel';
  const submitBtn = document.createElement('button');
  submitBtn.className = 'ev-dialog-btn ev-dialog-btn-submit';
  submitBtn.textContent = 'Submit';
  footer.append(cancelBtn, submitBtn);

  dialog.append(header, tabBar, body, footer);
  overlay.append(dialog);
  document.body.append(overlay);

  const close = () => overlay.remove();
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  submitBtn.addEventListener('click', () => {
    const updated = { ...config };
    body.querySelectorAll('[data-key]').forEach((input) => {
      updated[input.dataset.key] = input.value;
    });
    close();
    onSubmit(updated);
  });

  // Trap focus on first input
  const firstInput = dialog.querySelector('input, select');
  if (firstInput) firstInput.focus();
};
export default openDialog;
