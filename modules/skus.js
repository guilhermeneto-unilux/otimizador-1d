/* ===== SKUs & ESTOQUE UNIFICADO ===== */

function renderSkus() {
  const content = document.getElementById('contentArea');
  content.innerHTML = _renderSkusCatalogHtml();
}

function _renderSkusCatalogHtml(options = {}) {
  const embedded = Boolean(options.embedded);
  const q       = (appState.filters.skus || '').toLowerCase();
  
  const filteredRows = _skusFilteredRows(q);
  const rows = _skusRows(filteredRows);

  return `
    ${embedded ? `
      <div class="compras-catalog-head">
        <div>
          <div class="compras-panel-title">Catalogo e Estoque Virgem</div>
          <div class="compras-panel-subtitle">${appState.skus.length} perfis cadastrados no estoque de barras virgens.</div>
        </div>
        <button class="btn btn-green" onclick="_newSkuModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Novo Perfil & Estoque
        </button>
      </div>
    ` : `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">${appState.skus.length} perfis cadastrados</div>
        <h1 class="pg-title">Catálogo e Estoque Virgem</h1>
      </div>
      <button class="btn btn-green" onclick="_newSkuModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Novo Perfil & Estoque
      </button>
    </div>
    `}

    <!-- BARRA DE BUSCA -->
    <div class="search-bar-card" style="${embedded ? '' : 'margin-top:24px;'}">
      <div class="search-input-group">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" class="form-control"
               id="skusSearchInput"
               placeholder="Pesquisar por Código ou Descrição do Perfil..."
               value="${_uiEscAttr(appState.filters.skus || '')}"
               oninput="_updateSkusSearch(this.value)">
      </div>
      <span class="search-results-stats" id="skusSearchStats" style="${q ? '' : 'display:none;'}">${filteredRows.length} resultados</span>
    </div>

    <div class="tbl-wrap" style="margin-top:16px;">
      <table class="tbl">
        <thead>
          <tr>
            <th>Código SKU</th>
            <th>Descrição do Perfil</th>
            <th>Nome Resumido</th>
            <th>Dimensões & Lotes (m)</th>
            <th>Total Virgem em Estoque</th>
            <th>Valor por Metro</th>
            <th>Sobra Mínima</th>
            <th style="text-align:right;">Ações</th>
          </tr>
        </thead>
        <tbody id="skusRowsBody">
          ${rows.length ? rows : '<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--text-400);">Nenhum perfil cadastrado.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function _skusFilteredRows(q = (appState.filters.skus || '').toLowerCase()) {
  return appState.skus.filter(s => {
    if (!q) return true;
    return s.code.toLowerCase().includes(q) ||
           s.desc.toLowerCase().includes(q) ||
           (s.short_desc || '').toLowerCase().includes(q);
  });
}

function _skusRows(list) {
  return list.map(s => {
    const sc = skuColor(s.code);

    // Calcula o total de barras em estoque desse SKU
    const totalQty = s.dims ? s.dims.reduce((acc, d) => acc + (parseInt(d.qty)||0), 0) : 0;
    const totalLength = s.dims ? s.dims.reduce((acc, d) => acc + ((parseFloat(d.dim) || 0) * (parseInt(d.qty, 10) || 0)), 0) : 0;
    const pricePerMeter = skuPricePerMeter(s.code);
    const stockValue = _priceForLength(s.code, totalLength);

    // Lista das dimensões para exibição
    const dimsText = s.dims && s.dims.length > 0
      ? s.dims.map(d => `<span style="background:#e5e7eb; padding:2px 6px; border-radius:4px; font-size:11px;">${fmtM(d.dim)} (${d.qty}x)</span>`).join(' ')
      : '<span style="color:#9ca3af;">Sem estoque</span>';

    return `
      <tr>
        <td>
          <span class="status-badge" style="background:${sc.bg}; color:${sc.text}; border:1px solid ${sc.text}33;">
            ${s.code}
          </span>
        </td>
        <td><div style="font-weight:500;">${s.desc}</div></td>
        <td><div style="color:var(--text-400); font-size:13px;">${s.short_desc || '-'}</div></td>
        <td><div style="display:flex; gap:4px; flex-wrap:wrap;">${dimsText}</div></td>
        <td>
          <div style="font-weight:700; color:${totalQty > 0 ? 'var(--text)' : 'var(--red)'};">
            ${totalQty} barras
          </div>
          ${totalQty > 0 && pricePerMeter > 0 ? `<div style="font-size:11px; color:var(--text-400); margin-top:2px;">${fmtBRL(stockValue)}</div>` : ''}
        </td>
        <td>
          ${pricePerMeter > 0
            ? `<div style="font-weight:700; color:var(--text-900);">${fmtBRL(pricePerMeter)}/m</div>`
            : '<span class="status-badge badge-pending">Preço pendente</span>'}
        </td>
        <td>
          <div style="font-weight:600; color:var(--text-400);">${fmtM(s.min_sobra)}</div>
        </td>
        <td style="text-align:right;">
          <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
            <button class="btn btn-white btn-sm" onclick="_editSkuModal('${s.id}')">Editar Estoque</button>
            <div style="width:1px; height:16px; background:var(--border);"></div>
            <button class="btn btn-white btn-sm" style="color:var(--red);" onclick="if(confirm('Excluir permanentemente o perfil ${s.code}?')) _deleteSku('${s.id}')">Remover</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function _updateSkusSearch(value) {
  appState.filters.skus = value;
  const q = (value || '').toLowerCase();
  const filteredRows = _skusFilteredRows(q);
  const rows = _skusRows(filteredRows);

  const body = document.getElementById('skusRowsBody');
  if (body) body.innerHTML = rows || '<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--text-400);">Nenhum perfil cadastrado.</td></tr>';

  const stats = document.getElementById('skusSearchStats');
  if (stats) {
    stats.textContent = `${filteredRows.length} resultados`;
    stats.style.display = q ? '' : 'none';
  }
}

function _getSkuFormHtml(sku = null) {
  const code = sku ? sku.code : '';
  const desc = sku ? sku.desc : '';
  const pricePerMeter = sku ? skuPricePerMeter(sku.code) : 0;
  const suggestedPrice = _pricingSuggestionFromDescription(desc);
  const dims = sku && Array.isArray(sku.dims) && sku.dims.length
    ? sku.dims
    : [{ dim: '', qty: '' }, { dim: '', qty: '' }, { dim: '', qty: '' }];

  return `
    <div class="form-group">
      <label class="form-label">Código SKU (Ex: PER-40X40)</label>
      <input type="text" class="form-control" id="skCode" value="${_uiEscAttr(code)}" ${sku ? 'disabled' : ''} style="text-transform:uppercase;">
    </div>
    <div class="form-group">
      <label class="form-label">Descrição Comercial</label>
      <input type="text" class="form-control" id="skDesc" value="${_uiEscAttr(desc)}">
    </div>
    <div class="form-group">
      <label class="form-label">Nome Resumido do Perfil</label>
      <input type="text" class="form-control" id="skShortDesc" value="${_uiEscAttr(sku && sku.short_desc ? sku.short_desc : '')}">
    </div>
    <div class="form-group">
      <label class="form-label">Pasta</label>
      <input type="text" class="form-control" id="skFolder" value="${_uiEscAttr(sku && sku.folder ? sku.folder : '')}">
    </div>
    <div class="form-group">
      <label class="form-label">Valor do Perfil por Metro (R$/m)</label>
      <input type="number" min="0" step="0.0001" class="form-control" id="skPricePerMeter" value="${pricePerMeter > 0 ? pricePerMeter : ''}" placeholder="Ex: 9,7300">
      <div class="form-hint">${!pricePerMeter && suggestedPrice
        ? `Sugestão pela descrição: ${fmtBRL(suggestedPrice.pricePerMeter)}/m (${suggestedPrice.metersPerKg.toFixed(4).replace('.', ',')} m/kg · ${suggestedPrice.category}). Será aplicada se o campo ficar vazio.`
        : 'Este é o valor usado no estoque, nas sobras, no dashboard e nos planos de otimização.'}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Sobra Mínima para Guarda (m) <span style="font-weight:400; color:var(--text-400);">(Descartes menores irão para o lixo)</span></label>
      <input type="number" class="form-control" id="skMinSobra" value="${sku && sku.min_sobra !== undefined ? (sku.min_sobra / 1000) : 1.0}">
    </div>

    <div style="margin:24px 0 16px; border-bottom:1px solid var(--border);">
      <span style="font-size:12px; font-weight:700; color:var(--text-400); text-transform:uppercase;">Medidas & Estoque</span>
    </div>

    <div class="sku-dims-rows" id="skuDimsRows">
      ${dims.map(d => _getSkuDimRowHtml(d)).join('')}
    </div>

    <button class="btn btn-white btn-sm" onclick="_addSkuDimRow()">Adicionar comprimento</button>
  `;
}

function _getSkuDimRowHtml(dim = {}) {
  const len = dim && dim.dim ? (dim.dim / 1000).toFixed(3) : '';
  const qty = dim && dim.qty !== undefined ? dim.qty : '';
  return `
    <div class="sku-dim-row">
      <div class="form-group">
        <label class="form-label">Comprimento (m)</label>
        <input type="number" step="0.001" class="form-control sku-dim-input" value="${_uiEscAttr(len)}" placeholder="Ex: 6.000">
      </div>
      <div class="form-group">
        <label class="form-label">Qtd Barras</label>
        <input type="number" step="1" class="form-control sku-qty-input" value="${_uiEscAttr(qty)}" placeholder="Ex: 50">
      </div>
      <button class="btn btn-white btn-sm sku-dim-remove" onclick="_removeSkuDimRow(this)" aria-label="Remover comprimento">×</button>
    </div>
  `;
}

function _addSkuDimRow() {
  const rows = document.getElementById('skuDimsRows');
  if (rows) rows.insertAdjacentHTML('beforeend', _getSkuDimRowHtml());
}

function _removeSkuDimRow(button) {
  const row = button.closest('.sku-dim-row');
  if (!row) return;
  const rows = document.querySelectorAll('#skuDimsRows .sku-dim-row');
  if (rows.length <= 1) {
    row.querySelectorAll('input').forEach(input => { input.value = ''; });
    return;
  }
  row.remove();
}

function _extractDimsFromForm() {
  const dims = [];
  document.querySelectorAll('#skuDimsRows .sku-dim-row').forEach(row => {
    const dimInput = row.querySelector('.sku-dim-input');
    const qtyInput = row.querySelector('.sku-qty-input');
    if (!dimInput || !qtyInput) return;
    const val = String(dimInput.value);
    const d = Math.round(parseFloat(val.replace(',', '.')) * 1000);
    const q = parseInt(qtyInput.value);
    if (!isNaN(d) && d > 0 && !isNaN(q) && q >= 0) {
      dims.push({ dim: d, qty: q });
    }
  });
  if (typeof _comprasNormalizeSkuDims === 'function') return _comprasNormalizeSkuDims(dims);
  return dims;
}

function _newSkuModal() {
  openModal(
    'Cadastrar Perfil & Estoque',
    _getSkuFormHtml(),
    `<button class="btn btn-white" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-green" onclick="_salvarSku()">Salvar Perfil</button>`
  );
}

async function _salvarSku() {
  let code = document.getElementById('skCode').value.toUpperCase().trim();
  const desc = document.getElementById('skDesc').value.trim();
  const short_desc = document.getElementById('skShortDesc').value.trim();
  const folder = document.getElementById('skFolder').value.trim();
  const manualPrice = Math.max(0, parseFloat(String(document.getElementById('skPricePerMeter').value || '0').replace(',', '.')) || 0);
  const suggestedPrice = _pricingSuggestionFromDescription(desc);
  const pricePerMeter = manualPrice || suggestedPrice?.pricePerMeter || 0;
  
  // Converte Metros para Milímetros (int)
  const minSobra = Math.round(parseFloat(document.getElementById('skMinSobra').value.replace(',', '.')) * 1000) || 1000;
  
  if (!code || !desc) { showToast('Preencha código e descrição!', 'error'); return; }
  if (appState.skus.some(s => s.code === code)) { showToast('SKU já existe!', 'error'); return; }

  const dims = _extractDimsFromForm();
  if (dims.length === 0) { showToast('Cadastre ao menos 1 comprimento válido!', 'error'); return; }

  const id = `S${String(appState.skus.length + 1).padStart(2,'0')}`;
  const s = { id, code, desc, short_desc, folder, dims, min_sobra: minSobra };
  
  try {
    appState.skus.push(s);
    _setSkuPricePerMeter(s.code, pricePerMeter, manualPrice > 0
      ? { method: 'catalogo-manual', updatedAt: new Date().toISOString() }
      : suggestedPrice
        ? { method: 'descricao-automatica', category: suggestedPrice.category, costPerKg: suggestedPrice.costPerKg, metersPerKg: suggestedPrice.metersPerKg, updatedAt: new Date().toISOString() }
        : { method: 'preco-pendente', updatedAt: new Date().toISOString() });
    await DB.saveSku(s);
    await DB.saveComprasConfig();
    await DB.log("Cadastrou SKU", "unilux_skus", `${s.code} - ${s.desc} · ${pricePerMeter > 0 ? `${fmtBRL(pricePerMeter)}/m` : 'preço pendente'}`);
    closeModal(); 
    showToast('Perfil salvo com sucesso!', 'success'); 
    _refreshSkusView();
  } catch (err) {
    console.error('Falha ao salvar SKU:', err);
    showToast('Falha ao salvar no banco. Verifique sua conexão.', 'error');
  }
}

function _editSkuModal(id) {
  const s = appState.skus.find(x => x.id === id);
  if (!s) return;
  openModal(
    `Editar Estoque: ${s.code}`,
    _getSkuFormHtml(s),
    `<div><button class="btn btn-white" style="color:var(--red);" onclick="if(confirm('Excluir este SKU e todo o seu estoque associado? irreversível.')) _deleteSku('${id}')">Excluir Tudo</button></div>
     <div style="display:flex; gap:8px;">
       <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
       <button class="btn btn-green" onclick="_saveEditSku('${id}')">Atualizar Estoque</button>
     </div>`
  );
  document.getElementById('modalFooter').style.justifyContent = 'space-between';
}

async function _saveEditSku(id) {
  const s = appState.skus.find(x => x.id === id);
  if (!s) { showToast('SKU não encontrado!', 'error'); return; }

  try {
    // Preservar o code original do objeto em memória (nunca ler do input disabled)
    const originalCode = s.code;
    
    s.desc = document.getElementById('skDesc').value.trim();
    s.short_desc = document.getElementById('skShortDesc').value.trim();
    s.folder = document.getElementById('skFolder').value.trim();
    const manualPrice = Math.max(0, parseFloat(String(document.getElementById('skPricePerMeter').value || '0').replace(',', '.')) || 0);
    const suggestedPrice = _pricingSuggestionFromDescription(s.desc);
    const pricePerMeter = manualPrice || suggestedPrice?.pricePerMeter || 0;
    
    // Converte Metros para Milímetros (int)
    const minSobraRaw = document.getElementById('skMinSobra').value;
    s.min_sobra = Math.round(parseFloat(String(minSobraRaw).replace(',', '.')) * 1000) || 1000;
    
    const dims = _extractDimsFromForm();
    if (dims.length === 0) { showToast('Cadastre ao menos 1 comprimento!', 'error'); return; }
    s.dims = dims;
    
    // Garantir que o code está correto antes de salvar
    s.code = originalCode;
    
    await DB.saveSku(s);
    _setSkuPricePerMeter(s.code, pricePerMeter, manualPrice > 0
      ? { method: 'catalogo-manual', updatedAt: new Date().toISOString() }
      : suggestedPrice
        ? { method: 'descricao-automatica', category: suggestedPrice.category, costPerKg: suggestedPrice.costPerKg, metersPerKg: suggestedPrice.metersPerKg, updatedAt: new Date().toISOString() }
        : { method: 'preco-pendente', updatedAt: new Date().toISOString() });
    await DB.saveComprasConfig();
    await DB.log("Editou SKU", "unilux_skus", `${s.code} - ${s.desc} · ${fmtBRL(pricePerMeter)}/m`);
    
    closeModal(); 
    showToast('Estoque atualizado!', 'success'); 
    _refreshSkusView();
  } catch (err) {
    console.error('Falha ao atualizar SKU:', err);
    showToast('Erro ao atualizar o banco de dados. Detalhes: ' + (err.message || JSON.stringify(err)), 'error');
  }
}

async function _deleteSku(id) {
  const sku = appState.skus.find(x => x.id === id);
  appState.skus = appState.skus.filter(x => x.id !== id);
  await DB.deleteSku(id);
  if (sku && appState.comprasConfig?.skus) {
    const key = Object.keys(appState.comprasConfig.skus).find(candidate => _pricingCode(candidate) === _pricingCode(sku.code));
    if (key) {
      delete appState.comprasConfig.skus[key];
      await DB.saveComprasConfig();
    }
  }
  await DB.log("Removeu SKU", "unilux_skus", id);
  showToast('SKU removido.', 'info'); 
  closeModal(); _refreshSkusView();
}

function _refreshSkusView() {
  if (appState.currentRoute === 'compras') {
    renderCompras();
  } else {
    renderSkus();
  }
}
