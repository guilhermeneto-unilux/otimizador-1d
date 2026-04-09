/* ===== MODULE: OTIMIZADOR ===== */

function renderOtimizador() {
  const lotesDisponiveis = appState.lotes.filter(l => l.status === 'pending');

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Otimizador de Corte</h1>
        <p class="page-subtitle">Motor de otimização 1D – Minimização de perda de material</p>
      </div>
    </div>

    <div class="grid-1-2" style="align-items:start">
      <!-- PAINEL ESQUERDO: Seleção e Parâmetros -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card">
          <div class="card-header"><span class="card-title-lg">⚙️ Parâmetros</span></div>

          <div class="form-group">
            <label class="form-label">Selecionar Lote</label>
            <select class="form-select" id="otimLoteSelect" onchange="_otimLoadLote()">
              <option value="">-- Selecione um lote --</option>
              ${lotesDisponiveis.map(l => `
                <option value="${l.id}">${l.id} – ${l.skus.join(', ')} (${l.ordens.length} OP)</option>
              `).join('')}
              ${lotesDisponiveis.length === 0 ? '<option disabled>Nenhum lote pendente</option>' : ''}
            </select>
          </div>

          <div id="otimLoteInfo" style="display:none;">
            <div class="card" style="background:var(--surface-2);margin-top:8px;">
              <div id="otimInfoContent"></div>
            </div>
          </div>

          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">Estratégia de Otimização</label>
            <select class="form-select" id="otimEstrategia">
              <option value="ffd">FFD – First Fit Decreasing (Recomendado)</option>
              <option value="bestfit">Best Fit – Menor sobra</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Perda mínima considerável (mm)</label>
            <input class="form-input" type="number" id="otimPerdaMin" value="50" min="0">
            <span style="font-size:11px;color:var(--text-muted);margin-top:4px;display:block;">
              Sobras menores que este valor são descartadas automaticamente.
            </span>
          </div>

          <button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="_executarOtimizacao()" id="btnOtimizar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Executar Otimização
          </button>
        </div>

        <!-- LEGENDA FONTES -->
        <div class="card">
          <div class="card-header"><span class="card-title-lg">📖 Legenda</span></div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:30px;height:18px;border-radius:4px;background:var(--blue);"></div>
              <span style="font-size:13px;">Barra virgem (matéria-prima)</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:30px;height:18px;border-radius:4px;background:var(--yellow);"></div>
              <span style="font-size:13px;">Sobra / Retalho reutilizado</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:30px;height:18px;border-radius:4px;background:repeating-linear-gradient(45deg,#e5e9f2 0,#e5e9f2 3px,#f0f2f7 3px,#f0f2f7 9px);border:1px solid var(--border)"></div>
              <span style="font-size:13px;">Desperdício / Retalho gerado</span>
            </div>
          </div>
        </div>
      </div>

      <!-- PAINEL DIREITO: Resultado -->
      <div id="otimResultado">
        <div class="empty-state" style="background:var(--surface);border-radius:var(--radius-lg);border:1px solid var(--border);min-height:400px;">
          <div class="empty-state-icon">⚙️</div>
          <div class="empty-state-title">Aguardando otimização</div>
          <div class="empty-state-desc">Selecione um lote e clique em "Executar Otimização"</div>
        </div>
      </div>
    </div>
  `;
}

function _otimLoadLote() {
  const loteId = document.getElementById('otimLoteSelect').value;
  if (!loteId) { document.getElementById('otimLoteInfo').style.display = 'none'; return; }

  const lote = appState.lotes.find(l => l.id === loteId);
  const ordens = appState.ordens.filter(o => lote.ordens.includes(o.id));

  document.getElementById('otimLoteInfo').style.display = 'block';
  document.getElementById('otimInfoContent').innerHTML = `
    <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;">Ordens no lote</div>
    ${ordens.map(o => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:13px;font-weight:600;">${o.id}</div>
          <div style="font-size:11px;color:var(--text-muted);">${o.sku}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px;font-weight:700;">${o.qty}× ${o.dim}mm</div>
          <div style="font-size:11px;color:var(--text-muted);">Total: ${(o.qty * o.dim / 1000).toFixed(2)}m</div>
        </div>
      </div>
    `).join('')}
  `;
}

/* ---- ALGORITMO DE OTIMIZAÇÃO 1D (FFD + Prioridade Sobras) ---- */
function _executarOtimizacao() {
  const loteId = document.getElementById('otimLoteSelect').value;
  if (!loteId) { showToast('Selecione um lote primeiro!', 'error'); return; }

  const lote   = appState.lotes.find(l => l.id === loteId);
  const ordens = appState.ordens.filter(o => lote.ordens.includes(o.id));
  const perdaMin = parseInt(document.getElementById('otimPerdaMin').value) || 50;

  // Expandir ordens em peças individuais
  const pecas = [];
  ordens.forEach(o => {
    for (let i = 0; i < o.qty; i++) pecas.push({ op: o.id, sku: o.sku, dim: o.dim });
  });

  // Agrupar por SKU
  const bySku = {};
  pecas.forEach(p => {
    if (!bySku[p.sku]) bySku[p.sku] = [];
    bySku[p.sku].push(p);
  });

  const planos = [];
  const sobrasUsadas = [];

  Object.entries(bySku).forEach(([sku, pcs]) => {
    pcs.sort((a, b) => b.dim - a.dim); // FFD sort

    const sobrasDisp = appState.sobras
      .filter(s => s.sku === sku)
      .sort((a, b) => a.medida - b.medida)
      .map(s => ({ ...s, available: s.medida }));

    const barrasDisp = appState.barras
      .filter(b => b.sku === sku && b.qty > 0)
      .sort((a, b) => a.dim - b.dim);

    const bins = [];

    pcs.forEach(peca => {
      // 1) Tentar caber em bin já aberto
      let placed = false;
      for (const bin of bins) {
        if (bin.remaining >= peca.dim) {
          bin.pecas.push(peca);
          bin.remaining -= peca.dim;
          placed = true;
          break;
        }
      }
      if (placed) return;

      // 2) Abrir nova fonte: sobra primeiro
      let newBin = null;
      for (let i = 0; i < sobrasDisp.length; i++) {
        const s = sobrasDisp[i];
        if (s.available >= peca.dim) {
          newBin = { source: 'scrap', sourceId: s.id, barraLen: s.available, sku, pecas: [peca], remaining: s.available - peca.dim };
          sobrasDisp.splice(i, 1);
          sobrasUsadas.push(s.id);
          break;
        }
      }

      // 3) Fallback: barra virgem
      if (!newBin) {
        const barra = barrasDisp.find(b => b.qty > 0 && b.dim >= peca.dim);
        if (barra) {
          newBin = { source: 'virgin', sourceId: barra.id, barraLen: barra.dim, sku, pecas: [peca], remaining: barra.dim - peca.dim };
          barra.qty--;
        }
      }

      if (newBin) {
        bins.push(newBin);
      } else {
        bins.push({ source: 'virgin', sourceId: '???', barraLen: peca.dim, sku, pecas: [peca], remaining: 0 });
      }
    });

    bins.forEach(b => planos.push({ ...b, waste: b.remaining }));
  });

  // Métricas
  const totalLen   = planos.reduce((s, p) => s + p.barraLen, 0);
  const totalWaste = planos.reduce((s, p) => s + p.waste, 0);
  const aproveit   = totalLen > 0 ? ((1 - totalWaste / totalLen) * 100).toFixed(1) : '0.0';
  const scraUsadas = sobrasUsadas.length;
  const virgUsadas = planos.filter(p => p.source === 'virgin').length;

  _renderResultadoOtimizacao(planos, aproveit, scraUsadas, virgUsadas, totalWaste, loteId, perdaMin, sobrasUsadas);
}

function _renderResultadoOtimizacao(planos, aproveit, scraUsadas, virgUsadas, totalWaste, loteId, perdaMin, sobrasUsadas) {
  // Store result in global so the approve button can safely access it — no fragile serialization
  window._lastOtimResult = { planos, aproveit, loteId, perdaMin, sobrasUsadas };

  const el = document.getElementById('otimResultado');

  const barsHtml = planos.map((p, i) => {
    const segmentsHtml = p.pecas.map(peca => {
      const pct = (peca.dim / p.barraLen * 100).toFixed(2);
      const bg  = p.source === 'scrap' ? 'var(--yellow)' : 'var(--blue)';
      return `
        <div class="cut-segment" style="width:${pct}%;background:${bg};" title="${peca.op}: ${peca.dim}mm">
          <div class="cut-tooltip">${peca.op} · ${peca.dim}mm</div>
          <span style="font-size:10px;color:#fff;font-weight:700;overflow:hidden;text-overflow:ellipsis;padding:0 4px;">${peca.dim}</span>
        </div>`;
    }).join('');

    const wastePct  = (p.waste / p.barraLen * 100).toFixed(2);
    const wasteHtml = p.waste > 0 ? `
      <div class="cut-segment cut-waste" style="width:${wastePct}%;" title="Sobra/Perda: ${p.waste}mm">
        <span style="font-size:10px;">${p.waste >= 50 ? p.waste + 'mm' : ''}</span>
      </div>` : '';

    const srcTag = p.source === 'scrap'
      ? `<span class="otim-source-tag tag-scrap">🔶 Retalho ${p.sourceId}</span>`
      : `<span class="otim-source-tag tag-virgin">🔷 Barra Virgem ${p.sourceId}</span>`;

    return `
      <div class="cut-bar-wrapper">
        <div class="cut-bar-label">
          Barra ${i + 1} · ${_skuTag(p.sku)} · ${p.barraLen}mm ${srcTag}
        </div>
        <div class="cut-bar-visual">${segmentsHtml}${wasteHtml}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:4px;">
          <span>${p.pecas.length} peça(s) alocada(s)</span>
          <span>Sobra: ${p.waste}mm ${p.waste > 0 && p.waste >= perdaMin ? '→ para Grid' : p.waste > 0 ? '(descartada)' : ''}</span>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="otim-result">
      <div class="otim-result-header">
        <div>
          <div style="font-size:18px;font-weight:800;color:var(--text-primary);">Resultado da Otimização</div>
          <div style="font-size:13px;color:var(--text-muted);">Lote ${loteId}</div>
        </div>
        <button class="btn btn-success" onclick="_aprovarPlano()" id="btnAprovar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>
          Aprovar e Salvar Plano
        </button>
      </div>

      <div class="metric-row">
        <div class="metric-item">
          <div class="metric-item-label">Aproveitamento</div>
          <div class="metric-item-value text-green">${aproveit}%</div>
        </div>
        <div class="metric-item">
          <div class="metric-item-label">Barras Virgens</div>
          <div class="metric-item-value">${virgUsadas}</div>
        </div>
        <div class="metric-item">
          <div class="metric-item-label">Retalhos Usados</div>
          <div class="metric-item-value text-yellow">${scraUsadas}</div>
        </div>
        <div class="metric-item">
          <div class="metric-item-label">Perda Total</div>
          <div class="metric-item-value text-red">${fmtMm(totalWaste)}</div>
        </div>
        <div class="metric-item">
          <div class="metric-item-label">Barras Totais</div>
          <div class="metric-item-value">${planos.length}</div>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:4px;">
          <span>Taxa de aproveitamento</span><span class="font-700 text-green">${aproveit}%</span>
        </div>
        <div class="progress-bar" style="height:10px;">
          <div class="progress-fill" style="width:${aproveit}%"></div>
        </div>
      </div>

      <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.4px;">
        Distribuição de cortes
      </div>
      ${barsHtml}
    </div>
  `;
}

function _aprovarPlano() {
  const result = window._lastOtimResult;
  if (!result) { showToast('Nenhum resultado de otimização disponível!', 'error'); return; }

  const { planos, aproveit, loteId, perdaMin, sobrasUsadas } = result;
  const lote = appState.lotes.find(l => l.id === loteId);
  if (!lote) return;

  // 1) Sobras a gerar a partir do desperdício
  const sobrasParaGerar = [];
  planos.forEach(p => {
    if (p.waste >= (perdaMin || 50)) {
      sobrasParaGerar.push({ sku: p.sku, medida: p.waste });
    }
  });

  // 2) Mover sobras consumidas para histórico
  sobrasUsadas.forEach(id => {
    const idx = appState.sobras.findIndex(s => s.id === id);
    if (idx !== -1) {
      const removed = appState.sobras.splice(idx, 1)[0];
      appState.historico.unshift({
        id: `HC-${String(appState.historico.length + 1).padStart(3, '0')}`,
        sku: removed.sku, medida: removed.medida,
        consumido: new Date().toISOString().split('T')[0],
        lote: loteId, motivo: 'Usado em otimização'
      });
    }
  });

  // 3) Alocar novas sobras no grid
  sobrasParaGerar.forEach(s => {
    const free = _findFreeGridCell();
    if (free) {
      appState.sobras.push({
        id: `SC-${String(appState.nextSobraId++).padStart(3, '0')}`,
        sku: s.sku, medida: s.medida,
        criacao: new Date().toISOString().split('T')[0],
        col: free.col, row: free.row
      });
    }
  });

  // 4) Criar plano no Kanban com dados reais
  const planoId = `PC-${String(appState.nextPlanoId++).padStart(3, '0')}`;
  appState.planos.push({
    id: planoId, lote: loteId, sku: lote.skus.join('+'),
    barras: planos.length,
    aproveitamento: parseFloat(aproveit),
    criacao: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: `${planos.length} barra(s) · Aprov. ${aproveit}%`
  });

  // 5) Mover lote e ordens para concluído
  lote.status = 'approved';
  lote.ordens.forEach(id => {
    const o = appState.ordens.find(x => x.id === id);
    if (o) o.status = 'done';
  });

  window._lastOtimResult = null;

  const btn = document.getElementById('btnAprovar');
  if (btn) { btn.disabled = true; btn.innerHTML = '✓ Plano Salvo'; }

  showToast(`Plano ${planoId} aprovado! ${sobrasParaGerar.length} sobra(s) → Grid. Aproveitamento: ${aproveit}%`, 'success');
  updateBadges();
}

function _findFreeGridCell() {
  const COLS = 8, ROWS = 11;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const occupied = appState.sobras.some(s => s.col === col && s.row === row);
      if (!occupied) return { col, row };
    }
  }
  return null;
}
