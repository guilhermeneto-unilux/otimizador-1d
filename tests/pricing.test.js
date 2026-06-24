const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('modules/pricing.js', 'utf8');
const context = vm.createContext({
  console,
  Intl,
  Date,
  appState: {
    comprasConfig: {
      skus: {
        A: { pricePerMeter: 10 },
        B: { pricePerMeter: 20 }
      }
    },
    skus: [
      { code: 'A', min_sobra: 1000, dims: [{ dim: 6000, qty: 2 }] },
      { code: 'B', min_sobra: 1000, dims: [{ dim: 3000, qty: 1 }] }
    ],
    sobras: [
      { sku: 'A', medida: 1500 },
      { sku: 'B', medida: 500 }
    ]
  }
});
vm.runInContext(source, context);

const evaluate = expression => vm.runInContext(expression, context);

assert.equal(evaluate("skuPricePerMeter('a')"), 10, 'consulta de preço deve ignorar maiúsculas/minúsculas');

const descriptionSuggestion = evaluate(`_pricingSuggestionFromDescription(
  'Perfil Tubo 32mm Cru (PM-5229-REI707) {1kg.=3,10} PCT42M q.a.f.l unx F0174'
)`);
assert.equal(descriptionSuggestion.metersPerKg, 3.1);
assert.equal(descriptionSuggestion.costPerKg, 34.74);
assert.ok(Math.abs(descriptionSuggestion.pricePerMeter - (34.74 / 3.1)) < 1e-12);
assert.equal(
  evaluate("_pricingSuggestionFromDescription('Perfil aço 70mm 1kg.= 06/24 PCT120f')"),
  null,
  'data após fator vazio não pode ser interpretada como metros por kg'
);
assert.equal(
  evaluate("_pricingMetersPerKgFromDescription('Perfil Guia Preto (1kg 1,28m)')"),
  1.28,
  'fator sem sinal de igual também deve ser reconhecido quando possui unidade'
);

const weightedAverage = evaluate(`_pricingPurchaseAverage({
  currentPricePerMeter: 10,
  currentStockMm: 100000,
  incomingLengthMm: 20000,
  incomingTotalValue: 400
})`);
assert.ok(Math.abs(weightedAverage.newPricePerMeter - (1400 / 120)) < 1e-12);
assert.equal(weightedAverage.entryPricePerMeter, 20);

const initializedAverage = evaluate(`_pricingPurchaseAverage({
  currentPricePerMeter: 0,
  currentStockMm: 100000,
  incomingLengthMm: 20000,
  incomingTotalValue: 400
})`);
assert.equal(initializedAverage.newPricePerMeter, 20);
assert.equal(initializedAverage.initializedUnpricedStock, true);

const financials = evaluate(`_calculatePlanFinancials([
  { sku: 'A', len: 6000, rem: 1900, pcs: [{ dim: 4000 }] },
  { sku: 'B', len: 3000, rem: 400, pcs: [{ dim: 2500 }] }
], 100)`);
assert.equal(financials.sourceValue, 120);
assert.equal(financials.piecesValue, 90);
assert.equal(financials.generatedScrapValue, 19);
assert.equal(financials.discardValue, 11);
assert.equal(financials.discardMm, 600);
assert.equal(financials.unpricedSkuCount, 0);

const snapshotted = evaluate(`_calculatePlanFinancials([
  { sku: 'A', len: 6000, rem: 1900, pcs: [{ dim: 4000 }] }
], 100, { A: { pricePerMeter: 10, minScrap: 2000 } })`);
assert.equal(snapshotted.discardMm, 2000, 'limite histórico da sobra deve ser respeitado');
assert.equal(snapshotted.discardValue, 20, 'preço histórico deve ser respeitado');
assert.equal(evaluate("skuPricePerMeter('A', { A: { pricePerMeter: 0 } })"), 0, 'preço pendente também deve permanecer congelado no histórico');

const inventory = evaluate('_currentInventoryFinancials()');
assert.equal(inventory.virginValue, 180);
assert.equal(inventory.scrapValue, 25);
assert.equal(inventory.unpricedSkuCount, 0);

const persisted = evaluate(`_financialsForStoredPlan({
  mapa: [],
  financials: { discardValue: 123.45, piecesValue: 999 }
})`);
assert.equal(persisted.discardValue, 123.45, 'plano aprovado deve usar o valor financeiro congelado');
assert.equal(persisted.piecesValue, 999);

console.log('pricing.test.js: ok');
