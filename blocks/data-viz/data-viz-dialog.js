/* eslint-disable import/no-unresolved */

import PRESETS, { COLOR_SCHEMES } from './data-viz-presets.js';

const TABS = [
  { id: 'preset', label: 'Preset' },
  { id: 'data', label: 'Data' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'animation', label: 'Animation' },
];

const injectStyles = () => {
  if (document.getElementById('dv-dialog-styles')) return;
  const css = `
    .dv-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
    }
    .dv-dialog {
      background: #d0d0d0; border: 1px solid #999; border-radius: 3px;
      width: 540px; max-width: 96vw; max-height: 90vh;
      display: flex; flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      font-family: Arial, sans-serif; font-size: 13px; color: #222;
    }
    .dv-header {
      background: linear-gradient(180deg,#5a5a5a 0%,#3a3a3a 100%);
      color: #fff; padding: 8px 12px; border-radius: 2px 2px 0 0;
      display: flex; align-items: center; justify-content: space-between;
      font-weight: bold; font-size: 13px; letter-spacing: 0.02em;
    }
    .dv-close {
      background: none; border: none; color: #ccc;
      font-size: 18px; cursor: pointer; line-height: 1; padding: 0 2px;
    }
    .dv-close:hover { color: #fff; }
    .dv-tabs {
      display: flex; background: #bdbdbd;
      border-bottom: 1px solid #999; padding: 6px 8px 0; gap: 2px;
    }
    .dv-tab {
      padding: 5px 14px; border: 1px solid #999; border-bottom: none;
      background: #c8c8c8; cursor: pointer;
      border-radius: 2px 2px 0 0; font-size: 12px; color: #333;
    }
    .dv-tab:hover { background: #d8d8d8; }
    .dv-tab.active {
      background: #ececec; color: #000; font-weight: bold;
      border-bottom: 1px solid #ececec; margin-bottom: -1px;
    }
    .dv-body { padding: 16px; overflow-y: auto; flex: 1; background: #ececec; }
    .dv-panel { display: none; }
    .dv-panel.active { display: block; }
    .dv-field { margin-bottom: 12px; }
    .dv-field label {
      display: block; margin-bottom: 3px;
      font-weight: bold; font-size: 12px; color: #444;
    }
    .dv-field input, .dv-field select {
      width: 100%; padding: 5px 7px; border: 1px solid #aaa;
      border-radius: 2px; font-size: 12px; background: #fff;
      box-sizing: border-box;
    }
    .dv-preset-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .dv-preset-card {
      padding: 10px 12px; border: 2px solid #bbb;
      border-radius: 4px; background: #e0e0e0; cursor: pointer;
      font-size: 12px; transition: border-color 0.15s;
    }
    .dv-preset-card:hover { border-color: #7722ff; background: #ebe8f8; }
    .dv-preset-card.active { border-color: #7722ff; background: #ddd8f5; }
    .dv-preset-card strong { display: block; margin-bottom: 3px; }
    .dv-scheme-row {
      display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;
    }
    .dv-scheme-btn {
      padding: 4px 10px; border: 2px solid #bbb; border-radius: 12px;
      background: #e0e0e0; font-size: 11px; cursor: pointer; color: #333;
    }
    .dv-scheme-btn.active { border-color: #7722ff; background: #ddd8f5; }
    .dv-footer {
      padding: 10px 12px; background: #d0d0d0;
      border-top: 1px solid #aaa; display: flex;
      justify-content: flex-end; gap: 8px;
    }
    .dv-btn {
      padding: 5px 18px; border-radius: 2px;
      font-size: 12px; cursor: pointer; border: 1px solid #888;
    }
    .dv-btn-submit {
      background: linear-gradient(180deg,#5a5a5a 0%,#3a3a3a 100%);
      color: #fff; font-weight: bold;
    }
    .dv-btn-submit:hover { background: linear-gradient(180deg,#444 0%,#222 100%); }
    .dv-btn-cancel { background: #e0e0e0; color: #333; }
    .dv-btn-cancel:hover { background: #ccc; }
  `;
  const style = document.createElement('style');
  style.id = 'dv-dialog-styles';
  style.textContent = css;
  document.head.append(style);
};

const field = (labelText, inputEl) => {
  const wrap = document.createElement('div');
  wrap.className = 'dv-field';
  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  wrap.append(lbl, inputEl);
  return wrap;
};

const select = (options, current) => {
  const sel = document.createElement('select');
  options.forEach(([val, lbl]) => {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = lbl;
    if (val === String(current)) o.selected = true;
    sel.append(o);
  });
  return sel;
};

const input = (type, value, placeholder) => {
  const inp = document.createElement('input');
  inp.type = type;
  inp.value = value ?? '';
  if (placeholder) inp.placeholder = placeholder;
  return inp;
};

const openDialog = (config, onSubmit) => {
  injectStyles();

  const overlay = document.createElement('div');
  overlay.className = 'dv-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dv-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Data Visualizer Settings');

  const header = document.createElement('div');
  header.className = 'dv-header';
  header.textContent = 'Data Visualizer — Configure';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'dv-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '✕';
  header.append(closeBtn);

  const tabBar = document.createElement('div');
  tabBar.className = 'dv-tabs';
  const body = document.createElement('div');
  body.className = 'dv-body';

  // ── Preset panel ──────────────────────────────────────────────────────────
  const presetPanel = document.createElement('div');
  presetPanel.className = 'dv-panel active';
  presetPanel.dataset.panel = 'preset';
  const presetGrid = document.createElement('div');
  presetGrid.className = 'dv-preset-grid';
  let selectedPresetId = config.presetId || PRESETS[0].id;

  PRESETS.forEach((p) => {
    const card = document.createElement('div');
    card.className = `dv-preset-card${p.id === selectedPresetId ? ' active' : ''}`;
    card.innerHTML = `<strong>${p.label}</strong><span>${p.config.title || ''}</span>`;
    card.addEventListener('click', () => {
      presetGrid.querySelectorAll('.dv-preset-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      selectedPresetId = p.id;
    });
    presetGrid.append(card);
  });
  presetPanel.append(presetGrid);

  // ── Data panel ────────────────────────────────────────────────────────────
  const dataPanel = document.createElement('div');
  dataPanel.className = 'dv-panel';
  dataPanel.dataset.panel = 'data';
  const dataUrlInp = input('text', config.dataUrl, 'https://… or leave blank for sample data');
  const xInp = input('text', config.xField, 'x');
  const yInp = input('text', config.yField, 'y');
  const zInp = input('text', config.zField, 'z');
  const tInp = input('text', config.timeField, 'time');
  const lblInp = input('text', config.labelField, 'label');
  dataPanel.append(
    field('Data URL (CSV / JSON / GeoJSON)', dataUrlInp),
    field('X field', xInp),
    field('Y field (height / value)', yInp),
    field('Z field', zInp),
    field('Time field', tInp),
    field('Label field', lblInp),
  );

  // ── Appearance panel ──────────────────────────────────────────────────────
  const appearPanel = document.createElement('div');
  appearPanel.className = 'dv-panel';
  appearPanel.dataset.panel = 'appearance';
  const vtSel = select(
    [
      ['bar3d', '3D Bar Chart'],
      ['wave', 'Wave Surface'],
      ['scatter3d', '3D Scatter'],
      ['surface', 'Math Surface'],
      ['particles', 'Particle Storm'],
    ],
    config.vizType,
  );
  const schemeLbl = document.createElement('label');
  schemeLbl.textContent = 'Color scheme';
  schemeLbl.style.cssText = 'display:block;font-weight:bold;font-size:12px;color:#444;margin-bottom:4px;';
  const schemeRow = document.createElement('div');
  schemeRow.className = 'dv-scheme-row';
  let selectedScheme = config.colorScheme || 'brand';
  Object.keys(COLOR_SCHEMES).forEach((k) => {
    const btn = document.createElement('button');
    btn.className = `dv-scheme-btn${k === selectedScheme ? ' active' : ''}`;
    btn.textContent = k;
    btn.dataset.scheme = k;
    btn.addEventListener('click', () => {
      schemeRow.querySelectorAll('.dv-scheme-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedScheme = k;
    });
    schemeRow.append(btn);
  });
  appearPanel.append(
    field('Visualization type', vtSel),
    schemeLbl,
    schemeRow,
  );

  // ── Animation panel ───────────────────────────────────────────────────────
  const animPanel = document.createElement('div');
  animPanel.className = 'dv-panel';
  animPanel.dataset.panel = 'animation';
  const animSel = select([['true', 'On'], ['false', 'Off']], config.animate ? 'true' : 'false');
  const speedInp = input('number', config.animSpeed || '1', '1');
  animPanel.append(
    field('Auto-animate', animSel),
    field('Speed multiplier', speedInp),
  );

  // ── Tab wiring ────────────────────────────────────────────────────────────
  TABS.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = `dv-tab${i === 0 ? ' active' : ''}`;
    btn.textContent = tab.label;
    btn.dataset.tab = tab.id;
    btn.addEventListener('click', () => {
      tabBar.querySelectorAll('.dv-tab').forEach((t) => t.classList.remove('active'));
      body.querySelectorAll('.dv-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      body.querySelector(`[data-panel="${tab.id}"]`).classList.add('active');
    });
    tabBar.append(btn);
  });

  body.append(presetPanel, dataPanel, appearPanel, animPanel);

  const footer = document.createElement('div');
  footer.className = 'dv-footer';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'dv-btn dv-btn-cancel';
  cancelBtn.textContent = 'Cancel';
  const submitBtn = document.createElement('button');
  submitBtn.className = 'dv-btn dv-btn-submit';
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
    const preset = PRESETS.find((p) => p.id === selectedPresetId);
    close();
    onSubmit({
      ...config,
      presetId: selectedPresetId,
      vizType: vtSel.value,
      colorScheme: selectedScheme,
      dataUrl: dataUrlInp.value || '',
      xField: xInp.value || (preset?.config.xField ?? 'x'),
      yField: yInp.value || (preset?.config.yField ?? 'y'),
      zField: zInp.value || (preset?.config.zField ?? 'z'),
      timeField: tInp.value || (preset?.config.timeField ?? 'time'),
      labelField: lblInp.value || (preset?.config.labelField ?? 'label'),
      animate: animSel.value === 'true',
      animSpeed: Number.parseFloat(speedInp.value) || 1,
    });
  });

  const first = dialog.querySelector('input, select');
  if (first) first.focus();
};

export default openDialog;
