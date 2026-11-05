/* eslint-disable import/no-unresolved */

import parseData from './earth-viz-parser.js';

const THREE_VERSION = '0.187.0';
const THREE_BASE = `https://esm.sh/three@${THREE_VERSION}`;
const USGS_FEED = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

const TEXTURES = {
  color: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  monochrome: 'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
  relief: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
};

const GLOBE_RADIUS = 1;
const FALLBACK_SEGMENTS = 64;
const DEFAULT_POINT_SIZE = 0.015;
const DEFAULT_POINT_OPACITY = 0.85;
const DEFAULT_MIN_MAG = 2.0;
const DEFAULT_TIME_WINDOW_HOURS = 24;
const DEFAULT_CAMERA_Z = 2.8;
const PAUSE_ON_CLICK_MS = 3000;
const CONTINENT_COLOR = 0x2a6a3a;
const OCEAN_COLOR = 0x0a1a3a;
const PAGE_SIZE = 25;

const isAuthoringEnv = () => {
  const { hostname } = window.location;
  return (
    hostname.endsWith('.da.live')
    || hostname.endsWith('.experience.adobe.com')
    || hostname === 'localhost'
    || hostname === '127.0.0.1'
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const magColor = (mag) => {
  const m = Number.parseFloat(mag) || 0;
  if (m >= 7) return '#ff0000';
  if (m >= 6) return '#ff4400';
  if (m >= 5) return '#ff8800';
  if (m >= 4) return '#ffcc00';
  if (m >= 3) return '#aaff00';
  return '#44ff88';
};

const magRadius = (mag, base) => {
  const m = Number.parseFloat(mag) || 2;
  return base * (0.5 + (m - 2) * 0.18);
};

const latLngToVec3 = (lat, lng, radius, THREE) => {
  const phi = (90 - Number.parseFloat(lat)) * (Math.PI / 180);
  const theta = (Number.parseFloat(lng) + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
};

const toTimestamp = (val) => {
  if (!val) return 0;
  return Number.isNaN(Number(val)) ? new Date(val).getTime() : Number(val);
};

const formatTs = (val) => {
  if (!val) return '';
  return new Date(toTimestamp(val)).toUTCString();
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

// ─── Three.js loader ──────────────────────────────────────────────────────────

const loadThree = async () => {
  const mod = await import(/* @vite-ignore */ THREE_BASE);
  const { OrbitControls } = await import(
    /* @vite-ignore */ `${THREE_BASE}/examples/jsm/controls/OrbitControls.js`
  );
  return { THREE: mod, OrbitControls };
};

// ─── Fallback continent globe ─────────────────────────────────────────────────

const buildFallbackGlobe = (THREE) => {
  const group = new THREE.Group();
  const oceanGeo = new THREE.SphereGeometry(
    GLOBE_RADIUS,
    FALLBACK_SEGMENTS,
    FALLBACK_SEGMENTS,
  );
  group.add(new THREE.Mesh(
    oceanGeo,
    new THREE.MeshPhongMaterial({ color: OCEAN_COLOR }),
  ));

  const continents = [
    { lat: [25, 70], lng: [-170, -50] },
    { lat: [-55, 15], lng: [-85, -30] },
    { lat: [-35, 35], lng: [-20, 55] },
    { lat: [35, 70], lng: [-10, 60] },
    { lat: [5, 75], lng: [60, 145] },
    { lat: [-45, -10], lng: [110, 155] },
    { lat: [-90, -65], lng: [-180, 180] },
  ];

  continents.forEach(({ lat, lng }) => {
    const latSteps = Math.max(2, Math.round((lat[1] - lat[0]) / 5));
    const lngSteps = Math.max(2, Math.round((lng[1] - lng[0]) / 5));
    for (let i = 0; i < latSteps; i += 1) {
      for (let j = 0; j < lngSteps; j += 1) {
        const clat = lat[0] + (i + 0.5) * ((lat[1] - lat[0]) / latSteps);
        const clng = lng[0] + (j + 0.5) * ((lng[1] - lng[0]) / lngSteps);
        const pos = latLngToVec3(clat, clng, GLOBE_RADIUS + 0.002, THREE);
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.025, 8, 8),
          new THREE.MeshPhongMaterial({ color: CONTINENT_COLOR }),
        );
        mesh.position.copy(pos);
        group.add(mesh);
      }
    }
  });

  return group;
};

// ─── Textured globe ───────────────────────────────────────────────────────────

const buildTexturedGlobe = (mode, THREE) => new Promise((resolve) => {
  if (mode === 'wireframe') {
    resolve(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, FALLBACK_SEGMENTS, FALLBACK_SEGMENTS),
      new THREE.MeshBasicMaterial({ color: 0x00aaff, wireframe: true }),
    ));
    return;
  }
  const url = TEXTURES[mode] || TEXTURES.color;
  new THREE.TextureLoader().load(
    url,
    (tex) => {
      const matOpts = { map: tex };
      if (mode === 'relief') {
        matOpts.bumpMap = tex;
        matOpts.bumpScale = 0.05;
      }
      resolve(new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_RADIUS, FALLBACK_SEGMENTS, FALLBACK_SEGMENTS),
        new THREE.MeshPhongMaterial(matOpts),
      ));
    },
    undefined,
    () => resolve(buildFallbackGlobe(THREE)),
  );
});

// ─── Point cloud ──────────────────────────────────────────────────────────────

const buildPoints = (points, config, THREE) => {
  const group = new THREE.Group();
  const latF = config['lat-field'] || 'latitude';
  const lngF = config['lng-field'] || 'longitude';
  const magF = config['magnitude-field'] || 'mag';
  const baseSize = Number.parseFloat(config['point-size']) || DEFAULT_POINT_SIZE;
  const opacity = Number.parseFloat(config['point-opacity']) || DEFAULT_POINT_OPACITY;
  const customColor = config['point-color'];

  points.forEach((pt) => {
    const lat = Number.parseFloat(pt[latF]);
    const lng = Number.parseFloat(pt[lngF]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    const mag = pt[magF];
    const color = customColor || magColor(mag);
    const pos = latLngToVec3(lat, lng, GLOBE_RADIUS + 0.01, THREE);
    const mat = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      emissive: color,
      emissiveIntensity: 0.3,
    });
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(magRadius(mag, baseSize), 8, 8),
      mat,
    );
    mesh.position.copy(pos);
    mesh.userData = { idx: pt.pointIdx, point: pt };
    group.add(mesh);
  });

  return group;
};

// ─── Sort ─────────────────────────────────────────────────────────────────────

const sortPoints = (points, sortKey, timeF, magF) => {
  const sorted = [...points];
  if (sortKey === 'time-desc') {
    sorted.sort((a, b) => toTimestamp(b[timeF]) - toTimestamp(a[timeF]));
  } else if (sortKey === 'time-asc') {
    sorted.sort((a, b) => toTimestamp(a[timeF]) - toTimestamp(b[timeF]));
  } else if (sortKey === 'mag-desc') {
    sorted.sort(
      (a, b) => (Number.parseFloat(b[magF]) || 0) - (Number.parseFloat(a[magF]) || 0),
    );
  } else if (sortKey === 'mag-asc') {
    sorted.sort(
      (a, b) => (Number.parseFloat(a[magF]) || 0) - (Number.parseFloat(b[magF]) || 0),
    );
  }
  return sorted;
};

// ─── Panel ────────────────────────────────────────────────────────────────────

const buildPanel = (allPoints, config, onSelect) => {
  const labelF = config['label-field'] || 'place';
  const timeF = config['time-field'] || 'time';
  const magF = config['magnitude-field'] || 'mag';
  const title = config['panel-title'] || 'Recent Earthquakes';

  let currentSort = 'time-desc';
  let currentPage = 0;

  const panel = el('div', 'ev-panel');
  const header = el('div', 'ev-panel-header');
  const titleEl = el('p', 'ev-panel-title', title);
  const countEl = el('span', 'ev-panel-count', `${allPoints.length} events`);
  header.append(titleEl, countEl);

  const sortBar = el('div', 'ev-sort-bar');
  const sortLbl = el('span', 'ev-sort-label', 'Sort:');
  const sortSel = el('select', 'ev-sort-select');
  [
    ['time-desc', 'Time ↓ (newest)'],
    ['time-asc', 'Time ↑ (oldest)'],
    ['mag-desc', 'Magnitude ↓'],
    ['mag-asc', 'Magnitude ↑'],
  ].forEach(([val, lbl]) => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = lbl;
    sortSel.append(opt);
  });
  sortBar.append(sortLbl, sortSel);

  const list = el('div', 'ev-panel-list');
  const pagination = el('div', 'ev-pagination');

  const renderList = () => {
    list.innerHTML = '';
    pagination.innerHTML = '';

    const sorted = sortPoints(
      allPoints,
      currentSort,
      timeF,
      magF,
    );
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    currentPage = Math.min(currentPage, Math.max(0, totalPages - 1));
    const pageItems = sorted.slice(
      currentPage * PAGE_SIZE,
      (currentPage + 1) * PAGE_SIZE,
    );

    pageItems.forEach((pt) => {
      const globalIdx = pt.pointIdx;
      const mag = Number.parseFloat(pt[magF]) || 0;

      const row = el('div', 'ev-panel-row');
      row.dataset.idx = globalIdx;

      const magDot = el('div', 'ev-panel-mag', mag.toFixed(1));
      magDot.style.background = magColor(mag);

      const info = el('div', 'ev-panel-info');
      const lbl = el(
        'div',
        'ev-panel-label',
        pt[labelF] || `${pt.latitude ?? ''}, ${pt.longitude ?? ''}`,
      );
      const time = el('div', 'ev-panel-time', formatTs(pt[timeF]));
      info.append(lbl, time);

      const arrow = el('span', 'ev-panel-arrow', '›');
      row.append(magDot, info, arrow);

      // Inline detail accordion
      const detail = el('div', 'ev-detail');
      detail.hidden = true;

      const known = new Set([
        labelF,
        timeF,
        magF,
        'latitude',
        'longitude',
        'lat',
        'lng',
        'depth',
        'pointIdx',
      ]);

      const detailFields = [
        ['Magnitude', pt[magF]],
        ['Location', pt[labelF]],
        ['Time', formatTs(pt[timeF])],
        ['Depth', pt.depth ? `${pt.depth} km` : null],
        ['Latitude', pt.latitude ?? pt.lat],
        ['Longitude', pt.longitude ?? pt.lng],
      ];
      Object.entries(pt).forEach(([k, v]) => {
        if (!known.has(k)) detailFields.push([k, v]);
      });

      detailFields.forEach(([k, v]) => {
        if (!v && v !== 0) return;
        const drow = el('div', 'ev-detail-row');
        drow.append(
          el('span', 'ev-detail-key', k),
          el('span', 'ev-detail-val', String(v)),
        );
        detail.append(drow);
      });

      row.addEventListener('click', () => {
        const isOpen = !detail.hidden;
        list.querySelectorAll('.ev-detail').forEach((d) => { d.hidden = true; });
        list.querySelectorAll('.ev-panel-arrow').forEach((a) => { a.textContent = '›'; });
        list.querySelectorAll('.ev-panel-row').forEach((r) => r.classList.remove('selected'));
        if (!isOpen) {
          detail.hidden = false;
          arrow.textContent = '⌄';
          row.classList.add('selected');
          onSelect(globalIdx);
        }
      });

      list.append(row, detail);
    });

    if (totalPages > 1) {
      const prevBtn = el('button', 'ev-page-btn', '‹ Prev');
      prevBtn.disabled = currentPage === 0;
      prevBtn.addEventListener('click', () => {
        currentPage -= 1;
        renderList();
      });
      const pageInfo = el('span', 'ev-page-info', `${currentPage + 1} / ${totalPages}`);
      const nextBtn = el('button', 'ev-page-btn', 'Next ›');
      nextBtn.disabled = currentPage >= totalPages - 1;
      nextBtn.addEventListener('click', () => {
        currentPage += 1;
        renderList();
      });
      pagination.append(prevBtn, pageInfo, nextBtn);
    }
  };

  sortSel.addEventListener('change', () => {
    currentSort = sortSel.value;
    currentPage = 0;
    renderList();
  });

  renderList();

  panel.append(header, sortBar, list, pagination);

  panel.highlightRow = (globalIdx) => {
    list.querySelectorAll('.ev-panel-row').forEach((r) => r.classList.remove('selected'));
    const row = list.querySelector(`[data-idx="${globalIdx}"]`);
    if (row) {
      row.classList.add('selected');
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  return panel;
};

// ─── Authoring toolbar ────────────────────────────────────────────────────────

const buildToolbar = (config, onUpdate) => {
  const toolbar = el('div', 'ev-toolbar');
  const lbl = el('span', 'ev-toolbar-label', '✎ Earth Viz');
  toolbar.append(lbl);

  const sep = () => el('span', 'ev-toolbar-sep');

  ['color', 'monochrome', 'relief', 'wireframe'].forEach((mode) => {
    const btn = el(
      'button',
      `ev-toolbar-btn${config['globe-mode'] === mode ? ' active' : ''}`,
      mode,
    );
    btn.dataset.mode = mode;
    btn.addEventListener('click', () => {
      toolbar.querySelectorAll('.ev-toolbar-btn[data-mode]').forEach((b) => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      onUpdate({ ...config, 'globe-mode': mode });
    });
    toolbar.append(btn);
  });

  toolbar.append(sep());

  const colorLbl = el('span', 'ev-toolbar-label', 'pts');
  const colorPick = document.createElement('input');
  colorPick.type = 'color';
  colorPick.value = config['point-color'] || '#ff4400';
  colorPick.title = 'Point color';
  colorPick.style.cssText = [
    'height:22px',
    'width:36px',
    'padding:1px',
    'border:1px solid #999',
    'border-radius:2px',
    'cursor:pointer',
  ].join(';');
  colorPick.addEventListener('change', () => {
    onUpdate({ ...config, 'point-color': colorPick.value });
  });
  toolbar.append(colorLbl, colorPick, sep());

  const magLbl = el('span', 'ev-toolbar-label', 'min mag');
  const magInput = document.createElement('input');
  magInput.type = 'number';
  magInput.value = config['min-magnitude'] || DEFAULT_MIN_MAG;
  magInput.min = '0';
  magInput.max = '10';
  magInput.step = '0.1';
  magInput.style.cssText = [
    'width:52px',
    'padding:3px 5px',
    'font-size:11px',
    'border:1px solid #aaa',
    'border-radius:2px',
  ].join(';');
  magInput.addEventListener('change', () => {
    onUpdate({ ...config, 'min-magnitude': magInput.value });
  });
  toolbar.append(magLbl, magInput, sep());

  const pencil = el('button', 'ev-toolbar-pencil', '✎ Configure');
  pencil.title = 'Open full configuration dialog';
  pencil.addEventListener('click', async () => {
    try {
      const { default: openDialog } = await import('./earth-viz-dialog.js');
      openDialog(config, (updated) => onUpdate(updated));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('earth-viz-dialog failed to load:', e);
    }
  });
  toolbar.append(pencil);

  return toolbar;
};

// ─── Main decorator ───────────────────────────────────────────────────────────

export default async function decorate(block) {
  const config = {
    'globe-mode': 'color',
    'point-color': '',
    'point-size': String(DEFAULT_POINT_SIZE),
    'point-opacity': String(DEFAULT_POINT_OPACITY),
    'time-field': 'time',
    'lat-field': 'latitude',
    'lng-field': 'longitude',
    'magnitude-field': 'mag',
    'label-field': 'place',
    animation: 'true',
    'time-window-hours': String(DEFAULT_TIME_WINDOW_HOURS),
    'min-magnitude': String(DEFAULT_MIN_MAG),
    'show-labels': 'false',
    'panel-title': 'Recent Earthquakes',
    data: USGS_FEED,
  };

  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length === 2) {
      const key = cells[0].textContent.trim().toLowerCase();
      const val = cells[1].textContent.trim();
      if (key && val) config[key] = val;
    }
  });

  block.innerHTML = '';

  const shell = el('div', 'earth-viz');
  const stage = el('div', 'ev-stage');
  const canvasWrap = el('div', 'ev-canvas-wrap');
  const loading = el('div', 'ev-loading', 'Loading Earth…');
  canvasWrap.append(loading);
  stage.append(canvasWrap);
  shell.append(stage);
  block.append(shell);

  let THREE;
  let OrbitControls;
  try {
    ({ THREE, OrbitControls } = await loadThree());
  } catch {
    loading.className = 'ev-error';
    loading.textContent = 'Could not load Three.js.';
    return;
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000008);
  canvasWrap.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
  camera.position.z = DEFAULT_CAMERA_Z;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.3;
  controls.maxDistance = 8;
  controls.autoRotate = config.animation !== 'false';
  controls.autoRotateSpeed = 0.4;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 3, 5);
  scene.add(sun);

  const starPos = new Float32Array(6000);
  for (let i = 0; i < 6000; i += 1) starPos[i] = (Math.random() - 0.5) * 400;
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 }),
  ));

  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS * 1.02, 64, 64),
    new THREE.MeshPhongMaterial({ color: 0x4488ff, transparent: true, opacity: 0.08 }),
  ));

  const earthGroup = new THREE.Group();
  scene.add(earthGroup);

  let globeMesh = null;
  let pointsGroup = null;
  let panelEl = null;
  let timeBar = null;
  let allPoints = [];
  let selectedIdx = -1;
  let pauseRotateUntil = 0;
  let timePlaying = false;
  let timeWindow = 0;
  let spinBtn = null;

  const resize = () => {
    const w = canvasWrap.offsetWidth;
    const h = Math.max(canvasWrap.offsetHeight, 520);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvasWrap);
  resize();

  const resetView = () => {
    camera.position.set(0, 0, DEFAULT_CAMERA_Z);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  };

  const setSpinState = (spinning) => {
    controls.autoRotate = spinning;
    if (spinBtn) {
      spinBtn.classList.toggle('active', spinning);
      spinBtn.title = spinning ? 'Pause rotation' : 'Resume rotation';
    }
  };

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let pointerDownPos = null;

  const selectPoint = (idx) => {
    if (idx === selectedIdx) return;
    selectedIdx = idx;
    pauseRotateUntil = Date.now() + PAUSE_ON_CLICK_MS;

    if (pointsGroup) {
      pointsGroup.children.forEach((mesh) => {
        const pt = mesh.userData.point;
        const col = config['point-color'] || magColor(
          pt[config['magnitude-field'] || 'mag'],
        );
        mesh.material.color.set(col);
        mesh.material.emissive.set(col);
        mesh.material.emissiveIntensity = 0.3;
        mesh.scale.setScalar(1);
      });
      const sel = pointsGroup.children.find((m) => m.userData.idx === idx);
      if (sel) {
        sel.material.color.set('#ffffff');
        sel.material.emissive.set('#ffffff');
        sel.material.emissiveIntensity = 1;
        sel.scale.setScalar(2.5);
        const target = sel.position.clone().normalize().multiplyScalar(DEFAULT_CAMERA_Z);
        controls.target.set(0, 0, 0);
        camera.position.lerp(target, 0.3);
      }
    }

    if (panelEl) panelEl.highlightRow(idx);
  };

  renderer.domElement.addEventListener('pointerdown', (e) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!pointerDownPos) return;
    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    pointerDownPos = null;
    if (Math.sqrt(dx * dx + dy * dy) > 5) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    if (!pointsGroup) return;
    const hits = raycaster.intersectObjects(pointsGroup.children, false);
    if (hits.length > 0) selectPoint(hits[0].object.userData.idx);
  });

  const animate = () => {
    requestAnimationFrame(animate);
    if (Date.now() > pauseRotateUntil) {
      controls.autoRotate = config.animation !== 'false'
        && (spinBtn ? spinBtn.classList.contains('active') : true);
    }
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const renderGlobe = async (cfg) => {
    if (globeMesh) earthGroup.remove(globeMesh);
    if (pointsGroup) earthGroup.remove(pointsGroup);
    loading.style.display = 'flex';

    globeMesh = await buildTexturedGlobe(cfg['globe-mode'] || 'color', THREE);
    earthGroup.add(globeMesh);

    let rawPoints = [];
    try {
      const resp = await fetch(cfg.data || USGS_FEED);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      rawPoints = parseData(await resp.text(), cfg.data || USGS_FEED);
    } catch { rawPoints = []; }

    const minMag = Number.parseFloat(cfg['min-magnitude']) || DEFAULT_MIN_MAG;
    const magF = cfg['magnitude-field'] || 'mag';
    const timeF = cfg['time-field'] || 'time';
    const windowMs = (
      Number.parseFloat(cfg['time-window-hours']) || DEFAULT_TIME_WINDOW_HOURS
    ) * 3600000;
    const now = Date.now();

    allPoints = rawPoints
      .filter((p) => (Number.parseFloat(p[magF]) || 0) >= minMag)
      .filter((p) => {
        const ts = p[timeF];
        if (!ts) return true;
        return now - toTimestamp(ts) <= windowMs;
      })
      .map((p, i) => ({ ...p, pointIdx: i }));

    allPoints.sort((a, b) => toTimestamp(b[timeF]) - toTimestamp(a[timeF]));

    pointsGroup = buildPoints(allPoints, cfg, THREE);
    earthGroup.add(pointsGroup);

    if (panelEl) panelEl.remove();
    panelEl = buildPanel(allPoints, cfg, selectPoint);

    const tabBtn = el('button', 'ev-panel-tab', '▶ Events');
    tabBtn.addEventListener('click', () => {
      const collapsed = panelEl.classList.toggle('collapsed');
      tabBtn.textContent = collapsed ? '◀ Events' : '▶ Events';
      tabBtn.classList.toggle('collapsed', collapsed);
    });
    panelEl.prepend(tabBtn);
    stage.append(panelEl);

    const existingCtrl = canvasWrap.querySelector('.ev-globe-controls');
    if (existingCtrl) existingCtrl.remove();

    const globeControls = el('div', 'ev-globe-controls');

    spinBtn = el('button', 'ev-globe-btn ev-spin-btn active', '⟳');
    spinBtn.title = 'Pause rotation';
    spinBtn.addEventListener('click', () => setSpinState(!controls.autoRotate));

    const resetBtn = el('button', 'ev-globe-btn ev-reset-btn', '⊙');
    resetBtn.title = 'Reset view';
    resetBtn.addEventListener('click', resetView);

    globeControls.append(spinBtn, resetBtn);
    canvasWrap.append(globeControls);

    if (timeBar) timeBar.remove();
    const hasTime = allPoints.some((p) => p[timeF]);
    if (hasTime) {
      const times = allPoints.map((p) => toTimestamp(p[timeF])).filter(Boolean);
      const timeMin = Math.min(...times);
      const timeMax = Math.max(...times);
      timeWindow = timeMax;

      timeBar = el('div', 'ev-timebar');
      const playBtn = el('button', 'ev-timebar-play', '▶');
      playBtn.title = 'Play time animation';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'ev-timebar-slider';
      slider.min = String(timeMin);
      slider.max = String(timeMax);
      slider.value = String(timeMax);
      slider.step = String(Math.max(1, Math.round((timeMax - timeMin) / 200)));

      const timeLbl = el('span', 'ev-timebar-label', new Date(timeMax).toUTCString());

      const applySlider = (val) => {
        const t = Number(val);
        timeLbl.textContent = new Date(t).toUTCString();
        if (pointsGroup) {
          pointsGroup.children.forEach((mesh) => {
            const ts = mesh.userData.point[timeF];
            mesh.visible = !ts || toTimestamp(ts) <= t;
          });
        }
      };

      slider.addEventListener('input', () => {
        timeWindow = Number(slider.value);
        applySlider(timeWindow);
      });

      playBtn.addEventListener('click', () => {
        timePlaying = !timePlaying;
        playBtn.textContent = timePlaying ? '⏸' : '▶';
        if (timePlaying) {
          if (timeWindow >= timeMax) timeWindow = timeMin;
          const step = (timeMax - timeMin) / 300;
          const tick = () => {
            if (!timePlaying) return;
            timeWindow = Math.min(timeWindow + step, timeMax);
            slider.value = String(timeWindow);
            applySlider(timeWindow);
            if (timeWindow < timeMax) {
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

    loading.style.display = 'none';
    selectedIdx = -1;
  };

  if (isAuthoringEnv()) {
    const toolbar = buildToolbar(config, (updated) => {
      Object.assign(config, updated);
      toolbar.querySelectorAll('.ev-toolbar-btn[data-mode]').forEach((b) => {
        b.classList.toggle('active', b.dataset.mode === config['globe-mode']);
      });
      renderGlobe(config);
    });
    shell.append(toolbar);
  }

  await renderGlobe(config);
}
