/* eslint-disable import/no-unresolved */

import { getColorAt } from './data-viz-presets.js';

const POINT_SEGS = 8;

// ─── Shared geometry helpers ──────────────────────────────────────────────────

const normalizeValues = (points, field) => {
  const vals = points.map((p) => Number.parseFloat(p[field]) || 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  return vals.map((v) => (v - min) / range);
};

const buildAxes = (THREE, size) => {
  const mat = new THREE.LineBasicMaterial({ color: 0x334466, opacity: 0.5, transparent: true });
  const pts = [
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(size, 0, 0)],
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, size, 0)],
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, size)],
  ];
  const group = new THREE.Group();
  pts.forEach(([a, b]) => {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    group.add(new THREE.Line(geo, mat));
  });
  return group;
};

// ─── bar3d ────────────────────────────────────────────────────────────────────

export const renderBar3d = (points, cfg, scheme, THREE) => {
  const group = new THREE.Group();
  const xF = cfg.xField || 'x';
  const yF = cfg.yField || 'y';
  const zF = cfg.zField || 'z';

  const xs = points.map((p) => Number.parseFloat(p[xF]) || 0);
  const zs = points.map((p) => Number.parseFloat(p[zF]) || 0);
  const ys = normalizeValues(points, yF);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const zMin = Math.min(...zs);
  const zMax = Math.max(...zs);
  const xRange = xMax - xMin || 1;
  const zRange = zMax - zMin || 1;

  const BAR_W = 0.18;
  const MAX_H = 3;

  points.forEach((pt, i) => {
    const nx = (((Number.parseFloat(pt[xF]) || 0) - xMin) / xRange) * 4 - 2;
    const nz = (((Number.parseFloat(pt[zF]) || 0) - zMin) / zRange) * 4 - 2;
    const h = Math.max(0.05, ys[i] * MAX_H);
    const color = getColorAt(scheme, ys[i]);

    const geo = new THREE.CylinderGeometry(BAR_W, BAR_W * 1.1, h, 12, 1, false);
    const mat = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.15,
      shininess: 80,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(nx, h / 2, nz);
    mesh.userData = { point: pt, idx: i };

    // Rounded cap
    const capGeo = new THREE.SphereGeometry(BAR_W, 12, 6);
    const cap = new THREE.Mesh(capGeo, mat);
    cap.position.set(nx, h, nz);

    group.add(mesh, cap);
  });

  group.add(buildAxes(THREE, 2.5));
  return group;
};

// ─── wave ─────────────────────────────────────────────────────────────────────

export const renderWave = (points, cfg, scheme, THREE, time) => {
  const group = new THREE.Group();
  const xF = cfg.xField || 'x';
  const zF = cfg.zField || 'z';
  const yF = cfg.yField || 'y';

  const xs = points.map((p) => Number.parseFloat(p[xF]) || 0);
  const zs = points.map((p) => Number.parseFloat(p[zF]) || 0);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const zMin = Math.min(...zs);
  const zMax = Math.max(...zs);
  const xRange = xMax - xMin || 1;
  const zRange = zMax - zMin || 1;
  const cols = Math.round(Math.sqrt(points.length));
  const rows = Math.ceil(points.length / cols);

  const positions = new Float32Array(points.length * 3);
  const colors = new Float32Array(points.length * 3);
  const indices = [];

  const t = time || 0;

  points.forEach((pt, i) => {
    const nx = (((Number.parseFloat(pt[xF]) || 0) - xMin) / xRange) * 4 - 2;
    const nz = (((Number.parseFloat(pt[zF]) || 0) - zMin) / zRange) * 4 - 2;
    const baseY = Number.parseFloat(pt[yF]) || 0;
    const ny = baseY + Math.sin(nx * 1.5 + t) * 0.2 * Math.cos(nz * 1.5 + t * 0.7);
    const norm = (ny + 1) / 2;
    const col = getColorAt(scheme, norm);
    const rgb = col.match(/\d+/g).map(Number);

    positions[i * 3] = nx;
    positions[i * 3 + 1] = ny;
    positions[i * 3 + 2] = nz;
    colors[i * 3] = rgb[0] / 255;
    colors[i * 3 + 1] = rgb[1] / 255;
    colors[i * 3 + 2] = rgb[2] / 255;
  });

  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a = r * cols + c;
      const b = a + 1;
      const d = (r + 1) * cols + c;
      const e = d + 1;
      if (a < points.length && b < points.length
        && d < points.length && e < points.length) {
        indices.push(a, b, d, b, e, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    shininess: 60,
    transparent: true,
    opacity: 0.92,
  });

  group.add(new THREE.Mesh(geo, mat));
  group.add(buildAxes(THREE, 2.5));
  return {
    group, geo, positions, colors, points, cfg, scheme,
  };
};

// ─── scatter3d ────────────────────────────────────────────────────────────────

export const renderScatter3d = (points, cfg, scheme, THREE) => {
  const group = new THREE.Group();
  const xF = cfg.xField || 'x';
  const yF = cfg.yField || 'y';
  const zF = cfg.zField || 'z';
  const vF = cfg.valueField || 'value';

  const xs = normalizeValues(points, xF);
  const ys = normalizeValues(points, yF);
  const zs = normalizeValues(points, zF);
  const vs = normalizeValues(points, vF);

  points.forEach((pt, i) => {
    const nx = xs[i] * 4 - 2;
    const ny = ys[i] * 4 - 2;
    const nz = zs[i] * 4 - 2;
    const color = getColorAt(scheme, vs[i]);
    const size = 0.04 + vs[i] * 0.08;

    const geo = new THREE.SphereGeometry(size, POINT_SEGS, POINT_SEGS);
    const mat = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.85,
      shininess: 100,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(nx, ny, nz);
    mesh.userData = { point: pt, idx: i };
    group.add(mesh);
  });

  group.add(buildAxes(THREE, 2.5));
  return group;
};

// ─── surface ──────────────────────────────────────────────────────────────────

export const renderSurface = (points, cfg, scheme, THREE) => {
  const xF = cfg.xField || 'x';
  const yF = cfg.yField || 'y';
  const zF = cfg.zField || 'z';

  const xs = points.map((p) => Number.parseFloat(p[xF]) || 0);
  const ys = normalizeValues(points, yF);
  const zs = points.map((p) => Number.parseFloat(p[zF]) || 0);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const zMin = Math.min(...zs);
  const zMax = Math.max(...zs);
  const xRange = xMax - xMin || 1;
  const zRange = zMax - zMin || 1;

  const cols = Math.round(Math.sqrt(points.length));
  const rows = Math.ceil(points.length / cols);

  const positions = new Float32Array(points.length * 3);
  const colors = new Float32Array(points.length * 3);
  const indices = [];

  points.forEach((pt, i) => {
    const nx = (((Number.parseFloat(pt[xF]) || 0) - xMin) / xRange) * 4 - 2;
    const ny = (ys[i] - 0.5) * 3;
    const nz = (((Number.parseFloat(pt[zF]) || 0) - zMin) / zRange) * 4 - 2;
    const col = getColorAt(scheme, ys[i]);
    const rgb = col.match(/\d+/g).map(Number);

    positions[i * 3] = nx;
    positions[i * 3 + 1] = ny;
    positions[i * 3 + 2] = nz;
    colors[i * 3] = rgb[0] / 255;
    colors[i * 3 + 1] = rgb[1] / 255;
    colors[i * 3 + 2] = rgb[2] / 255;
  });

  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a = r * cols + c;
      const b = a + 1;
      const d = (r + 1) * cols + c;
      const e = d + 1;
      if (a < points.length && b < points.length
        && d < points.length && e < points.length) {
        indices.push(a, b, d, b, e, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const group = new THREE.Group();
  group.add(new THREE.Mesh(
    geo,
    new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 80,
    }),
  ));
  group.add(buildAxes(THREE, 2.5));
  return group;
};

// ─── particles ────────────────────────────────────────────────────────────────

export const renderParticles = (points, cfg, scheme, THREE, time) => {
  const xF = cfg.xField || 'x';
  const yF = cfg.yField || 'y';
  const zF = cfg.zField || 'z';
  const vF = cfg.valueField || 'value';

  const xs = normalizeValues(points, xF);
  const ys = normalizeValues(points, yF);
  const zs = normalizeValues(points, zF);
  const vs = normalizeValues(points, vF);
  const t = time || 0;

  const positions = new Float32Array(points.length * 3);
  const colors = new Float32Array(points.length * 3);

  points.forEach((_, i) => {
    const nx = (xs[i] * 4 - 2) + Math.sin(t + i * 0.3) * 0.05;
    const ny = (ys[i] * 4 - 2) + Math.cos(t * 0.7 + i * 0.2) * 0.05;
    const nz = (zs[i] * 4 - 2) + Math.sin(t * 1.3 + i * 0.1) * 0.05;
    const col = getColorAt(scheme, vs[i]);
    const rgb = col.match(/\d+/g).map(Number);

    positions[i * 3] = nx;
    positions[i * 3 + 1] = ny;
    positions[i * 3 + 2] = nz;
    colors[i * 3] = rgb[0] / 255;
    colors[i * 3 + 1] = rgb[1] / 255;
    colors[i * 3 + 2] = rgb[2] / 255;
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const group = new THREE.Group();
  group.add(new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    }),
  ));
  return {
    group, geo, positions, colors, points, cfg, scheme,
  };
};
