/* ===== CATÁLOGO SKUs – UNILUX 1D ===== */

function renderSkus() {
  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">${appState.skus.length} SKU(s) cadastrado(s)</div>
        <h1 class="pg-title">Catálogo SKUs</h1>
      </div>
      <div class="pg-actions">
        <button class="btn btn-green" onclick="_novoSkuModal()">+ Novo SKU</button>
      </div>
    </div>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr><th>Código</th><th>Descrição</th><th>Dim. Padrão</th><th>Barras</th><th>Sobras</th><th></th></tr>
        </thead>
        <tbody>${_skusRows()}</tbody>
      </table>
    </div>
  `;
}

function _skusRows() {
  if (!appState.skus.length) {
    return `<tr><td colspan="6" class="tbl-empty">Nenhum SKU cadastrado.</td></tr>`;
  }
  return appState.skus.map(s => {
    const c      = skuColor(s.code);
    const nBars  = appState.barras.filter(b => b.sku === s.code).reduce((acc, b) => acc + b.qty, 0);
    const nSobras= appState.sobras.filter(x => x.sku === s.code).length;
    return `
    <tr>
      <td><span class="sku-tag" style="background:${c.bg};color:${c.text};">${s.code}</span></td>
      <td style="color:var(--text-700);">${s.desc}</td>
      <td class="fw-700">${s.dim} mm</td>
      <td style="color:var(--text-400);">${nBars} un</td>
      <td style="color:var(--text-400);">${nSobras} retalho(s)</td>
      <td style="text-align:right;">
        <button class="btn btn-ghost btn-sm" onclick="_editSkuModal('${s.id}')">Editar</button>
        <button class="btn btn-ghost btn-sm text-red" onclick="_deleteSku('${s.id}')">Remover</button>
      </td>
    </tr>`;
  }).join('');
}

function _novoSkuModal() {
  openModal('Novo SKU', `
    <div class="form-group">
      <label class="form-label">Código</label>
      <input class="form-control" type="text" id="skCode" placeholder="ex: PER-40X40">
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <input class="form-control" type="text" id="skDesc" placeholder="ex: Perfil Quadrado 40×40mm">
    </div>
    <div class="form-group">
      <label class="form-label">Dimensão Padrão da Barra (mm)</label>
      <input class="form-control" type="number" id="skDim" placeholder="ex: 6000">
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" onclick="_salvarSku()">Salvar SKU</button>
  `);
}

function _salvarSku() {
  const code = document.getElementById('skCode').value.toUpperCase().trim();
  const desc = document.getElementById('skDesc').value.trim();
  const dim  = parseInt(document.getElementById('skDim').value);
  if (!code || !dim) { showToast('Preencha código e dimensão!', 'error'); return; }
  if (appState.skus.find(s => s.code === code)) { showToast('SKU já existe!', 'error'); return; }
  const id = `S${String(appState.skus.length + 1).padStart(2,'0')}`;
  DB.saveSku({ id, code, desc, dim });
  closeModal(); showToast(`SKU ${code} criado!`, 'success'); renderSkus();
}

function _editSkuModal(id) {
  const s = appState.skus.find(x => x.id === id);
  if (!s) return;
  openModal('Editar SKU', `
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <input class="form-control" type="text" id="skEditDesc" value="${s.desc}">
    </div>
    <div class="form-group">
      <label class="form-label">Dimensão Padrão (mm)</label>
      <input class="form-control" type="number" id="skEditDim" value="${s.dim}">
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" onclick="_saveEditSku('${id}')">Salvar</button>
  `);
}

function _saveEditSku(id) {
  const s = appState.skus.find(x => x.id === id);
  if (s) {
    s.desc = document.getElementById('skEditDesc').value;
    s.dim  = parseInt(document.getElementById('skEditDim').value);
    DB.save();
  }
  closeModal(); showToast('SKU atualizado!', 'success'); renderSkus();
}

function _deleteSku(id) {
  appState.skus = appState.skus.filter(x => x.id !== id);
  DB.save(); showToast('SKU removido.', 'info'); renderSkus();
}
