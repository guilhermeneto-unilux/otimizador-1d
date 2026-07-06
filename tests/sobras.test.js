const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const fields = {};
const context = vm.createContext({
  console,
  Date,
  Intl,
  appState: {
    skus: [
      {
        code: '001.008.002.000.5 - 1740LIGA-6069',
        desc: 'Perfil Tubo 38mm Box 90 Cor Cru UNX (PM-1740) {1kg.=1,918ml} PCT60M',
        short_desc: 'Tubo 38mm Box 90 Cru'
      },
      {
        code: '001.008.002.000.12',
        desc: 'Perfil teste comum',
        short_desc: 'Perfil teste'
      }
    ],
    sobras: [],
    filters: {}
  },
  document: {
    addEventListener() {},
    getElementById(id) { return fields[id] || null; },
    querySelectorAll() { return []; },
    querySelector() { return null; }
  },
  userCan() { return true; },
  requirePermission() { return true; },
  fmtM(mm) { return `${mm}mm`; },
  skuColor() { return { bg: '#fff', text: '#111' }; },
  showToast() {},
  closeModal() {},
  renderSobras() {},
  updateBadges() {},
  openModal() {},
  _uiEsc(value) { return String(value ?? ''); },
  _uiEscAttr(value) { return String(value ?? ''); }
});

vm.runInContext(fs.readFileSync('modules/sobras.js', 'utf8'), context);

const fullLabel = '001.008.002.000.5 - 1740LIGA-6069 - Perfil Tubo 38mm Box 90 Cor Cru UNX (PM-1740) {1kg.=1,918ml} PCT60M';
assert.equal(
  vm.runInContext(`_findSobraSkuFromInput(${JSON.stringify(fullLabel)}).code`, context),
  '001.008.002.000.5 - 1740LIGA-6069',
  'SKU com separador " - " dentro do código deve ser reconhecido pelo prefixo completo'
);

assert.equal(
  vm.runInContext("_findSobraSkuFromInput('tubo*90*cru').code", context),
  '001.008.002.000.5 - 1740LIGA-6069',
  'busca com coringa deve localizar SKU único por descrição'
);

fields.soSkuCode = { value: '001.008.002.000.5 - 1740LIGA-6069' };
assert.equal(
  vm.runInContext("_findSobraSkuFromInput('texto editado no campo').code", context),
  '001.008.002.000.5 - 1740LIGA-6069',
  'código oculto selecionado deve prevalecer sobre o texto exibido'
);

console.log('sobras.test.js: ok');
