/* ===== OTIMIZADOR – UNILUX 1D ===== */

const SEG_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316'];

function renderOtimizador() {
  const lotesDisp = appState.lotes.filter(l => l.status === 'pending' && l.ordens && l.ordens.length > 0);

  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header" style="margin-bottom:24px;">
      <div>
        <div class="pg-eyebrow">${lotesDisp.length} lote(s) disponível(is) para otimizar</div>
        <h1 class="pg-title">Otimizador</h1>
      </div>
    </div>

    <div class="otim-split">
      <!-- PARAMS -->
      <aside class="otim-params">
        <div class="params-card">
          <div class="params-title">Parâmetros</div>

          <div class="form-group">
            <label class="form-label">Lote Selecionado</label>
            <select class="form-control" id="otimLote">
              <option value="">— Escolha um lote —</option>
              ${lotesDisp.map(l => `<option value="${l.id}">${l.id} · ${l.ordens.length} OP(s)</option>`).join('')}
            </select>
            <div class="form-hint" style="margin-top:8px;">Estratégia unificada: retalhos com desperdício <b>≤ 20%</b>. Sobra mínima de segurança: <b>1000mm</b> (ou conf. por SKU).</div>
          </div>
        </div>

        <button class="btn btn-green" style="width:100%; justify-content:center; padding:12px;" onclick="_calcOtimizacao()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Calcular Otimização
        </button>

        <div class="params-card" style="margin-top:0;">
          <div class="params-title">Legenda</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-500);">
              <span style="width:12px; height:12px; background:var(--blue); border-radius:2px; flex-shrink:0;"></span> Barra Virgem
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-500);">
              <span style="width:12px; height:12px; background:var(--orange); border-radius:2px; flex-shrink:0;"></span> Retalho Reutilizado
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-500);">
              <span style="width:12px; height:12px; background:#e5e7eb; border-radius:2px; flex-shrink:0; border:1px solid #d1d5db;"></span> Descarte / Perda
            </div>
          </div>
        </div>
      </aside>

      <!-- RESULTS -->
      <section id="otimResults">
        <div class="empty-state" style="background:var(--white); border:1px dashed var(--border); border-radius:var(--radius); height:100%;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <p>Selecione um lote e clique em "Calcular"</p>
        </div>
      </section>
    </div>
  `;
}

function _calcOtimizacao() {
  const loteId   = document.getElementById('otimLote').value;
  const cfgTrim  = appState.configs ? (appState.configs.trim_mm || 0) : 0;
  const cfgPen   = appState.configs ? (appState.configs.scrap_penalty_pct || 0) / 100 : 0;

  if (!loteId) { showToast('Selecione um lote!', 'error'); return; }

  const lote   = appState.lotes.find(l => l.id === loteId);
  const ordens = appState.ordens.filter(o => lote.ordens.includes(o.id));

  // Montar peças e ordenar de forma decrescente
  const pieces = [];
  ordens.forEach(o => {
    for (let i = 0; i < o.qty; i++) pieces.push({ op: o.id, sku: o.sku, dim: o.dim });
  });
  pieces.sort((a, b) => b.dim - a.dim);

  // FFD por SKU
  const plans = [];
  const usedScraps = [];

  const skus = [...new Set(pieces.map(p => p.sku))];
  skus.forEach(sku => {
    const pcs   = pieces.filter(p => p.sku === sku);
    const bins  = [];
    const scraps= appState.sobras.filter(s => s.sku === sku).sort((a,b) => a.medida - b.medida);

    const sObj = appState.skus.find(x => x.code === sku);
    const skuMinSobra = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;

    pcs.forEach(pc => {
      // Tentar bin aberto
      const fit = bins.find(b => b.rem >= pc.dim);
      if (fit) { fit.pcs.push(pc); fit.rem -= pc.dim; return; }

      // Estratégia dos Retalhos (Máximo 20% de desperdício do retalho)
      let bestScrapIdx = -1;
      let minWaste = Infinity;
      
      for (let j = 0; j < scraps.length; j++) {
        const s = scraps[j];
        if (usedScraps.includes(s.id)) continue;
        
        const available = s.medida - cfgTrim;
        if (available >= pc.dim) {
          const waste = available - pc.dim;
          const wastePct = waste / s.medida;
          
          if (wastePct <= 0.20 && waste < minWaste) {
            bestScrapIdx = j;
            minWaste = waste;
          }
        }
      }

      if (bestScrapIdx !== -1) {
        const s = scraps[bestScrapIdx];
        usedScraps.push(s.id);
        const uLen = s.medida - cfgTrim;
        bins.push({ type:'scrap', srcId:s.id, len:s.medida, usable:uLen, sku, pcs:[pc], rem:uLen - pc.dim });
        return;
      }

      // Barra virgem (Best Fit para gerar recado limpo se possível)
      let chosenDim = null;
      if (sObj && sObj.dims) {
        const validos = sObj.dims.filter(d => d.qty > 0 && (d.dim - cfgTrim) >= pc.dim);
        if (validos.length > 0) {
           const zeradores = validos.filter(d => ((d.dim - cfgTrim) - pc.dim) < skuMinSobra).sort((a,b) => ((a.dim - cfgTrim) - pc.dim) - ((b.dim - cfgTrim) - pc.dim));
           if (zeradores.length > 0) {
              chosenDim = zeradores[0].dim; 
           } else {
              const maiores = validos.sort((a,b) => b.dim - a.dim);
              chosenDim = maiores[0].dim;
           }
        }
      }
      if (!chosenDim) chosenDim = 6000;
      
      const uLen = chosenDim - cfgTrim;
      bins.push({ type:'virgin', srcId: `${sku}|${chosenDim}`, len:chosenDim, usable:uLen, sku, pcs:[pc], rem:uLen - pc.dim });
    });

    bins.forEach(b => plans.push(b));
  });

  _renderResultados(plans, loteId, usedScraps, cfgTrim, cfgPen);
}

function _renderResultados(plans, loteId, usedScraps, cfgTrim, cfgPen) {
  window._lastOtimResult = { plans, loteId, usedScraps };
  const area = document.getElementById('otimResults');

  const totalLen   = plans.reduce((s,p) => s + p.len, 0);
  const totalWasteObj = plans.reduce((acc, p) => {
     const sObj = appState.skus.find(x => x.code === p.sku);
     const skuMin = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;

     // A sobra real devolvida ao estoque
     const realSobra = p.rem;
     if (realSobra >= skuMin) {
        acc.gerouSobra++;
        acc.perdaEstimada += (realSobra * cfgPen); // penalty do retalho retornado
     } else {
        acc.refugoPuro += realSobra;
     }
     acc.refile += cfgTrim;
     return acc;
  }, { gerouSobra:0, perdaEstimada:0, refugoPuro:0, refile:0 });
  
  const globalWaste = totalWasteObj.refile + totalWasteObj.refugoPuro + totalWasteObj.perdaEstimada;
  const eff = totalLen > 0 ? ((1 - globalWaste/totalLen)*100).toFixed(2) : '0.00';

  area.innerHTML = `
    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-box" style="border-top:3px solid var(--green);">
        <div class="stat-lbl">Eficiência</div>
        <div class="stat-val green">${eff}%</div>
      </div>
      <div class="stat-box">
        <div class="stat-lbl">Barras Usadas</div>
        <div class="stat-val">${plans.length}</div>
      </div>
      <div class="stat-box">
        <div class="stat-lbl">Sobras Aproveitadas</div>
        <div class="stat-val orange">${usedScraps.length}</div>
      </div>
      <div class="stat-box">
        <div class="stat-lbl">Desp. Oculto Estimado</div>
        <div class="stat-val red">${Math.round(globalWaste)} mm</div>
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-400);">Mapa de Corte · ${plans.length} barra(s)</span>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-white btn-sm" onclick="renderOtimizador()">Reiniciar</button>
        <button class="btn btn-dark" id="btnFinalizar" onclick="_finalizarOtimizacao()">Finalizar e Aprovar →</button>
      </div>
    </div>

    <!-- Bar maps -->
    ${plans.map((p, idx) => {
      const sObj = appState.skus.find(x => x.code === p.sku);
      const skuMin = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;

      const opColors = {};
      let ci = 0;
      p.pcs.forEach(pc => { if (!opColors[pc.op]) opColors[pc.op] = SEG_COLORS[ci++ % SEG_COLORS.length]; });
      const segs = p.pcs.map(pc => {
        const pct = (pc.dim / p.len * 100).toFixed(2);
        const bg  = p.type === 'scrap' ? '#f59e0b' : opColors[pc.op];
        return `<div class="bar-seg" style="width:${pct}%;background:${bg};" title="${pc.op}: ${pc.dim}mm">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 4px;">${pc.dim}</span>
        </div>`;
      }).join('');
      const wastePct = ((p.rem + cfgTrim) / p.len * 100).toFixed(2);
      const wasteEl = p.rem >= skuMin
        ? `<div class="bar-seg bar-seg-waste" style="width:${wastePct}%;" title="Sobra: ${p.rem}mm (+${cfgTrim}mm refile)">
            <span>${p.rem > 100 ? p.rem+'mm' : ''}</span>
           </div>`
        : `<div class="bar-seg" style="width:${wastePct}%; background:#ef4444;" title="Refugo Irrecuperável: ${p.rem}mm (+${cfgTrim}mm refile)"></div>`;
      const eff1 = (100 - ((p.rem + cfgTrim)/p.len*100)).toFixed(1);
      return `
        <div class="bar-result-card">
          <div class="bar-result-header">
            <div>
              <span style="font-size:14px; font-weight:700;">Barra #${idx+1}</span>
              <span style="font-size:12px; color:var(--text-400); margin-left:8px;">${p.sku} · ${p.len} mm · ${p.type === 'scrap' ? 'Retalho '+p.srcId : 'Virgem'}</span>
            </div>
            <span class="status-badge badge-approved">${eff1}% aproveitamento</span>
          </div>
          <div class="bar-track">${segs}${wasteEl}</div>
          <div class="bar-meta">
            <span>${p.pcs.length} peça(s)</span>
            <span>Sobra: ${p.rem}mm ${p.rem >= skuMin ? '→ Estoque' : '(descarte)'}</span>
          </div>
        </div>`;
    }).join('')}
  `;
}

async function _finalizarOtimizacao() {
  const res = window._lastOtimResult;
  if (!res) return;
  const { plans, loteId, usedScraps } = res;

  const lote = appState.lotes.find(l => l.id === loteId);
  if (lote) {
    lote.status = 'approved';
    DB.saveLote(lote);
    lote.ordens.forEach(id => { const o = appState.ordens.find(x => x.id === id); if (o) { o.status = 'done'; DB.saveOrdem(o); } });
  }

  // Gerar novas sobras auto-endereçadas
  let sobrasGeradas = 0;
  plans.forEach(p => {
    const sObj = appState.skus.find(x => x.code === p.sku);
    const skuMin = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;

    if (p.rem >= skuMin) {
      const id = `SC-${String(appState.nextSobraId++).padStart(3,'0')}`;
      sobrasGeradas++;
      
      const enderecoGarantido = _findNextWmsSlot();
      const novaSobra = { id, sku: p.sku, medida: p.rem, criacao: new Date().toISOString().split('T')[0], origem: loteId, endereco: enderecoGarantido };
      
      appState.sobras.push(novaSobra);
      DB.saveSobra(novaSobra);
    }
  });

  // Consumir sobras usadas
  usedScraps.forEach(sid => {
    appState.sobras = appState.sobras.filter(s => s.id !== sid);
    DB.deleteSobra(sid);
  });

  // Baixar barras virgens usadas agrupadas pelo SKU (Multi-Length Support)
  let barrasUsadas = 0;
  const skusAffected = new Set();
  plans.filter(p => p.type === 'virgin').forEach(p => {
    barrasUsadas++;
    const [skCode, dStr] = p.srcId.split('|');
    const dim = parseInt(dStr);
    const skuObj = appState.skus.find(x => x.code === skCode);
    if (skuObj && skuObj.dims) {
      const dimEntry = skuObj.dims.find(d => d.dim === dim);
      if (dimEntry && dimEntry.qty > 0) dimEntry.qty--;
      skusAffected.add(skuObj);
    }
  });
  // Flush batch updates to cloud
  skusAffected.forEach(s => DB.saveSku(s));

  // Criar e salvar Histórico da Otimização
  const totalLen = plans.reduce((s,p) => s + p.len, 0);
  const totalWaste = plans.reduce((s,p) => s + p.rem, 0);
  const aprov = totalLen > 0 ? ((1 - totalWaste/totalLen)*100).toFixed(2) : '0.00';
  
  const planoFinal = {
     id: `PL-${Date.now()}`,
     loteId,
     data: new Date().toISOString(),
     aproveitamento: document.querySelector('.stat-val.green').textContent,
     mapa: plans
  };
  
  const h = {
    lote_id: loteId,
    aproveitamento: aprov + '%',
    barras_usadas: barrasUsadas,
    sobras_geradas: sobrasGeradas,
    desperdicio_total: totalWaste.toString(),
    detalhes_plano: plans
  };
  
  appState.historico.push(h);
  DB.saveHistorico(h);

  window._lastOtimResult = null;

  const btn = document.getElementById('btnFinalizar');
  if (btn) { btn.disabled = true; btn.textContent = '✓ Aprovado'; }
  await DB.savePlano(planoFinal);
  await DB.log("Finalizou Otimização", "unilux_historico", `Lote ${loteId} (${plans.length} barras)`);
  
  showToast(`Plano ${loteId} finalizado e Histórico salvo em Nuvem!`, 'success');
  updateBadges();
  setTimeout(() => navigate('planos'), 1200);
}

function _findNextWmsSlot() {
  const occupied = appState.sobras.map(s => s.endereco).filter(Boolean);
  const CFG = [
    { id: 'VERDE', rows: 11, cols: 11 }, { id: 'ROXO', rows: 11, cols: 11 }, { id: 'AZUL', rows: 11, cols: 11 },
    { id: 'PRETO', rows: 11, cols: 11 }, { id: 'ROSA', rows: 6, cols: 6 },   { id: 'AMARELO', rows: 6, cols: 6 },
    { id: 'VERMELHO', rows: 6, cols: 6 }, { id: 'CINZA', rows: 6, cols: 6 },  { id: 'BRANCO', rows: 9, cols: 9 }
  ];
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  for(let q of CFG) {
    for(let r=0; r<q.rows; r++) {
      for(let c=1; c<=q.cols; c++) {
        const adr = `${q.id}-${L[r]}${String(c).padStart(2,'0')}`;
        if (!occupied.includes(adr)) return adr;
      }
    }
  }
  return null; // Caso a fabrica esteja com 709 retalhos (100% cheia)
}
