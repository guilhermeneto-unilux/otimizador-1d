/* ===== MODULE: CATÁLOGO SKUs ===== */

function renderSkus() {
  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Catálogo de SKUs</h1>
        <p class="page-subtitle">Master data de perfis – apenas SKUs cadastrados podem ser usados no sistema</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="_openNovoSkuModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo SKU
        </button>
      </div>
    </div>

    <!-- SUMMARY CARDS -->
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:24px;">
      <div class="kpi-card kpi-accent">
        <span class="kpi-label">SKUs Cadastrados</span>
        <span class="kpi-value">${appState.skus.length}</span>
      </div>
      <div class="kpi-card kpi-green">
        <span class="kpi-label">Com Estoque</span>
        <span class="kpi-value">${appState.skus.filter(s => appState.barras.some(b=>b.sku===s.code)).length}</span>
      </div>
      <div class="kpi-card kpi-yellow">
        <span class="kpi-label">Com Sobras</span>
        <span class="kpi-value">${appState.skus.filter(s => appState.sobras.some(x=>x.sku===s.code)).length}</span>
      </div>
    </div>

    <div class="table-wrapper">
      <div class="table-header">
        <span class="table-title">SKUs Cadastrados</span>
        <div class="table-actions">
          <input class="filter-input" type="text" id="skuSearch" placeholder="Filtrar…" oninput="_filterSkus()"
            style="padding:7px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;">
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Descrição</th><th>Dim. Padrão (mm)</th>
              <th>Estoque (barras)</th><th>Sobras</th><th>Ações</th>
            </tr>
          </thead>
          <tbody id="tbodySkus">
            ${_renderSkuRows(appState.skus)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function _renderSkuRows(skus) {
  if (!skus.length) return `<tr><td colspan="6"><div class="table-empty">Nenhum SKU cadastrado</div></td></tr>`;
  return skus.map(s => {
    const c = skuColor(s.code);
    const barrasQty = appState.barras.filter(b=>b.sku===s.code).reduce((sum,b)=>sum+b.qty,0);
    const sobrasQty = appState.sobras.filter(x=>x.sku===s.code).length;
    return `
      <tr>
        <td>
          <span style="background:${c.bg};color:${c.text};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">${s.code}</span>
        </td>
        <td>${s.desc}</td>
        <td class="font-600">${s.dim.toLocaleString('pt-BR')} mm</td>
        <td>
          ${barrasQty > 0
            ? `<span class="status-pill status-active">${barrasQty} barras</span>`
            : `<span class="status-pill status-done">Sem estoque</span>`}
        </td>
        <td>
          ${sobrasQty > 0
            ? `<span class="status-pill status-pending">${sobrasQty} sobras</span>`
            : `<span class="text-muted">—</span>`}
        </td>
        <td>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="_editSku('${s.id}')">Editar</button>
            <button class="btn btn-ghost btn-sm" onclick="_deleteSku('${s.id}')" style="color:var(--red);">Excluir</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function _filterSkus() {
  const q = document.getElementById('skuSearch').value.toLowerCase();
  const f = appState.skus.filter(s => s.code.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
  document.getElementById('tbodySkus').innerHTML = _renderSkuRows(f);
}

function _openNovoSkuModal() {
  openModal('Cadastrar Novo SKU', `
    <div class="form-group">
      <label class="form-label">Código *</label>
      <input class="form-input" type="text" id="novoSkuCod" placeholder="ex: PER-60X60">
    </div>
    <div class="form-group">
      <label class="form-label">Descrição *</label>
      <input class="form-input" type="text" id="novoSkuDesc" placeholder="ex: Perfil Quadrado 60×60mm">
    </div>
    <div class="form-group">
      <label class="form-label">Dimensão Padrão (mm) *</label>
      <input class="form-input" type="number" id="novoSkuDim" value="6000" min="1">
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_salvarNovoSku()">Cadastrar</button>
  `);
}

function _salvarNovoSku() {
  const code = document.getElementById('novoSkuCod').value.trim().toUpperCase();
  const desc = document.getElementById('novoSkuDesc').value.trim();
  const dim  = parseInt(document.getElementById('novoSkuDim').value);
  if (!code || !desc || !dim) { showToast('Preencha todos os campos!', 'error'); return; }
  if (appState.skus.find(s => s.code === code)) { showToast('Código já existe!', 'error'); return; }
  const id = `S${String(appState.skus.length + 1).padStart(2,'0')}`;
  appState.skus.push({ id, code, desc, dim });
  closeModal();
  showToast(`SKU ${code} cadastrado com sucesso!`, 'success');
  renderSkus();
}

function _editSku(id) {
  const s = appState.skus.find(x => x.id === id);
  if (!s) return;
  openModal(`Editar SKU – ${s.code}`, `
    <div class="form-group">
      <label class="form-label">Código</label>
      <input class="form-input" type="text" id="editSkuCod" value="${s.code}">
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <input class="form-input" type="text" id="editSkuDesc" value="${s.desc}">
    </div>
    <div class="form-group">
      <label class="form-label">Dimensão Padrão (mm)</label>
      <input class="form-input" type="number" id="editSkuDim" value="${s.dim}">
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_saveEditSku('${id}')">Salvar</button>
  `);
}

function _saveEditSku(id) {
  const s = appState.skus.find(x => x.id === id);
  if (!s) return;
  s.code = document.getElementById('editSkuCod').value.trim().toUpperCase();
  s.desc = document.getElementById('editSkuDesc').value.trim();
  s.dim  = parseInt(document.getElementById('editSkuDim').value);
  closeModal();
  showToast('SKU atualizado!', 'success');
  renderSkus();
}

function _deleteSku(id) {
  const s = appState.skus.find(x => x.id === id);
  if (!s) return;
  const inUse = appState.barras.some(b=>b.sku===s.code) || appState.ordens.some(o=>o.sku===s.code);
  if (inUse) { showToast(`SKU ${s.code} está em uso e não pode ser excluído!`, 'error'); return; }
  openModal('Confirmar Exclusão', `<p style="font-size:14px;">Tem certeza que deseja excluir o SKU <strong>${s.code}</strong>?<br>Esta ação não pode ser desfeita.</p>`, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-danger" onclick="_confirmDeleteSku('${id}')">Excluir</button>
  `);
}

function _confirmDeleteSku(id) {
  const idx = appState.skus.findIndex(x => x.id === id);
  if (idx !== -1) appState.skus.splice(idx, 1);
  closeModal();
  showToast('SKU excluído!', 'success');
  renderSkus();
}
