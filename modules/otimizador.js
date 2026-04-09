/* ===== OTIMIZADOR – UNILUX 1D ===== */

const SEG_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316'];

function renderOtimizador() {
  const lotesDisp = appState.lotes.filter(l => l.status === 'pending');

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
          </div>

          <div class="form-group">
            <label class="form-label">Estratégia</label>
            <select class="form-control" id="otimStrategy">
              <option value="ffd">First Fit Decreasing (FFD)</option>
              <option value="bfd">Best Fit Decreasing (BFD)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">
              <input type="checkbox" id="otimUsarSobras" checked style="margin-right:6px;">
              Priorizar Retalhos
            </label>
            <div class="form-hint">Usa sobras antes de barras virgens.</div>
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Sobra Mínima (mm)</label>
            <input class="form-control" type="number" id="otimMinSobra" value="50">
            <div class="form-hint">Abaixo disso, é descarte.</div>
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
  const minSobra = parseInt(document.getElementById('otimMinSobra').value) || 50;

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

    pcs.forEach(pc => {
      // Tentar bin aberto
      const fit = bins.find(b => b.rem >= pc.dim);
      if (fit) { fit.pcs.push(pc); fit.rem -= pc.dim; return; }

      // Tentar sobra
      const si = scraps.findIndex(s => s.medida >= pc.dim && !usedScraps.includes(s.id));
      if (si !== -1) {
        const s = scraps[si];
        usedScraps.push(s.id);
        bins.push({ type:'scrap', srcId:s.id, len:s.medida, sku, pcs:[pc], rem:s.medida - pc.dim });
        return;
      }

      // Barra virgem
      const fullLen = getSkuDim(sku);
      bins.push({ type:'virgin', srcId: _pickBar(sku), len:fullLen, sku, pcs:[pc], rem:fullLen - pc.dim });
    });

    bins.forEach(b => plans.push(b));
  });

  _renderResultados(plans, loteId, minSobra, usedScraps);
}

function _pickBar(sku) {
  const b = appState.barras.find(x => x.sku === sku && x.qty > 0);
  return b ? b.id : '???';
}

function _renderResultados(plans, loteId, minSobra, usedScraps) {
  window._lastOtimResult = { plans, loteId, minSobra, usedScraps };
  const area = document.getElementById('otimResults');

  const totalLen   = plans.reduce((s,p) => s + p.len, 0);
  const totalWaste = plans.reduce((s,p) => s + p.rem, 0);
  const eff        = totalLen > 0 ? ((1 - totalWaste/totalLen)*100).toFixed(2) : '0.00';

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
        <div class="stat-lbl">Desperdício Total</div>
        <div class="stat-val red">${totalWaste} mm</div>
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
      const wastePct = (p.rem / p.len * 100).toFixed(2);
      const wasteEl = p.rem > 0
        ? `<div class="bar-seg bar-seg-waste" style="width:${wastePct}%;" title="Sobra: ${p.rem}mm">
            <span>${p.rem > 100 ? p.rem+'mm' : ''}</span>
           </div>`
        : '';
      const eff1 = (100 - (p.rem/p.len*100)).toFixed(1);
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
            <span>Sobra: ${p.rem}mm ${p.rem >= minSobra ? '→ Estoque' : '(descarte)'}</span>
          </div>
        </div>`;
    }).join('')}
  `;
}

function _finalizarOtimizacao() {
  const { plans, loteId, minSobra, usedScraps } = window._lastOtimResult;

  const lote = appState.lotes.find(l => l.id === loteId);
  if (lote) {
    lote.status = 'approved';
    DB.saveLote(lote);
    lote.ordens.forEach(id => { const o = appState.ordens.find(x => x.id === id); if (o) { o.status = 'done'; DB.saveOrdem(o); } });
  }

  // Gerar novas sobras
  let sobrasGeradas = 0;
  plans.forEach(p => {
    if (p.rem >= minSobra) {
      const id = `SC-${String(appState.nextSobraId++).padStart(3,'0')}`;
      sobrasGeradas++;
      const novaSobra = { id, sku: p.sku, medida: p.rem, criacao: new Date().toISOString().split('T')[0], origem: loteId };
      appState.sobras.push(novaSobra);
      DB.saveSobra(novaSobra);
    }
  });

  // Consumir sobras usadas
  usedScraps.forEach(sid => {
    appState.sobras = appState.sobras.filter(s => s.id !== sid);
    DB.deleteSobra(sid);
  });

  // Baixar barras virgens usadas
  let barrasUsadas = 0;
  plans.filter(p => p.type === 'virgin' && p.srcId !== '???').forEach(p => {
    barrasUsadas++;
    const b = appState.barras.find(x => x.id === p.srcId);
    if (b && b.qty > 0) { b.qty--; DB.saveBarra(b); }
  });

  // Criar e salvar Histórico da Otimização
  const totalLen = plans.reduce((s,p) => s + p.len, 0);
  const totalWaste = plans.reduce((s,p) => s + p.rem, 0);
  const aprov = totalLen > 0 ? ((1 - totalWaste/totalLen)*100).toFixed(2) : '0.00';
  
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

  showToast(`Plano ${loteId} finalizado e Histórico salvo em Nuvem!`, 'success');
  updateBadges();
  setTimeout(() => navigate('planos'), 1200);
}
