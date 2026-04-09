/* ===== MODULE: BARRAS (MATÉRIA-PRIMA) ===== */

function renderBarras() {
  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Barras – Matéria-prima</h1>
        <p class="page-subtitle">Controle do estoque de barras virgens</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="_mockImportBarras()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Importar planilha
        </button>
        <button class="btn btn-primary" onclick="_openNovaBarraModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Barra
        </button>
      </div>
    </div>

    <!-- RESUMO RÁPIDO -->
    <div class="kpi-grid" style="margin-bottom:24px;">
      ${[
        { label:'Total de Lotes', val: appState.barras.length, color:'kpi-accent', ic:'ic-accent' },
        { label:'Total de Barras', val: appState.barras.reduce((s,b)=>s+b.qty,0), color:'kpi-green', ic:'ic-green' },
        { label:'Comprimento Total (m)', val: (appState.barras.reduce((s,b)=>s+b.qty*b.dim,0)/1000).toFixed(0), color:'kpi-blue', ic:'ic-blue' },
        { label:'Estoques Baixos', val: appState.barras.filter(b=>b.status==='low').length, color:'kpi-yellow', ic:'ic-yellow' },
      ].map(k => `
        <div class="kpi-card ${k.color}">
          <div class="kpi-icon ${k.ic}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="9" width="20" height="6" rx="2"/></svg>
          </div>
          <span class="kpi-label">${k.label}</span>
          <span class="kpi-value">${k.val}</span>
        </div>
      `).join('')}
    </div>

    <!-- TABELA -->
    <div class="table-wrapper">
      <div class="table-header">
        <span class="table-title">Estoque de Barras</span>
        <div class="table-actions">
          <input class="filter-input" type="text" id="barraSearch" placeholder="Filtrar por SKU…" oninput="_filterBarras()" style="padding:7px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;">
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>SKU</th><th>Lote Fornecedor</th><th>Dimensão</th>
              <th>Qtd Barras</th><th>Estoque Total</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody id="tbodyBarras">
            ${_renderBarrasRows(appState.barras)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function _renderBarrasRows(barras) {
  if (!barras.length) return `<tr><td colspan="8"><div class="table-empty">Nenhuma barra cadastrada</div></td></tr>`;
  return barras.map(b => {
    const totalMm = b.qty * b.dim;
    const statusPill = b.status === 'low'
      ? `<span class="status-pill status-low">Estoque Baixo</span>`
      : `<span class="status-pill status-active">Normal</span>`;
    return `
      <tr>
        <td class="font-600">${b.id}</td>
        <td>${_skuTag(b.sku)}</td>
        <td>${b.lote}</td>
        <td>${b.dim.toLocaleString('pt-BR')} mm</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="progress-bar" style="width:70px;">
              <div class="progress-fill" style="width:${Math.min(b.qty/50*100,100)}%;background:${b.status==='low'?'var(--red)':'var(--green)'}"></div>
            </div>
            <span class="font-600">${b.qty}</span>
          </div>
        </td>
        <td class="font-600">${(totalMm/1000).toFixed(2)} m</td>
        <td>${statusPill}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm btn-icon" title="Editar" onclick="_editBarra('${b.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" title="Adicionar estoque" onclick="_addEstoque('${b.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function _filterBarras() {
  const q = document.getElementById('barraSearch').value.toLowerCase();
  const filtered = appState.barras.filter(b => b.sku.toLowerCase().includes(q) || b.lote.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
  document.getElementById('tbodyBarras').innerHTML = _renderBarrasRows(filtered);
}

function _openNovaBarraModal() {
  const skuOptions = appState.skus.map(s => `<option value="${s.code}">${s.code} – ${s.desc}</option>`).join('');
  openModal('Adicionar Barra ao Estoque', `
    <div class="form-group">
      <label class="form-label">SKU *</label>
      <select class="form-select" id="novaBarraSku" onchange="_autoFillDim()">${skuOptions}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Dimensão (mm) *</label>
        <input class="form-input" type="number" id="novaBarraDim" value="6000" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">Quantidade *</label>
        <input class="form-input" type="number" id="novaBarraQty" placeholder="ex: 20" min="1">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Lote do Fornecedor *</label>
      <input class="form-input" type="text" id="novaBarraLote" placeholder="ex: LF-2026-05">
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_salvarNovaBarra()">Adicionar</button>
  `);
}

function _autoFillDim() {
  const sku = document.getElementById('novaBarraSku').value;
  const s = appState.skus.find(x => x.code === sku);
  if (s) document.getElementById('novaBarraDim').value = s.dim;
}

function _salvarNovaBarra() {
  const sku  = document.getElementById('novaBarraSku').value;
  const dim  = parseInt(document.getElementById('novaBarraDim').value);
  const qty  = parseInt(document.getElementById('novaBarraQty').value);
  const lote = document.getElementById('novaBarraLote').value;
  if (!dim || !qty || !lote) { showToast('Preencha todos os campos!', 'error'); return; }

  const newId = `B${String(appState.barras.length + 1).padStart(3,'0')}`;
  appState.barras.push({ id: newId, sku, lote, dim, qty, status: qty <= 10 ? 'low' : 'active' });
  closeModal();
  showToast('Barra adicionada ao estoque!', 'success');
  renderBarras();
}

function _editBarra(id) {
  const b = appState.barras.find(x => x.id === id);
  if (!b) return;
  openModal(`Editar ${b.id}`, `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Quantidade atual</label>
        <input class="form-input" type="number" id="editBarraQty" value="${b.qty}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="editBarraSt">
          <option value="active" ${b.status==='active'?'selected':''}>Normal</option>
          <option value="low"    ${b.status==='low'   ?'selected':''}>Estoque Baixo</option>
        </select>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_saveEditBarra('${id}')">Salvar</button>
  `);
}

function _saveEditBarra(id) {
  const b = appState.barras.find(x => x.id === id);
  if (!b) return;
  b.qty    = parseInt(document.getElementById('editBarraQty').value);
  b.status = document.getElementById('editBarraSt').value;
  closeModal();
  showToast('Barra atualizada!', 'success');
  renderBarras();
}

function _addEstoque(id) {
  const b = appState.barras.find(x => x.id === id);
  if (!b) return;
  openModal(`Adicionar estoque – ${b.id}`, `
    <div class="form-group">
      <label class="form-label">Quantidade a adicionar</label>
      <input class="form-input" type="number" id="addQty" placeholder="ex: 10" min="1">
    </div>
    <p style="font-size:13px;color:var(--text-muted);">Estoque atual: <strong>${b.qty}</strong> barras</p>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-success" onclick="_confirmAddEstoque('${id}')">Adicionar</button>
  `);
}

function _confirmAddEstoque(id) {
  const b = appState.barras.find(x => x.id === id);
  const add = parseInt(document.getElementById('addQty').value);
  if (!add || add < 1) { showToast('Quantidade inválida', 'error'); return; }
  b.qty += add;
  if (b.qty > 10) b.status = 'active';
  closeModal();
  showToast(`+${add} barras adicionadas ao estoque de ${b.sku}!`, 'success');
  renderBarras();
}

function _mockImportBarras() { showToast('Importação via planilha – em breve!', 'info'); }
