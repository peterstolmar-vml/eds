export default function decorate(block) {
  const rows = [...block.children];
  const cfg = {};

  rows.forEach((row) => {
    const [keyCell, valCell] = [...row.children];
    if (!keyCell || !valCell) return;
    const key = keyCell.textContent.trim().toLowerCase();
    const val = valCell.textContent.trim();
    cfg[key] = val;
  });

  block.innerHTML = '';

  const url = cfg.embedurl;
  if (!url) {
    block.textContent = 'No embedUrl configured.';
    return;
  }

  const height = cfg.height || '600px';
  const title = cfg.title || 'Embedded content';

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.title = title;
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('loading', 'lazy');
  iframe.style.width = '100%';
  iframe.style.height = height;
  iframe.style.border = 'none';
  iframe.style.borderRadius = '8px';

  block.appendChild(iframe);
}
