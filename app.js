'use strict';
const $ = id => document.getElementById(id);
const game = window.CookieGame;
const saveKey = 'kevins-cookie-shop-v1';
// Keep the original storage key so existing shops survive the name change.
const dollars = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
let state = game.initialState();
let serving = false;
let customerTimers = [];
try {
  const saved = JSON.parse(localStorage.getItem(saveKey));
  if (saved && saved.version === 1 && Number.isInteger(saved.seed) && Number.isFinite(saved.cash) && saved.cash >= 0 && Array.isArray(saved.history) && saved.history.length <= 30 && saved.plan && saved.history.every(r => ['day','quantity','price','advertising','sold','expenses','revenue','profit','cash'].every(k => Number.isFinite(r[k])))) state = saved;
} catch (_) { /* Storage can be unavailable when opening local files. */ }
function save() { try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch (_) { document.querySelector('footer span:last-child').textContent = 'Progress kept for this session'; } }
function plan() { return { quantity: $('quantity').value === '' ? NaN : Number($('quantity').value), price: $('price').value === '' ? NaN : Number($('price').value), advertising: $('advertising').value === '' ? NaN : Number($('advertising').value) }; }
function ended() { return state.history.length >= 30 || state.cash < 5; }
function fillInputs() { for (const key of ['quantity','price','advertising']) $(key).value = key === 'price' ? Number(state.plan[key]).toFixed(2) : state.plan[key]; }
function updatePlan() {
  const p = plan(), validNumbers = Object.values(p).every(Number.isFinite);
  $('ingredient-cost').textContent = validNumbers ? dollars(p.quantity * 0.5) : '—';
  $('advertising-cost').textContent = validNumbers ? dollars(p.advertising) : '—';
  $('investment').textContent = validNumbers ? dollars(game.cost(p)) : '—';
  const remaining = validNumbers ? game.money(state.cash - game.cost(p)) : NaN;
  $('cash-after-opening').textContent = validNumbers ? dollars(remaining) : '—';
  $('cash-after-opening').classList.toggle('negative', remaining < 0);
  document.querySelector('.budget-note').hidden = state.awaitingNext || ended();
  const error = ended() || state.awaitingNext ? '' : game.validate(state, p);
  $('form-error').textContent = error;
  $('investment').classList.toggle('negative', validNumbers && game.cost(p) > state.cash);
  $('bake').disabled = serving || ended() || state.awaitingNext || !!error;
  $('bake').innerHTML = ended() ? 'Run complete <span>✓</span>' : state.awaitingNext ? 'Shop closed for today <span>✓</span>' : 'Open shop & bake <span>→</span>';
  const expected = validNumbers ? game.demand(state, p) : 0;
  $('demand').textContent = validNumbers ? `${Math.round(expected * 0.8)}–${Math.round(expected * 1.2)}` : '—';
  if (validNumbers && !error && !ended() && !state.awaitingNext) { state.plan = p; save(); }
}
function render() {
  if (!state.awaitingNext) $('customer-strip').hidden = true;
  const days = state.history.length, last = state.history.at(-1), totalSold = state.history.reduce((n, r) => n + r.sold, 0);
  $('cash').textContent = dollars(state.cash);
  $('profit').textContent = dollars(game.money(state.cash - 100));
  $('profit').classList.toggle('negative', state.cash < 100);
  $('sold').innerHTML = `${totalSold.toLocaleString()} <em>cookies</em>`;
  $('progress-label').innerHTML = `${days} <em>of 30 days</em>`;
  $('progress').style.width = `${days / 30 * 100}%`;
  $('day-label').innerHTML = `DAY ${String(state.awaitingNext ? Math.max(1, days) : Math.min(30, days + 1)).padStart(2, '0')} <b>/ 30</b>`;
  $('plan-title').textContent = ended() ? 'Your run is complete' : state.awaitingNext ? 'Another day in the books' : 'Plan today’s batch';
  $('shop-status').textContent = ended() ? 'THANKS FOR THE MEMORIES' : state.awaitingNext ? 'CLOSED FOR THE DAY' : 'OPEN FOR POSSIBILITIES';
  $('door-label').textContent = ended() || state.awaitingNext ? 'CLOSED' : 'HELLO!';
  $('progress-note').textContent = ended() ? 'One sweet chapter, complete.' : days === 0 ? 'A fresh start. Make it sweet.' : `${30 - days} days of possibility ahead.`;
  const market = game.market(state);
  $('market-title').textContent = market.title;
  $('market-description').textContent = market.description;
  for (const key of ['quantity','price','advertising']) $(key).disabled = state.awaitingNext || ended();
  $('result-title').textContent = last ? `Day ${last.day} results` : 'Today’s results';
  if (last) {
    const fields = [['Cookies sold', `${last.sold} / ${last.quantity}`], ['Revenue', dollars(last.revenue)], ['Expenses', dollars(last.expenses)], ['Daily profit', dollars(last.profit)], ['Cash remaining', dollars(last.cash)], ['Unsold cookies', `${last.quantity - last.sold}`]];
    $('results').innerHTML = `<div class="result-grid">${fields.map(([label, value]) => `<div class="result-item"><span>${label}</span><strong class="${label === 'Daily profit' ? last.profit < 0 ? 'negative' : 'positive' : ''}">${value}</strong></div>`).join('')}</div><p class="result-note">${last.quantity === 0 ? 'The oven stayed off today. Advertising and shop overhead still apply.' : last.sold === last.quantity ? 'Sold out! A bigger batch might help you meet tomorrow’s demand.' : `${last.quantity - last.sold} cookies went unsold. Try a smaller batch, a lower price, or a little more advertising.`}</p><button id="next-day" class="${state.awaitingNext || ended() ? 'primary-button' : 'secondary-button'} next-button">${ended() ? 'See your shop summary →' : state.awaitingNext ? `Plan day ${days + 1} →` : 'Ready for a fresh batch above ↑'}</button>`;
    $('next-day').disabled = serving || (!state.awaitingNext && !ended());
    $('next-day').onclick = () => { if (ended()) return finish(); state.awaitingNext = false; save(); render(); $('quantity').focus(); };
  }
  $('ledger-count').textContent = `${days} ${days === 1 ? 'day' : 'days'} in the books`;
  if (last) $('ledger').innerHTML = [...state.history].reverse().map(r => `<tr><td>Day ${String(r.day).padStart(2, '0')}</td><td>${r.quantity} / ${r.sold}</td><td>${dollars(r.price)}</td><td>${dollars(r.revenue)}</td><td>${dollars(r.expenses)}</td><td class="${r.profit < 0 ? 'negative' : 'positive'}">${r.profit > 0 ? '+' : ''}${dollars(r.profit)}</td><td>${dollars(r.cash)}</td></tr>`).join('');
  updatePlan();
}
function finish() {
  $('finish-title').textContent = state.history.length >= 30 ? 'Thirty days. One sweet story.' : 'Time for a fresh beginning.';
  $('finish-description').textContent = state.history.length >= 30 ? `You turned $100 into ${dollars(state.cash)}. ${state.cash > 100 ? 'Your neighborhood cookie shop made a profit. Nicely baked!' : 'Every batch taught you something. Bring that experience to your next shop.'}` : `Your cash is below the $5 needed to open the shop. Your run ends after ${state.history.length} ${state.history.length === 1 ? 'day' : 'days'}. Try a smaller batch and keep an eye on demand next time.`;
  $('finish-stats').innerHTML = `<span>FINAL CASH<strong>${dollars(state.cash)}</strong></span><span>TOTAL PROFIT<strong>${dollars(state.cash - 100)}</strong></span><span>COOKIES SOLD<strong>${state.history.reduce((n,r) => n + r.sold, 0)}</strong></span>`;
  if (!$('finish-dialog').open) $('finish-dialog').showModal();
}
function reset() { state = game.initialState(); save(); location.reload(); }
function completeCustomers() {
  customerTimers.forEach(clearTimeout);
  customerTimers = [];
  serving = false;
  $('customer-layer').replaceChildren();
  $('skip-customers').hidden = true;
  const last = state.history.at(-1);
  $('customer-count').textContent = `${last.sold} cookies sold · ${dollars(last.revenue)} earned`;
  render();
  if (ended()) finish();
}
function animateCustomers(result) {
  serving = true;
  render();
  $('shop-status').textContent = 'FRESH COOKIES, HAPPY CUSTOMERS';
  $('door-label').textContent = 'OPEN';
  $('bake').innerHTML = 'Serving happy customers <span>🍪</span>';
  $('customer-strip').hidden = false;
  $('customer-count').textContent = `0 / ${result.sold} cookies sold`;
  $('skip-customers').hidden = false;
  const scene = document.querySelector('.shop-scene');
  scene.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  if (!result.sold) {
    $('customer-count').textContent = 'A quiet day — no cookie sales today.';
    completeCustomers();
    $('customer-count').textContent = 'A quiet day — no cookie sales today.';
    return;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return completeCustomers();
  const count = Math.min(24, Math.ceil(result.sold / 5));
  const shirts = ['#b96e51', '#587f9b', '#e3af59', '#7b8d62', '#a57d9b'];
  const skins = ['#e8b88d', '#b77a51', '#f3d0a7', '#8b583e'];
  let purchased = 0;
  for (let i = 0; i < count; i++) {
    const quantity = Math.floor(result.sold / count) + (i < result.sold % count ? 1 : 0);
    const delay = i * 210;
    const customer = document.createElement('div');
    customer.className = 'customer';
    customer.style.setProperty('--arrival-delay', `${delay}ms`);
    customer.style.setProperty('--shirt', shirts[i % shirts.length]);
    customer.style.setProperty('--skin', skins[i % skins.length]);
    customer.innerHTML = `<span class="purchase-pop">🍪 ×${quantity}<small>${dollars(quantity * result.price)}</small></span><div class="customer-person"><svg viewBox="0 0 38 60" aria-hidden="true"><ellipse cx="19" cy="57" rx="15" ry="3" fill="#193e351c"/><path class="customer-leg leg-a" d="M15 40 12 55"/><path class="customer-leg leg-b" d="M23 40 26 55"/><path d="M10 28 6 41M28 28 32 39" stroke="var(--skin)" stroke-width="5" stroke-linecap="round"/><path d="M10 27 Q19 22 28 27 L27 43H11Z" fill="var(--shirt)"/><circle cx="19" cy="15" r="10" fill="var(--skin)"/><path d="M9 14Q8 2 20 4Q30 4 29 13L24 10 14 10Z" fill="#514034"/><g fill="#473c32"><circle cx="16" cy="15" r="1"/><circle cx="23" cy="15" r="1"/></g><path d="M17 20Q20 23 23 19" fill="none" stroke="#744d39" stroke-width="1.3" stroke-linecap="round"/></svg><span class="customer-bag">🍪</span></div>`;
    $('customer-layer').append(customer);
    customerTimers.push(setTimeout(() => {
      purchased += quantity;
      $('customer-count').textContent = `${purchased} / ${result.sold} cookies sold · ${dollars(game.money(purchased * result.price))}`;
    }, delay + 1450));
  }
  customerTimers.push(setTimeout(completeCustomers, (count - 1) * 210 + 3700));
}
$('plan-form').addEventListener('submit', event => { event.preventDefault(); if (serving) return; try { state = game.runDay(state, plan()); save(); animateCustomers(state.history.at(-1)); } catch (error) { $('form-error').textContent = error.message; } });
$('skip-customers').onclick = completeCustomers;
for (const key of ['quantity','price','advertising']) $(key).addEventListener('input', updatePlan);
$('restart').onclick = () => $('reset-dialog').showModal();
$('shop-home').onclick = () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
$('cancel-reset').onclick = () => $('reset-dialog').close();
$('confirm-reset').onclick = reset;
$('play-again').onclick = reset;
$('view-ledger').onclick = () => { $('finish-dialog').close(); document.querySelector('.history-panel').scrollIntoView({ behavior: 'smooth' }); };
fillInputs(); render(); save();
if (ended()) finish();
