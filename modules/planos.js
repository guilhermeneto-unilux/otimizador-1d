/* ===== PLANOS DE CORTE – UNILUX 1D ===== */

function renderPlanos() {
  const lotesPend = appState.lotes.filter(l => l.status === 'pending');
  const planos = appState.planos || [];

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
        <h2 style="font-size:16px; font-weight:700; margin-bottom:12px; color:var(--text-900);">Planos Finalizados</h2>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>ID Plano</th>
                <th>Lote Origem</th>
                <th>Aproveitamento</th>
                <th>Barras</th>
                <th>Data Finalização</th>
                <th>Status</th>
                <th style="text-align:right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${planos.length ? _planosFinalizadosRows(planos) : '<tr><td colspan="7" class="tbl-empty">Nenhum plano finalizado ainda.</td></tr>'}
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

function _planosFinalizadosRows(planos) {
  return planos.sort((a,b) => new Date(b.data) - new Date(a.data)).map(p => {
    const barras = p.mapa ? p.mapa.length : 0;
    return `
    <tr>
      <td class="fw-700">${p.id}</td>
      <td style="color:var(--text-400);">${p.loteId}</td>
      <td><span class="status-badge badge-approved">${p.aproveitamento}</span></td>
      <td>${barras} barra(s)</td>
      <td style="color:var(--text-400);">${new Date(p.data).toLocaleString('pt-BR')}</td>
      <td><span class="status-badge badge-approved">✓ Concluído</span></td>
      <td style="text-align:right;">
        <div style="display:flex; gap:6px; justify-content:flex-end;">
          <button class="btn btn-white btn-sm" style="background:#f0fdf4; border-color:#bbf7d0; color:#16a34a;" onclick="_exportPlanoExcel('${p.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar Excel
          </button>
          <button class="btn btn-white btn-sm" onclick="_verPlanoMapa('${p.id}')">Ver Mapa</button>
        </div>
      </td>
    </tr>`;
  }).join('');
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
    const sel = document.getElementById('otimLoteSelect');
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
          'z',               // G
          'z',               // H
          'z',               // I
          skuShortName,      // J: Nome do SKU Resumido
          'z',               // K
          sku,               // L: Código do SKU
          'z',               // M
          'z',               // N
          'z',               // O
          'z',               // P
          'z',               // Q
          'z',               // R
          'z',               // S
          'z',               // T
          'z',               // U
          'z',               // V
          'z',               // W
          'z',               // X
          'z',               // Y
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

  // Agrupar por SKU para contagem de barras
  const skuCounts = {};
  plano.mapa.forEach(bin => {
    skuCounts[bin.sku] = (skuCounts[bin.sku] || 0) + 1;
  });

  const summaryHtml = Object.entries(skuCounts).map(([sku, count]) => {
    const sObj = appState.skus.find(s => s.code === sku);
    const name = sObj ? (sObj.short_desc || sObj.desc) : sku;
    return `<div style="font-size:13px; margin-bottom:4px;">• ${sku} (${name}): <b>${count} barras</b></div>`;
  }).join('');

  const html = `
    <div style="margin-bottom:16px; padding:12px; background:var(--bg-100); border-radius:8px; border:1px solid var(--border);">
      <div style="font-weight:700; font-size:12px; color:var(--text-400); text-transform:uppercase; margin-bottom:8px;">Resumo de Material (Abastecimento)</div>
      ${summaryHtml}
    </div>
    <div style="margin-bottom:20px; font-size:14px; color:var(--text-400);">
      Lote: <b>${plano.loteId}</b> | Aproveitamento: <b>${plano.aproveitamento}</b> | Data: <b>${new Date(plano.data).toLocaleString('pt-BR')}</b>
    </div>
    <div id="modalMapaContent" style="display:flex; flex-direction:column; gap:16px; max-height:60vh; overflow-y:auto; padding-right:8px;">
      ${plano.mapa.map((bin, idx) => _renderBarResult(bin, idx)).join('')}
    </div>
  `;

  openModal(`Mapa do Plano: ${plano.id}`, html);
}

function _renderBarResult(bin, idx) {
  const totalPcs = bin.pcs.reduce((sum, p) => sum + p.dim, 0);
  const aprov = ((totalPcs/bin.len)*100).toFixed(1);

  return `
    <div class="res-item" style="padding:16px; border:1px solid var(--border); border-radius:12px; background:white;">
      <div class="res-item-header" style="display:flex; justify-content:space-between; margin-bottom:12px;">
        <span style="font-weight:700; color:var(--text-900);">Barra #${idx+1} — <span style="color:var(--text-400);">${bin.len}m</span></span>
        <span class="status-badge badge-approved">${aprov}% usado</span>
      </div>
      <div class="bar-viz" style="height:48px; background:var(--bg-200); border-radius:6px; display:flex; position:relative; overflow:hidden; border:1px solid var(--border);">
        ${bin.pcs.map(pc => {
          const w = (pc.dim / bin.len) * 100;
          const c = skuColor(pc.sku);
          return `
            <div class="bar-pc" style="width:${w}%; background:${c.bg}; color:${c.text}; height:100%; border-right:1px solid rgba(0,0,0,0.1); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; position:relative;" title="${pc.op}: ${pc.dim}m">
              ${pc.dim}
            </div>
          `;
        }).join('')}
        ${bin.rem > 0 ? `<div style="flex:1; background:repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px); display:flex; align-items:center; justify-content:center; font-size:10px; color:var(--text-400);">Sobra: ${bin.rem}m</div>` : ''}
      </div>
      <div style="margin-top:8px; font-size:12px; color:var(--text-400); display:flex; gap:12px;">
        <span>Material: <b>${bin.sku}</b></span>
        <span>Peças: <b>${bin.pcs.length}</b></span>
      </div>
    </div>
  `;
}

