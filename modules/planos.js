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
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px;">
          <h2 style="font-size:16px; font-weight:700; color:var(--text-900); margin:0;">Planos Finalizados</h2>
          <div class="search-input-group" style="max-width:300px; width:100%;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" class="form-control" placeholder="Buscar por plano, lote ou SKU..." onkeyup="_filtrarPlanos(this.value)">
          </div>
        </div>
        <div class="tbl-wrap">
          <table class="tbl" id="tblPlanosFin">
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
          '',                // V
          '',                // W
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

  // Separar barras virgens de retalhos
  const virginPlans = plano.mapa.filter(p => p.type === 'virgin');
  const scrapPlans  = plano.mapa.filter(p => p.type === 'scrap');

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
    return `<div style="font-size:13px; margin-bottom:4px;">• ${sku} (${name}): <b>${data.count} barras inteiras</b> <span style="color:var(--text-400); font-size:12px;">(${fmtM(data.length)} total)</span></div>`;
  }).join('');

  // Resumo de Retalhos em Uso
  const scrapSummaryHtml = scrapPlans.map(p => {
    const sObj = appState.skus.find(s => s.code === p.sku);
    const name = sObj ? (sObj.short_desc || sObj.desc) : p.sku;
    return `<div style="font-size:13px; margin-bottom:4px;">• ${p.sku} (${fmtM(p.len)}): <b>Setor ${p.srcAddr || '—'}</b> <span style="color:var(--text-400); font-size:11px;">(ID: ${p.srcId})</span></div>`;
  }).join('');

  const html = `
    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
      <div style="padding:16px; background:var(--bg-100); border-radius:10px; border:1px solid var(--border);">
        <div style="font-weight:800; font-size:11px; color:var(--text-500); text-transform:uppercase; margin-bottom:10px; letter-spacing:0.5px;">📦 Matéria-Prima (Barras Inteiras)</div>
        ${virginSummaryHtml || '<div style="font-size:13px; color:var(--text-400);">Nenhuma barra virgem usada neste lote.</div>'}
      </div>

      <div style="padding:16px; background:#fff7ed; border-radius:10px; border:1px solid #fed7aa;">
        <div style="font-weight:800; font-size:11px; color:#c2410c; text-transform:uppercase; margin-bottom:10px; letter-spacing:0.5px;">♻️ Retalhos Reutilizados (Abastecimento)</div>
        ${scrapSummaryHtml || '<div style="font-size:13px; color:#c2410c; opacity:0.7;">Nenhum retalho reutilizado neste lote.</div>'}
      </div>
    </div>
    <div style="margin-bottom:20px; font-size:14px; color:var(--text-400);">
      Lote: <b>${plano.loteId}</b> | Aproveitamento: <b>${plano.aproveitamento}</b> | Data: <b>${new Date(plano.data).toLocaleString('pt-BR')}</b>
    </div>
    <div id="modalMapaContent" style="display:flex; flex-direction:column; gap:16px; max-height:60vh; overflow-y:auto; padding-right:8px;">
      ${(() => {
        const c = {};
        return plano.mapa.map(bin => {
          if (c[bin.sku] === undefined) c[bin.sku] = 0;
          return _renderBarResult(bin, c[bin.sku]++);
        }).join('');
      })()}
    </div>
  `;

  openModal(`Mapa do Plano: ${plano.id}`, html);
}

function _filtrarPlanos(val) {
  const q = val.toLowerCase();
  document.querySelectorAll('#tblPlanosFin tbody tr').forEach(tr => {
    tr.style.display = (tr.textContent.toLowerCase().includes(q) ? '' : 'none');
  });
}

function _renderBarResult(bin, idx) {
  const totalPcs = bin.pcs.reduce((sum, p) => sum + p.dim, 0);
  const aprov = ((totalPcs/bin.len)*100).toFixed(1);

  const sObj = appState.skus.find(s => s.code === bin.sku);
  const skuShortDesc = sObj && sObj.short_desc ? sObj.short_desc : (sObj && sObj.desc ? sObj.desc : '');
  const addrText = bin.srcAddr ? ` (Endereço: ${bin.srcAddr})` : ' (Sem endereço)';

  return `
    <div class="res-item" style="padding:16px; border:1px solid var(--border); border-radius:12px; background:white;">
      <div class="res-item-header" style="display:flex; justify-content:space-between; margin-bottom:12px;">
        <span style="font-weight:700; color:var(--text-900);">Barra #${idx+1} — <span style="color:var(--text-400);">${fmtM(bin.len)}</span> — ${bin.type === 'scrap' ? `<span style="color:#c2410c;">Retalho ${bin.srcId}${addrText}</span>` : 'Virgem'}</span>
        <span class="status-badge badge-approved">${aprov}% usado</span>
      </div>
      <div class="bar-viz" style="height:48px; background:var(--bg-200); border-radius:6px; display:flex; position:relative; overflow:hidden; border:1px solid var(--border);">
        ${bin.pcs.map(pc => {
          const w = (pc.dim / bin.len) * 100;
          return `
            <div class="bar-pc" style="width:${w}%; background:#3b82f6; color:#fff; height:100%; border-right:2px solid #fff; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:11px; font-weight:700; position:relative;" title="${pc.op}: ${fmtM(pc.dim)}">
              <span style="font-size:9px;">${pc.op}</span>
              <span style="font-size:10px;">${fmtM(pc.dim)}</span>
            </div>
          `;
        }).join('')}
        ${bin.rem > 0 ? `<div style="flex:1; background:repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px); display:flex; align-items:center; justify-content:center; font-size:10px; color:var(--text-400);">Sobra: ${fmtM(bin.rem)}</div>` : ''}
      </div>
      <div style="margin-top:8px; font-size:12px; color:var(--text-400); display:flex; gap:12px;">
        <span>Material: <b>${bin.sku}</b></span>
        <span>Peças: <b>${bin.pcs.length}</b></span>
      </div>
    </div>
  `;
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
          if (!o && window.supabase) {
             const req = await window.supabase.from('unilux_ordens').select('*').eq('id', oid).single();
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

