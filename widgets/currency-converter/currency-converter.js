/**
 * Decorates the currency converter widget
 * @param {Element} block The widget block element
 */
export default async function decorate(block) {
  // 1. Extract authored properties from the table rows
  const rows = [...block.children];
  const headingText = rows[0]?.querySelector('div')?.textContent || 'Currency Converter';
  const baseCurrency = rows[1]?.querySelector('div')?.textContent?.trim() || 'USD';

  // 2. Clear out the original table content to prepare the widget UI
  block.innerHTML = '';

  // 3. Build the widget structure dynamically (Vanilla JS DOM manipulation)
  const widgetContainer = document.createElement('div');
  widgetContainer.classList.add('converter-wrapper');

  widgetContainer.innerHTML = `
    <h3>${headingText}</h3>
    <div class="converter-form">
      <input type="number" id="convert-amount" value="1" min="1" aria-label="Amount" />
      <select id="convert-from" aria-label="From Currency">
        <option value="USD" ${baseCurrency === 'USD' ? 'selected' : ''}>USD ($)</option>
        <option value="EUR" ${baseCurrency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
        <option value="GBP" ${baseCurrency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
      </select>
      <span class="to-label">to</span>
      <select id="convert-to" aria-label="To Currency">
        <option value="EUR" ${baseCurrency === 'USD' ? 'selected' : ''}>EUR (€)</option>
        <option value="USD" ${baseCurrency === 'EUR' ? 'selected' : ''}>USD ($)</option>
        <option value="GBP">GBP (£)</option>
      </select>
    </div>
    <div class="converter-result">
      <p id="result-text">Calculating...</p>
    </div>
  `;

  block.append(widgetContainer);

  // 4. Widget Logic (Simulated live API calculation)
  const amountInput = block.querySelector('#convert-amount');
  const fromSelect = block.querySelector('#convert-from');
  const toSelect = block.querySelector('#convert-to');
  const resultText = block.querySelector('#result-text');

  // Hardcoded rates for example purposes (replace with a live fetch() call if needed)
  const rates = {
    USD: { EUR: 0.92, GBP: 0.78, USD: 1 },
    EUR: { USD: 1.09, GBP: 0.85, EUR: 1 },
    GBP: { USD: 1.28, EUR: 1.18, GBP: 1 },
  };

  function calculate() {
    const amount = parseFloat(amountInput.value) || 0;
    const from = fromSelect.value;
    const to = toSelect.value;

    const rate = rates[from]?.[to] || 1;
    const total = (amount * rate).toFixed(2);

    resultText.textContent = `${amount} ${from} = ${total} ${to}`;
  }

  // 5. Attach event listeners for real-time reactivity
  amountInput.addEventListener('input', calculate);
  fromSelect.addEventListener('change', calculate);
  toSelect.addEventListener('change', calculate);

  // Run initial calculation on load
  calculate();
}
