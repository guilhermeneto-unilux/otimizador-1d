/* ===== PLANOS DE CORTE – UNILUX 1D ===== */

function renderPlanos() {
  const lotesPend = appState.lotes.filter(l => l.status === 'pending');
  const planos = appState.planos || [];
  const q = (appState.filters.planos || '').trim();
  const filteredCount = q ? planos.filter(p => _planoMatchesSearch(p, q)).length : planos.length;

  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header" style="margin-bottom:24px;">
      <div>
        <div class="pg-eyebrow">${planos.length} plano(s) concluído(s) · ${lotesPend.length} lote(s) aguardando</div>
        <h1 class="pg-title">Planos de Corte</h1>
      </div>
    </div>

    <!-- ABAS OU SEÇÕES -->
    <div style="display:flex; flex-direction:column; gap:32px;">
      
      <!-- SEÇÃO 1: Planos Finalizados -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px;">
          <h2 style="font-size:16px; font-weight:700; color:var(--text-900); margin:0;">Planos Finalizados</h2>
          <div class="search-input-group" style="max-width:360px; width:100%;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" class="form-control" id="planosSearchInput" placeholder="Buscar por plano, lote, SKU ou OP..." value="${_planosEsc(q)}" oninput="_filtrarPlanos(this.value)">
          </div>
        </div>
        <div class="search-results-stats" id="planosSearchStats" style="${q ? 'margin-bottom:10px;' : 'display:none; margin-bottom:10px;'}">${filteredCount} resultados</div>
        <div class="tbl-wrap">
          <table class="tbl" id="tblPlanosFin">
            <thead>
              <tr>
                <th>ID Plano</th>
                <th>Lote Origem</th>
                <th>Aproveitamento</th>
                <th>Barras</th>
                <th>Valor Descartado</th>
                <th>Data Finalização</th>
                <th>Aprovado por</th>
                <th>Status</th>
                <th style="text-align:right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${planos.length ? _planosFinalizadosRows(planos, q) : '<tr><td colspan="9" class="tbl-empty">Nenhum plano finalizado ainda.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SEÇÃO 2: Lotes Pendentes -->
      <div>
        <h2 style="font-size:16px; font-weight:700; margin-bottom:12px; color:var(--text-400);">Lotes em Aguardo</h2>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Ordens</th>
                <th>SKUs</th>
                <th>Data Criação</th>
                <th style="text-align:right;">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${lotesPend.length ? _lotesPendentesRows(lotesPend) : '<tr><td colspan="5" class="tbl-empty">Nenhum lote pendente.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

function _planosFinalizadosRows(planos, q = '') {
  return planos.slice().sort((a,b) => new Date(b.data) - new Date(a.data)).map(p => {
    const barras = p.mapa ? p.mapa.length : 0;
    const approval = _planoApprovalInfo(p);
    const financials = _financialsForStoredPlan(p);
    const searchText = _planoSearchHaystack(p);
    const visible = _planoMatchesSearch(p, q);
    return `
    <tr data-search="${_planosEsc(searchText)}" style="${visible ? '' : 'display:none;'}">
      <td class="fw-700">${p.id}</td>
      <td style="color:var(--text-400);">${p.loteId}</td>
      <td><span class="status-badge badge-approved">${p.aproveitamento}</span></td>
      <td>${barras} barra(s)</td>
      <td><div class="fw-700" style="color:var(--red);" ${financials.unpricedSkuCount ? `title="Total parcial: ${financials.unpricedSkuCount} SKU(s) sem preço"` : ''}>${fmtBRL(financials.discardValue)}${financials.unpricedSkuCount ? ' *' : ''}</div></td>
      <td style="color:var(--text-400);">${new Date(p.data).toLocaleString('pt-BR')}</td>
      <td>
        <div class="fw-700">${_planosEsc(approval.name)}</div>
        ${approval.email ? `<div style="font-size:11px; color:var(--text-400); margin-top:2px;">${_planosEsc(approval.email)}</div>` : ''}
      </td>
      <td><span class="status-badge badge-approved">✓ Concluído</span></td>
      <td style="text-align:right;">
        <div style="display:flex; gap:6px; justify-content:flex-end;">
          <button class="btn btn-white btn-sm" style="background:#f0fdf4; border-color:#bbf7d0; color:#16a34a;" onclick="_exportPlanoExcel('${p.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar Excel
          </button>
          <button class="btn btn-white btn-sm" style="background:#fff1f2; border-color:#fecdd3; color:#e11d48;" onclick="_reverterPlanoParaLote('${p.id}')" title="Desfazer Aprovação e voltar para Lote">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reverter para Lote
          </button>
          <button class="btn btn-white btn-sm" onclick="_verPlanoMapa('${p.id}')">Ver Mapa</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function _planoApprovalInfo(plano) {
  const raw = plano.approvedBy || plano.approved_by || plano.finalizadoPor || plano.finalizado_por || null;
  if (!raw) return { name: 'Sem registro', email: '', role: '' };
  if (typeof raw === 'string') return { name: raw, email: '', role: '' };
  return {
    name: raw.name || raw.user_name || raw.nome || 'Sem registro',
    email: raw.email || '',
    role: raw.role || raw.perfil || ''
  };
}

function _planosEsc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function _planoSearchHaystack(plano) {
  const raw = _planoSearchText(plano).toLowerCase();
  const compact = raw.replace(/[\s-]/g, '');
  return `${raw} ${compact}`;
}

function _planoSearchText(plano) {
  const bits = [
    plano.id,
    plano.loteId,
    plano.aproveitamento,
    plano.data,
    _planoApprovalInfo(plano).name,
    _planoApprovalInfo(plano).email
  ];

  (plano.mapa || []).forEach((bin, binIdx) => {
    bits.push(bin.sku, bin.srcId, bin.srcAddr, `barra-${binIdx + 1}`);
    (bin.pcs || []).forEach(pc => {
      bits.push(pc.baseOp, pc.op, pc.lineId, pc.pieceId, _opDigits(pc.baseOp || pc.op || pc.pieceId), pc.sku, pc.dim, pc.entrega);
    });
  });

  return bits.filter(v => v !== undefined && v !== null && v !== '').join(' ');
}

function _planoMatchesSearch(plano, q) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return true;
  const compact = needle.replace(/[\s-]/g, '');
  const haystack = _planoSearchHaystack(plano);
  return haystack.includes(needle) || (compact && haystack.includes(compact));
}

function _planosPieceMatchesSearch(pc, q) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return false;
  const compact = needle.replace(/[\s-]/g, '');
  const text = [
    pc.baseOp,
    pc.op,
    pc.lineId,
    pc.pieceId,
    _opDigits(pc.baseOp || pc.op || pc.pieceId),
    pc.sku,
    pc.dim,
    pc.entrega
  ].filter(Boolean).join(' ').toLowerCase();
  const haystack = `${text} ${text.replace(/[\s-]/g, '')}`;
  return haystack.includes(needle) || (compact && haystack.includes(compact));
}

function _lotesPendentesRows(lotes) {
  return lotes.map(l => {
    return `
    <tr>
      <td class="fw-700">${l.id}</td>
      <td style="color:var(--text-400);">${(l.ordens || []).length} ordens</td>
      <td style="max-width: 250px; white-space: normal;">
        ${(()=>{ 
          const skus = l.skus || [];
          const vis = skus.slice(0, 4);
          const ext = skus.length - 4;
          let h = vis.map(s => { const c = skuColor(s); return `<span class="sku-tag" style="background:${c.bg};color:${c.text};margin-right:4px;margin-bottom:4px;display:inline-block;">${s}</span>`; }).join('');
          if(ext > 0) h += `<span class="sku-tag" style="background:#e5e7eb;color:#374151;margin-bottom:4px;display:inline-block;">+${ext}</span>`;
          return h;
        })()}
      </td>
      <td style="color:var(--text-400);">${l.criacao || '—'}</td>
      <td style="text-align:right;">
        <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
          <button class="btn btn-ghost btn-sm" style="color:var(--red); padding:4px 8px;" onclick="_excluirLotePendente('${l.id}')" title="Excluir Lote">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
          <button class="btn btn-dark btn-sm" onclick="_abrirLoteNoOtimizador('${l.id}')">Otimizar Agora →</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function _excluirLotePendente(id) {
  if (!confirm(`Deseja realmente excluir o lote ${id}?\nAs ordens de produção ficarão livres para serem agrupadas em outro lote.`)) return;

  const lote = appState.lotes.find(l => l.id === id);
  if (lote && lote.ordens) {
    for (const oid of lote.ordens) {
      const o = appState.ordens.find(x => x.id === oid);
      if (o) {
        o.status = 'pending';
        o.lote = null;
        await DB.saveOrdem(o);
      }
    }
  }

  appState.lotes = appState.lotes.filter(l => l.id !== id);
  await DB.deleteLote(id);

  await DB.log("Removeu Lote", "unilux_lotes", `Lote pendente ${id} excluído`);
  showToast(`Lote ${id} excluído com sucesso!`, 'success');
  renderPlanos();
  updateBadges();
}

function _abrirLoteNoOtimizador(loteId) {
  navigate('otimizador');
  setTimeout(() => {
    const sel = document.getElementById('otimLote');
    if (sel) sel.value = loteId;
  }, 100);
}

/* ============================================================
   EXCEL EXPORT — Plano de Corte (.xlsx)
   ============================================================
   Layout de 31 colunas (A → AE) conforme especificação:
   A: Nº linha por SKU | B: Nº barra por SKU | C: Tamanho barra
   D: Dimensão corte   | E: Plan ID global    | F: Data/hora
   G-I: z              | J: Nome SKU           | K: z
   L: Código SKU       | M-Y: z                | Z: Data entrega
   AA-AC: Refile       | AD-AE: Nome SKU
   ============================================================ */
function _exportPlanoExcel(planoId) {
  const plano = appState.planos.find(p => p.id === planoId);
  if (!plano || !plano.mapa) {
    showToast('Plano não encontrado!', 'error');
    return;
  }

  const mapa = plano.mapa;
  const refile = plano.trim_m || (appState.configs ? (appState.configs.trim_m || 0) : 0);
  const dataHora = new Date(plano.data).toLocaleString('pt-BR');
  const skuPlanIds = plano.skuPlanIds || {};

  // Agrupar bins por SKU preservando a ordem
  const skuOrder = [];
  const skuBins = {};
  mapa.forEach(bin => {
    if (!skuBins[bin.sku]) {
      skuBins[bin.sku] = [];
      skuOrder.push(bin.sku);
    }
    skuBins[bin.sku].push(bin);
  });

  // Montar as linhas do Excel
  const rows = [];

  // Linha 1: CABEÇALHOS (32 colunas conforme solicitado)
  rows.push([
    "PARTNUM", "SOUNUM", "SOULEN", "PARTLEN", "PLANID", "PLANCRDATE", "PLANNAME", "PLANDES1", "PLANDES2", "PLANDES3",
    "MATID", "MATDES1", "LAYID", "SOUID", "SOUCOST", "SOUMNFDATE", "SOUSTORID", "SOUSTORDES1", "SOUDES1", "SOUDES2",
    "SOUDES3", "PARTID", "PARTORDNUM", "PARTDES1", "PARTDES2", "PARTDES3", "SETTKERF", "SETTTRIMLEFT", "SETTTRIMRIGHT",
    "MATDES2", "MATDES3", "MATDES4"
  ]);

  skuOrder.forEach((sku, skuIdx) => {
    // Linha em branco entre SKUs (exceto antes do primeiro)
    if (skuIdx > 0) {
      rows.push(Array(32).fill(''));
    }

    const bins = skuBins[sku];
    const sObj = appState.skus.find(s => s.code === sku);
    const skuName = sObj ? sObj.desc : sku;
    const skuShortName = sObj ? (sObj.short_desc || sObj.desc) : sku;
    const planId = skuPlanIds[sku] || '?';

    let lineNum = 0; // Nº linha por SKU (col A)

    bins.forEach((bin, barIdx) => {
      const barNum = barIdx + 1; // Nº barra por SKU (col B)

      bin.pcs.forEach(pc => {
        lineNum++;

        // Buscar data de entrega da OP original
        let entrega = pc.entrega || '';
        if (!entrega) {
          const op = appState.ordens.find(o => o.id === pc.op);
          if (op) entrega = op.entrega || '';
        }
        // Formatar data de entrega
        if (entrega && entrega.includes('-')) {
          const [y,m,d] = entrega.split('-');
          entrega = `${d}/${m}/${y}`;
        }

        const row = [
          lineNum,           // A: Nº linha por SKU
          barNum,            // B: Nº barra por SKU
          bin.len,           // C: Tamanho da barra
          pc.dim,            // D: Dimensão do corte
          planId,            // E: Plan ID global por SKU
          dataHora,          // F: Data/hora otimização
          '',                // G: apenas com o titulo, o resto todo vazio
          plano.id,          // H: o nome do plano em todas as linhas
          '',                // I: apenas com o titulo, o resto todo vazio
          skuShortName,      // J: Nome do SKU Resumido
          sku,               // K: código do sku
          sku,               // L: Código do SKU
          '',                // M: Coluna M até Y apenas com o titulo
          '',                // N
          '',                // O
          '',                // P
          '',                // Q
          '',                // R
          '',                // S
          '',                // T
          '',                // U
          _pieceExportId(pc), // V: PARTID com os dígitos da OP
          _opDigits(pc.baseOp || pc.op || pc.pieceId), // W: número da OP (mantém cabeçalho PARTORDNUM)
          '',                // X
          '',                // Y
          entrega,           // Z: Data de entrega
          refile,            // AA: Refile
          refile,            // AB: Refile
          refile,            // AC: Refile
          skuShortName,      // AD: Nome do SKU Resumido (MATDES2)
          skuName,           // AE: Nome do SKU (MATDES3)
          skuName            // AF: Nome do SKU (MATDES4)
        ];

        rows.push(row);
      });
    });
  });

  // Gerar o arquivo .xlsx usando SheetJS
  if (!window.XLSX) {
    showToast('Biblioteca XLSX não carregada!', 'error');
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Ajustar largura das colunas
  ws['!cols'] = [
    { wch: 6 },  // A
    { wch: 6 },  // B
    { wch: 10 }, // C
    { wch: 10 }, // D
    { wch: 8 },  // E
    { wch: 20 }, // F
    { wch: 4 },  // G
    { wch: 4 },  // H
    { wch: 4 },  // I
    { wch: 30 }, // J
    { wch: 4 },  // K
    { wch: 15 }, // L
    { wch: 4 },  // M-Y (small)
    { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 },
    { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 },
    { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 },
    { wch: 12 }, // Z
    { wch: 8 },  // AA
    { wch: 8 },  // AB
    { wch: 8 },  // AC
    { wch: 30 }, // AD
    { wch: 30 }, // AE
    { wch: 30 }  // AF
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Plano de Corte');
  XLSX.writeFile(wb, `Plano_${plano.loteId}_${plano.id}.xlsx`);

  showToast(`Excel exportado: Plano_${plano.loteId}_${plano.id}.xlsx`, 'success');
}

function _verPlanoMapa(planoId) {
  const plano = appState.planos.find(p => p.id === planoId);
  if (!plano) return;
  const activeSearch = appState.filters.planos || '';

  // Separar barras virgens de retalhos
  const virginPlans = plano.mapa.filter(p => p.type === 'virgin');
  const scrapPlans  = plano.mapa.filter(p => p.type === 'scrap');
  const approval = _planoApprovalInfo(plano);
  const solverStatus = plano.solver
    ? (plano.solver.optimal ? 'Ótimo comprovado' : 'Melhor encontrado no limite')
    : '';
  const planFinancials = _financialsForStoredPlan(plano);
  const hasHistoricalSnapshot = !!(plano.priceSnapshot || plano.price_snapshot);

  // Resumo de Barras Virgens
  const virginSkuCounts = {};
  virginPlans.forEach(p => {
    if (!virginSkuCounts[p.sku]) virginSkuCounts[p.sku] = { count: 0, length: 0 };
    virginSkuCounts[p.sku].count++;
    virginSkuCounts[p.sku].length += p.len;
  });

  const virginSummaryHtml = Object.entries(virginSkuCounts).map(([sku, data]) => {
    const sObj = appState.skus.find(s => s.code === sku);
    const name = sObj ? (sObj.short_desc || sObj.desc) : sku;
    return `<div class="plano-map-summary-line">• ${sku} (${name}): <b>${data.count} barras inteiras</b> <span>(${fmtM(data.length)} total)</span></div>`;
  }).join('');

  // Resumo de Retalhos em Uso
  const scrapSummaryHtml = scrapPlans.map(p => {
    const sObj = appState.skus.find(s => s.code === p.sku);
    const name = sObj ? (sObj.short_desc || sObj.desc) : p.sku;
    return `<div class="plano-map-summary-line">• ${p.sku} — ${_planosEsc(name)} (${fmtM(p.len)}): <b>Setor ${p.srcAddr || '—'}</b> <span>(ID: ${p.srcId})</span></div>`;
  }).join('');

  const html = `
    <div class="plano-map">
      <div class="plano-map-summary-grid plano-map-summary-grid--financial">
        <div class="plano-map-summary-card">
          <div class="plano-map-section-title">📦 Matéria-Prima (Barras Inteiras)</div>
          ${virginSummaryHtml || '<div class="plano-map-empty">Nenhuma barra virgem usada neste lote.</div>'}
        </div>

        <div class="plano-map-summary-card plano-map-summary-card--scrap">
          <div class="plano-map-section-title">♻️ Retalhos Reutilizados (Abastecimento)</div>
          ${scrapSummaryHtml || '<div class="plano-map-empty">Nenhum retalho reutilizado neste lote.</div>'}
        </div>

        <div class="plano-map-summary-card plano-map-summary-card--financial">
          <div class="plano-map-section-title">💰 Valores do Plano</div>
          <div class="plano-map-summary-line">Peças: <b>${fmtBRL(planFinancials.piecesValue)}</b></div>
          <div class="plano-map-summary-line">Sobras geradas: <b>${fmtBRL(planFinancials.generatedScrapValue)}</b></div>
          <div class="plano-map-summary-line plano-map-summary-line--discard">Descarte: <b>${fmtBRL(planFinancials.discardValue)}${planFinancials.unpricedSkuCount ? ' *' : ''}</b></div>
          <div class="plano-map-finance-note">${planFinancials.unpricedSkuCount
            ? `Total parcial: ${planFinancials.unpricedSkuCount} SKU(s) sem preço por metro.`
            : hasHistoricalSnapshot ? 'Preços congelados na aprovação.' : 'Plano antigo: estimativa com os preços atuais.'}</div>
        </div>
      </div>

      <div class="plano-map-meta">
        Lote: <b>${plano.loteId}</b> | Aproveitamento: <b>${plano.aproveitamento}</b>${solverStatus ? ` | Busca: <b>${solverStatus}</b>` : ''} | Data: <b>${new Date(plano.data).toLocaleString('pt-BR')}</b> | Aprovado por: <b>${_planosEsc(approval.name)}</b>${approval.email ? ` <span>(${_planosEsc(approval.email)})</span>` : ''}
      </div>

      <div id="modalMapaContent" class="plano-map-list">
        ${(() => {
          const c = {};
          return plano.mapa.map((bin, binIdx) => {
            if (c[bin.sku] === undefined) c[bin.sku] = 0;
            return _renderBarResult(bin, c[bin.sku]++, plano.id, binIdx, activeSearch, plano);
          }).join('');
        })()}
      </div>
    </div>
  `;

  openModal(`Mapa do Plano: ${plano.id}`, html, '', 'modal-map');
}

function _filtrarPlanos(val) {
  appState.filters.planos = val || '';
  const q = (val || '').toLowerCase();
  let count = 0;
  document.querySelectorAll('#tblPlanosFin tbody tr').forEach(tr => {
    const compact = q.replace(/[\s-]/g, '');
    const search = tr.dataset.search || tr.textContent.toLowerCase();
    const visible = !q || search.includes(q) || (compact && search.includes(compact));
    tr.style.display = visible ? '' : 'none';
    if (visible) count++;
  });

  const stats = document.getElementById('planosSearchStats');
  if (stats) {
    stats.textContent = `${count} resultados`;
    stats.style.display = q ? '' : 'none';
  }
}

function _renderBarResult(bin, idx, planoId = '', binIdx = 0, activeSearch = '', planContext = null) {
  const totalPcs = bin.pcs.reduce((sum, p) => sum + p.dim, 0);
  const aprov = ((totalPcs/bin.len)*100).toFixed(1);

  const sObj = appState.skus.find(s => s.code === bin.sku);
  const skuShortDesc = sObj && sObj.short_desc ? sObj.short_desc : (sObj && sObj.desc ? sObj.desc : '');
  const addrText = bin.srcAddr ? ` (Endereço: ${bin.srcAddr})` : ' (Sem endereço)';
  const scrapNameText = bin.type === 'scrap' && skuShortDesc ? ` · ${_planosEsc(skuShortDesc)}` : '';
  const skuMinSobra = _planoSkuMinSobra(bin.sku);
  const restanteEhSobra = bin.rem >= skuMinSobra;
  const restanteLabel = restanteEhSobra ? 'Sobra' : 'Descarte';
  const barFinancials = _calculatePlanFinancials(
    [bin],
    planContext?.trim_mm || 0,
    planContext?.priceSnapshot || planContext?.price_snapshot || null
  );

  return `
    <div class="plano-map-bar-card">
      <div class="plano-map-bar-head">
        <span class="plano-map-bar-title">Barra #${idx+1} - <span>${fmtM(bin.len)}</span> - ${bin.type === 'scrap' ? `<strong class="plano-map-source-scrap">Retalho ${bin.srcId}${scrapNameText}${addrText}</strong>` : '<strong class="plano-map-source-virgin">Virgem</strong>'}</span>
        <span class="status-badge badge-approved">${aprov}% usado</span>
      </div>
      <div class="plano-map-track">
        ${bin.pcs.map((pc, pcIdx) => {
          const w = (pc.dim / bin.len) * 100;
          const label = _pieceLabel(pc);
          const pieceClass = _planosPieceMatchesSearch(pc, activeSearch) ? 'plano-map-piece plano-map-piece--highlight' : 'plano-map-piece';
          return `
            <button class="${pieceClass}" style="width:${w}%;" title="${label}: ${fmtM(pc.dim)}" onclick="_confirmarRetrabalhoOP('${planoId}', ${binIdx}, ${pcIdx})">
              <span class="plano-map-piece-label">${label}</span>
              <span class="plano-map-piece-dim">${fmtM(pc.dim)}</span>
            </button>
          `;
        }).join('')}
        ${bin.rem > 0 ? `<div class="plano-map-waste" title="${restanteLabel}: ${fmtM(bin.rem)}">${restanteLabel}: ${fmtM(bin.rem)}</div>` : ''}
      </div>
      <div class="plano-map-bar-meta">
        <span>Material: <b>${bin.sku}</b></span>
        ${bin.type === 'scrap' && skuShortDesc ? `<span>Nome resumido: <b>${_planosEsc(skuShortDesc)}</b></span>` : ''}
        <span>Peças: <b>${bin.pcs.length}</b></span>
        <span>Valor descartado: <b>${barFinancials.unpricedSkuCount ? 'Preço pendente' : fmtBRL(barFinancials.discardValue)}</b></span>
      </div>
    </div>
  `;
}

function _getPlanoPieceContext(planoId, binIdx, pcIdx) {
  const plano = appState.planos.find(p => p.id === planoId);
  const bin = plano && plano.mapa ? plano.mapa[binIdx] : null;
  const pc = bin && bin.pcs ? bin.pcs[pcIdx] : null;
  if (!plano || !bin || !pc) return null;
  return { plano, bin, pc };
}

function _confirmarRetrabalhoOP(planoId, binIdx, pcIdx) {
  const ctx = _getPlanoPieceContext(planoId, binIdx, pcIdx);
  if (!ctx) {
    showToast('Não foi possível localizar esta OP no plano.', 'error');
    return;
  }

  const existing = _findExistingRetrabalho(ctx.plano.id, ctx.pc, binIdx, pcIdx);
  if (existing) {
    showToast(`Retrabalho já criado: ${existing.id}`, 'info');
    appState._ordensTab = 'pending';
    appState.filters.ordens = existing.id;
    closeModal();
    navigate('ordens');
    return;
  }

  const label = _pieceLabel(ctx.pc);
  const msg = `Deseja retrabalhar ${label}?\n\nPlano: ${ctx.plano.id}\nLote: ${ctx.plano.loteId}\nSKU: ${ctx.pc.sku || ctx.bin.sku}\nMedida: ${fmtM(ctx.pc.dim)}`;
  if (!confirm(msg)) return;

  _criarOrdemRetrabalho(ctx.plano, ctx.bin, ctx.pc, binIdx, pcIdx);
}

async function _criarOrdemRetrabalho(plano, bin, pc, binIdx, pcIdx) {
  const original = appState.ordens.find(o => o.id === pc.op);
  const originalBaseOp = pc.baseOp || pc.op || pc.pieceId || 'OP';
  const id = _nextRetrabalhoId(originalBaseOp);
  const now = new Date().toISOString();
  const currentUser = appState.currentUser || {};
  const baseMeta = original && original._meta ? { ...original._meta } : {};

  const ordem = {
    id,
    sku: pc.sku || bin.sku,
    dim: Math.round(Number(pc.dim) || 0),
    qty: 1,
    cliente: original?.cliente || 'Retrabalho',
    entrega: pc.entrega || original?.entrega || new Date().toISOString().split('T')[0],
    status: 'pending',
    lote: null,
    _meta: {
      ...baseMeta,
      rework: {
        isRework: true,
        originalOp: pc.op || '',
        originalBaseOp,
        originalPieceId: pc.pieceId || '',
        originalPieceNo: pc.pieceNo || pcIdx + 1,
        originalQty: pc.qty || '',
        planoId: plano.id,
        loteId: plano.loteId,
        binIndex: binIdx,
        pieceIndex: pcIdx,
        sourceSku: pc.sku || bin.sku,
        sourceDim: Math.round(Number(pc.dim) || 0),
        createdAt: now,
        createdBy: {
          id: currentUser.id || '',
          name: currentUser.name || '',
          email: currentUser.email || ''
        }
      }
    }
  };

  appState.ordens.push(ordem);
  try {
    await DB.saveOrdem(ordem);
    await DB.log("Criou Retrabalho", "unilux_ordens", `${id} a partir de ${originalBaseOp} no plano ${plano.id}`);
  } catch (err) {
    appState.ordens = appState.ordens.filter(o => o.id !== id);
    console.error('Erro ao criar retrabalho:', err);
    showToast('Erro ao criar retrabalho. Tente novamente.', 'error');
    return;
  }

  closeModal();
  showToast(`Retrabalho ${id} enviado para Pendentes.`, 'success');
  appState._ordensTab = 'pending';
  appState.filters.ordens = id;
  navigate('ordens');
}

function _findExistingRetrabalho(planoId, pc, binIdx, pcIdx) {
  return appState.ordens.find(o => {
    const rw = o._meta && o._meta.rework;
    if (o.status === 'done') return false;
    if (!rw || rw.planoId !== planoId) return false;
    if (pc.pieceId && rw.originalPieceId === pc.pieceId) return true;
    return rw.originalOp === pc.op && Number(rw.binIndex) === Number(binIdx) && Number(rw.pieceIndex) === Number(pcIdx);
  });
}

function _nextRetrabalhoId(originalOp) {
  const normalized = typeof _normalizeOpId === 'function'
    ? (_normalizeOpId(originalOp) || 'OP-RETRABALHO')
    : String(originalOp || 'OP-RETRABALHO').toUpperCase();
  const safeBase = normalized.replace(/[^A-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/-$/g, '') || 'OP-RETRABALHO';
  let idx = 1;
  let id = `${safeBase}-RT${idx}`;
  while (appState.ordens.some(o => o.id === id)) {
    idx++;
    id = `${safeBase}-RT${idx}`;
  }
  return id;
}

function _planoSkuMinSobra(sku) {
  const sObj = appState.skus.find(s => s.code === sku);
  const raw = sObj && sObj.min_sobra !== undefined ? Number(sObj.min_sobra) : 1000;
  if (Number.isFinite(raw) && raw > 0 && raw < 10) return Math.round(raw * 1000);
  return Number.isFinite(raw) && raw > 0 ? raw : 1000;
}

async function _reverterPlanoParaLote(planoId) {
  const html = `
    <div style="padding:10px; text-align:center;">
      <div style="font-size:24px; margin-bottom:16px;">🔄</div>
      <p style="margin-bottom:20px; color:var(--text-600);">Deseja realmente reverter o plano <b>${planoId}</b>?<br><br>Isso devolverá o material ao estoque e transformará o plano de volta em um lote editável.</p>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-dark" id="btnConfirmRevert" style="background:var(--red); border-color:var(--red);">Sim, Reverter</button>
      </div>
    </div>
  `;
  openModal('Reverter Plano', html);

  document.getElementById('btnConfirmRevert').onclick = async () => {
    closeModal();
    const plano = appState.planos.find(p => p.id === planoId);
    if (!plano) { showToast('Plano não encontrado!', 'error'); return; }

    const loteId = plano.loteId;
    showToast('Revertendo plano... aguarde', 'info');

    try {
      // 1. Restaurar Estoque de Barras Virgens
      const skusAffected = new Set();
      for (const bin of plano.mapa) {
        if (bin.type === 'virgin') {
          const [skCode, dStr] = bin.srcId.split('|');
          const dim = parseFloat(dStr);
          const skuObj = appState.skus.find(x => x.code === skCode);
          if (skuObj && skuObj.dims) {
            const dimEntry = skuObj.dims.find(d => parseFloat(d.dim) === dim || Math.abs(d.dim - dim) < 0.2);
            if (dimEntry) {
              dimEntry.qty++;
              skusAffected.add(skuObj);
            } else {
              console.warn(`[REVERT] Dimensão ${dim} não encontrada para SKU ${skCode}`);
            }
          }
        } else if (bin.type === 'scrap') {
          // Restaurar retalho consumido
          const novaSobra = { 
            id: bin.srcId, 
            sku: bin.sku, 
            medida: bin.len, 
            criacao: new Date().toISOString().split('T')[0], 
            origem: 'Reversão ' + loteId, 
            endereco: bin.srcAddr || ''
          };
          if (!appState.sobras.some(s => s.id === bin.srcId)) {
            console.log(`[REVERT] Restaurando retalho: ${bin.srcId} no setor ${bin.srcAddr || '—'}`);
            appState.sobras.push(novaSobra);
            await DB.saveSobra(novaSobra);
          }
        }
      }
      for (const s of skusAffected) await DB.saveSku(s);

      // 2. Apagar as sobras que foram GERADAS por este plano
      const sobrasGeradasPeloLote = appState.sobras.filter(s => s.origem === loteId);
      for (const sg of sobrasGeradasPeloLote) {
        console.log(`[REVERT] Removendo sobra gerada: ${sg.id}`);
        appState.sobras = appState.sobras.filter(s => s.id !== sg.id);
        await DB.deleteSobra(sg.id);
      }

      // 3. Restaurar Lote (Status -> pending)
      let loteObj = appState.lotes.find(l => l.id === loteId);
      if (!loteObj) {
         loteObj = await DB.getLote(loteId);
         if (loteObj) appState.lotes.push(loteObj);
      }
      
      if (loteObj) {
        loteObj.status = 'pending';
        let ords = typeof loteObj.ordens === 'string' ? JSON.parse(loteObj.ordens) : (loteObj.ordens || []);
        loteObj.ordens = ords;
        await DB.saveLote(loteObj);
        for (const oid of ords) {
          let o = appState.ordens.find(x => x.id === oid);
          if (!o && supabaseClient) {
             const req = await supabaseClient.from('unilux_ordens').select('*').eq('id', oid).single();
             if (req.data) o = req.data;
          }
          if (o) {
            o.status = 'in_batch';
            o.lote = loteId;
            await DB.saveOrdem(o);
          }
        }
      }

      // 4. Remover Plano e Histórico
      appState.planos = appState.planos.filter(p => p.id !== planoId);
      await DB.savePlanosAll();
      await DB.deleteHistoricoByLote(loteId);
      appState.historico = appState.historico.filter(h => h.lote_id !== loteId);
      
      await DB.log("Reverteu Plano", "unilux_configs", `Plano ${planoId} do Lote ${loteId} revertido`);
      showToast(`Plano ${loteId} revertido com sucesso!`, 'success');
      renderPlanos();
      updateBadges();

    } catch (err) {
      console.error('Erro crítico na reversão:', err);
      showToast('Erro ao reverter o plano. Verifique o console. ' + err.message, 'error');
    }
  };
}
