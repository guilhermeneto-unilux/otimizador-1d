/* ===== ORDENS DE PRODUÇÃO – UNILUX 1D ===== */

function renderOrdens() {
  if (!userCan('orders:view')) {
    document.getElementById('contentArea').innerHTML = `<h3>Acesso negado.</h3>`;
    return;
  }
  const tab      = appState._ordensTab || 'pending';
  const q        = (appState.filters.ordens || '').toLowerCase();
  const canWrite = userCan('orders:write');

  const pending  = appState.ordens.filter(o => o.status === 'pending');
  const inBatch  = appState.ordens.filter(o => o.status === 'in_batch');
  const pendingPieces = _ordensPieceTotal(pending);
  const inBatchPieces = _ordensPieceTotal(inBatch);

  const filtered = _ordensFilteredList(tab, q);

  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">${pending.length} linha(s) pendente(s) / ${pendingPieces} peça(s) · ${inBatch.length} linha(s) em lote / ${inBatchPieces} peça(s)</div>
        <h1 class="pg-title">Ordens de Produção</h1>
      </div>
      <div class="pg-actions">
        ${canWrite ? `<button class="btn btn-white btn-sm" onclick="_openColarExcelModal()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          Modelo
        </button>` : ''}
        <button class="btn btn-white btn-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV
        </button>
        ${canWrite ? `<input type="file" id="opExcelFile" accept=".xlsx, .xls, .csv" style="display:none;" onchange="_handleExcelUpload(event)">
        <button class="btn btn-white btn-sm" style="background:#fff7ed; border-color:#fdba74; color:#c2410c;" onclick="document.getElementById('opExcelFile').click()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Importar Planilha
        </button>
        <button class="btn btn-white btn-sm" onclick="_novaOrdemModal()">+ Nova Ordem</button>
        ${tab === 'pending' ? `<button class="btn btn-white btn-sm" style="color:var(--red); border-color:#fee2e2; margin-right:4px;" onclick="_excluirOrdensMassa()">Excluir Selecionadas</button>` : ''}
        <button class="btn btn-green" onclick="_criarLote()">Criar Lote →</button>` : ''}
      </div>
    </div>

    ${canWrite ? '' : renderReadOnlyHint('Você pode consultar as ordens, mas não importar, criar, excluir, reverter ou criar lotes.')}

    <div class="tabs" style="margin-bottom:0; border-bottom:0; border-radius:8px 8px 0 0;">
      <span class="tab ${tab === 'pending' ? 'active' : ''}" onclick="_setOrdensTab('pending')">Pendentes (${pending.length} linhas / ${pendingPieces} pç)</span>
      <span class="tab ${tab === 'batch'   ? 'active' : ''}" onclick="_setOrdensTab('batch')">Em Lote (${inBatch.length} linhas / ${inBatchPieces} pç)</span>
      ${canWrite && tab === 'batch' && inBatch.length > 0
        ? `<button class="btn btn-ghost btn-sm" style="margin-left:auto; color:var(--red); border:1px solid #fee2e2; font-weight:700;" onclick="_reverterTodasOrdens()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reverter Tudo para Pendente
           </button>` 
        : ''}
    </div>

    <!-- BARRA DE BUSCA -->
    <div class="search-bar-card" style="border-top:0; border-radius:0 0 8px 8px; margin-bottom:24px;">
      <div class="search-input-group">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" class="form-control" 
               id="ordensSearchInput"
               placeholder="Pesquisar por OP, Cliente, Pedido ou Data..." 
               value="${_uiEscAttr(appState.filters.ordens || '')}"
               oninput="_updateOrdensSearch(this.value)">
      </div>
      <span class="search-results-stats" id="ordensSearchStats" style="${q ? '' : 'display:none;'}">${filtered.length} resultados</span>
    </div>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            ${canWrite ? '<th style="width:36px;"><input type="checkbox" id="checkAll" onchange="_toggleAll(this)"></th>' : ''}
            <th>OP</th><th>SKU</th><th>Dimensão Corte</th><th>QTD</th><th>Entrega</th><th>Cliente</th><th>Status</th><th style="text-align:right;">Ação</th>
          </tr>
        </thead>
        <tbody id="ordensRowsBody">
          ${_ordensRows(filtered)}
        </tbody>
      </table>
    </div>
  `;
}

function _ordensPieceTotal(list) {
  return (list || []).reduce((sum, o) => sum + (Number(o.qty) || 0), 0);
}

function _ordensFilteredList(tab = (appState._ordensTab || 'pending'), q = (appState.filters.ordens || '').toLowerCase()) {
  const activeList = tab === 'pending'
    ? appState.ordens.filter(o => o.status === 'pending')
    : appState.ordens.filter(o => o.status === 'in_batch');

  return activeList.filter(o => {
    if (!q) return true;
    const matchId = o.id.toLowerCase().includes(q);
    const matchBaseOp = _ordemBaseOp(o).toLowerCase().includes(q);
    const matchSku = o.sku.toLowerCase().includes(q);
    const matchCliente = (o.cliente || '').toLowerCase().includes(q);
    const matchEntrega = _fmtDate(o.entrega).toLowerCase().includes(q);
    const matchPedido = [
      o._meta?.pedido,
      o._meta?.op_original,
      o._meta?.base_op,
      o._meta?.line_id
    ].filter(Boolean).join(' ').toLowerCase().includes(q);
    const matchRetrabalho = [
      o._meta?.rework?.originalOp,
      o._meta?.rework?.originalPieceId,
      o._meta?.rework?.planoId,
      o._meta?.rework?.loteId
    ].filter(Boolean).join(' ').toLowerCase().includes(q);
    return matchId || matchBaseOp || matchSku || matchCliente || matchEntrega || matchPedido || matchRetrabalho;
  });
}

function _updateOrdensSearch(value) {
  appState.filters.ordens = value;
  const q = (value || '').toLowerCase();
  const filtered = _ordensFilteredList(appState._ordensTab || 'pending', q);
  const body = document.getElementById('ordensRowsBody');
  if (body) body.innerHTML = _ordensRows(filtered);

  const stats = document.getElementById('ordensSearchStats');
  if (stats) {
    stats.textContent = `${filtered.length} resultados`;
    stats.style.display = q ? '' : 'none';
  }
}

function _ordensRows(list) {
  const canWrite = userCan('orders:write');
  if (!list.length) return `<tr><td colspan="${canWrite ? 9 : 8}" class="tbl-empty">Nenhuma ordem</td></tr>`;
  return list.map(o => {
    const c = skuColor(o.sku);
    const isRework = _isRetrabalhoOrdem(o);
    const rw = isRework ? o._meta.rework : null;
    const baseOp = _ordemBaseOp(o);
    const lineHint = baseOp && baseOp !== o.id
      ? `<div class="ordem-rework-origin">Linha interna ${_uiEsc(o.id)}</div>`
      : '';
    const opCell = isRework
      ? `<div class="fw-700" style="font-size:13px;">${o.id}</div><div class="ordem-rework-origin">Retrabalho de ${_uiEsc(rw.originalOp || 'OP')} · Plano ${_uiEsc(rw.planoId || '-')}</div>`
      : `<div class="fw-700" style="font-size:13px;">${_uiEsc(baseOp || o.id)}</div>${lineHint}`;
    const statusLabel = o.status === 'pending'
      ? (isRework ? 'Pendente · Retrabalho' : 'Pendente')
      : o.status === 'in_batch'
        ? `Lote ${o.lote}`
        : 'Concluído';
    const actionHtml = !canWrite
      ? '<span class="compras-muted">Consulta</span>'
      : o.status === 'pending'
      ? `<div style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
          ${isRework ? `<button class="btn btn-white btn-sm" style="padding:4px 8px;" onclick="_editarRetrabalhoModal('${o.id}')">Editar</button>` : ''}
          <button class="btn btn-ghost btn-sm" style="color:var(--red); padding:4px 8px;" onclick="if(confirm('Tem certeza que deseja excluir esta Ordem de Produção?')) _deleteOrdem('${o.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
        </div>`
      : o.status === 'in_batch'
        ? `<button class="btn btn-white btn-sm" style="padding:4px 8px;" onclick="_reverterOrdem('${o.id}')" title="Voltar para Pendente">Reverter</button>`
        : '';
    return `
    <tr>
      ${canWrite ? `<td><input type="checkbox" class="ord-chk" data-id="${o.id}"></td>` : ''}
      <td>${opCell}</td>
      <td><span class="sku-tag" style="background:${c.bg};color:${c.text};">${o.sku}</span></td>
      <td class="fw-700">${fmtM(o.dim)}</td>
      <td>${o.qty} pç</td>
      <td style="color:var(--text-400);">${_fmtDate(o.entrega)}</td>
      <td style="color:var(--text-400);">${o.cliente || '—'}</td>
      <td><span class="status-badge ${o.status === 'pending' ? 'badge-pending' : o.status === 'in_batch' ? 'badge-batch' : 'badge-approved'}">
        ${statusLabel}
      </span></td>
      <td style="text-align:right;">
        ${actionHtml}
      </td>
    </tr>`;
  }).join('');
}

function _fmtDate(iso) {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function _normalizeOpId(rawId) {
  const value = String(rawId ?? '').trim().toUpperCase();
  if (!value) return '';
  const withoutPrefix = value.replace(/^(OP[\s-]*)+/i, '').trim().replace(/\s+/g, '-');
  if (!withoutPrefix) return '';
  return `OP-${withoutPrefix}`;
}

function _ordemBaseOp(o) {
  if (!o) return '';
  const metaBase = o._meta?.base_op || o._meta?.op_original;
  if (metaBase) return _normalizeOpId(metaBase);
  return _stripOrderLineSuffix(_normalizeOpId(o.id));
}

function _stripOrderLineSuffix(id) {
  return String(id || '').replace(/-L\d+$/i, '');
}

function _isRetrabalhoOrdem(o) {
  return !!(o && o._meta && o._meta.rework);
}

function _setOrdensTab(tab) { appState._ordensTab = tab; renderOrdens(); }
function _toggleAll(el) { document.querySelectorAll('.ord-chk').forEach(c => c.checked = el.checked); }

function _editarRetrabalhoModal(id) {
  if (!requirePermission('orders:write')) return;
  const o = appState.ordens.find(x => x.id === id);
  if (!o || !_isRetrabalhoOrdem(o) || o.status !== 'pending') {
    showToast('Somente OPs pendentes de retrabalho podem ser editadas.', 'error');
    return;
  }

  const rw = o._meta.rework || {};
  const skuOpts = appState.skus.map(s => `<option value="${s.code}">${s.code} – ${s.desc}</option>`).join('');
  const dimM = Number(o.dim || 0) ? (Number(o.dim) / 1000).toFixed(3) : '';

  openModal(`Editar Retrabalho: ${id}`, `
    <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:12px; margin-bottom:16px; color:#9a3412; font-size:13px;">
      Origem: <b>${_uiEsc(rw.originalOp || '-')}</b> · Plano <b>${_uiEsc(rw.planoId || '-')}</b> · Lote <b>${_uiEsc(rw.loteId || '-')}</b>
    </div>
    <div class="form-group">
      <label class="form-label">SKU / Material</label>
      <input class="form-control" type="text" id="rwSku" list="rwSkuDatalist" value="${_uiEscAttr(o.sku)}" autocomplete="off">
      <datalist id="rwSkuDatalist">${skuOpts}</datalist>
    </div>
    <div class="form-group">
      <label class="form-label">Dimensão de Corte (m)</label>
      <input class="form-control" type="number" step="0.001" id="rwDim" value="${_uiEscAttr(dimM)}">
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" onclick="_salvarEdicaoRetrabalho('${id}')">Salvar Alterações</button>
  `);
}

async function _salvarEdicaoRetrabalho(id) {
  if (!requirePermission('orders:write')) return;
  const o = appState.ordens.find(x => x.id === id);
  if (!o || !_isRetrabalhoOrdem(o) || o.status !== 'pending') {
    showToast('Retrabalho não encontrado para edição.', 'error');
    return;
  }

  const sku = document.getElementById('rwSku').value.trim();
  const dim = Math.round(parseFloat(String(document.getElementById('rwDim').value || '').replace(',', '.')) * 1000);

  if (!sku) { showToast('Selecione um SKU/Material!', 'error'); return; }
  if (!dim || dim <= 0) { showToast('Informe uma dimensão válida.', 'error'); return; }
  if (!appState.skus.some(s => s.code === sku)) { showToast('SKU não encontrado no catálogo!', 'error'); return; }

  const previous = { sku: o.sku, dim: o.dim };
  const previousRework = { ...(o._meta.rework || {}) };
  o.sku = sku;
  o.dim = dim;
  o._meta.rework.editedAt = new Date().toISOString();
  o._meta.rework.editedBy = {
    id: appState.currentUser?.id || '',
    name: appState.currentUser?.name || '',
    email: appState.currentUser?.email || ''
  };
  o._meta.rework.previous = previous;

  try {
    await DB.saveOrdem(o);
    await DB.log("Editou Retrabalho", "unilux_ordens", `${id}: ${previous.sku}/${fmtM(previous.dim)} -> ${sku}/${fmtM(dim)}`);
  } catch (err) {
    o.sku = previous.sku;
    o.dim = previous.dim;
    o._meta.rework = previousRework;
    console.error('Erro ao editar retrabalho:', err);
    showToast('Erro ao salvar alteração do retrabalho.', 'error');
    return;
  }

  closeModal();
  showToast(`Retrabalho ${id} atualizado!`, 'success');
  renderOrdens();
  updateBadges();
}

function _novaOrdemModal() {
  if (!requirePermission('orders:write')) return;
  const skuOpts = appState.skus.map(s => `<option value="${s.code}">${s.code} – ${s.desc}</option>`).join('');
  openModal('Nova Ordem de Produção', `
    <div class="form-group">
      <label class="form-label">Número da OP</label>
      <input class="form-control" type="text" id="opId" placeholder="Ex: 12345 ou OP-12345">
    </div>
    <div class="form-group">
      <label class="form-label">SKU / Material</label>
      <input class="form-control" type="text" id="opSku" list="skuDatalist" placeholder="Digite ou cole o código SKU..." autocomplete="off">
      <datalist id="skuDatalist">${skuOpts}</datalist>
      <div class="form-hint">Digite, cole (Ctrl+V) ou selecione da lista</div>
    </div>
    <div class="form-row">
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Dimensão de Corte (m)</label>
        <input class="form-control" type="number" step="0.001" id="opDim" placeholder="ex: 1,200">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Quantidade (peças)</label>
        <input class="form-control" type="number" id="opQty" value="1" min="1">
      </div>
    </div>
    <div class="form-group" style="margin-top:16px">
      <label class="form-label">Cliente</label>
      <input class="form-control" type="text" id="opCliente" placeholder="Nome do cliente">
    </div>
    <div class="form-group">
      <label class="form-label">Data de Entrega</label>
      <input class="form-control" type="date" id="opEntrega">
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" onclick="_salvarOrdem()">Salvar Ordem</button>
  `);
}

async function _salvarOrdem() {
  if (!requirePermission('orders:write')) return;
  let rawId   = document.getElementById('opId').value.trim();
  const sku   = _canonicalSku(document.getElementById('opSku').value.trim());
  const dim   = Math.round(parseFloat(document.getElementById('opDim').value.replace(',', '.')) * 1000);
  const qty   = parseInt(document.getElementById('opQty').value);
  const cliente = document.getElementById('opCliente').value || 'Geral';
  const entrega = document.getElementById('opEntrega').value || new Date().toISOString().split('T')[0];
  
  if (!rawId) { showToast('Preencha o número da OP!', 'error'); return; }
  if (!sku) { showToast('Selecione um SKU/Material!', 'error'); return; }
  if (!dim || dim <= 0 || !Number.isInteger(qty) || qty <= 0) { showToast('Preencha dimensão e quantidade válidas!', 'error'); return; }
  
  // Validar que o SKU existe no catálogo
  const skuExists = _skuExists(sku);
  if (!skuExists) { showToast('SKU não encontrado no catálogo!', 'error'); return; }
  
  // Formatar o ID: adicionar prefixo OP- se o usuário não colocou
  const baseOp = _normalizeOpId(rawId);
  if (!baseOp) { showToast('Preencha um número de OP válido!', 'error'); return; }

  const pendingSameLine = appState.ordens.find(o =>
    o.status === 'pending' &&
    _ordemBaseOp(o) === baseOp &&
    _orderLineSignature(o.sku, o.dim) === _orderLineSignature(sku, dim)
  );
  if (pendingSameLine) {
    showToast(`A linha ${baseOp} / ${sku} / ${fmtM(dim)} já está pendente.`, 'error');
    return;
  }

  const usedIds = new Set(appState.ordens.map(o => o.id));
  const id = _allocateOrderLineId(baseOp, sku, dim, usedIds);
  const novaOrdem = {
    id,
    sku,
    dim,
    qty,
    cliente,
    entrega,
    status: 'pending',
    lote: null,
    _meta: {
      base_op: baseOp,
      op_original: rawId,
      line_id: id
    }
  };
  try {
    await DB.saveOrdem(novaOrdem);
    appState.ordens.push(novaOrdem);
  } catch (err) {
    console.error('Erro ao salvar ordem:', err);
    showToast('Erro ao salvar OP no banco.', 'error');
    return;
  }
  
  closeModal();
  showToast(`Ordem ${id} criada!`, 'success');
  renderOrdens(); updateBadges();
}

async function _criarLote() {
  if (!requirePermission('orders:write')) return;
  const sel = [...new Set([...document.querySelectorAll('.ord-chk:checked')].map(c => c.dataset.id))];
  if (!sel.length) { showToast('Selecione ao menos uma ordem!', 'error'); return; }
  const validation = _validateOrdensParaLote(sel);
  if (!validation.ok) {
    _showLoteValidationReport(validation);
    return;
  }
  
  // Solicitar número do lote ao usuário
  const userLoteId = prompt('Digite o número/nome do lote:');
  if (!userLoteId || !userLoteId.trim()) { showToast('Número do lote é obrigatório!', 'error'); return; }
  
  const id = userLoteId.trim();
  
  // Verificar duplicata
  if (appState.lotes.some(l => l.id === id)) { showToast(`Lote "${id}" já existe!`, 'error'); return; }

  const skus = [...new Set(validation.ordens.map(o => o.sku).filter(Boolean))];
  if (!skus.length) { showToast('Erro ao identificar SKUs!', 'error'); return; }
  const loteObj = { id, ordens: sel, skus, criacao: new Date().toISOString().split('T')[0], status: 'pending' };
  const previous = validation.ordens.map(o => ({ o, status: o.status, lote: o.lote }));
  try {
    appState.lotes.push(loteObj);
    await DB.saveLote(loteObj);
    for (const o of validation.ordens) {
      o.status = 'in_batch';
      o.lote = id;
      await DB.saveOrdem(o);
    }
    showToast(`Lote ${id} criado!`, 'success');
    navigate('otimizador');
  } catch (err) {
    appState.lotes = appState.lotes.filter(l => l.id !== id);
    previous.forEach(p => {
      p.o.status = p.status;
      p.o.lote = p.lote;
    });
    console.error('Erro ao criar lote:', err);
    showToast('Erro ao salvar lote no banco. Nada foi enviado para otimização.', 'error');
  }
}

function _validateOrdensParaLote(ids) {
  const errors = [];
  const ordens = ids.map(id => appState.ordens.find(o => o.id === id)).filter(Boolean);
  if (ordens.length !== ids.length) {
    const foundIds = new Set(ordens.map(o => o.id));
    ids.filter(id => !foundIds.has(id)).forEach(id => errors.push({ op: id, reason: 'OP selecionada não existe mais no sistema' }));
  }

  ordens.forEach(o => {
    const qty = Number(o.qty);
    const dim = Number(o.dim);
    if (o.status !== 'pending') errors.push({ op: o.id, reason: `status inválido para lote: ${o.status}` });
    if (!Number.isInteger(qty) || qty <= 0) errors.push({ op: o.id, reason: 'quantidade inválida' });
    if (!Number.isFinite(dim) || dim <= 0) errors.push({ op: o.id, reason: 'medida de corte inválida' });
    if (!_skuExists(o.sku)) errors.push({ op: o.id, reason: `SKU não cadastrado: ${o.sku || '-'}` });
  });

  return { ok: errors.length === 0, errors, ordens };
}

function _showLoteValidationReport(validation) {
  const rows = validation.errors.map(e => `
    <tr>
      <td>${_uiEsc(e.op || '-')}</td>
      <td>${_uiEsc(e.reason || '')}</td>
    </tr>
  `).join('');
  openModal('Lote bloqueado', `
    <div style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:8px; padding:12px; margin-bottom:16px; font-size:13px; font-weight:700;">
      Nenhum lote foi criado. Corrija as OPs abaixo antes de otimizar.
    </div>
    <div class="tbl-wrap" style="max-height:260px; overflow:auto;">
      <table class="tbl">
        <thead><tr><th>OP</th><th>Motivo</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `, `
    <button class="btn btn-dark" onclick="closeModal()">OK</button>
  `);
}

async function _deleteOrdem(id) {
  if (!requirePermission('orders:write')) return;
  try {
    // UI Otimista: remove da memória e atualiza tela na hora
    appState.ordens = appState.ordens.filter(o => o.id !== id);
    renderOrdens(); 
    updateBadges();

    // Sincroniza com DB (Background)
    await DB.deleteOrdem(id);
    await DB.log("Removeu Ordem", "unilux_ordens", id);
    
    showToast(`Ordem ${id} removida!`, 'info');
  } catch (err) {
    console.error('Erro ao deletar ordem:', err);
    showToast(`Erro ao remover ${id} do banco de dados, mas removida da sessão.`, 'error');
  }
}

async function _excluirOrdensMassa() {
  if (!requirePermission('orders:write')) return;
  const sel = [...document.querySelectorAll('.ord-chk:checked')].map(c => c.dataset.id);
  if (!sel.length) { showToast('Selecione ao menos uma ordem!', 'error'); return; }
  
  if (!confirm(`Deseja realmente excluir permanentemente as ${sel.length} ordens selecionadas?`)) return;

  showToast('Excluindo ordens...', 'info');

  try {
    for (const id of sel) {
      appState.ordens = appState.ordens.filter(o => o.id !== id);
      await DB.deleteOrdem(id);
    }

    await DB.log("Removeu Ordem Massa", "unilux_ordens", `${sel.length} ordens excluídas`);
    showToast(`${sel.length} ordens excluídas com sucesso!`, 'success');
  } catch (err) {
    console.error('Erro na exclusão em massa:', err);
    showToast('Houve um erro ao excluir algumas ordens no banco de dados.', 'error');
  }
  
  renderOrdens();
  updateBadges();
}

async function _reverterOrdem(id) {
  if (!requirePermission('orders:write')) return;
  const o = appState.ordens.find(x => x.id === id);
  if (!o) return;
  
  if (o.lote) {
    const lote = appState.lotes.find(l => l.id === o.lote);
    if (lote) {
      lote.ordens = lote.ordens.filter(oid => oid !== id);
      if (lote.ordens.length === 0) {
        appState.lotes = appState.lotes.filter(l => l.id !== o.lote);
        await DB.deleteLote(o.lote);
      } else {
        DB.saveLote(lote);
      }
    }
  }

  o.status = 'pending';
  o.lote = null;
  await DB.saveOrdem(o);
  
  await DB.log("Reverteu Ordem", "unilux_ordens", `${id} voltou para Pendente`);
  renderOrdens(); updateBadges();
  showToast(`Ordem ${id} voltou para status pendente!`, 'success');
}

async function _reverterTodasOrdens() {
  if (!requirePermission('orders:write')) return;
  const inBatch = appState.ordens.filter(o => o.status === 'in_batch');
  if (inBatch.length === 0) return;
  
  if (!confirm(`Deseja reverter TODAS as ${inBatch.length} ordens deste lote para o status Pendente?`)) return;
  
  showToast('Processando revers\u00e3o em massa...', 'info');

  const lotesAfetados = [...new Set(inBatch.map(o => o.lote).filter(Boolean))];

  // Atualizar ordens na mem\u00f3ria e banco
  for (const o of inBatch) {
    o.status = 'pending';
    o.lote = null;
    await DB.saveOrdem(o);
  }

  // Limpar lotes agora vazios
  for (const lid of lotesAfetados) {
    appState.lotes = appState.lotes.filter(l => l.id !== lid);
    await DB.deleteLote(lid);
  }

  showToast('Sucesso! Todas as ordens voltaram para a lista Pendente.', 'success');
  await DB.log("Reverter Massa", "unilux_ordens", `${inBatch.length} ordens revertidas`);
  
  renderOrdens();
  updateBadges();
}

/* =====================================================================
   EXCEL IMPORT LOGIC
   ===================================================================== */
async function _handleExcelUpload(e) {
  if (!requirePermission('orders:write')) return;
  const file = e.target.files[0];
  if (!file) return;

  showToast('Lendo arquivo, aguarde...', 'info');

  const reader = new FileReader();
  reader.onload = async function(ev) {
    try {
      const data = new Uint8Array(ev.target.result);
      const workbook = window.XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
      const result = _prepareOrdensImport(rows, { sourceName: file.name || 'planilha' });

      if (!result.ok) {
        _showImportReport(result);
        return;
      }

      const clearFirst = confirm("Deseja LIMPAR a lista de ordens pendentes atual antes de importar?\n\n(Clique em CANCELAR para apenas ADICIONAR as novas ordens)");
      await _commitOrdensImport(result, {
        clearFirst,
        successMessage: 'Importação concluída!',
        logAction: 'Importou Planilha'
      });
    } catch (err) {
      console.error(err);
      showToast('Erro ao processar arquivo Excel. Verifique o formato.', 'error');
    } finally {
      const fileInput = document.getElementById('opExcelFile');
      if (fileInput) fileInput.value = '';
      renderOrdens();
      updateBadges();
    }
  };

  reader.readAsArrayBuffer(file);
}

/* =====================================================================
   PASTE FROM EXCEL LOGIC
   ===================================================================== */
function _openColarExcelModal() {
  if (!requirePermission('orders:write')) return;
  const allHeaders = ['mrp', 'op_codigo', 'quantidade', 'numero_pedido_cliente', 'nome_cliente', 'codigo_cliente', 'sku_codigo', 'nome_produto', 'data_entrega', 'observacao', 'largura_corte', 'altura_corte', 'numero_etiqueta', 'largura_peca', 'altura_peca', 'descricao_configuracao', 'garras', 'modelo', 'qtd_carrinhos', 'emenda'];
  const reqHeaders = ['op_codigo', 'quantidade', 'sku_codigo', 'largura_corte'];

  openModal('Colar do Excel', `
    <div style="font-size:13px; color:var(--text-500); margin-bottom:16px;">Copie as células do Excel (incluindo cabeçalho) e cole abaixo</div>
    
    <div style="background:var(--bg-100); border:1px solid var(--border); border-radius:8px; padding:16px; margin-bottom:16px;">
      <div style="font-size:11px; font-weight:700; color:var(--text-400); margin-bottom:8px;">COLUNAS ESPERADAS (NA PRIMEIRA LINHA DO EXCEL):</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
        ${allHeaders.map(h => `<span style="background:#fff; border:1px solid #d1d5db; padding:4px 8px; border-radius:4px; font-size:12px; font-family:monospace;">${h}</span>`).join('')}
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-white btn-sm" onclick="navigator.clipboard.writeText('${allHeaders.join('\\t')}'); showToast('Cabeçalhos copiados!', 'success');">📄 Copiar todos os cabeçalhos</button>
        <button class="btn btn-white btn-sm" style="color:var(--green); border-color:#bbf7d0;" onclick="navigator.clipboard.writeText('${reqHeaders.join('\\t')}'); showToast('Cabeçalhos obrigatórios copiados!', 'success');">📄 Copiar só obrigatórios</button>
      </div>
      <div style="font-size:12px; color:var(--text-500); margin-top:8px;">
        💡 Dica: Use o botão ⬇ Modelo para baixar uma planilha já com os cabeçalhos corretos. Preencha e cole aqui.
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" style="font-size:11px; font-weight:700; color:var(--text-400); text-transform:uppercase;">COLE OS DADOS AQUI:</label>
      <textarea id="pasteExcelArea" class="form-control" style="height:150px; font-family:monospace; font-size:12px; white-space:pre;" placeholder="Cole aqui as células copiadas do Excel.&#10;Ex:&#10;mrp&#09;op_codigo&#09;quantidade..."></textarea>
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" onclick="_processarColarExcel()">✓ Confirmar Importação</button>
  `);
}

async function _processarColarExcel() {
  if (!requirePermission('orders:write')) return;
  const text = document.getElementById('pasteExcelArea').value;
  if (!text || !text.trim()) { showToast('Nenhum dado colado!', 'error'); return; }

  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) { showToast('Cole o cabeçalho e pelo menos uma linha de dados.', 'error'); return; }

  const rows = lines.map(line => line.split('\t'));
  const result = _prepareOrdensImport(rows, { sourceName: 'texto colado' });
  if (!result.ok) {
    _showImportReport(result);
    return;
  }

  closeModal();
  await _commitOrdensImport(result, {
    clearFirst: false,
    successMessage: 'Importação concluída!',
    logAction: 'Importou Texto Excel'
  });
  renderOrdens();
  updateBadges();
}

const OP_IMPORT_ALIASES = {
  op: ['op', 'opcodigo', 'op_codigo', 'numeroop', 'numero_op', 'ordemproducao', 'ordem_producao', 'ordemdeproducao'],
  qty: ['quantidade', 'qtd', 'qtde', 'qtdpecas', 'qtd_pecas', 'qtdpeca', 'pecas'],
  sku: ['sku', 'skucodigo', 'sku_codigo', 'codigosku', 'codigo_sku', 'codigoitem', 'codigo_item', 'codigoproduto', 'codigo_produto', 'material', 'perfil'],
  dim: ['larguracorte', 'largura_corte', 'dimensaocorte', 'dimensao_corte', 'medidacorte', 'medida_corte', 'medida', 'comprimento', 'comprimentocorte', 'largura'],
  cliente: ['nomecliente', 'nome_cliente', 'cliente', 'nrpedcli', 'pedido_cliente', 'numero_pedido_cliente'],
  entrega: ['dataentrega', 'data_entrega', 'entrega', 'dtentrega'],
  mrp: ['mrp'],
  pedido: ['numeropedido', 'numero_pedido', 'pedido', 'nrpedido'],
  etiqueta: ['numeroetiqueta', 'numero_etiqueta', 'etiqueta'],
  subclasse: ['subclasse'],
  obs: ['observacao', 'observacao_', 'obs']
};

const OP_LEGACY_COLUMNS = {
  mrp: 0,
  op: 1,
  qty: 2,
  pedido: 3,
  cliente: 4,
  sku: 5,
  etiqueta: 6,
  subclasse: 7,
  entrega: 8,
  obs: 9,
  dim: 10
};

function _prepareOrdensImport(rows, opts = {}) {
  const sourceName = opts.sourceName || 'importação';
  const headerInfo = _detectImportColumns(rows);
  const columns = headerInfo.columns;
  const startIdx = headerInfo.headerRow >= 0 ? headerInfo.headerRow + 1 : 0;
  const errors = [];
  const warnings = [];
  const grouped = new Map();
  let sourceRows = 0;
  let blankRows = 0;

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i] || [];
    const lineNo = i + 1;
    if (!_rowHasContent(row)) {
      blankRows++;
      continue;
    }

    const rawOp = _cell(row, columns.op);
    const rawQty = _cell(row, columns.qty);
    const rawSku = _cell(row, columns.sku);
    const rawDim = _cell(row, columns.dim);
    const baseOp = _normalizeOpId(rawOp);
    const qty = _parseImportQty(rawQty);
    const dim = _parseImportDim(rawDim);
    const sku = _canonicalSku(rawSku);
    const rowErrors = [];

    if (!baseOp) rowErrors.push('OP vazia');
    if (!Number.isInteger(qty) || qty <= 0) rowErrors.push('quantidade inválida');
    if (!Number.isFinite(dim) || dim <= 0) rowErrors.push('medida de corte inválida');
    if (!String(rawSku ?? '').trim()) {
      rowErrors.push('SKU vazio');
    } else if (!_skuExists(sku)) {
      rowErrors.push(`SKU não cadastrado: ${rawSku}`);
    }

    if (rowErrors.length) {
      errors.push({ line: lineNo, op: baseOp || String(rawOp || '-'), reason: rowErrors.join(', ') });
      continue;
    }

    sourceRows++;
    const entrega = _parseImportDate(_cell(row, columns.entrega));
    const rowOrder = {
      id: baseOp,
      sku,
      dim,
      qty,
      cliente: String(_cell(row, columns.cliente) || '').trim() || 'Planilha',
      entrega: entrega || new Date().toISOString().split('T')[0],
      status: 'pending',
      lote: null,
      _meta: {
        mrp: String(_cell(row, columns.mrp) || ''),
        op_original: String(rawOp || ''),
        base_op: baseOp,
        line_id: baseOp,
        pedido: String(_cell(row, columns.pedido) || ''),
        etiqueta: String(_cell(row, columns.etiqueta) || ''),
        subclasse: String(_cell(row, columns.subclasse) || ''),
        obs: String(_cell(row, columns.obs) || ''),
        import_source: sourceName,
        import_rows: [lineNo]
      }
    };

    const groupKey = `${baseOp}|${_orderLineSignature(sku, dim)}`;
    const existingGroup = grouped.get(groupKey);
    if (existingGroup) {
      existingGroup.qty += rowOrder.qty;
      existingGroup._meta.import_rows.push(lineNo);
      if (rowOrder._meta.etiqueta) {
        existingGroup._meta.etiqueta = [existingGroup._meta.etiqueta, rowOrder._meta.etiqueta].filter(Boolean).join(', ');
      }
      warnings.push(`${baseOp} aparece mais de uma vez com o mesmo SKU/medida; quantidade somada para ${existingGroup.qty} pç.`);
    } else {
      grouped.set(groupKey, rowOrder);
    }
  }

  const orders = _assignImportOrderIds([...grouped.values()], warnings);

  if (!sourceRows && !errors.length) {
    errors.push({ line: '-', op: '-', reason: 'nenhuma linha válida encontrada para importar' });
  }

  const totalPieces = orders.reduce((sum, o) => sum + Number(o.qty || 0), 0);
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    orders,
    sourceRows,
    blankRows,
    totalPieces,
    mergedRows: Math.max(0, sourceRows - orders.length),
    headerMode: headerInfo.headerRow >= 0 ? `cabeçalho linha ${headerInfo.headerRow + 1}` : 'layout legado',
    sourceName
  };
}

function _assignImportOrderIds(orders, warnings) {
  const usedIds = new Set((appState.ordens || []).map(o => o.id));
  const claimedPendingIds = new Set();
  const byBase = new Map();

  orders.forEach(order => {
    const baseOp = order._meta?.base_op || _ordemBaseOp(order);
    if (!byBase.has(baseOp)) byBase.set(baseOp, []);
    byBase.get(baseOp).push(order);
  });

  byBase.forEach((baseOrders, baseOp) => {
    if (baseOrders.length > 1) {
      warnings.push(`${baseOp} possui ${baseOrders.length} perfis/medidas diferentes; serão criadas linhas internas separadas.`);
    }

    baseOrders
      .sort((a, b) => (a._meta.import_rows?.[0] || 0) - (b._meta.import_rows?.[0] || 0))
      .forEach(order => {
        const signature = _orderLineSignature(order.sku, order.dim);
        const matchingPending = (appState.ordens || []).find(existing =>
          existing.status === 'pending' &&
          !claimedPendingIds.has(existing.id) &&
          _ordemBaseOp(existing) === baseOp &&
          _orderLineSignature(existing.sku, existing.dim) === signature
        );

        if (matchingPending) {
          order.id = matchingPending.id;
          claimedPendingIds.add(matchingPending.id);
          warnings.push(`Linha pendente ${matchingPending.id} de ${baseOp} será atualizada.`);
        } else {
          order.id = _allocateOrderLineId(baseOp, order.sku, order.dim, usedIds);
          if (order.id !== baseOp) {
            const existingBase = (appState.ordens || []).find(existing => _ordemBaseOp(existing) === baseOp);
            if (existingBase) {
              warnings.push(`${baseOp} já existe no histórico/sistema; nova linha criada como ${order.id}.`);
            }
          }
        }

        order._meta.base_op = baseOp;
        order._meta.line_id = order.id;
        usedIds.add(order.id);
      });
  });

  return orders;
}

function _orderLineSignature(sku, dim) {
  return `${String(_canonicalSku(sku)).trim().toLowerCase()}|${Number(dim) || 0}`;
}

function _allocateOrderLineId(baseOp, sku, dim, usedIds) {
  const used = usedIds || new Set((appState.ordens || []).map(o => o.id));
  const base = _normalizeOpId(baseOp);
  if (base && !used.has(base)) return base;

  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-L${String(i).padStart(2, '0')}`;
    if (!used.has(candidate)) return candidate;
  }

  const fallback = `${base}-L${Date.now()}`;
  return used.has(fallback) ? `${fallback}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` : fallback;
}

function _detectImportColumns(rows) {
  const maxRows = Math.min(rows.length, 12);
  for (let i = 0; i < maxRows; i++) {
    const header = (rows[i] || []).map(_normalizeImportHeader);
    const columns = {};
    Object.keys(OP_IMPORT_ALIASES).forEach(key => {
      columns[key] = _findImportColumn(header, OP_IMPORT_ALIASES[key]);
    });
    if (columns.qty !== -1 && columns.sku !== -1 && columns.dim !== -1) {
      return { headerRow: i, columns };
    }
  }
  return { headerRow: -1, columns: { ...OP_LEGACY_COLUMNS } };
}

function _findImportColumn(header, aliases) {
  return header.findIndex(h => aliases.includes(h));
}

function _normalizeImportHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function _cell(row, idx) {
  return idx === undefined || idx === -1 ? '' : row[idx];
}

function _rowHasContent(row) {
  return (row || []).some(cell => String(cell ?? '').trim() !== '');
}

function _parseImportQty(value) {
  const n = _parseImportNumber(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n);
}

function _parseImportDim(value) {
  const n = _parseImportNumber(value);
  if (!Number.isFinite(n) || n <= 0) return NaN;
  return Math.round(n > 100 ? n : n * 1000);
}

function _parseImportNumber(value) {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  const cleaned = raw.replace(/[^\d,.-]/g, '');
  if (!cleaned) return NaN;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  if (hasComma && hasDot) return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  if (hasComma) return parseFloat(cleaned.replace(',', '.'));
  return parseFloat(cleaned);
}

function _parseImportDate(value) {
  if (!value) return '';
  if (value instanceof Date && !isNaN(value)) return value.toISOString().split('T')[0];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date((value - 25569) * 86400 * 1000).toISOString().split('T')[0];
  }
  const raw = String(value).trim().split(' ')[0];
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (raw.includes('/')) {
    const [d, m, y] = raw.split('/');
    if (d && m && y) return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return raw;
}

function _canonicalSku(rawSku) {
  const raw = String(rawSku ?? '').trim();
  const found = appState.skus.find(s => String(s.code || '').trim().toLowerCase() === raw.toLowerCase());
  return found ? found.code : raw;
}

function _skuExists(sku) {
  return appState.skus.some(s => String(s.code || '').trim().toLowerCase() === String(sku || '').trim().toLowerCase());
}

async function _commitOrdensImport(result, opts = {}) {
  if (!requirePermission('orders:write')) return;
  showToast('Validado. Salvando OPs...', 'info');
  try {
    if (opts.clearFirst) {
      const pendingToClear = appState.ordens.filter(o => o.status === 'pending').map(o => o.id);
      for (const id of pendingToClear) await DB.deleteOrdem(id);
      appState.ordens = appState.ordens.filter(o => o.status !== 'pending');
    }

    for (const ordem of result.orders) {
      const idx = appState.ordens.findIndex(o => o.id === ordem.id);
      if (idx !== -1) appState.ordens[idx] = ordem;
      else appState.ordens.push(ordem);
      await DB.saveOrdem(ordem);
    }

    DB.saveConfig(appState.configs);
    await DB.log(opts.logAction || 'Importou OPs', 'unilux_ordens', `${result.orders.length} linha(s) de OP, ${result.totalPieces} peça(s), ${result.sourceRows} linha(s), ${result.mergedRows} linha(s) agrupada(s)`);
    showToast(`${opts.successMessage || 'Importação concluída!'} ${result.orders.length} linha(s) / ${result.totalPieces} peça(s).`, 'success');
    if (result.warnings.length || result.mergedRows) _showImportReport({ ...result, ok: true });
  } catch (err) {
    console.error('Erro ao salvar importação:', err);
    showToast('Erro ao salvar OPs no banco. A importação foi interrompida.', 'error');
  }
}

function _showImportReport(result) {
  const statusTitle = result.ok ? 'Importação validada' : 'Importação bloqueada';
  const statusColor = result.ok ? '#166534' : '#991b1b';
  const statusBg = result.ok ? '#f0fdf4' : '#fef2f2';
  const statusBorder = result.ok ? '#bbf7d0' : '#fecaca';
  const errors = (result.errors || []).slice(0, 20).map(e => `
    <tr>
      <td>${_uiEsc(String(e.line))}</td>
      <td>${_uiEsc(e.op || '-')}</td>
      <td>${_uiEsc(e.reason || '')}</td>
    </tr>
  `).join('');
  const warnings = (result.warnings || []).slice(0, 12).map(w => `<li>${_uiEsc(w)}</li>`).join('');

  openModal(statusTitle, `
    <div style="background:${statusBg}; border:1px solid ${statusBorder}; color:${statusColor}; border-radius:8px; padding:12px; margin-bottom:16px; font-size:13px; font-weight:700;">
      ${result.ok ? 'Nenhum erro crítico encontrado.' : 'Nenhuma linha de OP foi salva. Corrija os itens abaixo e importe novamente.'}
    </div>
    <div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px; margin-bottom:16px;">
      ${_importMetric('Linhas lidas', result.sourceRows || 0)}
      ${_importMetric('Linhas OP', (result.orders || []).length)}
      ${_importMetric('Peças', result.totalPieces || 0)}
      ${_importMetric('Agrupadas', result.mergedRows || 0)}
    </div>
    <div style="font-size:12px; color:var(--text-400); margin-bottom:12px;">Origem: ${_uiEsc(result.sourceName || '-')} · Leitura: ${_uiEsc(result.headerMode || '-')}</div>
    ${warnings ? `<div style="margin-bottom:16px;"><div class="form-label">Avisos</div><ul style="margin:6px 0 0 18px; color:var(--text-500); font-size:12px;">${warnings}</ul></div>` : ''}
    ${errors ? `
      <div class="form-label">Erros encontrados</div>
      <div class="tbl-wrap" style="max-height:260px; overflow:auto; margin-top:8px;">
        <table class="tbl">
          <thead><tr><th>Linha</th><th>OP</th><th>Motivo</th></tr></thead>
          <tbody>${errors}</tbody>
        </table>
      </div>
      ${(result.errors || []).length > 20 ? `<div style="font-size:12px; color:var(--text-400); margin-top:8px;">Mostrando 20 de ${result.errors.length} erros.</div>` : ''}
    ` : ''}
  `, `
    <button class="btn btn-dark" onclick="closeModal()">OK</button>
  `);
}

function _importMetric(label, value) {
  return `
    <div style="border:1px solid var(--border); border-radius:8px; padding:10px; background:#fff;">
      <div style="font-size:10px; color:var(--text-400); font-weight:800; text-transform:uppercase;">${label}</div>
      <div style="font-size:20px; font-weight:800; color:var(--text-900);">${value}</div>
    </div>
  `;
}
