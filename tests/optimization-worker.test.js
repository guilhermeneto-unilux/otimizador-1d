const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('modules/optimization-worker.js', 'utf8');
const context = vm.createContext({
  console,
  Date,
  self: { postMessage() {} }
});
vm.runInContext(source, context);

const pieces = (sku, dimensions) => dimensions.map((dim, index) => ({
  pieceId: `${sku}-${index + 1}`,
  op: `OP-${sku}-${index + 1}`,
  sku,
  dim
}));

function solve(skus) {
  return context.solveOptimization({
    timeoutMs: 30000,
    cfgTrim: 50,
    skus,
    fallbackPlans: []
  });
}

const dilutionRegression = solve([
  {
    code: 'TARGET',
    minSobra: 1230,
    pieces: pieces('TARGET', [1692, 1660, 1660, 1452, 1172, 1172]),
    scraps: [],
    virginBars: [{ dim: 6000, qty: 100 }]
  },
  {
    // Este SKU tem refugo inevitável. O algoritmo antigo abria quatro barras
    // extras em TARGET para diluir esse refugo na razão global de eficiência.
    code: 'OTHER',
    minSobra: 4000,
    pieces: pieces('OTHER', [3000]),
    scraps: [],
    virginBars: [{ dim: 6000, qty: 100 }]
  }
]);

assert.equal(dilutionRegression.optimal, true);
assert.equal(dilutionRegression.global.totalBins, 3, 'o plano global deve abrir duas barras para TARGET e uma para OTHER');
const targetPlans = dilutionRegression.global.plans.filter(plan => plan.sku === 'TARGET');
assert.equal(targetPlans.length, 2, 'as seis peças reais devem ser compactadas em duas barras');
assert.deepEqual(
  [...targetPlans.map(plan => plan.pcs.length)].sort((a, b) => a - b),
  [3, 3],
  'cada barra deve agrupar três peças'
);

const strategyRegression = solve([{
  code: 'SCRAP',
  minSobra: 1000,
  pieces: pieces('SCRAP', [1000, 1000]),
  scraps: [
    { id: 'S1', medida: 4000, endereco: 'A-01' },
    { id: 'S2', medida: 4000, endereco: 'A-02' }
  ],
  virginBars: [{ dim: 6000, qty: 100 }]
}]);

assert.equal(strategyRegression.global.scrapBars, 1, 'o plano global deve compactar as duas peças em um único retalho');
// Com a correção do bug, a estratégia forçada também deve ser inteligente e compactar as peças
// ao invés de abrir uma sobra separada para cada peça
assert.equal(strategyRegression.forced.scrapBars, 1, 'a estratégia forçada também deve compactar as peças no mesmo retalho');

const optimizerSource = fs.readFileSync('modules/otimizador.js', 'utf8');
const optimizerContext = vm.createContext({
  console,
  Date,
  Intl,
  appState: {
    skus: [{ code: 'TARGET', min_sobra: 1230 }]
  },
  _calculatePlanFinancials() {
    return { piecesValue: 0, discardValue: 0, unpricedSkuCount: 0 };
  }
});
vm.runInContext(optimizerSource, optimizerContext);

optimizerContext.fragmentedPlans = [1692, 1660, 1660, 1452, 1172, 1172].map((dim, index) => ({
  type: 'virgin',
  srcId: 'TARGET|6000',
  len: 5950,
  usable: 5900,
  sku: 'TARGET',
  pcs: [{ pieceId: `fragmented-${index}`, sku: 'TARGET', dim }],
  rem: 5900 - dim
}));
optimizerContext.compactPlans = targetPlans;

const fragmentedMetrics = vm.runInContext('_otimPlanMetrics(fragmentedPlans, 50)', optimizerContext);
assert.ok(
  Math.abs(fragmentedMetrics.efficiencyValue - (8808 / (6 * 5950))) < 1e-12,
  'ocupação deve considerar somente peças cortadas, sem fingir que sobras já são produto'
);
assert.equal(
  vm.runInContext("_compareOtimResultsGlobal({ plans: compactPlans, cfgTrim: 50 }, { plans: fragmentedPlans, cfgTrim: 50 })", optimizerContext) < 0,
  true,
  'a proteção da interface também deve preferir o plano compactado'
);

console.log('optimization-worker.test.js: ok');
