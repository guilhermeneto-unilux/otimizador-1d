/* ===== OTIMIZADOR PRO – UNILUX 1D (Advanced FFD + Scrap-First) ===== */

const SEG_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#0ea5e9','#6366f1','#06b6d4','#f97316','#ec4899','#818cf8','#a855f7'];

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
            <div class="form-hint" style="margin-top:8px;">Motor <b>FFD Avançado</b>: agrupa por SKU, usa dimensão de corte real de cada OP, prioriza retalhos (≤ 20% desperdício), empacota múltiplas peças por barra para minimizar matéria-prima. Sobra mínima: <b>conf. por SKU</b>.</div>
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
              <span style="width:12px; height:12px; background:var(--blue); border-radius:2px; flex-shrink:0;"></span> Peça em Barra Virgem
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-500);">
              <span style="width:12px; height:12px; background:#f59e0b; border-radius:2px; flex-shrink:0;"></span> Peça em Retalho Reutilizado
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-500);">
              <span style="width:12px; height:12px; background:#22c55e; border-radius:2px; flex-shrink:0; border:1px solid #16a34a;"></span> Sobra Gerada → Estoque
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-500);">
              <span style="width:12px; height:12px; background:#ef4444; border-radius:2px; flex-shrink:0;"></span> Refugo / Descarte
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-500);">
              <span style="width:12px; height:12px; background:#e5e7eb; border-radius:2px; flex-shrink:0; border:1px solid #d1d5db;"></span> Refile / Esquadrejamento
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

/* ============================================================
   CORE OPTIMIZER: Advanced FFD (First-Fit Decreasing)
   ============================================================
   Estratégia:
   1. Agrupar peças por SKU (cada um tem seus próprios perfis/barras).
   2. Ordenar peças de forma DECRESCENTE (maiores primeiro).
   3. Fase 1 — Scrap-First: tentar usar retalhos existentes
      - Para cada retalho, empilhar o máximo de peças possível (BFD real).
      - Aceitar retalho se desperdício ≤ 20% OU se sobra ≥ min_sobra.
   4. Fase 2 — Barras Virgens: empacotar peças restantes
      - Escolha inteligente do tamanho da barra.
      - Para cada barra aberta, empilhar o máximo de peças (FFD real).
   5. Fase 3 — Refinamento: realocar peças para reduzir bins.
   ============================================================ */

function _calcOtimizacao() {
  const loteId   = document.getElementById('otimLote').value;
  const cfgTrim  = appState.configs ? (appState.configs.trim_mm || 0) : 0;
  const cfgPen   = appState.configs ? (appState.configs.scrap_penalty_pct || 0) / 100 : 0;

  if (!loteId) { showToast('Selecione um lote!', 'error'); return; }

  const lote   = appState.lotes.find(l => l.id === loteId);
  const ordens = appState.ordens.filter(o => lote.ordens.includes(o.id));

  // 1. Montar TODAS as peças individuais a partir das OPs (cada unidade é uma peça separada)
  const allPieces = [];
  ordens.forEach(o => {
    for (let i = 0; i < o.qty; i++) {
      allPieces.push({ op: o.id, sku: o.sku, dim: parseFloat(o.dim), entrega: o.entrega || '' });
    }
  });

  // 2. Agrupar por SKU
  const skuGroups = {};
  allPieces.forEach(pc => {
    if (!skuGroups[pc.sku]) skuGroups[pc.sku] = [];
    skuGroups[pc.sku].push(pc);
  });

  const plans = [];
  const usedScraps = [];

  // 3. Para cada SKU, executar FFD avançado
  Object.keys(skuGroups).forEach(sku => {
    const pieces = skuGroups[sku].sort((a, b) => b.dim - a.dim); // Decrescente
    const remaining = pieces.map((pc, idx) => ({ ...pc, _idx: idx })); // Peças pendentes

    const sObj = appState.skus.find(x => x.code === sku);
    const skuMinSobra = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;

    // ── FASE 1: Scrap-First — Tentar usar retalhos existentes ──
    const scraps = appState.sobras
      .filter(s => s.sku === sku && !usedScraps.includes(s.id))
      .sort((a, b) => a.medida - b.medida); // Menor primeiro para best-fit

    scraps.forEach(scrap => {
      if (remaining.length === 0) return;
      const available = scrap.medida - cfgTrim;
      if (available <= 0) return;

      // Tentar empacotar o máximo de peças neste retalho (FFD)
      const packed = _packPiecesIntoBin(remaining, available);

      if (packed.length === 0) return;

      const usedLen = packed.reduce((s, pc) => s + pc.dim, 0);
      const waste = available - usedLen;
      const wastePct = waste / scrap.medida;

      // Aceitar se: desperdício ≤ 20% OU sobra ≥ min_sobra (gera sub-retalho útil)
      if (wastePct <= 0.20 || waste >= skuMinSobra) {
        usedScraps.push(scrap.id);
        // Remover peças empacotadas da lista de pendentes
        const packedIdxs = packed.map(p => p._idx);
        _removePacked(remaining, packedIdxs);

        plans.push({
          type: 'scrap',
          srcId: scrap.id,
          len: scrap.medida,
          usable: available,
          sku,
          pcs: packed.map(p => ({ op: p.op, sku: p.sku, dim: p.dim, entrega: p.entrega })),
          rem: waste
        });
      }
    });

    // ── FASE 2: Barras Virgens — Empacotar peças restantes com FFD ──
    while (remaining.length > 0) {
      // Pegar a maior peça pendente para determinar o tamanho mínimo da barra
      const largestPiece = remaining[0]; // Já está ordenado decrescente

      // Encontrar a melhor barra virgem para este grupo de peças
      const chosenDim = _chooseBestBar(sObj, largestPiece.dim, remaining, cfgTrim, skuMinSobra);
      const uLen = chosenDim - cfgTrim;

      // Empacotar o máximo de peças nesta barra
      const packed = _packPiecesIntoBin(remaining, uLen);

      if (packed.length === 0) {
        // Fallback: peça que não cabe em nenhuma barra — forçar na maior disponível
        const biggestBar = _getBiggestBar(sObj) || 6000;
        const pc = remaining.shift();
        plans.push({
          type: 'virgin',
          srcId: `${sku}|${biggestBar}`,
          len: biggestBar,
          usable: biggestBar - cfgTrim,
          sku,
          pcs: [{ op: pc.op, sku: pc.sku, dim: pc.dim, entrega: pc.entrega }],
          rem: (biggestBar - cfgTrim) - pc.dim
        });
        continue;
      }

      const packedIdxs = packed.map(p => p._idx);
      _removePacked(remaining, packedIdxs);

      const usedLen = packed.reduce((s, pc) => s + pc.dim, 0);
      plans.push({
        type: 'virgin',
        srcId: `${sku}|${chosenDim}`,
        len: chosenDim,
        usable: uLen,
        sku,
        pcs: packed.map(p => ({ op: p.op, sku: p.sku, dim: p.dim, entrega: p.entrega })),
        rem: uLen - usedLen
      });
    }
  });

  // ── FASE 3: Refinamento — Tentar consolidar bins sub-utilizados ──
  _refinePlans(plans, cfgTrim);

  _renderResultados(plans, loteId, usedScraps, cfgTrim, cfgPen);
}

/* ── Empacota o máximo de peças que cabem num bin de capacidade `capacity` ── */
function _packPiecesIntoBin(remaining, capacity) {
  const packed = [];
  let used = 0;

  for (let i = 0; i < remaining.length; i++) {
    if (used + remaining[i].dim <= capacity) {
      packed.push(remaining[i]);
      used += remaining[i].dim;
    }
  }
  return packed;
}

/* ── Remove peças empacotadas da lista de pendentes ── */
function _removePacked(remaining, packedIdxs) {
  const idxSet = new Set(packedIdxs);
  for (let i = remaining.length - 1; i >= 0; i--) {
    if (idxSet.has(remaining[i]._idx)) {
      remaining.splice(i, 1);
    }
  }
}

/* ── Escolhe a melhor barra virgem para um grupo de peças ──
     Estratégia: testar TODOS os tamanhos de barra disponíveis,
     simular o empacotamento em cada um, e escolher a que gera
     o menor desperdício total (ou melhor sobra reutilizável). */
function _chooseBestBar(sObj, minDim, remaining, cfgTrim, skuMinSobra) {
  if (!sObj || !sObj.dims || sObj.dims.length === 0) return 6000;

  const validBars = sObj.dims
    .filter(d => d.qty > 0 && (d.dim - cfgTrim) >= minDim)
    .map(d => d.dim)
    .sort((a, b) => a - b); // Ascendente

  if (validBars.length === 0) {
    // Nenhuma barra comporta a peça, pegar a maior disponível
    const allBars = sObj.dims.filter(d => d.qty > 0).sort((a, b) => b.dim - a.dim);
    return allBars.length > 0 ? allBars[0].dim : 6000;
  }

  let bestDim = validBars[0];
  let bestScore = -Infinity;

  validBars.forEach(barDim => {
    const uLen = barDim - cfgTrim;
    const packed = _packPiecesIntoBin(remaining, uLen);
    const usedLen = packed.reduce((s, pc) => s + pc.dim, 0);
    const waste = uLen - usedLen;
    const efficiency = usedLen / barDim;

    // Score: priorizar eficiência alta + penalizar sobra "no man's land"
    let score = efficiency * 1000; // Base: eficiência

    if (waste === 0) {
      score += 500; // Perfeito: zero desperdício
    } else if (waste < skuMinSobra) {
      // Penalizar sobra inútil (descarte) usando a Taxa de Desperdício das configs
      const penaltyFactor = (cfgPen > 0) ? (cfgPen * 10) : 1;
      score -= (waste / skuMinSobra) * 100 * penaltyFactor; 
    } else {
      score += 200; // Bom: gera sobra reutilizável (acima da mínima)
    }

    // Bonus: mais peças empacotadas = melhor
    score += packed.length * 50;

    if (score > bestScore) {
      bestScore = score;
      bestDim = barDim;
    }
  });

  return bestDim;
}

/* ── Retorna a maior barra disponível para um SKU ── */
function _getBiggestBar(sObj) {
  if (!sObj || !sObj.dims) return null;
  const available = sObj.dims.filter(d => d.qty > 0).sort((a, b) => b.dim - a.dim);
  return available.length > 0 ? available[0].dim : null;
}

/* ── Fase 3: Refinamento — tentar consolidar bins ──
     Verifica se peças de bins com baixa utilização podem ser
     realocadas em outros bins com espaço sobrando. */
function _refinePlans(plans, cfgTrim) {
  let improved = true;
  let maxPasses = 5;

  while (improved && maxPasses-- > 0) {
    improved = false;

    // Ordenar bins por utilização crescente (pior primeiro)
    const binsByUtil = plans
      .map((p, idx) => ({
        idx,
        util: p.pcs.reduce((s, pc) => s + pc.dim, 0) / p.len
      }))
      .sort((a, b) => a.util - b.util);

    for (let i = 0; i < binsByUtil.length; i++) {
      const sourceBin = plans[binsByUtil[i].idx];
      if (!sourceBin || sourceBin.pcs.length === 0) continue;

      // Tentar realocar TODAS as peças deste bin para outros bins
      const sourcePcs = [...sourceBin.pcs];
      let allMoved = true;

      for (const pc of sourcePcs) {
        let moved = false;
        for (let j = 0; j < plans.length; j++) {
          if (j === binsByUtil[i].idx) continue;
          const targetBin = plans[j];
          if (!targetBin || targetBin.pcs.length === 0) continue;
          if (targetBin.sku !== sourceBin.sku) continue;

          if (targetBin.rem >= pc.dim) {
            targetBin.pcs.push(pc);
            targetBin.rem -= pc.dim;
            moved = true;
            break;
          }
        }
        if (!moved) {
          allMoved = false;
          break;
        }
      }

      if (allMoved) {
        // Remove o bin source (todas as peças foram redistribuídas)
        // Remover peças alocadas para evitar duplicatas
        sourceBin.pcs = [];
        sourceBin._remove = true;
        improved = true;
      } else {
        // Reverter: tirar as peças que foram movidas de volta
        for (const pc of sourcePcs) {
          // Verificar se esta peça está no sourceBin.pcs
          const stillInSource = sourceBin.pcs.some(sp => sp === pc);
          if (!stillInSource) {
            // Ela foi movida — trazê-la de volta
            for (let j = 0; j < plans.length; j++) {
              if (j === binsByUtil[i].idx) continue;
              const targetBin = plans[j];
              const idx = targetBin.pcs.indexOf(pc);
              if (idx !== -1) {
                targetBin.pcs.splice(idx, 1);
                targetBin.rem += pc.dim;
                break;
              }
            }
            sourceBin.pcs.push(pc);
          }
        }
      }
    }

    // Limpar bins marcados para remoção
    for (let i = plans.length - 1; i >= 0; i--) {
      if (plans[i]._remove) plans.splice(i, 1);
    }
  }
}

/* ============================================================
   RENDER RESULTADOS
   ============================================================ */
function _renderResultados(plans, loteId, usedScraps, cfgTrim, cfgPen) {
  window._lastOtimResult = { plans, loteId, usedScraps };
  const area = document.getElementById('otimResults');

  // Calcular estatísticas
  const totalUsedLen = plans.reduce((s, p) => {
    return s + p.pcs.reduce((a, pc) => a + pc.dim, 0);
  }, 0);
  const totalBarLen = plans.reduce((s, p) => s + p.len, 0);

  let sobrasGeradas = 0;
  let totalRefugo = 0;
  let totalSobraUtil = 0;

  plans.forEach(p => {
    const sObj = appState.skus.find(x => x.code === p.sku);
    const skuMin = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;
    if (p.rem >= skuMin) {
      sobrasGeradas++;
      totalSobraUtil += p.rem;
    } else {
      totalRefugo += p.rem;
    }
  });

  const totalRefile = plans.length * cfgTrim;
  const globalWaste = totalRefugo + totalRefile;
  const eff = totalBarLen > 0 ? ((totalUsedLen / totalBarLen) * 100).toFixed(2) : '0.00';

  // Agrupar planos por SKU para visualização
  const skuOrder = [];
  const skuMap = {};
  plans.forEach((p, idx) => {
    if (!skuMap[p.sku]) {
      skuMap[p.sku] = [];
      skuOrder.push(p.sku);
    }
    skuMap[p.sku].push({ plan: p, globalIdx: idx });
  });

  area.innerHTML = `
    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-box" style="border-top:3px solid var(--green);">
        <div class="stat-lbl">Eficiência Real</div>
        <div class="stat-val green">${eff}%</div>
      </div>
      <div class="stat-box">
        <div class="stat-lbl">Barras Usadas</div>
        <div class="stat-val">${plans.length}</div>
      </div>
      <div class="stat-box">
        <div class="stat-lbl">Retalhos Consumidos</div>
        <div class="stat-val orange">${usedScraps.length}</div>
      </div>
      <div class="stat-box" style="border-top:3px solid #22c55e;">
        <div class="stat-lbl">Sobras Geradas</div>
        <div class="stat-val" style="color:#22c55e;">${sobrasGeradas} <span style="font-size:11px; font-weight:400;">(${Math.round(totalSobraUtil)}mm total)</span></div>
      </div>
      <div class="stat-box" style="border-top:3px solid var(--red);">
        <div class="stat-lbl">Desperdício</div>
        <div class="stat-val red">${Math.round(globalWaste)} mm</div>
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-400);">Mapa de Corte · ${plans.length} barra(s) · ${skuOrder.length} SKU(s)</span>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-white btn-sm" onclick="renderOtimizador()">Reiniciar</button>
        <button class="btn btn-dark" id="btnFinalizar" onclick="_finalizarOtimizacao()">Finalizar e Aprovar →</button>
      </div>
    </div>

    <!-- Bar maps grouped by SKU -->
    ${skuOrder.map(sku => {
      const sc = skuColor(sku);
      const skuPlans = skuMap[sku];
      const skuBars = skuPlans.length;
      const skuPcs = skuPlans.reduce((s, x) => s + x.plan.pcs.length, 0);
      const skuSobras = skuPlans.filter(x => {
        const sObj = appState.skus.find(s => s.code === sku);
        const skuMin = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;
        return x.plan.rem >= skuMin;
      }).length;

      return `
        <div style="margin-bottom:20px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; padding:10px 16px; background:${sc.bg}22; border-radius:6px; border-left:4px solid ${sc.text};">
            <span class="sku-tag" style="background:${sc.bg};color:${sc.text}; font-size:12px; padding:4px 10px;">${sku}</span>
            <span style="font-size:12px; font-weight:600; color:var(--text-500);">${skuBars} barra(s) · ${skuPcs} peça(s)${skuSobras > 0 ? ` · <span style="color:#16a34a;">♻ ${skuSobras} sobra(s) gerada(s)</span>` : ''}</span>
          </div>
          ${skuPlans.map(({ plan: p, globalIdx: idx }) => _renderBarCard(p, idx, cfgTrim)).join('')}
        </div>
      `;
    }).join('')}
  `;
}

/* ── Renderiza um card individual de barra ── */
function _renderBarCard(p, idx, cfgTrim) {
  const sObj = appState.skus.find(x => x.code === p.sku);
  const skuMin = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;
  const geraSobra = p.rem >= skuMin;

  // Cores por OP dentro da barra
  const opColors = {};
  let ci = 0;
  p.pcs.forEach(pc => { if (!opColors[pc.op]) opColors[pc.op] = SEG_COLORS[ci++ % SEG_COLORS.length]; });

  // Segmentos de peças
  const segs = p.pcs.map(pc => {
    const pct = (pc.dim / p.len * 100).toFixed(2);
    const bg = p.type === 'scrap' ? '#f59e0b' : opColors[pc.op];
    return `<div class="bar-seg" style="width:${pct}%;background:${bg};" title="${pc.op}: ${pc.dim}mm">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 4px;">${pc.dim}</span>
    </div>`;
  }).join('');

  // Segmento de refile
  const refilePct = cfgTrim > 0 ? (cfgTrim / p.len * 100).toFixed(2) : 0;
  const refileEl = cfgTrim > 0
    ? `<div class="bar-seg" style="width:${refilePct}%; background:#e5e7eb; border-left:1px dashed #9ca3af;" title="Refile: ${cfgTrim}mm"></div>`
    : '';

  // Segmento de sobra/refugo
  const sobraPct = p.rem > 0 ? (p.rem / p.len * 100).toFixed(2) : 0;
  let wasteEl = '';
  if (p.rem > 0) {
    if (geraSobra) {
      wasteEl = `<div class="bar-seg" style="width:${sobraPct}%; background:linear-gradient(135deg, #22c55e, #16a34a); border-left:2px solid #15803d;" title="SOBRA GERADA → Estoque: ${p.rem}mm">
        <span style="color:#fff; font-weight:700; font-size:10px; text-shadow:0 1px 2px rgba(0,0,0,.3);">♻ ${p.rem}mm</span>
      </div>`;
    } else {
      wasteEl = `<div class="bar-seg" style="width:${sobraPct}%; background:${p.rem > 50 ? '#ef4444' : 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 4px, #e5e7eb 4px, #e5e7eb 8px)'}; color:${p.rem > 50 ? '#fff' : 'var(--text-400)'};" title="Refugo: ${p.rem}mm">
        <span style="font-size:10px;">${p.rem > 30 ? p.rem + 'mm' : ''}</span>
      </div>`;
    }
  }

  const usedMm = p.pcs.reduce((s, pc) => s + pc.dim, 0);
  const effBar = ((usedMm / p.len) * 100).toFixed(1);

  // Badge de sobra gerada
  const sobraBadge = geraSobra
    ? `<span class="status-badge" style="background:#dcfce7; color:#16a34a; border:1px solid #bbf7d0; margin-left:8px; animation: pulse-sobra 2s ease-in-out infinite;">♻ Gera Sobra ${p.rem}mm → Estoque</span>`
    : '';

  return `
    <div class="bar-result-card" style="${geraSobra ? 'border-left:3px solid #22c55e; background:linear-gradient(90deg, #f0fdf4 0%, #fff 30%);' : ''}">
      <div class="bar-result-header">
        <div>
          <span style="font-size:14px; font-weight:700;">Barra #${idx+1}</span>
          <span style="font-size:12px; color:var(--text-400); margin-left:8px;">${p.sku} · ${p.len}mm · ${p.type === 'scrap' ? 'Retalho ' + p.srcId : 'Virgem'}</span>
          ${sobraBadge}
        </div>
        <span class="status-badge ${parseFloat(effBar) >= 90 ? 'badge-approved' : parseFloat(effBar) >= 70 ? 'badge-batch' : 'badge-pending'}">${effBar}% aproveitamento</span>
      </div>
      <div class="bar-track">${segs}${refileEl}${wasteEl}</div>
      <div class="bar-meta">
        <span>${p.pcs.length} peça(s): ${p.pcs.map(pc => `${pc.op}(${pc.dim}mm)`).join(', ')}</span>
        <span style="font-weight:600; color:${geraSobra ? '#16a34a' : p.rem > 0 ? '#ef4444' : 'var(--text-400)'};">
          ${geraSobra 
            ? `♻ Sobra: ${p.rem}mm → Vai para Estoque` 
            : p.rem > 0 
              ? `🗑 Descarte: ${p.rem}mm` 
              : '✓ Zero desperdício'}
        </span>
      </div>
    </div>`;
}

/* ============================================================
   FINALIZAR OTIMIZAÇÃO
   ============================================================ */
async function _finalizarOtimizacao() {
  const res = window._lastOtimResult;
  if (!res) return;
  const { plans, loteId, usedScraps } = res;

  const lote = appState.lotes.find(l => l.id === loteId);
  if (lote) {
    lote.status = 'done';
    DB.saveLote(lote);
    lote.ordens.forEach(id => { const o = appState.ordens.find(x => x.id === id); if (o) { o.status = 'done'; DB.saveOrdem(o); } });
    // Remove from in-memory list immediately so UI refreshes correctly
    appState.lotes = appState.lotes.filter(l => l.id !== loteId);
  }

  // Gerar novas sobras (FUNCIONALIDADE AUTO-SAVE DESATIVADA POR SOLICITAÇÃO)
  let sobrasGeradas = 0;
  plans.forEach(p => {
    const sObj = appState.skus.find(x => x.code === p.sku);
    const skuMin = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;

    if (p.rem >= skuMin) {
      sobrasGeradas++;
      /* 
      // Desativado: o usuário prefere guardar manualmente
      const id = SC-${String(appState.nextSobraId++).padStart(3,'0')};
      const enderecoGarantido = _findNextWmsSlot();
      const novaSobra = { id, sku: p.sku, medida: p.rem, criacao: new Date().toISOString().split('T')[0], origem: loteId, endereco: enderecoGarantido };
      appState.sobras.push(novaSobra);
      DB.saveSobra(novaSobra);
      */
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
  const totalUsed = plans.reduce((s,p) => s + p.pcs.reduce((a,pc) => a + pc.dim, 0), 0);
  const aprov = totalLen > 0 ? ((totalUsed/totalLen)*100).toFixed(2) : '0.00';
  
  // Atribuir Plan ID global por SKU (nunca repete entre lotes)
  if (!appState.configs.nextPlanId) appState.configs.nextPlanId = 1;
  const skuPlanIds = {};
  const skusInPlan = [...new Set(plans.map(p => p.sku))];
  skusInPlan.forEach(sk => {
    skuPlanIds[sk] = appState.configs.nextPlanId++;
  });
  // Salvar o contador atualizado
  DB.saveConfig(appState.configs);

  const cfgTrimFinal = appState.configs ? (appState.configs.trim_mm || 0) : 0;
  const planoFinal = {
     id: `PL-${Date.now()}`,
     loteId,
     data: new Date().toISOString(),
     aproveitamento: aprov + '%',
     trim_mm: cfgTrimFinal,
     skuPlanIds,
     mapa: plans
  };
  
  const h = {
    lote_id: loteId,
    aproveitamento: aprov + '%',
    barras_usadas: barrasUsadas,
    sobras_geradas: sobrasGeradas,
    desperdicio_total: (totalLen - totalUsed).toString(),
    detalhes_plano: plans
  };
  
  appState.planos.push(planoFinal);
  appState.historico.push(h);
  DB.saveHistorico(h);

  window._lastOtimResult = null;

  const btn = document.getElementById('btnFinalizar');
  if (btn) { btn.disabled = true; btn.textContent = '\u2713 Aprovado'; }
  
  // Save all plans to unilux_configs row id=2 (no separate table needed)
  await DB.savePlanosAll();
  await DB.log("Finalizou Otimização", "unilux_historico", `Lote ${loteId} (${plans.length} barras)`);
  
  showToast(`Plano ${loteId} finalizado e salvo na nuvem!`, 'success');
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
  return null;
}
