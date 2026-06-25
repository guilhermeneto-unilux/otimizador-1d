const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({
  appState: { currentUser: null },
  document: {
    body: {
      classList: { toggle() {} },
      dataset: {},
      removeAttribute() {}
    },
    querySelectorAll() { return []; }
  },
  showToast() {}
});

vm.runInContext(fs.readFileSync('modules/permissions.js', 'utf8'), context);

const evaluate = expression => vm.runInContext(expression, context);

assert.equal(evaluate("userCanRoute('dashboard')"), false, 'sem usuário logado não deve liberar rotas');
assert.equal(evaluate("normalizeUserRole('operador')"), 'pcp', 'operador legado deve virar pcp');
assert.equal(evaluate("roleLabel('operador')"), 'PCP');

context.appState.currentUser = { role: 'pcp' };
assert.equal(evaluate("userCan('orders:write')"), true);
assert.equal(evaluate("userCan('compras:entry')"), false);
assert.equal(evaluate("userCanRoute('compras')"), true, 'PCP pode consultar compras');
assert.equal(evaluate("userCanRoute('otimizador')"), true);

context.appState.currentUser = { role: 'compras' };
assert.equal(evaluate("userCan('compras:entry')"), true);
assert.equal(evaluate("userCan('compras:config')"), true);
assert.equal(evaluate("userCan('orders:write')"), false);
assert.equal(evaluate("userCanRoute('ordens')"), false);
assert.equal(evaluate("userCanRoute('compras')"), true);

context.appState.currentUser = { role: 'consulta' };
assert.equal(evaluate("userCanRoute('ordens')"), true);
assert.equal(evaluate("userCanRoute('otimizador')"), false);
assert.equal(evaluate("userCan('scraps:write')"), false);
assert.equal(evaluate("userCan('compras:entry')"), false);

context.appState.currentUser = { role: 'admin' };
assert.equal(evaluate("userCan('users:manage')"), true);
assert.equal(evaluate("userCan('skus:manage')"), true);
assert.equal(evaluate("userCanRoute('auditoria')"), true);

console.log('permissions.test.js: ok');
