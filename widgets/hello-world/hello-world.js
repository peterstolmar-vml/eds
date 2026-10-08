export default function decorate(widget) {
  // Parameters from the widget URL are available as data attributes.
  const name = widget.dataset.name || 'world';
  const target = widget.querySelector('.name');
  if (target) target.textContent = name;
}
