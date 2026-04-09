/* ===== MODULE: ORDENS DE PRODUÇÃO ===== */

function renderOrdens() {
  const pendentes = appState.ordens.filter(o => o.status === 'pending');
  const emLote    = appState.ordens.filter(o => o.status === 'batch');

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Ordens de Produção</h1>
        <p class="page-subtitle">Gerencie e envie ordens para otimização</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="_mockImportarOP()" title="Em breve">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Importar Excel
        </button>
        <button class="btn btn-secondary btn-sm" onclick="_mockExportarOP()" title="Em breve">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Exportar Excel
        </button>
        <button class="btn btn-primary" onclick="_openNovaOP()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Ordem
        </button>
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs" id="ordTabs">
      <button class="tab-btn active" data-tab="pendentes" onclick="_switchOrdTab('pendentes')">
        Pendentes <span class="badge badge-warning" style="margin-left:6px">${pendentes.length}</span>
      </button>
      <button class="tab-btn" data-tab="emLote" onclick="_switchOrdTab('emLote')">
        Em Lote <span class="badge badge-info" style="margin-left:6px">${emLote.length}</span>
      </button>
    </div>

    <!-- TAB: PENDENTES -->
    <div class="tab-panel active" id="tab-pendentes">
      <div class="table-wrapper">
        <div class="table-header">
          <span class="table-title">Ordens aguardando otimização</span>
          <div class="table-actions">
            <button class="btn btn-primary btn-sm" id="btnCriarLote" onclick="_criarLote()" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
              Criar Lote com Selecionadas
            </button>
          </div>
        </div>
        <div class="table-scroll">
          <table id="tablePendentes">
            <thead>
              <tr>
                <th class="checkbox-cell"><input type="checkbox" id="chkAllPend" onchange="_toggleAllPend(this)"></th>
                <th>OP</th><th>SKU</th><th>Dimensão</th><th>Qtd</th>
                <th>Entrega</th><th>Cliente</th><th>Status</th>
              </tr>
            </thead>
            <tbody id="tbodyPendentes">
              ${pendentes.length === 0
                ? `<tr><td colspan="8"><div class="table-empty">✅ Nenhuma ordem pendente</div></td></tr>`
                : pendentes.map(o => `
                  <tr id="row-${o.id}">
                    <td class="checkbox-cell">
                      <input type="checkbox" class="chk-pend" value="${o.id}" onchange="_updateCriarLoteBtn()">
                    </td>
                    <td><span class="font-700">${o.id}</span></td>
                    <td>${_skuTag(o.sku)}</td>
                    <td><span class="font-600">${o.dim} mm</span></td>
                    <td>${o.qty} pç</td>
                    <td>${formatDate(o.entrega)}</td>
                    <td>${o.cliente}</td>
                    <td><span class="status-pill status-pending">Pendente</span></td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB: EM LOTE -->
    <div class="tab-panel" id="tab-emLote">
      <div class="table-wrapper">
        <div class="table-header">
          <span class="table-title">Ordens agrupadas em lotes</span>
          <button class="btn btn-secondary btn-sm" onclick="navigate('otimizador')">
            Ir para Otimizador →
          </button>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>OP</th><th>Lote</th><th>SKU</th><th>Dimensão</th>
                <th>Qtd</th><th>Entrega</th><th>Cliente</th><th>Status</th>
              </tr>
            </thead>
            <tbody id="tbodyEmLote">
              ${emLote.length === 0
                ? `<tr><td colspan="8"><div class="table-empty">Nenhuma ordem em lote</div></td></tr>`
                : emLote.map(o => `
                  <tr>
                    <td><span class="font-700">${o.id}</span></td>
                    <td>
                      <span class="badge badge-info">${o.lote}</span>
                    </td>
                    <td>${_skuTag(o.sku)}</td>
                    <td><span class="font-600">${o.dim} mm</span></td>
                    <td>${o.qty} pç</td>
                    <td>${formatDate(o.entrega)}</td>
                    <td>${o.cliente}</td>
                    <td><span class="status-pill status-batch">Em Lote</span></td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function _switchOrdTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
}

function _toggleAllPend(master) {
  document.querySelectorAll('.chk-pend').forEach(c => c.checked = master.checked);
  _updateCriarLoteBtn();
}

function _updateCriarLoteBtn() {
  const anyChecked = [...document.querySelectorAll('.chk-pend')].some(c => c.checked);
  const btn = document.getElementById('btnCriarLote');
  if (btn) btn.disabled = !anyChecked;
}

function _criarLote() {
  const selected = [...document.querySelectorAll('.chk-pend:checked')].map(c => c.value);
  if (!selected.length) return;

  const loteId = `LT-${String(appState.nextLoteId++).padStart(3,'0')}`;
  const skusInvolved = [...new Set(selected.map(id => appState.ordens.find(o=>o.id===id)?.sku).filter(Boolean))];

  appState.lotes.push({
    id: loteId, ordens: selected, status: 'pending',
    criacao: new Date().toISOString().split('T')[0],
    skus: skusInvolved,
  });

  selected.forEach(id => {
    const o = appState.ordens.find(x => x.id === id);
    if (o) { o.status = 'batch'; o.lote = loteId; }
  });

  showToast(`Lote ${loteId} criado com ${selected.length} ordem(ns)!`, 'success');
  renderOrdens();
  _switchOrdTab('emLote');
}

function _openNovaOP() {
  const skuOptions = appState.skus.map(s => `<option value="${s.code}">${s.code} – ${s.desc}</option>`).join('');
  openModal('Nova Ordem de Produção', `
    <div class="form-group">
      <label class="form-label">SKU *</label>
      <select class="form-select" id="novaOpSku">${skuOptions}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Dimensão do Corte (mm) *</label>
        <input class="form-input" type="number" id="novaOpDim" placeholder="ex: 1200" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">Quantidade (peças) *</label>
        <input class="form-input" type="number" id="novaOpQty" placeholder="ex: 10" min="1">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data de Entrega *</label>
        <input class="form-input" type="date" id="novaOpEntrega">
      </div>
      <div class="form-group">
        <label class="form-label">Cliente</label>
        <input class="form-input" type="text" id="novaOpCliente" placeholder="Nome do cliente">
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_salvarNovaOP()">Criar Ordem</button>
  `);
}

function _salvarNovaOP() {
  const sku    = document.getElementById('novaOpSku').value;
  const dim    = parseInt(document.getElementById('novaOpDim').value);
  const qty    = parseInt(document.getElementById('novaOpQty').value);
  const entrega = document.getElementById('novaOpEntrega').value;
  const cliente = document.getElementById('novaOpCliente').value || 'Cliente';

  if (!dim || !qty || !entrega) { showToast('Preencha todos os campos obrigatórios', 'error'); return; }

  const newId = `OP-${String(appState.ordens.length + 1).padStart(3,'0')}`;
  appState.ordens.push({ id: newId, sku, dim, qty, entrega, cliente, status: 'pending', lote: null });

  closeModal();
  showToast(`Ordem ${newId} criada com sucesso!`, 'success');
  renderOrdens();
}

function _mockImportarOP() { showToast('Importação via Excel – funcionalidade em breve!', 'info'); }
function _mockExportarOP() { showToast('Exportação via Excel – funcionalidade em breve!', 'info'); }
