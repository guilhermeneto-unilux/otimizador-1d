const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('modules/optimization-worker.js', 'utf8');
const context = vm.createContext({ console, Date, self: { postMessage() {} } });
vm.runInContext(source, context);
const pieces = (sku, dimensions) => dimensions.map((dim, index) => ({ pieceId: `${sku}-${index + 1}`, op: `OP-${sku}-${index + 1}`, sku, dim }));
function solve(skus) { return context.solveOptimization({ timeoutMs: 30000, cfgTrim: 50, skus, fallbackPlans: [] }); }
const strategyRegression = solve([{
  code: 'SCRAP',
  minSobra: 1000,
  pieces: pieces('SCRAP', [3000, 3000]),
  scraps: [
    { id: 'S1', medida: 4000, endereco: 'A-01' },
    { id: 'S2', medida: 4000, endereco: 'A-02' }
  ],
  virginBars: [{ dim: 6000, qty: 100 }]
}]);
console.log('GLOBAL:', JSON.stringify(strategyRegression.global, null, 2));
console.log('FORCED:', JSON.stringify(strategyRegression.forced, null, 2));
