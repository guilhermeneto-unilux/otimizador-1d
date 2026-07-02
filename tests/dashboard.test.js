const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({
  console,
  Date,
  Intl,
  appState: {
    skus: [
      { code: 'SKU-A', short_desc: 'Perfil teste', min_sobra: 200000 },
      { code: 'SKU-B', short_desc: 'Base Shadow Branco', min_sobra: 1000 }
    ],
    planos: [],
    sobras: [],
    configs: {},
    comprasConfig: { skus: {} }
  },
  formatDate(value) { return value; },
  fmtM(value) { return `${value}mm`; },
  fmtBRLCompact(value) { return `R$${value}`; },
  skuColor() { return { bg: '#fff', text: '#111' }; },
  userCan() { return true; },
  requirePermission() { return true; },
  showToast() {}
});

vm.runInContext(fs.readFileSync('modules/dashboard.js', 'utf8'), context);

const weightedMetric = vm.runInContext(`_metricFromBins([
  { sku: 'SKU-A', type: 'virgin', len: 1000000, rem: 100000, pcs: [{ dim: 900000 }] },
  { sku: 'SKU-A', type: 'virgin', len: 50000, rem: 2500, pcs: [{ dim: 47500 }] }
])`, context);

assert.ok(
  Math.abs(weightedMetric.realEfficiency - (947500 / 1050000) * 100) < 1e-12,
  'ocupação real deve ser ponderada pela metragem aberta, não pela média simples dos percentuais'
);
assert.ok(
  Math.abs(weightedMetric.discardPct - (102500 / 1050000) * 100) < 1e-12,
  'desperdício deve ser ponderado pela metragem aberta'
);

vm.runInContext("appState.skus[0].min_sobra = 1000", context);
const usefulScrapMetric = vm.runInContext(`_metricFromBins([
  { sku: 'SKU-A', type: 'virgin', len: 6000, rem: 2000, pcs: [{ dim: 4000 }] }
])`, context);

assert.equal(usefulScrapMetric.realEfficiency, (4000 / 6000) * 100);
assert.equal(usefulScrapMetric.efficiency, 100);
assert.equal(usefulScrapMetric.generatedPct, (2000 / 6000) * 100);

assert.equal(vm.runInContext("_dashboardSkuFromInput('SKU-B - Base Shadow Branco')", context), 'SKU-B');
assert.equal(vm.runInContext("_dashboardSkuFromInput('base*shadow')", context), 'SKU-B');
assert.equal(vm.runInContext("_dashboardSkuSearchMatches('perfil').length", context), 1);

console.log('dashboard.test.js: ok');
