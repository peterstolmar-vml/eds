/*
 * Stats Block
 * Animated counter bar with numbers that count up on scroll
 * Each row: col 1 = number value (e.g. "85%"), col 2 = label text
 */
function animateValue(el, target, suffix, duration) {
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic for smooth deceleration
    const eased = 1 - (1 - progress) ** 3;
    const current = Math.round(eased * target);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

export default function decorate(block) {
  const rows = [...block.children];

  block.setAttribute('role', 'list');
  block.setAttribute('aria-label', 'Key statistics');

  rows.forEach((row) => {
    row.classList.add('stats-item');
    row.setAttribute('role', 'listitem');
    const cols = [...row.children];

    if (cols[0]) {
      cols[0].classList.add('stats-value');
      const text = cols[0].textContent.trim();
      const num = parseInt(text, 10);
      const suffix = text.replace(/[\d,]/g, '').trim();
      cols[0].dataset.target = num;
      cols[0].dataset.suffix = suffix;
      // Keep full value accessible while showing animated value visually
      cols[0].setAttribute('aria-label', text);
      cols[0].textContent = `0${suffix}`;
    }

    if (cols[1]) cols[1].classList.add('stats-label');
  });

  // Animate when scrolled into view
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        block.classList.add('visible');
        rows.forEach((row, i) => {
          const valueEl = row.querySelector('.stats-value');
          if (valueEl) {
            const target = parseInt(valueEl.dataset.target, 10);
            const { suffix } = valueEl.dataset;
            // Stagger animation start for each stat
            setTimeout(() => animateValue(valueEl, target, suffix, 1800), i * 200);
          }
        });
      }
    },
    { threshold: 0.3 },
  );

  observer.observe(block);
}