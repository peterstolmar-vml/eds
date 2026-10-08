import { loadStyle, getConfig } from '../ak.js';

const { codeBase } = getConfig();

/**
 * Visual error boxes are opt-in: ?debug=1 (or true) turns them on for the
 * session, ?debug=0 turns them off. Errors are always logged to the console.
 */
function isDebug() {
  const param = new URLSearchParams(window.location.search).get('debug');
  try {
    if (param !== null) {
      const on = ['1', 'true', 'on'].includes(param.toLowerCase());
      if (on) sessionStorage.setItem('ak-debug', '1');
      else sessionStorage.removeItem('ak-debug');
      return on;
    }
    return sessionStorage.getItem('ak-debug') === '1';
  } catch {
    return param === '1' || param === 'true';
  }
}

export default async function error(ex, el) {
  // eslint-disable-next-line no-console
  console.log(ex);
  if (el && isDebug()) {
    await loadStyle(`${codeBase}/styles/error.css`);
    const wrapper = document.createElement('div');
    wrapper.className = 'has-error';

    const title = document.createElement('p');
    title.className = 'title';
    title.textContent = 'Error';
    el.insertAdjacentElement('afterend', wrapper);
    wrapper.append(title, el);
  }
}
