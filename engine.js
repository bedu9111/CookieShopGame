(function (root) {
  'use strict';
  const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const markets = [
    { title: 'A lovely day for cookies', description: 'Steady foot traffic and a neighborhood with a sweet tooth.', factor: 1 },
    { title: 'Rain calls for comfort food', description: 'A rainy afternoon means fewer people strolling past the shop.', factor: 0.8 },
    { title: 'The neighborhood is buzzing', description: 'A local market brings a few extra hungry faces to your door.', factor: 1.25 },
    { title: 'A quiet day on the block', description: 'It’s a slower day. A modest batch could be a smart move.', factor: 0.9 },
    { title: 'A little weekend magic', description: 'Families are out and about, looking for something sweet.', factor: 1.15 }
  ];
  function initialState() { return { version: 1, seed: Math.floor(Math.random() * 1000000), cash: 100, history: [], awaitingNext: false, plan: { quantity: 60, price: 2, advertising: 10 } }; }
  function market(state) { const dayIndex = Math.max(0, state.history.length - (state.awaitingNext ? 1 : 0)); return markets[dayIndex === 0 ? 0 : (dayIndex * 7 + state.seed) % markets.length]; }
  function cost(plan) { return money(plan.quantity * 0.5 + plan.advertising + 5); }
  function demand(state, plan) { return Math.max(0, Math.round((90 * Math.exp(-0.65 * (plan.price - 1)) + 7 * Math.sqrt(plan.advertising)) * market(state).factor)); }
  function validate(state, plan) {
    if (state.history.length >= 30 || state.cash < 5) return 'This run is complete. Start a fresh game to keep baking.';
    if (state.awaitingNext) return 'Continue to the next day before opening the shop.';
    if (!Number.isInteger(plan.quantity) || plan.quantity < 0 || plan.quantity > 1000) return 'Bake between 0 and 1,000 whole cookies.';
    if (!Number.isFinite(plan.price) || plan.price < 0.25 || plan.price > 10) return 'Set a price between $0.25 and $10.00.';
    if (!Number.isInteger(plan.advertising) || plan.advertising < 0 || plan.advertising > 1000) return 'Choose a whole-dollar advertising budget from $0 to $1,000.';
    if (cost(plan) > state.cash) return 'This batch is over budget. Reduce your cookies or advertising.';
    return '';
  }
  function runDay(state, plan) {
    const error = validate(state, plan); if (error) throw new Error(error);
    const day = state.history.length + 1;
    const noise = 0.8 + (((state.seed + day * 7919) * 48271) % 2147483647) / 2147483647 * 0.4;
    const sold = Math.min(plan.quantity, Math.round(demand(state, plan) * noise));
    const expenses = cost(plan), revenue = money(sold * plan.price), profit = money(revenue - expenses), cash = money(state.cash + profit);
    const result = { day, ...plan, sold, expenses, revenue, profit, cash };
    return { ...state, cash, plan: { ...plan }, history: [...state.history, result], awaitingNext: true };
  }
  const api = { initialState, market, cost, demand, validate, runDay, money };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CookieGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
