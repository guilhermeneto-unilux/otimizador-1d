/* ===== BARRAS – UNILUX 1D ===== */

function renderBarras() {
  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">${appState.barras.length} lote(s) cadastrado(s)</div>
        <h1 class="pg-title">Barras</h1>
      </div>
      <div class="pg-actions">
        <button class="btn btn-green" onclick="_novaBarraModal()">+ Novo Lote</button>
      </div>
    </div>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Lote</th><th>SKU</th><th>Dimensão</th><th>Em Estoque</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>${_barrasRows()}</tbody>
      </table>
    </div>
  `;
}

function _barrasRows() {
  if (!appState.barras.length) {
    return `<tr><td colspan="6" class="tbl-empty">Nenhuma barra cadastrada.<br><button class="btn btn-dark btn-sm" style="margin-top:12px;" onclick="_novaBarraModal()">+ Novo Lote</button></td></tr>`;
  }
  return appState.barras.map(b => {
    const c = skuColor(b.sku);
    const statusClass = b.qty === 0 ? 'badge-done' : b.qty <= 5 ? 'badge-pending' : 'badge-approved';
    const statusTxt   = b.qty === 0 ? 'Esgotado'  : b.qty <= 5 ? 'Crítico'       : 'OK';
    return `
    <tr>
      <td class="fw-700">${b.lote}</td>
      <td><span class="sku-tag" style="background:${c.bg};color:${c.text};">${b.sku}</span></td>
      <td class="fw-700">${b.dim} mm</td>
      <td class="fw-700">${b.qty}</td>
      <td><span class="status-badge ${statusClass}">${statusTxt}</span></td>
      <td style="text-align:right;">
        <button class="btn btn-ghost btn-sm" onclick="_editarBarra('${b.id}')">Editar</button>
        <button class="btn btn-ghost btn-sm text-red" onclick="_deletarBarra('${b.id}')">Remover</button>
      </td>
    </tr>`;
  }).join('');
}

function _novaBarraModal() {
  const skuOpts = appState.skus.map(s => `<option value="${s.code}">${s.code} – ${s.desc} (${s.dim}mm)</option>`).join('');
  openModal('Novo Lote de Barras', `
    <div class="form-group">
      <label class="form-label">SKU / Material</label>
      <select class="form-control" id="brSku">${skuOpts}</select>
    </div>
    <div class="form-row">
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Código do Lote</label>
        <input class="form-control" type="text" id="brLote" placeholder="ex: LF-2026-05">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Quantidade</label>
        <input class="form-control" type="number" id="brQty" value="10" min="1">
      </div>
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" onclick="_salvarBarra()">Salvar</button>
  `);
}

function _salvarBarra() {
  const sku  = document.getElementById('brSku').value;
  const lote = document.getElementById('brLote').value || `LF-${Date.now()}`;
  const qty  = parseInt(document.getElementById('brQty').value);
  const skuObj = appState.skus.find(s => s.code === sku);
  const dim  = skuObj ? skuObj.dim : 6000;
  const id   = `B${String(appState.barras.length + 1).padStart(3,'0')}`;
  const newBarra = { id, sku, lote, dim, qty, status: qty > 5 ? 'active' : 'low' };
  appState.barras.push(newBarra);
  DB.saveBarra(newBarra);
  closeModal();
  showToast('Lote de barras adicionado!', 'success');
  renderBarras();
}

function _editarBarra(id) {
  const b = appState.barras.find(x => x.id === id);
  if (!b) return;
  openModal('Editar Estoque', `
    <div class="form-group">
      <label class="form-label">Quantidade em Estoque</label>
      <input class="form-control" type="number" id="brEditQty" value="${b.qty}" min="0">
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" onclick="_saveEditBarra('${id}')">Salvar</button>
  `);
}

function _saveEditBarra(id) {
  const b = appState.barras.find(x => x.id === id);
  if (b) { b.qty = parseInt(document.getElementById('brEditQty').value); DB.saveBarra(b); }
  closeModal(); showToast('Estoque atualizado!', 'success'); renderBarras();
}

function _deletarBarra(id) {
  appState.barras = appState.barras.filter(x => x.id !== id);
  DB.deleteBarra(id); showToast('Lote removido.', 'info'); renderBarras();
}
