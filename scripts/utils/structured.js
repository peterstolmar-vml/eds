/*
 * Structured content (DA forms) helpers.
 *
 * Entries are DA documents holding a `da-form` block (metadata) and a block
 * named after the schema (data). Nested objects are separate blocks
 * referenced as `self://#<id>`. We read the previewed document first so
 * edits show up immediately, then fall back to the published JSON from the
 * DA structured content service.
 */
import { getConfig } from '../ak.js';

const SC_SERVICE = 'https://da-sc.adobeaem.workers.dev/live';
const cache = new Map();

/** DA org/repo from an aem.page/aem.live hostname, else the configured site. */
export function getDaSite() {
  const [, repo, org] = window.location.hostname.split('.')[0].split('--');
  if (org && repo) return { org, repo };
  return getConfig().daSite || {};
}

/** Document path without a local preview mount (e.g. /content). */
export function docPath(path) {
  const { mount } = getConfig();
  return mount && path.startsWith(`${mount}/`) ? path.slice(mount.length) : path;
}

export function formEditorUrl(path) {
  const { org, repo } = getDaSite();
  return `https://da.live/form#/${org}/${repo}${docPath(path)}`;
}

export function docEditorUrl(path) {
  const { org, repo } = getDaSite();
  return `https://da.live/edit#/${org}/${repo}${docPath(path)}`;
}

function coerce(text) {
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}

function parseBlock(block, root) {
  const data = {};
  [...block.children].forEach((row) => {
    const [keyCell, valueCell] = row.children;
    const key = keyCell?.textContent.trim();
    if (!key || !valueCell) return;
    // eslint-disable-next-line no-use-before-define
    data[key] = parseValue(valueCell, root);
  });
  return data;
}

function resolve(text, root) {
  if (!text.startsWith('self://#')) return coerce(text);
  const ref = root.querySelector(`.${CSS.escape(text.slice(8))}`);
  return ref ? parseBlock(ref, root) : null;
}

function parseValue(cell, root) {
  const items = cell.querySelectorAll(':scope > ul > li');
  if (items.length) return [...items].map((li) => resolve(li.textContent.trim(), root));
  return resolve(cell.textContent.trim(), root);
}

/** Parses DA form document markup into `{ metadata, data }`. */
export function parseDaForm(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const form = doc.querySelector('.da-form');
  if (!form) return null;
  const meta = parseBlock(form, doc);
  const schemaName = meta['x-schema-name'];
  const dataBlock = schemaName && doc.querySelector(`div.${CSS.escape(schemaName)}`);
  return {
    metadata: { schemaName, title: meta.title },
    data: dataBlock ? parseBlock(dataBlock, doc) : {},
  };
}

async function fetchPreview(path) {
  // .plain.html on aem.page; local html-folder previews serve the page itself
  let resp = await fetch(`${path}.plain.html`);
  if (!resp.ok) resp = await fetch(path);
  if (!resp.ok) throw new Error(`${resp.status}`);
  const parsed = parseDaForm(await resp.text());
  if (!parsed) throw new Error('Not a structured content document');
  return parsed;
}

async function fetchService(path) {
  const { org, repo } = getDaSite();
  const resp = await fetch(`${SC_SERVICE}/${org}/${repo}${docPath(path)}`);
  if (!resp.ok) throw new Error(`${resp.status}`);
  return resp.json();
}

/**
 * Fetch a structured content entry by document path.
 * @param {string} path e.g. /demo/cutex/data/products/ultra-powerful
 * @returns {Promise<{metadata: object, data: object, path: string}|null>}
 */
export function fetchStructured(path) {
  if (!cache.has(path)) {
    const load = fetchPreview(path)
      .catch(() => fetchService(path))
      .then((json) => ({ ...json, path }))
      .catch(() => null);
    cache.set(path, load);
  }
  return cache.get(path);
}
