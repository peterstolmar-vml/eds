/* eslint-disable import/no-unresolved */

import PRESETS from './data-viz-presets.js';
import {
  renderBar3d,
  renderWave,
  renderScatter3d,
  renderSurface,
  renderParticles,
} from './data-viz-renderers.js';

const THREE_VERSION = '0.187.0';
const THREE_BASE = `https://esm.sh/three@${THREE_VERSION}`;
const DEFAULT_CAMERA_Z = 6;
const PAUSE_ON_CLICK_MS = 3000;

const isAuthoringEnv = () => {
  const { hostname } = window.location;
  return (
    hostname.endsWith('.da.live')
    || hostname.endsWith('.experience.adobe.com')
    || hostname === 'localhost'
    || hostname === '127.0.0.1'
  );
};

const el = (tag, cls, ...children) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  children.flat().forEach((c) => {
    if (!c && c !== 0) return;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
};

const toTimestamp = (val) => {
  if (!val) return 0;
  return Number.isNaN(Number(val)) ? new Date(val).getTime() : Number(val);
};

const fetchData = async (url) => {
  if (!url || url === 'sample') return null;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const text = await resp.text();
  try {
    const json = JSON.parse(text);
    if (json.features) {
      return json.features
        .filter((f) => f.geometry?.type === 'Point')
        .map((f) => ({
          ...f.properties,
          longitude: f.geometry.coordinates[0],
          latitude: f.geometry.coordinates[1],
        }));
    }
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.data)) return json.data;
    return json;
  } catch {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
      return obj;
    });
  }
};

const loadThree = async () => {
  const mod = await import(/* @vite-ignore */ THREE_BASE);
  const { OrbitControls } = await import(
    /* @vite-ignore */ `${THREE_BASE}/examples/jsm/controls/OrbitControls.js`
  );
  return { THREE: mod, OrbitControls };
};

const buildTooltip = (wrap) => {
  const tip = el('div', 'dv-tooltip');
  tip.hidden = true;
  wrap.append(tip);
  const show = (pt, x, y) => {
    tip.innerHTML = '';
    const entries = Object.entries(pt)
      .filter(([k]) => k !== 'pointIdx')
      .slice(0, 6);
    if (entries.length === 0) return;
    tip.append(el('strong', null, String(entries[0][1])));
    entries.slice(1).forEach(([k, v]) => {
      tip.append(el('span', null, `${k}: ${v}`), document.createElement('br'));
    });
    tip.style.left = `${x + 12}px`;
    tip.style.top = `${y + 12}px`;
    tip.hidden = false;
  };
  const hide = () => { tip.hidden = true; };
  return { show, hide };
};

const buildFilterBar = (points, cfg, onFilter) => {
  const filterF = cfg.filterField || cfg.labelField;
  if (!filterF) return null;
  const vals = [...new Set(
    points.map((p) => String(p[filterF] ?? '')).filter(Boolean),
  )];
  if (vals.length < 2 || vals.length > 40) return null;
  const bar = el('div', 'dv-filter-bar');
  bar.append(el('span', 'dv-filter-label', 'Filter:'));
  const sel = document.createElement('select');
  sel.className = 'dv-filter-select';
  const allOpt = document.createElement('option');
  allOpt.value = '__all__';
  allOpt.textContent = 'All';
  sel.append(allOpt);
  vals.forEach((v) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    sel.append(o);
  });
  sel.addEventListener('change', () => {
    const v = sel.value;
    onFilter(v === '__all__' ? null : v);
  });
  bar.append(sel);
  return bar;
};

const buildToolbar = (config, onUpdate) => {
  const toolbar = el('div', 'dv-toolbar');
  toolbar.append(el('span', 'dv-toolbar-label', '✎ Data Viz'));

  const presetSel = document.createElement('select');
  presetSel.className = 'dv-toolbar-preset';
  PRESETS.forEach((p) => {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.label;
    if (p.id === config.presetId) o.selected = true;
    presetSel.append(o);
  });
  presetSel.addEventListener('change', () => {
    const preset = PRESETS.find((p) => p.id === presetSel.value);
    if (preset) {
      onUpdate({
        ...config,
        presetId: preset.id,
        vizType: preset.vizType,
        colorScheme: preset.colorScheme,
        ...preset.config,
      });
    }
  });
  toolbar.append(presetSel);

  const sep = () => el('span', 'dv-toolbar-sep');
  toolbar.append(sep());

  [
    ['bar3d', '▦'],
    ['wave', '〜'],
    ['scatter3d', '✦'],
    ['surface', '⛰'],
    ['particles', '✸'],
    ['chartopotamus', '📡'],
  ].forEach(([type, icon]) => {
    const btn = el(
      'button',
      `dv-toolbar-btn${config.vizType === type ? ' active' : ''}`,
      icon,
    );
    btn.title = type;
    btn.dataset.vtype = type;
    btn.addEventListener('click', () => {
      toolbar.querySelectorAll('.dv-toolbar-btn[data-vtype]').forEach((b) => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      onUpdate({ ...config, vizType: type });
    });
    toolbar.append(btn);
  });

  toolbar.append(sep());

  ['thermal', 'ocean', 'neon', 'monochrome', 'brand'].forEach((scheme) => {
    const btn = el(
      'button',
      `dv-toolbar-btn${config.colorScheme === scheme ? ' active' : ''}`,
      scheme,
    );
    btn.dataset.scheme = scheme;
    btn.addEventListener('click', () => {
      toolbar.querySelectorAll('.dv-toolbar-btn[data-scheme]').forEach((b) => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      onUpdate({ ...config, colorScheme: scheme });
    });
    toolbar.append(btn);
  });

  toolbar.append(sep());

  const pencil = el('button', 'dv-toolbar-pencil', '✎ Configure');
  pencil.addEventListener('click', async () => {
    try {
      const { default: openDialog } = await import('./data-viz-dialog.js');
      openDialog(config, (updated) => onUpdate(updated));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('data-viz-dialog failed to load:', e);
    }
  });
  toolbar.append(pencil);
  return toolbar;
};

export default async function decorate(block) {
  const rawCfg = {};
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length === 2) {
      const k = cells[0].textContent.trim().toLowerCase();
      const v = cells[1].textContent.trim();
      if (k && v) rawCfg[k] = v;
    }
  });

  const presetId = rawCfg.preset || PRESETS[0].id;
  const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];

  const config = {
    presetId: preset.id,
    vizType: rawCfg['viz-type'] || preset.vizType,
    colorScheme: rawCfg['color-scheme'] || preset.colorScheme,
    dataUrl: rawCfg.data || preset.dataSource,
    animate: rawCfg.animate !== 'false',
    animSpeed: Number.parseFloat(rawCfg['anim-speed']) || 1,
    timeField: rawCfg['time-field'] || preset.config.timeField || 'time',
    filterField: rawCfg['filter-field'] || preset.config.labelField || '',
    ...preset.config,
    ...rawCfg,
  };

  block.innerHTML = '';

  const shell = el('div', 'data-viz');
  const headerBar = el('div', 'dv-header-bar');
  const titleEl = el('p', 'dv-title', config.title || 'Data Visualization');
  const globeControls = el('div', 'dv-globe-controls');
  const spinBtn = el('button', 'dv-icon-btn active', '⟳');
  spinBtn.title = 'Pause rotation';
  const resetBtn = el('button', 'dv-icon-btn', '⊙');
  resetBtn.title = 'Reset view';
  globeControls.append(spinBtn, resetBtn);
  headerBar.append(titleEl, globeControls);

  const canvasWrap = el('div', 'dv-canvas-wrap');
  const loading = el('div', 'dv-loading', 'Loading…');
  canvasWrap.append(loading);
  shell.append(headerBar, canvasWrap);
  block.append(shell);

  let THREE;
  let OrbitControls;
  try {
    ({ THREE, OrbitControls } = await loadThree());
  } catch {
    loading.className = 'dv-error';
    loading.textContent = 'Could not load Three.js.';
    return;
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x080c14);
  canvasWrap.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
  camera.position.set(4, 3, DEFAULT_CAMERA_Z);

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.08;
  orbitControls.autoRotate = config.animate;
  orbitControls.autoRotateSpeed = 0.6;

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(5, 8, 5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x7722ff, 0.4);
  fillLight.position.set(-5, -2, -5);
  scene.add(fillLight);

  const resize = () => {
    const w = canvasWrap.offsetWidth;
    const h = Math.max(canvasWrap.offsetHeight, 480);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvasWrap);
  resize();

  resetBtn.addEventListener('click', () => {
    camera.position.set(4, 3, DEFAULT_CAMERA_Z);
    camera.lookAt(0, 0, 0);
    orbitControls.target.set(0, 0, 0);
    orbitControls.update();
  });

  let spinning = true;
  spinBtn.addEventListener('click', () => {
    spinning = !spinning;
    orbitControls.autoRotate = spinning;
    spinBtn.classList.toggle('active', spinning);
    spinBtn.title = spinning ? 'Pause rotation' : 'Resume rotation';
  });

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let pointerDownPos = null;
  let pauseUntil = 0;
  const tooltip = buildTooltip(canvasWrap);

  renderer.domElement.addEventListener('pointerdown', (e) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });

  let vizGroup = null;
  let waveState = null;
  let particleState = null;
  let allPoints = [];
  let filteredPoints = [];
  let animTime = 0;
  let timePlaying = false;
  let timeWindow = 0;
  let timeBar = null;
  let filterBar = null;

  let wavePhase = 0;
  const animate = () => {
    requestAnimationFrame(animate);
    if (Date.now() > pauseUntil) {
      orbitControls.autoRotate = spinning;
    }
    orbitControls.update();

    if (config.animate && config.vizType === 'wave' && waveState) {
      wavePhase += 0.015 * (config.animSpeed || 1);
      const {
        geo, positions, colors, points: wpts, cfg, scheme, getColorAt,
      } = waveState;
      const xF = cfg.xField || 'x';
      const zF = cfg.zField || 'z';
      const yF = cfg.yField || 'y';
      const xvals = wpts.map((p) => Number.parseFloat(p[xF]) || 0);
      const zvals = wpts.map((p) => Number.parseFloat(p[zF]) || 0);
      const xMin = Math.min(...xvals);
      const xMax = Math.max(...xvals);
      const zMin = Math.min(...zvals);
      const zMax = Math.max(...zvals);
      const xRange = xMax - xMin || 1;
      const zRange = zMax - zMin || 1;

      wpts.forEach((pt, i) => {
        const nx = (((Number.parseFloat(pt[xF]) || 0) - xMin) / xRange) * 4 - 2;
        const nz = (((Number.parseFloat(pt[zF]) || 0) - zMin) / zRange) * 4 - 2;
        const baseY = Number.parseFloat(pt[yF]) || 0;
        const ny = baseY
          + Math.sin(nx * 1.5 + wavePhase) * 0.25
          * Math.cos(nz * 1.5 + wavePhase * 0.7);
        positions[i * 3 + 1] = ny;
        const norm = (ny + 1) / 2;
        if (getColorAt) {
          const col = getColorAt(scheme, norm);
          const rgb = col.match(/\d+/g).map(Number);
          colors[i * 3] = rgb[0] / 255;
          colors[i * 3 + 1] = rgb[1] / 255;
          colors[i * 3 + 2] = rgb[2] / 255;
        }
      });
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.computeVertexNormals();
    }

    if (config.animate && config.vizType === 'particles' && particleState) {
      wavePhase += 0.012 * (config.animSpeed || 1);
      const { geo, positions, points: ppts } = particleState;
      ppts.forEach((_, i) => {
        positions[i * 3] += Math.sin(wavePhase + i * 0.3) * 0.002;
        positions[i * 3 + 1] += Math.cos(wavePhase * 0.7 + i * 0.2) * 0.002;
        positions[i * 3 + 2] += Math.sin(wavePhase * 1.3 + i * 0.1) * 0.002;
      });
      geo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  };
  animate();

  const renderViz = async (cfg) => {
    if (vizGroup) scene.remove(vizGroup);
    if (timeBar) timeBar.remove();
    if (filterBar) filterBar.remove();
    loading.style.display = 'flex';
    waveState = null;
    particleState = null;
    wavePhase = 0;

    // ── Chartopotamus image mode ───────────────────────────────────────────────
    if (cfg.vizType === 'chartopotamus') {
      loading.style.display = 'none';
      canvasWrap.querySelectorAll('img, .dv-charto-placeholder').forEach((n) => n.remove());
      if (cfg.embedurl) {
        const img = document.createElement('img');
        img.src = cfg.embedurl;
        img.alt = cfg.title || 'Chartopotamus chart';
        img.style.cssText = 'width:100%;border-radius:8px;display:block;';
        canvasWrap.append(img);
      } else {
        const msg = el(
          'div',
          'dv-charto-placeholder dv-loading',
          '📡 Use Configure → Chartopotamus to generate a chart',
        );
        canvasWrap.append(msg);
      }
      return;
    }

    const currentPreset = PRESETS.find((p) => p.id === cfg.presetId) || PRESETS[0];
    let points = currentPreset.sampleData;
    try {
      const fetched = await fetchData(cfg.dataUrl);
      if (fetched && fetched.length > 0) points = fetched;
    } catch { /* use sample */ }

    allPoints = points.map((p, i) => ({ ...p, pointIdx: i }));
    filteredPoints = [...allPoints];
    titleEl.textContent = cfg.title || currentPreset.config.title || 'Data Visualization';

    const buildVizGroup = (pts) => {
      if (cfg.vizType === 'bar3d') {
        return { group: renderBar3d(pts, cfg, cfg.colorScheme, THREE), state: null };
      }
      if (cfg.vizType === 'wave') {
        const result = renderWave(pts, cfg, cfg.colorScheme, THREE, 0);
        return { group: result.group, state: result };
      }
      if (cfg.vizType === 'scatter3d') {
        return { group: renderScatter3d(pts, cfg, cfg.colorScheme, THREE), state: null };
      }
      if (cfg.vizType === 'surface') {
        return { group: renderSurface(pts, cfg, cfg.colorScheme, THREE), state: null };
      }
      if (cfg.vizType === 'particles') {
        const result = renderParticles(pts, cfg, cfg.colorScheme, THREE, 0);
        return { group: result.group, state: result };
      }
      return { group: renderBar3d(pts, cfg, cfg.colorScheme, THREE), state: null };
    };

    const { group, state } = buildVizGroup(filteredPoints);
    vizGroup = group;

    if (cfg.vizType === 'wave' && state) {
      const { getColorAt } = await import('./data-viz-presets.js');
      waveState = { ...state, getColorAt };
    }
    if (cfg.vizType === 'particles') particleState = state;
    scene.add(vizGroup);

    filterBar = buildFilterBar(allPoints, cfg, (filterVal) => {
      filteredPoints = filterVal
        ? allPoints.filter(
          (p) => String(p[cfg.filterField || cfg.labelField] ?? '') === filterVal,
        )
        : [...allPoints];
      const rebuilt = buildVizGroup(filteredPoints);
      if (vizGroup) scene.remove(vizGroup);
      vizGroup = rebuilt.group;
      if (cfg.vizType === 'wave' && rebuilt.state) {
        waveState = { ...rebuilt.state, getColorAt: waveState?.getColorAt };
      }
      if (cfg.vizType === 'particles') particleState = rebuilt.state;
      scene.add(vizGroup);
    });
    if (filterBar) shell.insertBefore(filterBar, timeBar);

    const timeF = cfg.timeField;
    const hasTime = timeF && allPoints.some((p) => p[timeF]);
    if (hasTime) {
      const times = allPoints.map((p) => toTimestamp(p[timeF])).filter(Boolean);
      const timeMin = Math.min(...times);
      const timeMax = Math.max(...times);
      timeWindow = timeMax;
      animTime = timeMax;

      timeBar = el('div', 'dv-timebar');
      const playBtn = el('button', 'dv-timebar-play', '▶');

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'dv-timebar-slider';
      slider.min = String(timeMin);
      slider.max = String(timeMax);
      slider.value = String(timeMax);
      slider.step = String(Math.max(1, Math.round((timeMax - timeMin) / 200)));

      const isNumericTime = !Number.isNaN(Number(allPoints[0][timeF]));
      const fmtTime = (v) => (isNumericTime ? String(v) : new Date(v).toUTCString());
      const timeLbl = el('span', 'dv-timebar-label', fmtTime(timeMax));

      const applyTime = (val) => {
        const t = Number(val);
        timeLbl.textContent = fmtTime(t);
        if (vizGroup) {
          vizGroup.children.forEach((mesh) => {
            if (!mesh.userData?.point) return;
            const ts = mesh.userData.point[timeF];
            mesh.visible = !ts || toTimestamp(ts) <= t;
          });
        }
      };

      slider.addEventListener('input', () => {
        timeWindow = Number(slider.value);
        applyTime(timeWindow);
      });

      playBtn.addEventListener('click', () => {
        timePlaying = !timePlaying;
        playBtn.textContent = timePlaying ? '⏸' : '▶';
        if (timePlaying) {
          if (animTime >= timeMax) animTime = timeMin;
          const step = (timeMax - timeMin) / 300;
          const tick = () => {
            if (!timePlaying) return;
            animTime = Math.min(animTime + step, timeMax);
            slider.value = String(animTime);
            applyTime(animTime);
            if (animTime < timeMax) {
              requestAnimationFrame(tick);
            } else {
              timePlaying = false;
              playBtn.textContent = '▶';
            }
          };
          requestAnimationFrame(tick);
        }
      });

      timeBar.append(playBtn, slider, timeLbl);
      shell.append(timeBar);
    }

    const onPointerUp = (e) => {
      if (!pointerDownPos) return;
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      pointerDownPos = null;
      if (Math.sqrt(dx * dx + dy * dy) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      if (!vizGroup) return;
      const hits = raycaster.intersectObjects(vizGroup.children, true);
      const hit = hits.find((h) => h.object.userData?.point);
      if (hit) {
        pauseUntil = Date.now() + PAUSE_ON_CLICK_MS;
        tooltip.show(
          hit.object.userData.point,
          e.clientX - canvasWrap.getBoundingClientRect().left,
          e.clientY - canvasWrap.getBoundingClientRect().top,
        );
        vizGroup.children.forEach((mesh) => {
          if (!mesh.material) return;
          mesh.material.emissiveIntensity = 0.15;
          mesh.scale.setScalar(1);
        });
        hit.object.material.emissiveIntensity = 1;
        hit.object.scale.setScalar(1.4);
      } else {
        tooltip.hide();
      }
    };

    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    renderer.domElement.addEventListener('pointermove', (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      if (!vizGroup) return;
      const hits = raycaster.intersectObjects(vizGroup.children, true);
      const hit = hits.find((h) => h.object.userData?.point);
      renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
    });

    loading.style.display = 'none';
  };

  if (isAuthoringEnv()) {
    const toolbar = buildToolbar(config, (updated) => {
      Object.assign(config, updated);
      toolbar.querySelectorAll('.dv-toolbar-btn[data-vtype]').forEach((b) => {
        b.classList.toggle('active', b.dataset.vtype === config.vizType);
      });
      toolbar.querySelectorAll('.dv-toolbar-btn[data-scheme]').forEach((b) => {
        b.classList.toggle('active', b.dataset.scheme === config.colorScheme);
      });
      renderViz(config);
    });
    shell.append(toolbar);
  }

  await renderViz(config);
}
