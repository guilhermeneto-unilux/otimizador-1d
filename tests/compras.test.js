const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const fields = {
  entradaSkuSelect: { value: 'SKU-1' },
  entradaComprimento: { value: '6' },
  entradaQuantidade: { value: '2' },
  entradaValorTotal: { value: '240' },
  entradaObs: { value: '' }
};
const events = { toasts: [], savedSkus: 0, savedConfigs: 0, logs: 0 };
const context = vm.createContext({
  console,
  Date,
  Intl,
  JSON,
  appState: {
    skus: [{
      id: '1',
      code: 'SKU-1',
      desc: 'Perfil teste',
      dims: [{ dim: 6000, qty: 10 }],
      min_sobra: 1000
    }],
    comprasConfig: {
      global: {},
      skus: { 'SKU-1': { pricePerMeter: 10 } }
    },
    filters: {},
    ordens: [],
    sobras: [],
    planos: [],
    configs: {},
    currentUser: { role: 'compras' }
  },
  document: {
    getElementById(id) { return fields[id] || null; }
  },
  DB: {
    async saveSku() { events.savedSkus++; },
    async saveComprasConfig() { events.savedConfigs++; },
    async log() { events.logs++; }
  },
  showToast(message, type) { events.toasts.push({ message, type }); },
  closeModal() {},
  renderCompras() {},
  fmtM(mm) { return `${mm}mm`; }
});

vm.runInContext(fs.readFileSync('modules/permissions.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('modules/pricing.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('modules/compras.js', 'utf8'), context);
context.renderCompras = () => {};

async function main() {
  const preview = vm.runInContext('_comprasEntradaCalculation()', context);
  assert.equal(preview.currentMeters, 60);
  assert.equal(preview.incomingMeters, 12);
  assert.equal(preview.entryPricePerMeter, 20);
  assert.ok(Math.abs(preview.newPricePerMeter - (840 / 72)) < 1e-12);

  fields.entradaValorTotal.value = '';
  await vm.runInContext('_saveComprasEntrada()', context);
  assert.equal(events.savedSkus, 0, 'entrada sem valor deve ser bloqueada');
  assert.match(events.toasts.at(-1).message, /valor total/i);

  fields.entradaValorTotal.value = '240';
  await vm.runInContext('_saveComprasEntrada()', context);
  assert.equal(events.savedSkus, 1);
  assert.equal(events.savedConfigs, 1);
  assert.equal(events.logs, 1);
  assert.equal(JSON.stringify(context.appState.skus[0].dims), JSON.stringify([{ dim: 6000, qty: 12 }]));
  assert.ok(Math.abs(context.appState.comprasConfig.skus['SKU-1'].pricePerMeter - (840 / 72)) < 1e-12);
  assert.equal(context.appState.comprasConfig.skus['SKU-1'].priceSource.method, 'entrada-media-ponderada');

  console.log('compras.test.js: ok');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
