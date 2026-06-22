/* ===== OTIMIZADOR PRO – UNILUX 1D (Advanced FFD + Scrap-First) ===== */

const SEG_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#0ea5e9','#6366f1','#06b6d4','#f97316','#ec4899','#818cf8','#a855f7'];
const OTIM_STRATEGY_CURRENT = 'current';
const OTIM_STRATEGY_FORCE_SCRAPS = 'force-scraps';

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
              ${lotesDisp.map(l => `<option value="${l.id}">${l.id} · ${l.ordens.length} linha(s) · ${_lotePieceCount(l)} peça(s)</option>`).join('')}
            </select>
            <div class="form-hint" style="margin-top:8px;">Motor <b>FFD Avançado</b>: agrupa por SKU, usa dimensão de corte real de cada OP, prioriza retalhos (≤ 20% desperdício), empacota múltiplas peças por barra para minimizar matéria-prima. Sobra mínima: <b>conf. por SKU</b>.</div>
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Estratégia de Otimização</label>
            <select class="form-control" id="otimStrategy">
              <option value="${OTIM_STRATEGY_CURRENT}" selected>Melhor aproveitamento (estratégia atual)</option>
              <option value="${OTIM_STRATEGY_FORCE_SCRAPS}">Forçar utilização das sobras</option>
            </select>
            <div class="form-hint" style="margin-top:8px;">
              <b>Melhor aproveitamento</b> mantém exatamente a lógica atual. <b>Forçar utilização</b> usa o máximo possível de sobras compatíveis antes das barras inteiras, mesmo com eficiência menor.
            </div>
          </div>
        </div>

        <button class="btn btn-green" id="btnCalcOtim" style="width:100%; justify-content:center; padding:12px;" onclick="_startOtimizacao()">
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

function _lotePieceCount(lote) {
  const ids = [...new Set((lote?.ordens || []).map(id => String(id)))];
  return ids.reduce((sum, id) => {
    const ordem = appState.ordens.find(o => o.id === id);
    return sum + (Number(ordem?.qty) || 0);
  }, 0);
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

function _startOtimizacao() {
  const loteId = document.getElementById('otimLote').value;
  if (!loteId) { showToast('Selecione um lote!', 'error'); return; }

  const btn = document.getElementById('btnCalcOtim');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Calculando...`;
  }

  const area = document.getElementById('otimResults');
  if (area) {
    area.innerHTML = `
      <div class="empty-state" style="background:var(--white); border:1px dashed var(--border); border-radius:var(--radius); height:100%; display:flex; flex-direction:column; gap:16px;">
        <div style="animation: spin 1s linear infinite; display:inline-block;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="1.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
        </div>
        <p>Calculando melhor aproveitamento... Por favor, aguarde.</p>
      </div>
      <style>
        @keyframes spin { 100% { transform: rotate(360deg); } }
      </style>
    `;
  }

  // Defer computation to allow paint
  setTimeout(() => {
    try {
      _calcOtimizacao();
    } catch (e) {
      console.error("Optimization error:", e);
      if (e.message === 'LOTE_CORROMPEU') {
        showToast('As ordens deste lote não existem mais no sistema.', 'error');
        if (area) {
          area.innerHTML = `
            <div class="empty-state" style="background:var(--white); border:1px dashed #ef4444; border-radius:var(--radius); height:100%; display:flex; flex-direction:column; gap:16px; color:#ef4444;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <p>Lote Inválido. As ordens de produção referentes a este lote foram deletadas do banco de dados (provavelmente via exclusão manual ou atualização da planilha sem essas ordens). Exclua ou recrie este lote para continuar.</p>
            </div>
          `;
        }
      } else if (String(e.message || '').startsWith('LOTE_OP_INVALIDA')) {
        const details = String(e.message || '').split(':').slice(1).join(':') || 'OP inválida';
        const safeDetails = _otimEsc(details);
        showToast('O lote tem OP com quantidade ou medida inválida.', 'error');
        if (area) {
          area.innerHTML = `
            <div class="empty-state" style="background:var(--white); border:1px dashed #ef4444; border-radius:var(--radius); height:100%; display:flex; flex-direction:column; gap:16px; color:#ef4444;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>Revise quantidade e medida das OPs antes de otimizar: ${safeDetails}.</p>
            </div>
          `;
        }
      } else if (String(e.message || '').startsWith('SKU_NAO_CADASTRADO')) {
        const details = String(e.message || '').split(':').slice(1).join(':') || 'SKU não cadastrado';
        const safeDetails = _otimEsc(details);
        showToast('Existem OPs com SKU não cadastrado. Otimização bloqueada.', 'error');
        if (area) {
          area.innerHTML = `
            <div class="empty-state" style="background:var(--white); border:1px dashed #ef4444; border-radius:var(--radius); height:100%; display:flex; flex-direction:column; gap:16px; color:#ef4444;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <p>Cadastre ou corrija o SKU antes de otimizar: ${safeDetails}.</p>
            </div>
          `;
        }
      } else if (String(e.message || '').startsWith('SKU_SEM_BARRA')) {
        const details = String(e.message || '').split(':').slice(1).join(':') || 'sem barra compatível';
        const safeDetails = _otimEsc(details);
        showToast('Sem barra compatível para uma ou mais peças. Otimização bloqueada.', 'error');
        if (area) {
          area.innerHTML = `
            <div class="empty-state" style="background:var(--white); border:1px dashed #ef4444; border-radius:var(--radius); height:100%; display:flex; flex-direction:column; gap:16px; color:#ef4444;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>Não existe barra virgem em estoque com medida suficiente para a peça restante: ${safeDetails}.</p>
            </div>
          `;
        }
      } else if (String(e.message || '').startsWith('PLAN_PIECE_MISMATCH')) {
        showToast('O otimizador detectou uma inconsistência no plano e bloqueou o resultado. Tente recalcular o lote.', 'error');
        if (area) {
          area.innerHTML = `
            <div class="empty-state" style="background:var(--white); border:1px dashed #ef4444; border-radius:var(--radius); height:100%; display:flex; flex-direction:column; gap:16px; color:#ef4444;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>Plano inconsistente: a quantidade de peças calculada não bate com as OPs do lote. O plano não foi aprovado nem salvo.</p>
            </div>
          `;
        }
      } else {
        showToast('Erro durante a otimização: ' + e.message, 'error');
        console.error('Detalhes completos do erro:', e);
        if (area) {
          area.innerHTML = `
            <div class="empty-state" style="background:var(--white); border:1px dashed #ef4444; border-radius:var(--radius); height:100%; display:flex; flex-direction:column; gap:16px; color:#ef4444;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>Falha ao calcular otimização. Verifique se os SKUs possuem o cadastro correto.</p>
            </div>
          `;
        }
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Calcular Otimização`;
      }
    }
  }, 100);
}

function _calcOtimizacao() {
  const loteId   = document.getElementById('otimLote').value;
  const strategy = document.getElementById('otimStrategy')?.value === OTIM_STRATEGY_FORCE_SCRAPS
    ? OTIM_STRATEGY_FORCE_SCRAPS
    : OTIM_STRATEGY_CURRENT;
  const cfgTrim  = appState.configs ? (appState.configs.trim_mm || 0) : 0;
  const cfgPen   = appState.configs ? (appState.configs.scrap_penalty_pct || 0) / 100 : 0;

  if (!loteId) { showToast('Selecione um lote!', 'error'); return; }

  const lote = appState.lotes.find(l => l.id === loteId);
  if (!lote || !Array.isArray(lote.ordens)) {
    throw new Error('LOTE_CORROMPEU');
  }

  const loteOrderIds = [...new Set(lote.ordens.map(id => String(id)))];
  const ordens = loteOrderIds
    .map(id => appState.ordens.find(o => o.id === id))
    .filter(Boolean);

  if (!ordens || ordens.length === 0 || ordens.length !== loteOrderIds.length) {
    throw new Error('LOTE_CORROMPEU');
  }

  const invalidOps = ordens.filter(o => {
    const qty = Number(o.qty);
    const dim = Number(o.dim);
    return !Number.isInteger(qty) || qty <= 0 || !Number.isFinite(dim) || dim <= 0;
  });
  if (invalidOps.length) {
    throw new Error(`LOTE_OP_INVALIDA:${invalidOps.map(o => o.id).join(', ')}`);
  }

  const missingSkuOps = ordens.filter(o => !_otimFindSku(o.sku));
  if (missingSkuOps.length) {
    throw new Error(`SKU_NAO_CADASTRADO:${missingSkuOps.map(o => `${o.id} (${o.sku || '-'})`).join(', ')}`);
  }

  // 1. Montar TODAS as peças individuais a partir das OPs (cada unidade é uma peça separada)
  const allPieces = [];
  ordens.forEach(o => {
    const qty = Number(o.qty);
    const skuObj = _otimFindSku(o.sku);
    const baseOp = _otimBaseOp(o);
    for (let i = 0; i < qty; i++) {
      allPieces.push({
        pieceId: `${o.id}#${i + 1}`,
        pieceNo: i + 1,
        qty,
        op: o.id,
        baseOp,
        lineId: o.id,
        sku: skuObj.code,
        dim: parseFloat(o.dim),
        entrega: o.entrega || ''
      });
    }
  });

  // ── VALIDAÇÃO DE UNIDADES (guardrail mm vs m) ──
  // Peças devem estar em milímetros (valores típicos: 500–6000).
  // Se alguma peça tem dim < 100, provavelmente está em metros → corrigir.
  allPieces.forEach(pc => {
    if (pc.dim > 0 && pc.dim < 100) {
      console.warn(`[OTIM] Peça ${pc.op} dim=${pc.dim} parece estar em METROS. Convertendo para mm (*1000).`);
      pc.dim = Math.round(pc.dim * 1000);
    }
  });

  // Validar dimensões das barras nos SKUs também
  const skuCodes = [...new Set(allPieces.map(p => p.sku))];
  skuCodes.forEach(skuCode => {
    const sObj = appState.skus.find(x => x.code === skuCode);
    if (sObj && sObj.dims) {
      sObj.dims.forEach(d => {
        if (d.dim > 0 && d.dim < 100) {
          console.warn(`[OTIM] Barra SKU ${skuCode} dim=${d.dim} parece estar em METROS. Convertendo para mm (*1000).`);
          d.dim = Math.round(d.dim * 1000);
        }
      });
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
    if (!sObj) {
      throw new Error(`SKU_NAO_CADASTRADO:${sku}`);
    }
    // Guardrail min_sobra: se < 10, provavelmente em metros
    if (sObj && sObj.min_sobra !== undefined && sObj.min_sobra > 0 && sObj.min_sobra < 10) {
      console.warn(`[OTIM] SKU ${sku} min_sobra=${sObj.min_sobra} parece estar em METROS. Convertendo para mm (*1000).`);
      sObj.min_sobra = Math.round(sObj.min_sobra * 1000);
    }
    const skuMinSobra = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;
    
    console.log(`[OTIM] SKU=${sku}: ${remaining.length} peça(s), dim maior=${remaining[0]?.dim}mm, minSobra=${skuMinSobra}mm, barras=${sObj?.dims?.map(d=>`${d.dim}mm(qty:${d.qty})`).join(', ') || 'N/A'}`);

    // ── FASE 1: Scrap-First — Tentar usar retalhos existentes ──
    const scraps = (appState.sobras || [])
      .filter(s => s.sku === sku && !usedScraps.includes(s.id))
      .sort((a, b) => a.medida - b.medida); // Menor primeiro para best-fit

    if (strategy === OTIM_STRATEGY_FORCE_SCRAPS) {
      _forceCompatibleScraps(scraps, remaining, cfgTrim, sku, plans, usedScraps);
    } else {
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
            srcAddr: scrap.endereco || '',
            len: scrap.medida,
            usable: available,
            sku,
            pcs: packed.map(_toPlanPiece),
            rem: waste
          });
          console.log(`[OTIM] Usado retalho ${scrap.id} do setor ${scrap.endereco || '—'}`);
        }
      });
    }

    // ── FASE 2: Barras Virgens — Empacotar peças restantes com FFD ──
    while (remaining.length > 0) {
      // Pegar a maior peça pendente para determinar o tamanho mínimo da barra
      const largestPiece = remaining[0]; // Já está ordenado decrescente

      // Encontrar a melhor barra virgem para este grupo de peças
      const chosenDim = _chooseBestBar(sObj, largestPiece.dim, remaining, cfgTrim, skuMinSobra, cfgPen);
      if (!chosenDim) {
        throw new Error(`SKU_SEM_BARRA:${sku} / ${largestPiece.op} / ${fmtM(largestPiece.dim)}`);
      }
      const effectiveLen = chosenDim - 50;
      const uLen = effectiveLen - cfgTrim;

      // Empacotar o máximo de peças nesta barra
      const packed = _packPiecesIntoBin(remaining, uLen);

      if (packed.length === 0) {
        throw new Error(`SKU_SEM_BARRA:${sku} / ${largestPiece.op} / ${fmtM(largestPiece.dim)}`);
      }

      const packedIdxs = packed.map(p => p._idx);
      _removePacked(remaining, packedIdxs);

      const usedLen = packed.reduce((s, pc) => s + pc.dim, 0);
      plans.push({
        type: 'virgin',
        srcId: `${sku}|${chosenDim}`,
        len: effectiveLen,
        usable: uLen,
        sku,
        pcs: packed.map(_toPlanPiece),
        rem: uLen - usedLen
      });
    }
  });

  // ── FASE 3: Refinamento — Tentar consolidar bins sub-utilizados ──
  _refinePlans(plans, cfgTrim, strategy === OTIM_STRATEGY_FORCE_SCRAPS);
  _validatePlanPieceCounts(plans, allPieces);

  _renderResultados(plans, loteId, _usedScrapIdsFromPlans(plans), cfgTrim, cfgPen, strategy);
}

function _usedScrapIdsFromPlans(plans) {
  return [...new Set((plans || [])
    .filter(plan => plan?.type === 'scrap' && Array.isArray(plan.pcs) && plan.pcs.length > 0)
    .map(plan => plan.srcId)
    .filter(Boolean))];
}

function _otimFindSku(code) {
  const raw = String(code || '').trim().toLowerCase();
  return appState.skus.find(s => String(s.code || '').trim().toLowerCase() === raw) || null;
}

function _otimBaseOp(ordem) {
  const raw = ordem?._meta?.base_op || ordem?._meta?.op_original || ordem?.id || '';
  const normalized = String(raw)
    .split('#')[0]
    .trim()
    .toUpperCase()
    .replace(/^(OP[\s-]*)+/i, '')
    .replace(/-L\d+$/i, '')
    .trim();
  return normalized ? `OP-${normalized}` : String(ordem?.id || '');
}

function _otimEsc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function _toPlanPiece(pc) {
  return {
    pieceId: pc.pieceId,
    pieceNo: pc.pieceNo,
    qty: pc.qty,
    op: pc.op,
    baseOp: pc.baseOp,
    lineId: pc.lineId,
    sku: pc.sku,
    dim: pc.dim,
    entrega: pc.entrega
  };
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

/* ── Força a utilização do maior número possível de sobras compatíveis ──
     Primeiro reserva uma peça para cada sobra que consegue receber corte.
     Depois completa o espaço restante sem retirar peças das sobras reservadas. */
function _forceCompatibleScraps(scraps, remaining, cfgTrim, sku, plans, usedScraps) {
  if (!Array.isArray(scraps) || !scraps.length || !remaining.length) return;

  const availableScraps = scraps
    .map(scrap => ({ scrap, available: Number(scrap.medida) - cfgTrim }))
    .filter(item => Number.isFinite(item.available) && item.available > 0)
    .sort((a, b) => a.available - b.available);

  // Peças menores primeiro maximizam a quantidade de sobras que recebem ao menos um corte.
  const seedCandidates = remaining.slice().sort((a, b) => a.dim - b.dim);
  const forcedBins = [];

  availableScraps.forEach(({ scrap, available }) => {
    const candidateIndex = seedCandidates.findIndex(pc => pc.dim <= available);
    if (candidateIndex === -1) return;

    const seed = seedCandidates.splice(candidateIndex, 1)[0];
    forcedBins.push({ scrap, available, packed: [seed] });
  });

  if (!forcedBins.length) return;

  _removePacked(remaining, forcedBins.map(bin => bin.packed[0]._idx));

  forcedBins.forEach(bin => {
    const seedUsed = bin.packed[0].dim;
    const extras = _packPiecesIntoBin(remaining, bin.available - seedUsed);
    if (extras.length) {
      _removePacked(remaining, extras.map(pc => pc._idx));
      bin.packed.push(...extras);
    }

    const usedLen = bin.packed.reduce((sum, pc) => sum + pc.dim, 0);
    const scrap = bin.scrap;
    usedScraps.push(scrap.id);
    plans.push({
      type: 'scrap',
      srcId: scrap.id,
      srcAddr: scrap.endereco || '',
      len: Number(scrap.medida),
      usable: bin.available,
      sku,
      pcs: bin.packed.map(_toPlanPiece),
      rem: bin.available - usedLen
    });
    console.log(`[OTIM] Uso forçado do retalho ${scrap.id} do setor ${scrap.endereco || '—'}`);
  });
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
function _chooseBestBar(sObj, minDim, remaining, cfgTrim, skuMinSobra, cfgPen) {
  if (!sObj || !sObj.dims || sObj.dims.length === 0) return null;

  const validBars = sObj.dims
    .filter(d => d.qty > 0 && ((d.dim - 50) - cfgTrim) >= minDim)
    .map(d => d.dim)
    .sort((a, b) => a - b); // Ascendente

  if (validBars.length === 0) {
    return null;
  }

  let bestDim = validBars[0];
  let bestScore = -Infinity;

  validBars.forEach(barDim => {
    const uLen = (barDim - 50) - cfgTrim;
    if (uLen <= 0) return;
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
function _refinePlans(plans, cfgTrim, preserveScrapBins = false) {
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
      if (preserveScrapBins && sourceBin.type === 'scrap') continue;

      // Tentar realocar TODAS as peças deste bin para outros bins
      const sourcePcs = [...sourceBin.pcs];
      let allMoved = true;
      const movedCopies = [];

      for (const pc of sourcePcs) {
        let wasMoved = false;
        for (let j = 0; j < plans.length; j++) {
          if (j === binsByUtil[i].idx) continue;
          const targetBin = plans[j];
          if (!targetBin || targetBin.pcs.length === 0) continue;
          if (targetBin.sku !== sourceBin.sku) continue;

          if (targetBin.rem >= pc.dim) {
            targetBin.pcs.push(pc);
            targetBin.rem -= pc.dim;
            movedCopies.push({ targetBin, pc });
            wasMoved = true;
            break;
          }
        }
        if (!wasMoved) {
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
        // Reverter as cópias já feitas nos bins destino nesta tentativa parcial.
        movedCopies.forEach(({ targetBin, pc }) => {
          const idx = targetBin.pcs.lastIndexOf(pc);
          if (idx !== -1) {
            targetBin.pcs.splice(idx, 1);
            targetBin.rem += pc.dim;
          }
        });
      }
    }

    // Limpar bins marcados para remoção
    for (let i = plans.length - 1; i >= 0; i--) {
      if (plans[i]._remove) plans.splice(i, 1);
    }
  }
}

function _validatePlanPieceCounts(plans, expectedPieces) {
  const expected = new Map();
  expectedPieces.forEach(pc => expected.set(pc.pieceId, pc));

  const seen = new Map();
  plans.forEach(plan => {
    (plan.pcs || []).forEach(pc => {
      const id = pc.pieceId || `${pc.op}|${pc.sku}|${pc.dim}|legacy`;
      seen.set(id, (seen.get(id) || 0) + 1);
    });
  });

  const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  const missing = [...expected.keys()].filter(id => !seen.has(id));
  const extras = [...seen.keys()].filter(id => !expected.has(id));

  if (duplicates.length || missing.length || extras.length) {
    console.error('[OTIM] Plano inconsistente', { duplicates, missing, extras });
    throw new Error(`PLAN_PIECE_MISMATCH duplicates=${duplicates.length} missing=${missing.length} extras=${extras.length}`);
  }
}

/* ============================================================
   RENDER RESULTADOS
   ============================================================ */
function _renderResultados(plans, loteId, usedScraps, cfgTrim, cfgPen, strategy = OTIM_STRATEGY_CURRENT) {
  window._lastOtimResult = { plans, loteId, usedScraps, strategy };
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
  
  const totalUseful = totalUsedLen + totalSobraUtil;
  const eff = totalBarLen > 0 ? ((totalUseful / totalBarLen) * 100).toFixed(2) : '0.00';
  const strategyLabel = strategy === OTIM_STRATEGY_FORCE_SCRAPS
    ? 'Forçar utilização das sobras'
    : 'Melhor aproveitamento';

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
        <div class="stat-val" style="color:#22c55e;">${sobrasGeradas} <span style="font-size:11px; font-weight:400;">(${fmtM(totalSobraUtil)} total)</span></div>
      </div>
      <div class="stat-box" style="border-top:3px solid var(--red);">
        <div class="stat-lbl">Desperdício</div>
        <div class="stat-val red">${fmtM(globalWaste)}</div>
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-400);">Mapa de Corte · ${plans.length} barra(s) · ${skuOrder.length} SKU(s) · Estratégia: ${strategyLabel}</span>
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
      const sObj = appState.skus.find(s => s.code === sku);
      const skuShortDesc = sObj && sObj.short_desc ? sObj.short_desc : (sObj && sObj.desc ? sObj.desc : '');
      const skuMinSobra = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;

      const skuSobras = skuPlans.filter(x => x.plan.rem >= skuMinSobra).length;

      // Calculate SKU Efficiency
      const skuBarLen = skuPlans.reduce((s, x) => s + x.plan.len, 0);
      const skuUsedLen = skuPlans.reduce((s, x) => s + x.plan.pcs.reduce((a, pc) => a + pc.dim, 0), 0);
      const skuSobraUtilLen = skuPlans.reduce((s, x) => s + (x.plan.rem >= skuMinSobra ? x.plan.rem : 0), 0);
      const skuEff = skuBarLen > 0 ? (((skuUsedLen + skuSobraUtilLen) / skuBarLen) * 100).toFixed(1) : '0.0';

      return `
        <div style="margin-bottom:20px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; padding:10px 16px; background:${sc.bg}22; border-radius:6px; border-left:4px solid ${sc.text};">
            <span class="sku-tag" style="background:${sc.bg};color:${sc.text}; font-size:12px; padding:4px 10px;">${sku} ${skuShortDesc ? `- ${skuShortDesc}` : ''}</span>
            <span style="font-size:12px; font-weight:600; color:var(--text-500);">${skuBars} barra(s) · ${skuPcs} peça(s) <span style="margin-left:6px; padding:2px 6px; background:rgba(0,0,0,0.05); border-radius:4px;">Aproveitamento: <b>${skuEff}%</b></span>${skuSobras > 0 ? ` · <span style="color:#16a34a;">♻ ${skuSobras} sobra(s) gerada(s)</span>` : ''}</span>
          </div>
          ${skuPlans.map(({ plan: p }, localIdx) => _renderBarCard(p, localIdx, cfgTrim)).join('')}
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
  p.pcs.forEach(pc => { 
    if (!opColors[pc.op]) opColors[pc.op] = '#3b82f6'; // Azul solicitado
  });

  // Segmentos de peças
  const segs = p.pcs.map(pc => {
    const pct = (pc.dim / p.len * 100).toFixed(2);
    const bg = p.type === 'scrap' ? '#f59e0b' : opColors[pc.op];
    const label = _pieceLabel(pc);
    return `<div class="bar-seg" style="width:${pct}%;background:${bg}; border-right: 2px solid #fff; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#fff;" title="${label}: ${fmtM(pc.dim)}">
      <span style="font-size:9px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${label}</span>
      <span style="font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${fmtM(pc.dim)}</span>
    </div>`;
  }).join('');

  // Segmento de refile
  const refilePct = cfgTrim > 0 ? (cfgTrim / p.len * 100).toFixed(2) : 0;
  const refileEl = cfgTrim > 0
    ? `<div class="bar-seg" style="width:${refilePct}%; background:#e5e7eb; border-left:1px dashed #9ca3af;" title="Refile: ${fmtM(cfgTrim)}"></div>`
    : '';

  // Segmento de sobra/refugo
  const sobraPct = p.rem > 0 ? (p.rem / p.len * 100).toFixed(2) : 0;
  let wasteEl = '';
  if (p.rem > 0) {
    if (geraSobra) {
      wasteEl = `<div class="bar-seg" style="width:${sobraPct}%; background:linear-gradient(135deg, #22c55e, #16a34a); border-left:2px solid #15803d;" title="SOBRA GERADA → Estoque: ${fmtM(p.rem)}">
        <span style="color:#fff; font-weight:700; font-size:10px; text-shadow:0 1px 2px rgba(0,0,0,.3);">♻ ${fmtM(p.rem)}</span>
      </div>`;
    } else {
      wasteEl = `<div class="bar-seg" style="width:${sobraPct}%; background:${p.rem > 0.05 ? '#ef4444' : 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 4px, #e5e7eb 4px, #e5e7eb 8px)'}; color:${p.rem > 0.05 ? '#fff' : 'var(--text-400)'};" title="Refugo: ${fmtM(p.rem)}">
        <span style="font-size:10px;">${p.rem > 0 ? fmtM(p.rem) : ''}</span>
      </div>`;
    }
  }

  const usedMm = p.pcs.reduce((s, pc) => s + pc.dim, 0);
  const barUseful = geraSobra ? (usedMm + p.rem) : usedMm;
  const effBar = ((barUseful / p.len) * 100).toFixed(1);

  // Badge de sobra gerada
  const sobraBadge = geraSobra
    ? `<span class="status-badge" style="background:#dcfce7; color:#16a34a; border:1px solid #bbf7d0; margin-left:8px; animation: pulse-sobra 2s ease-in-out infinite;">♻ Gera Sobra ${fmtM(p.rem)} → Estoque</span>`
    : '';

  const skuShortDesc = sObj && sObj.short_desc ? sObj.short_desc : (sObj && sObj.desc ? sObj.desc : '');
  const addrText = p.srcAddr ? ` (Endereço: ${p.srcAddr})` : ' (Sem endereço)';

  return `
    <div class="bar-result-card" style="${geraSobra ? 'border-left:3px solid #22c55e; background:linear-gradient(90deg, #f0fdf4 0%, #fff 30%);' : ''}">
      <div class="bar-result-header">
        <div>
          <span style="font-size:14px; font-weight:700;">Barra #${idx+1}</span>
          <span style="font-size:12px; color:var(--text-400); margin-left:8px;">${p.sku} ${skuShortDesc ? `(${skuShortDesc})` : ''} · ${fmtM(p.len)} · ${p.type === 'scrap' ? `Retalho ${p.srcId}${addrText}` : 'Virgem'}</span>
          ${sobraBadge}
        </div>
        <span class="status-badge ${parseFloat(effBar) >= 90 ? 'badge-approved' : parseFloat(effBar) >= 70 ? 'badge-batch' : 'badge-pending'}">${effBar}% aproveitamento</span>
      </div>
      <div class="bar-track">${segs}${refileEl}${wasteEl}</div>
      <div class="bar-meta">
        <span>${p.pcs.length} peça(s): ${p.pcs.map(pc => `${_pieceLabel(pc)}(${fmtM(pc.dim)})`).join(', ')}</span>
        <span style="font-weight:600; color:${geraSobra ? '#16a34a' : p.rem > 0 ? '#ef4444' : 'var(--text-400)'};">
          ${geraSobra 
            ? `♻ Sobra: ${fmtM(p.rem)} → Vai para Estoque` 
            : p.rem > 0 
              ? `🗑 Descarte: ${fmtM(p.rem)}` 
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
  const { plans, loteId, usedScraps, strategy = OTIM_STRATEGY_CURRENT } = res;

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
  const usedScrapIds = [...new Set(usedScraps)];
  const sobrasConsumidas = usedScrapIds
    .map(sid => appState.sobras.find(s => s.id === sid))
    .filter(Boolean);
  if (sobrasConsumidas.length !== usedScrapIds.length) {
    throw new Error(`SOBRAS_CONSUMIDAS_INCONSISTENTES:${sobrasConsumidas.length}/${usedScrapIds.length}`);
  }
  if (usedScrapIds.length && typeof _registrarHistoricoSobras !== 'function') {
    throw new Error('SOBRA_HISTORY_HANDLER_MISSING');
  }
  if (usedScrapIds.length) {
    await DB.deleteSobras(usedScrapIds);
    const usedScrapIdSet = new Set(usedScrapIds);
    appState.sobras = appState.sobras.filter(s => !usedScrapIdSet.has(s.id));
  }

  // Baixar barras virgens usadas agrupadas pelo SKU (Multi-Length Support)
  let barrasUsadas = 0;
  const skusAffected = new Set();
  plans.filter(p => p.type === 'virgin').forEach(p => {
    barrasUsadas++;
    const [skCode, dStr] = p.srcId.split('|');
    const dim = parseFloat(dStr);
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
  
  let histSobraUtil = 0;
  plans.forEach(p => {
    const sObj = appState.skus.find(x => x.code === p.sku);
    const skuMin = sObj && sObj.min_sobra !== undefined ? sObj.min_sobra : 1000;
    if (p.rem >= skuMin) histSobraUtil += p.rem;
  });
  
  const histUseful = totalUsed + histSobraUtil;
  const aprov = totalLen > 0 ? ((histUseful/totalLen)*100).toFixed(2) : '0.00';
  
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
  const finalizedAt = new Date().toISOString();
  const approver = _approvalUserSnapshot();
  const planoFinal = {
     id: `PL-${Date.now()}`,
     loteId,
     data: finalizedAt,
     aproveitamento: aprov + '%',
     trim_mm: cfgTrimFinal,
     approvedAt: finalizedAt,
     approvedBy: approver,
     estrategia: strategy,
     skuPlanIds,
     sobrasUtilizadas: sobrasConsumidas.map(s => ({
       id: s.id || '',
       sku: s.sku || '',
       medida: Number(s.medida) || 0,
       endereco: s.endereco || '',
       origem: s.origem || '',
       criacao: s.criacao || ''
     })),
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
  if (sobrasConsumidas.length) {
    try {
      await _registrarHistoricoSobras('utilizada', sobrasConsumidas, {
        loteId,
        planoId: planoFinal.id,
        reason: 'Otimização aprovada'
      });
    } catch (err) {
      console.error('Plano salvo, mas o histórico de sobras não pôde ser atualizado:', err);
      showToast('O plano foi salvo, mas o histórico das sobras falhou. Avise o administrador.', 'error');
      throw err;
    }
  }
  await DB.log("Finalizou Otimização", "unilux_historico", `Lote ${loteId} (${plans.length} barras) aprovado por ${approver.name} · Estratégia: ${strategy}`);
  
  showToast(`Plano ${loteId} finalizado e salvo na nuvem!`, 'success');
  updateBadges();
  setTimeout(() => navigate('planos'), 1200);
}

function _approvalUserSnapshot() {
  const u = appState.currentUser || {};
  return {
    id: u.id || '',
    name: u.name || 'Usuário não identificado',
    email: u.email || '',
    role: u.role || ''
  };
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
