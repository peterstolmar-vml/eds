/* eslint-disable import/no-unresolved */

/**
 * Parse CSV text into array of objects using first row as headers.
 * @param {string} text
 * @returns {object[]}
 */
const parseCSV = (text) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || [];
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] ?? '').replace(/^"|"$/g, '').trim();
    });
    return obj;
  });
};

/**
 * Normalize GeoJSON FeatureCollection into flat point array.
 * @param {object} gj
 * @returns {object[]}
 */
const parseGeoJSON = (gj) => {
  const features = gj.features ?? [];
  return features
    .filter((f) => f.geometry?.type === 'Point')
    .map((f) => ({
      ...f.properties,
      longitude: f.geometry.coordinates[0],
      latitude: f.geometry.coordinates[1],
      elevation: f.geometry.coordinates[2] ?? 0,
    }));
};

/**
 * Detect format and return normalized array of point objects.
 * Each object must have latitude + longitude at minimum.
 * @param {string} text raw response text
 * @param {string} url  source url (used for extension hint)
 * @returns {object[]}
 */
const parseData = (text, url) => {
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  if (ext === 'csv') return parseCSV(text);
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // fallback: try CSV
    return parseCSV(text);
  }
  if (json.type === 'FeatureCollection') return parseGeoJSON(json);
  // USGS feed shape: { features: [...] }
  if (json.features) return parseGeoJSON(json);
  // plain array
  if (Array.isArray(json)) return json;
  // plain object with a data key
  if (Array.isArray(json.data)) return json.data;
  return [];
};
export default parseData;
