/* eslint-disable import/no-unresolved */

export const COLOR_SCHEMES = {
  thermal: ['#140040', '#7722ff', '#cc44ff', '#ffcc00', '#ff8800', '#ff4400', '#ffffff'],
  ocean: ['#000820', '#003860', '#0066aa', '#00aacc', '#44ddee', '#aaffee', '#ffffff'],
  neon: ['#0d0d0d', '#7722ff', '#00ffcc', '#ffee00', '#ff2288', '#ffffff'],
  monochrome: ['#000000', '#222222', '#555555', '#888888', '#bbbbbb', '#ffffff'],
  brand: ['#111111', '#7722ff', '#ccff00', '#ddaaff', '#f0f0f0', '#ffffff'],
};

export const getColorAt = (scheme, t) => {
  const palette = COLOR_SCHEMES[scheme] || COLOR_SCHEMES.brand;
  const clamped = Math.max(0, Math.min(1, t));
  const pos = clamped * (palette.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, palette.length - 1);
  const frac = pos - lo;
  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16),
    ];
  };
  const a = hexToRgb(palette[lo]);
  const b = hexToRgb(palette[hi]);
  const r = Math.round(a[0] + (b[0] - a[0]) * frac);
  const g = Math.round(a[1] + (b[1] - a[1]) * frac);
  const bv = Math.round(a[2] + (b[2] - a[2]) * frac);
  return `rgb(${r},${g},${bv})`;
};

// ─── Sample inline datasets ───────────────────────────────────────────────────

const SAMPLE_BAR = Array.from({ length: 24 }, (_, i) => ({
  label: `Region ${i + 1}`,
  value: Math.round(20 + Math.random() * 80),
  category: i % 4,
  time: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
}));

const SAMPLE_WAVE = Array.from({ length: 400 }, (_, i) => {
  const x = (i % 20) - 10;
  const z = Math.floor(i / 20) - 10;
  return { x, z, y: Math.sin(x * 0.5) * Math.cos(z * 0.5) };
});

const SAMPLE_SCATTER = Array.from({ length: 120 }, (_, i) => ({
  x: (Math.random() - 0.5) * 10,
  y: (Math.random() - 0.5) * 10,
  z: (Math.random() - 0.5) * 10,
  value: Math.random(),
  label: `Point ${i + 1}`,
  time: new Date(Date.now() - i * 3600000 * 2).toISOString(),
}));

const SAMPLE_GDP = [
  { country: 'USA', year: 2012, gdp: 16.25 },
  { country: 'USA', year: 2014, gdp: 17.55 },
  { country: 'USA', year: 2016, gdp: 18.74 },
  { country: 'USA', year: 2018, gdp: 20.58 },
  { country: 'USA', year: 2020, gdp: 21.06 },
  { country: 'USA', year: 2022, gdp: 25.46 },
  { country: 'China', year: 2012, gdp: 8.56 },
  { country: 'China', year: 2014, gdp: 10.48 },
  { country: 'China', year: 2016, gdp: 11.23 },
  { country: 'China', year: 2018, gdp: 13.89 },
  { country: 'China', year: 2020, gdp: 14.72 },
  { country: 'China', year: 2022, gdp: 17.96 },
  { country: 'Germany', year: 2012, gdp: 3.54 },
  { country: 'Germany', year: 2014, gdp: 3.88 },
  { country: 'Germany', year: 2016, gdp: 3.47 },
  { country: 'Germany', year: 2018, gdp: 3.95 },
  { country: 'Germany', year: 2020, gdp: 3.84 },
  { country: 'Germany', year: 2022, gdp: 4.07 },
  { country: 'Japan', year: 2012, gdp: 6.20 },
  { country: 'Japan', year: 2014, gdp: 4.85 },
  { country: 'Japan', year: 2016, gdp: 4.95 },
  { country: 'Japan', year: 2018, gdp: 5.04 },
  { country: 'Japan', year: 2020, gdp: 5.05 },
  { country: 'Japan', year: 2022, gdp: 4.23 },
];

const SAMPLE_SURFACE = Array.from({ length: 225 }, (_, i) => {
  const x = (i % 15) - 7;
  const z = Math.floor(i / 15) - 7;
  const r = Math.sqrt(x * x + z * z);
  return { x, z, y: r === 0 ? 1 : Math.sin(r * 0.8) / (r * 0.3) };
});

// ─── Preset definitions ───────────────────────────────────────────────────────

const PRESETS = [
  {
    id: 'earthquake-bars',
    label: '🌍 Earthquake Activity (3D Bars)',
    vizType: 'bar3d',
    colorScheme: 'thermal',
    dataSource: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
    dataFormat: 'geojson',
    sampleData: SAMPLE_BAR,
    config: {
      xField: 'longitude',
      yField: 'mag',
      zField: 'latitude',
      labelField: 'place',
      timeField: 'time',
      title: 'Earthquake Activity — M2.5+ Last 24h',
    },
  },
  {
    id: 'wave-demo',
    label: '🌊 Wave Animation',
    vizType: 'wave',
    colorScheme: 'ocean',
    dataSource: 'sample',
    sampleData: SAMPLE_WAVE,
    config: {
      xField: 'x',
      yField: 'y',
      zField: 'z',
      animate: true,
      title: 'Wave Surface Animation',
    },
  },
  {
    id: 'scatter-time',
    label: '✨ 3D Scatter — Time Animated',
    vizType: 'scatter3d',
    colorScheme: 'neon',
    dataSource: 'sample',
    sampleData: SAMPLE_SCATTER,
    config: {
      xField: 'x',
      yField: 'y',
      zField: 'z',
      valueField: 'value',
      labelField: 'label',
      timeField: 'time',
      title: '3D Scatter Plot',
    },
  },
  {
    id: 'gdp-bars',
    label: '📊 GDP by Country (3D Bars)',
    vizType: 'bar3d',
    colorScheme: 'brand',
    dataSource: 'sample',
    sampleData: SAMPLE_GDP,
    config: {
      xField: 'country',
      yField: 'gdp',
      zField: 'year',
      labelField: 'country',
      timeField: 'year',
      title: 'GDP by Country 2012–2022 (Trillion USD)',
    },
  },
  {
    id: 'surface-demo',
    label: '🏔 Mathematical Surface',
    vizType: 'surface',
    colorScheme: 'brand',
    dataSource: 'sample',
    sampleData: SAMPLE_SURFACE,
    config: {
      xField: 'x',
      yField: 'y',
      zField: 'z',
      title: 'sinc(r) Surface',
    },
  },
  {
    id: 'particles-demo',
    label: '🎆 Particle Storm',
    vizType: 'particles',
    colorScheme: 'neon',
    dataSource: 'sample',
    sampleData: SAMPLE_SCATTER,
    config: {
      xField: 'x',
      yField: 'y',
      zField: 'z',
      valueField: 'value',
      animate: true,
      title: 'Particle Storm',
    },
  },
];

export default PRESETS;
