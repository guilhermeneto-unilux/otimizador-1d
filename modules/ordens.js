/* ===== ORDENS DE PRODUÇÃO – UNILUX 1D ===== */

function renderOrdens() {
  const tab      = appState._ordensTab || 'pending';
  const pending  = appState.ordens.filter(o => o.status === 'pending');
  const inBatch  = appState.ordens.filter(o => o.status === 'in_batch');

  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">${pending.length} pendente(s) · ${inBatch.length} em lote</div>
        <h1 class="pg-title">Ordens de Produção</h1>
      </div>
      <div class="pg-actions">
        <button class="btn btn-white btn-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          Modelo
        </button>
        <button class="btn btn-white btn-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV
        </button>
        <input type="file" id="opExcelFile" accept=".xlsx, .xls, .csv" style="display:none;" onchange="_handleExcelUpload(event)">
        <button class="btn btn-white btn-sm" style="background:#fff7ed; border-color:#fdba74; color:#c2410c;" onclick="document.getElementById('opExcelFile').click()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Importar Planilha
        </button>
        <button class="btn btn-white btn-sm" onclick="_novaOrdemModal()">+ Nova Ordem</button>
        ${tab === 'pending' ? `<button class="btn btn-white btn-sm" style="color:var(--red); border-color:#fee2e2; margin-right:4px;" onclick="_excluirOrdensMassa()">Excluir Selecionadas</button>` : ''}
        <button class="btn btn-green" onclick="_criarLote()">Criar Lote →</button>
      </div>
    </div>

    <div class="tabs">
      <span class="tab ${tab === 'pending' ? 'active' : ''}" onclick="_setOrdensTab('pending')">Pendentes (${pending.length})</span>
      <span class="tab ${tab === 'batch'   ? 'active' : ''}" onclick="_setOrdensTab('batch')">Em Lote (${inBatch.length})</span>
      ${tab === 'batch' && inBatch.length > 0 
        ? `<button class="btn btn-ghost btn-sm" style="margin-left:auto; color:var(--red); border:1px solid #fee2e2; font-weight:700;" onclick="_reverterTodasOrdens()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reverter Tudo para Pendente
           </button>` 
        : ''}
    </div>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:36px;"><input type="checkbox" id="checkAll" onchange="_toggleAll(this)"></th>
            <th>OP</th><th>SKU</th><th>Dimensão Corte</th><th>QTD</th><th>Entrega</th><th>Cliente</th><th>Status</th><th style="text-align:right;">Ação</th>
          </tr>
        </thead>
        <tbody>
          ${_ordensRows(tab === 'pending' ? pending : inBatch)}
        </tbody>
      </table>
    </div>
  `;
}

function _ordensRows(list) {
  if (!list.length) return `<tr><td colspan="8" class="tbl-empty">Nenhuma ordem</td></tr>`;
  return list.map(o => {
    const c = skuColor(o.sku);
    return `
    <tr>
      <td><input type="checkbox" class="ord-chk" data-id="${o.id}"></td>
      <td class="fw-700" style="font-size:13px;">${o.id}</td>
      <td><span class="sku-tag" style="background:${c.bg};color:${c.text};">${o.sku}</span></td>
      <td class="fw-700">${fmtM(o.dim)}</td>
      <td>${o.qty} pç</td>
      <td style="color:var(--text-400);">${_fmtDate(o.entrega)}</td>
      <td style="color:var(--text-400);">${o.cliente || '—'}</td>
      <td><span class="status-badge ${o.status === 'pending' ? 'badge-pending' : o.status === 'in_batch' ? 'badge-batch' : 'badge-approved'}">
        ${o.status === 'pending' ? 'Pendente' : o.status === 'in_batch' ? `Lote ${o.lote}` : 'Concluído'}
      </span></td>
      <td style="text-align:right;">
        ${o.status === 'pending' 
          ? `<button class="btn btn-ghost btn-sm" style="color:var(--red); padding:4px 8px;" onclick="if(confirm('Tem certeza que deseja excluir esta Ordem de Produção?')) _deleteOrdem('${o.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>` 
          : o.status === 'in_batch' 
          ? `<button class="btn btn-white btn-sm" style="padding:4px 8px;" onclick="_reverterOrdem('${o.id}')" title="Voltar para Pendente">Reverter</button>` 
          : ''}
      </td>
    </tr>`;
  }).join('');
}

function _fmtDate(iso) {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function _setOrdensTab(tab) { appState._ordensTab = tab; renderOrdens(); }
function _toggleAll(el) { document.querySelectorAll('.ord-chk').forEach(c => c.checked = el.checked); }

function _novaOrdemModal() {
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

function _salvarOrdem() {
  let rawId   = document.getElementById('opId').value.trim();
  const sku   = document.getElementById('opSku').value.trim();
  const dim   = Math.round(parseFloat(document.getElementById('opDim').value.replace(',', '.')) * 1000);
  const qty   = parseInt(document.getElementById('opQty').value);
  const cliente = document.getElementById('opCliente').value || 'Geral';
  const entrega = document.getElementById('opEntrega').value || new Date().toISOString().split('T')[0];
  
  if (!rawId) { showToast('Preencha o número da OP!', 'error'); return; }
  if (!sku) { showToast('Selecione um SKU/Material!', 'error'); return; }
  if (!dim || !qty) { showToast('Preencha dimensão e quantidade!', 'error'); return; }
  
  // Validar que o SKU existe no catálogo
  const skuExists = appState.skus.some(s => s.code === sku);
  if (!skuExists) { showToast('SKU não encontrado no catálogo!', 'error'); return; }
  
  // Formatar o ID: adicionar prefixo OP- se o usuário não colocou
  const id = rawId.toUpperCase().startsWith('OP-') ? rawId.toUpperCase() : `OP-${rawId}`;
  
  // Verificar duplicata
  if (appState.ordens.some(o => o.id === id)) { showToast(`Ordem ${id} já existe!`, 'error'); return; }
  
  const novaOrdem = { id, sku, dim, qty, cliente, entrega, status: 'pending', lote: null };
  appState.ordens.push(novaOrdem);
  DB.saveOrdem(novaOrdem);
  
  closeModal();
  showToast(`Ordem ${id} criada!`, 'success');
  renderOrdens(); updateBadges();
}

function _criarLote() {
  const sel = [...document.querySelectorAll('.ord-chk:checked')].map(c => c.dataset.id);
  if (!sel.length) { showToast('Selecione ao menos uma ordem!', 'error'); return; }
  
  // Solicitar número do lote ao usuário
  const userLoteId = prompt('Digite o número/nome do lote:');
  if (!userLoteId || !userLoteId.trim()) { showToast('Número do lote é obrigatório!', 'error'); return; }
  
  const id = userLoteId.trim();
  
  // Verificar duplicata
  if (appState.lotes.some(l => l.id === id)) { showToast(`Lote "${id}" já existe!`, 'error'); return; }

  const skus = [...new Set(sel.map(oid => appState.ordens.find(o => o.id === oid)?.sku).filter(Boolean))];
  if (!skus.length) { showToast('Erro ao identificar SKUs!', 'error'); return; }
  const loteObj = { id, ordens: sel, skus, criacao: new Date().toISOString().split('T')[0], status: 'pending' };
  appState.lotes.push(loteObj);
  DB.saveLote(loteObj);
  appState.ordens.forEach(o => { 
    if(sel.includes(o.id)) { 
      o.status = 'in_batch'; 
      o.lote = id; 
      DB.saveOrdem(o);
    } 
  });
  showToast(`Lote ${id} criado!`, 'success');
  navigate('otimizador');
}

async function _deleteOrdem(id) {
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
  const file = e.target.files[0];
  if (!file) return;

  showToast('Lendo arquivo, aguarde...', 'info');

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = window.XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const clearFirst = confirm("Deseja LIMPAR a lista de ordens pendentes atual antes de importar?\n\n(Clique em CANCELAR para apenas ADICIONAR as novas ordens)");
      if (clearFirst) {
        // Remove only pending orders (keep those in batch)
        appState.ordens = appState.ordens.filter(o => o.status !== 'pending');
        // Note: they stay in DB but will be overwritten by same ID or added as new. 
        // For a full clear of pending from DB, more logic is needed, but this helps the user's view.
      }

      let count = 0;
      
      // Itera a partir da linha index 1 assumindo que 0 tem cabeçalho
      // Mas checa todas as linhas para ver se têm dados mínimos válidos
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r.length) continue;

        // Expectation:
        // 0: MRP, 1: OP, 2: Qtd, 3: Nr Pedido, 4: Nr Ped Cli, 5: SKU, 6: Etiqueta, 7: Subclasse, 8: Entrega, 9: Obs, 10: Dim
        const rawQty = parseInt(r[2], 10);
        const rawSku = String(r[5] || '').trim();
        // Converte Largura (m) da Planilha para milímetros (int)
        const rawDim = Math.round(parseFloat(String(r[10]).replace(',', '.')) * 1000);

        // Validação: só importa linhas que tiverem número em Largura e Quantidade, e algum Sku
        if (isNaN(rawDim) || isNaN(rawQty) || rawDim <= 0 || rawQty <= 0 || !rawSku) {
           continue; 
        }

        const opId = String(r[1] || '').trim();
        let finalId;
        if (opId) {
          finalId = `OP-${opId}`;
        } else {
          finalId = `OP-IMP-${String(appState.configs.nextImportOpId++).padStart(4,'0')}`;
        }
        const clienteStr = String(r[4] || '').trim();
        
        let entrega = '';
        if (r[8]) {
          // Se o excel mandar como número serial, a lib do SheetJS às vezes extrai numero
          if (typeof r[8] === 'number') {
             entrega = new Date((r[8] - (25567 + 2)) * 86400 * 1000).toISOString().split('T')[0];
          } else {
             entrega = String(r[8]).split(' ')[0]; // Pega a parte da data
          }
        }

        const novaOrdem = {
          id: finalId,
          sku: rawSku,
          dim: rawDim,
          qty: rawQty,
          cliente: clienteStr || 'Planilha',
          entrega: entrega || new Date().toISOString().split('T')[0],
          status: 'pending',
          lote: null,
          _meta: {
             mrp: r[0] || '',
             op_original: r[1] || '',
             pedido: r[3] || '',
             etiqueta: r[6] || '',
             subclasse: r[7] || '',
             obs: r[9] || ''
          }
        };

        const existingIdx = appState.ordens.findIndex(o => o.id === finalId);
        if (existingIdx !== -1) {
          appState.ordens[existingIdx] = novaOrdem;
        } else {
          appState.ordens.push(novaOrdem);
        }
        
        DB.saveOrdem(novaOrdem); 
        count++;
      }
      
      DB.saveConfig(appState.configs);

      showToast(`Importação concluída! ${count} OPs carregadas.`, 'success');
      DB.log("Importou Planilha", "unilux_ordens", `${count} ordens importadas`);
      
    } catch (err) {
      console.error(err);
      showToast('Erro ao processar arquivo Excel. Verifique o formato.', 'error');
    } finally {
      // reseta o input
      document.getElementById('opExcelFile').value = '';
      renderOrdens(); 
      updateBadges();
    }
  };
  
  reader.readAsArrayBuffer(file);
}
