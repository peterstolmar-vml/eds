/* eslint-disable import/no-unresolved */

import parseData from './earth-viz-parser.js';

const THREE_VERSION = '0.187.0';
const THREE_BASE = `https://esm.sh/three@${THREE_VERSION}`;
const USGS_FEED = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

const TEXTURES = {
  color: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  monochrome: 'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
  relief: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
  bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
};

const WIREFRAME_COLOR = 0x00aaff;
const GLOBE_RADIUS = 1;
const FALLBACK_SEGMENTS = 64;
const DEFAULT_POINT_COLOR = '#ff4400';
const DEFAULT_POINT_SIZE = 0.015;
const DEFAULT_POINT_OPACITY = 0.85;
const DEFAULT_MIN_MAG = 2.0;
const DEFAULT_TIME_WINDOW_HOURS = 24;
const PAUSE_ON_CLICK_MS = 3000;
const CONTINENT_COLOR = 0x2a6a3a;
const OCEAN_COLOR = 0x0a1a3a;

const isAuthoringEnv = () => {
  const { hostname } = window.location;
  return (
    hostname.endsWith('.da.live')
    || hostname.endsWith('.experience.adobe.com')
    || hostname === 'localhost'
    || hostname === '127.0.0.1'
  );
};

// ─── Magnitude → color ───────────────────────────────────────────────────────

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

// ─── lat/lng → 3D position ───────────────────────────────────────────────────

const latLngToVec3 = (lat, lng, radius, THREE) => {
  const phi = (90 - Number.parseFloat(lat)) * (Math.PI / 180);
  const theta = (Number.parseFloat(lng) + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
};

// ─── Three.js dynamic import ─────────────────────────────────────────────────

const loadThree = async () => {
  const mod = await import(/* @vite-ignore */ THREE_BASE);
  const { OrbitControls } = await import(
    /* @vite-ignore */ `${THREE_BASE}/examples/jsm/controls/OrbitControls.js`
  );
  return { THREE: mod, OrbitControls };
};

// ─── Fallback continent geometry ─────────────────────────────────────────────

const buildFallbackGlobe = (THREE) => {
  const group = new THREE.Group();
  const oceanGeo = new THREE.SphereGeometry(GLOBE_RADIUS, FALLBACK_SEGMENTS, FALLBACK_SEGMENTS);
  const oceanMat = new THREE.MeshPhongMaterial({ color: OCEAN_COLOR });
  group.add(new THREE.Mesh(oceanGeo, oceanMat));

  // Simplified continent outlines as lat/lng bounding boxes → extruded spherical patches
  const continents = [
    { lat: [25, 70], lng: [-170, -50] }, // N America
    { lat: [-55, 15], lng: [-85, -30] }, // S America
    { lat: [-35, 35], lng: [-20, 55] }, // Africa
    { lat: [35, 70], lng: [-10, 60] }, // Europe
    { lat: [5, 75], lng: [60, 145] }, // Asia
    { lat: [-45, -10], lng: [110, 155] }, // Australia
    { lat: [-90, -65], lng: [-180, 180] }, // Antarctica
  ];

  continents.forEach(({ lat, lng }) => {
    const latSteps = Math.max(2, Math.round((lat[1] - lat[0]) / 5));
    const lngSteps = Math.max(2, Math.round((lng[1] - lng[0]) / 5));
    for (let i = 0; i < latSteps; i += 1) {
      for (let j = 0; j < lngSteps; j += 1) {
        const clat = lat[0] + (i + 0.5) * ((lat[1] - lat[0]) / latSteps);
        const clng = lng[0] + (j + 0.5) * ((lng[1] - lng[0]) / lngSteps);
        const pos = latLngToVec3(clat, clng, GLOBE_RADIUS + 0.002, THREE);
        const geo = new THREE.SphereGeometry(0.025, 8, 8);
        const mat = new THREE.MeshPhongMaterial({ color: CONTINENT_COLOR });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        group.add(mesh);
      }
    }
  });

  return group;
};

// ─── Point cloud builder ─────────────────────────────────────────────────────

const buildPoints = (points, config, THREE) => {
  const group = new THREE.Group();
  const latF = config['lat-field'] || 'latitude';
  const lngF = config['lng-field'] || 'longitude';
  const magF = config['magnitude-field'] || 'mag';
  const baseSize = Number.parseFloat(config['point-size']) || DEFAULT_POINT_SIZE;
  const opacity = Number.parseFloat(config['point-opacity']) || DEFAULT_POINT_OPACITY;
  const customColor = config['point-color'];

  points.forEach((pt, idx) => {
    const lat = Number.parseFloat(pt[latF]);
    const lng = Number.parseFloat(pt[lngF]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    const mag = pt[magF];
    const color = customColor || magColor(mag);
    const radius = magRadius(mag, baseSize);
    const pos = latLngToVec3(lat, lng, GLOBE_RADIUS + 0.01, THREE);
    const geo = new THREE.SphereGeometry(radius, 8, 8);
    const mat = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      emissive: color,
      emissiveIntensity: 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.userData = { idx, point: pt };
    group.add(mesh);
  });

  return group;
};

// ─── Globe texture loader ─────────────────────────────────────────────────────

const buildTexturedGlobe = (mode, THREE) => new Promise((resolve) => {
  if (mode === 'wireframe') {
    const geo = new THREE.SphereGeometry(GLOBE_RADIUS, FALLBACK_SEGMENTS, FALLBACK_SEGMENTS);
    const mat = new THREE.MeshBasicMaterial({ color: WIREFRAME_COLOR, wireframe: true });
    resolve(new THREE.Mesh(geo, mat));
    return;
  }

  const loader = new THREE.TextureLoader();
  const url = TEXTURES[mode] || TEXTURES.color;

  loader.load(
    url,
    (tex) => {
      const geo = new THREE.SphereGeometry(GLOBE_RADIUS, FALLBACK_SEGMENTS, FALLBACK_SEGMENTS);
      const matOpts = { map: tex };
      if (mode === 'relief') {
        matOpts.bumpMap = tex;
        matOpts.bumpScale = 0.05;
      }
      const mat = new THREE.MeshPhongMaterial(matOpts);
      resolve(new THREE.Mesh(geo, mat));
    },
    undefined,
    () => {
      // Texture failed — use fallback continent globe
      resolve(buildFallbackGlobe(THREE));
    },
  );
});

// ─── Side panel ──────────────────────────────────────────────────────────────

const buildPanel = (points, config, onSelect) => {
  const labelF = config['label-field'] || 'place';
  const timeF = config['time-field'] || 'time';
  const magF = config['magnitude-field'] || 'mag';
  const title = config['panel-title'] || 'Recent Earthquakes';

  const panel = document.createElement('div');
  panel.className = 'ev-panel';

  const header = document.createElement('div');
  header.className = 'ev-panel-header';

  const titleEl = document.createElement('p');
  titleEl.className = 'ev-panel-title';
  titleEl.textContent = title;

  const countEl = document.createElement('span');
  countEl.className = 'ev-panel-count';
  countEl.textContent = `${points.length} events`;

  header.append(titleEl, countEl);

  const list = document.createElement('div');
  list.className = 'ev-panel-list';

  points.forEach((pt, idx) => {
    const mag = Number.parseFloat(pt[magF]) || 0;
    const row = document.createElement('div');
    row.className = 'ev-panel-row';
    row.dataset.idx = idx;

    const magDot = document.createElement('div');
    magDot.className = 'ev-panel-mag';
    magDot.style.background = magColor(mag);
    magDot.textContent = mag.toFixed(1);

    const info = document.createElement('div');
    info.className = 'ev-panel-info';

    const lbl = document.createElement('div');
    lbl.className = 'ev-panel-label';
    lbl.textContent = pt[labelF] || `${pt.latitude ?? pt.lat}, ${pt.longitude ?? pt.lng}`;

    const time = document.createElement('div');
    time.className = 'ev-panel-time';
    const ts = pt[timeF];
    time.textContent = ts ? new Date(Number.isNaN(Number(ts)) ? ts : Number(ts)).toUTCString() : '';

    info.append(lbl, time);
    row.append(magDot, info);
    row.addEventListener('click', () => onSelect(idx));
    list.append(row);
  });

  const detail = document.createElement('div');
  detail.className = 'ev-detail';
  detail.hidden = true;

  panel.append(header, list, detail);
  panel.evList = list;
  panel.evDetail = detail;
  panel.evCount = countEl;

  return panel;
};

const showDetail = (panel, pt, labelF, timeF, magF) => {
  const detail = panel.evDetail;
  detail.hidden = false;
  detail.innerHTML = '';

  const h4 = document.createElement('h4');
  h4.textContent = pt[labelF] || 'Event Details';
  detail.append(h4);

  const show = (key, val) => {
    if (!val && val !== 0) return;
    const row = document.createElement('div');
    row.className = 'ev-detail-row';
    const k = document.createElement('span');
    k.className = 'ev-detail-key';
    k.textContent = key;
    const v = document.createElement('span');
    v.className = 'ev-detail-val';
    v.textContent = String(val);
    row.append(k, v);
    detail.append(row);
  };

  show('Magnitude', pt[magF]);
  show('Location', pt[labelF]);
  const ts = pt[timeF];
  if (ts) show('Time', new Date(Number.isNaN(Number(ts)) ? ts : Number(ts)).toUTCString());
  show('Depth', pt.depth ? `${pt.depth} km` : null);
  show('Latitude', pt.latitude ?? pt.lat);
  show('Longitude', pt.longitude ?? pt.lng);

  // Any extra keys
  const known = new Set([labelF, timeF, magF, 'latitude', 'longitude', 'lat', 'lng', 'depth']);
  Object.entries(pt).forEach(([k, v]) => {
    if (!known.has(k)) show(k, v);
  });
};

// ─── Authoring toolbar ────────────────────────────────────────────────────────

const buildToolbar = (config, onUpdate) => {
  const toolbar = document.createElement('div');
  toolbar.className = 'ev-toolbar';

  const lbl = document.createElement('span');
  lbl.className = 'ev-toolbar-label';
  lbl.textContent = '✎ Earth Viz';
  toolbar.append(lbl);

  const sep = () => {
    const s = document.createElement('span');
    s.className = 'ev-toolbar-sep';
    return s;
  };

  // Globe mode buttons
  ['color', 'monochrome', 'relief', 'wireframe'].forEach((mode) => {
    const btn = document.createElement('button');
    btn.className = `ev-toolbar-btn${config['globe-mode'] === mode ? ' active' : ''}`;
    btn.textContent = mode;
    btn.addEventListener('click', () => {
      toolbar.querySelectorAll('.ev-toolbar-btn[data-mode]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      onUpdate({ ...config, 'globe-mode': mode });
    });
    btn.dataset.mode = mode;
    toolbar.append(btn);
  });

  toolbar.append(sep());

  // Point color picker
  const colorLbl = document.createElement('span');
  colorLbl.className = 'ev-toolbar-label';
  colorLbl.textContent = 'pts';
  const colorPick = document.createElement('input');
  colorPick.type = 'color';
  colorPick.value = config['point-color'] || DEFAULT_POINT_COLOR;
  colorPick.title = 'Point color (blank = magnitude scale)';
  colorPick.style.cssText = 'height:22px;width:36px;padding:1px;border:1px solid #999;border-radius:2px;cursor:pointer;';
  colorPick.addEventListener('change', () => {
    onUpdate({ ...config, 'point-color': colorPick.value });
  });
  toolbar.append(colorLbl, colorPick, sep());

  // Min magnitude
  const magLbl = document.createElement('span');
  magLbl.className = 'ev-toolbar-label';
  magLbl.textContent = 'min mag';
  const magInput = document.createElement('input');
  magInput.type = 'number';
  magInput.value = config['min-magnitude'] || DEFAULT_MIN_MAG;
  magInput.min = '0';
  magInput.max = '10';
  magInput.step = '0.1';
  magInput.style.cssText = 'width:52px;padding:3px 5px;font-size:11px;border:1px solid #aaa;border-radius:2px;';
  magInput.addEventListener('change', () => {
    onUpdate({ ...config, 'min-magnitude': magInput.value });
  });
  toolbar.append(magLbl, magInput, sep());

  // Pencil / dialog button
  const pencil = document.createElement('button');
  pencil.className = 'ev-toolbar-pencil';
  pencil.title = 'Open full configuration dialog';
  pencil.textContent = '✎ Configure';
  pencil.addEventListener('click', async () => {
    const { openDialog } = await import('./earth-viz-dialog.js');
    openDialog.default(config, (updated) => onUpdate(updated));
  });
  toolbar.append(pencil);

  return toolbar;
};

// ─── Main decorator ───────────────────────────────────────────────────────────

export default async function decorate(block) {
  // Parse config from block table rows
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

  // ── Build shell ─────────────────────────────────────────────────────────────
  const shell = document.createElement('div');
  shell.className = 'earth-viz';

  const stage = document.createElement('div');
  stage.className = 'ev-stage';

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'ev-canvas-wrap';

  const loading = document.createElement('div');
  loading.className = 'ev-loading';
  loading.textContent = 'Loading Earth…';
  canvasWrap.append(loading);

  stage.append(canvasWrap);
  shell.append(stage);
  block.append(shell);

  // ── Load Three.js ───────────────────────────────────────────────────────────
  let THREE;
  let OrbitControls;
  try {
    const mod = await loadThree();
    THREE = mod.THREE;
    OrbitControls = mod.OrbitControls;
  } catch {
    loading.className = 'ev-error';
    loading.textContent = 'Could not load Three.js. Check your connection.';
    return;
  }

  // ── Renderer ────────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000008);
  canvasWrap.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
  camera.position.z = 2.8;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.3;
  controls.maxDistance = 6;
  controls.autoRotate = config.animation !== 'false';
  controls.autoRotateSpeed = 0.4;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 3, 5);
  scene.add(sun);

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starCount = 2000;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 1) {
    starPos[i] = (Math.random() - 0.5) * 400;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })));

  // Atmosphere glow
  const atmGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.02, 64, 64);
  const atmMat = new THREE.MeshPhongMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.08,
    side: THREE.FrontSide,
  });
  scene.add(new THREE.Mesh(atmGeo, atmMat));

  // ── Globe group (replaceable) ───────────────────────────────────────────────
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
  let timeMax = 0;

  // ── Resize handler ──────────────────────────────────────────────────────────
  const resize = () => {
    const w = canvasWrap.offsetWidth;
    const h = canvasWrap.offsetHeight || 520;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvasWrap);
  resize();

  // ── Raycaster for click ─────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const selectPoint = (idx) => {
    if (idx === selectedIdx) return;
    selectedIdx = idx;
    pauseRotateUntil = Date.now() + PAUSE_ON_CLICK_MS;

    // Reset all point colors
    if (pointsGroup) {
      pointsGroup.children.forEach((mesh) => {
        const pt = mesh.userData.point;
        const col = config['point-color'] || magColor(pt[config['magnitude-field'] || 'mag']);
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
      }
    }

    // Panel highlight
    if (panelEl) {
      panelEl.evList.querySelectorAll('.ev-panel-row').forEach((r) => r.classList.remove('selected'));
      const row = panelEl.evList.querySelector(`[data-idx="${idx}"]`);
      if (row) {
        row.classList.add('selected');
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      const pt = allPoints[idx];
      if (pt) {
        showDetail(
          panelEl,
          pt,
          config['label-field'] || 'place',
          config['time-field'] || 'time',
          config['magnitude-field'] || 'mag',
        );
      }
    }

    // Ease camera toward point
    if (pointsGroup) {
      const sel = pointsGroup.children.find((m) => m.userData.idx === idx);
      if (sel) {
        const target = sel.position.clone().normalize().multiplyScalar(2.8);
        controls.target.set(0, 0, 0);
        camera.position.lerp(target, 0.3);
      }
    }
  };

  renderer.domElement.addEventListener('click', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    if (!pointsGroup) return;
    const hits = raycaster.intersectObjects(pointsGroup.children, false);
    if (hits.length > 0) {
      selectPoint(hits[0].object.userData.idx);
    }
  });

  // ── Animation loop ──────────────────────────────────────────────────────────
  const animate = () => {
    requestAnimationFrame(animate);
    controls.autoRotate = config.animation !== 'false' && Date.now() > pauseRotateUntil;
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  // ── Filter points by time window ────────────────────────────────────────────
  const applyTimeFilter = (windowStart) => {
    if (!pointsGroup) return;
    const timeF = config['time-field'] || 'time';
    pointsGroup.children.forEach((mesh) => {
      const pt = mesh.userData.point;
      const ts = pt[timeF];
      if (!ts) { mesh.visible = true; return; }
      const t = Number.isNaN(Number(ts)) ? new Date(ts).getTime() : Number(ts);
      mesh.visible = t >= windowStart;
    });
  };

  // ── Render globe + data ─────────────────────────────────────────────────────
  const renderGlobe = async (cfg) => {
    // Remove old meshes
    if (globeMesh) earthGroup.remove(globeMesh);
    if (pointsGroup) earthGroup.remove(pointsGroup);

    loading.style.display = 'flex';

    // Build globe
    globeMesh = await buildTexturedGlobe(cfg['globe-mode'] || 'color', THREE);
    earthGroup.add(globeMesh);

    // Fetch data
    const dataUrl = cfg.data || USGS_FEED;
    let rawPoints = [];
    try {
      const resp = await fetch(dataUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      rawPoints = parseData(text, dataUrl);
    } catch {
      rawPoints = [];
    }

    // Filter by magnitude
    const minMag = Number.parseFloat(cfg['min-magnitude']) || DEFAULT_MIN_MAG;
    const magF = cfg['magnitude-field'] || 'mag';
    allPoints = rawPoints.filter((p) => (Number.parseFloat(p[magF]) || 0) >= minMag);

    // Filter by time window
    const windowHours = Number.parseFloat(cfg['time-window-hours']) || DEFAULT_TIME_WINDOW_HOURS;
    const timeF = cfg['time-field'] || 'time';
    const now = Date.now();
    const windowMs = windowHours * 3600 * 1000;
    allPoints = allPoints.filter((p) => {
      const ts = p[timeF];
      if (!ts) return true;
      const t = Number.isNaN(Number(ts)) ? new Date(ts).getTime() : Number(ts);
      return now - t <= windowMs;
    });

    const toTimestamp = (pt) => {
      const raw = pt[timeF];
      if (!raw) return 0;
      return Number.isNaN(Number(raw)) ? new Date(raw).getTime() : Number(raw);
    };

    allPoints.sort((a, b) => toTimestamp(b) - toTimestamp(a));

    // Build points
    pointsGroup = buildPoints(allPoints, cfg, THREE);
    earthGroup.add(pointsGroup);

    // Build / update panel
    if (panelEl) panelEl.remove();
    panelEl = buildPanel(allPoints, cfg, selectPoint);
    stage.append(panelEl);

    // Panel toggle button
    const existingToggle = canvasWrap.querySelector('.ev-panel-toggle');
    if (existingToggle) existingToggle.remove();
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'ev-panel-toggle';
    toggleBtn.title = 'Toggle side panel';
    toggleBtn.textContent = '▶';
    toggleBtn.addEventListener('click', () => {
      const collapsed = panelEl.classList.toggle('collapsed');
      toggleBtn.textContent = collapsed ? '◀' : '▶';
    });
    canvasWrap.append(toggleBtn);

    // Time scrub
    if (timeBar) timeBar.remove();
    const hasTime = allPoints.some((p) => p[timeF]);
    if (hasTime) {
      const times = allPoints
        .map((p) => {
          const ts = p[timeF];
          /* eslint-disable-next-line no-nested-ternary */
          return ts ? (Number.isNaN(Number(ts)) ? new Date(ts).getTime() : Number(ts)) : 0;
        })
        .filter(Boolean);
      timeMax = Math.max(...times);
      timeWindow = timeMax;

      timeBar = document.createElement('div');
      timeBar.className = 'ev-timebar';

      const playBtn = document.createElement('button');
      playBtn.className = 'ev-timebar-play';
      playBtn.title = 'Play / pause time animation';
      playBtn.textContent = '▶';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'ev-timebar-slider';
      slider.min = String(Math.min(...times));
      slider.max = String(timeMax);
      slider.value = String(timeMax);
      slider.step = String(Math.max(1, Math.round((timeMax - Math.min(...times)) / 200)));

      const timeLbl = document.createElement('span');
      timeLbl.className = 'ev-timebar-label';
      timeLbl.textContent = new Date(timeMax).toUTCString();

      slider.addEventListener('input', () => {
        timeWindow = Number(slider.value);
        timeLbl.textContent = new Date(timeWindow).toUTCString();
        applyTimeFilter(Number(slider.min));
        // show points up to slider position
        if (pointsGroup) {
          pointsGroup.children.forEach((mesh) => {
            const ts = mesh.userData.point[timeF];
            if (!ts) { mesh.visible = true; return; }
            const t = Number.isNaN(Number(ts)) ? new Date(ts).getTime() : Number(ts);
            mesh.visible = t <= timeWindow;
          });
        }
      });

      playBtn.addEventListener('click', () => {
        timePlaying = !timePlaying;
        playBtn.textContent = timePlaying ? '⏸' : '▶';
        if (timePlaying) {
          const minT = Number(slider.min);
          if (timeWindow >= timeMax) timeWindow = minT;
          const step = (timeMax - minT) / 300;
          const tick = () => {
            if (!timePlaying) return;
            timeWindow = Math.min(timeWindow + step, timeMax);
            slider.value = String(timeWindow);
            timeLbl.textContent = new Date(timeWindow).toUTCString();
            if (pointsGroup) {
              pointsGroup.children.forEach((mesh) => {
                const ts = mesh.userData.point[timeF];
                if (!ts) { mesh.visible = true; return; }
                const t = Number.isNaN(Number(ts)) ? new Date(ts).getTime() : Number(ts);
                mesh.visible = t <= timeWindow;
              });
            }
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

  // ── Authoring toolbar ─────────────────────────────────────────────────────
  if (isAuthoringEnv()) {
    const toolbar = buildToolbar(config, (updated) => {
      Object.assign(config, updated);
      // Refresh globe mode buttons
      toolbar.querySelectorAll('.ev-toolbar-btn[data-mode]').forEach((b) => {
        b.classList.toggle('active', b.dataset.mode === config['globe-mode']);
      });
      renderGlobe(config);
    });
    shell.append(toolbar);
  }

  // ── Initial render ──────────────────────────────────────────────────────────
  await renderGlobe(config);
}
