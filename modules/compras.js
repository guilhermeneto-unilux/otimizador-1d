/* ===== COMPRAS - ANALISE DE PONTO DE COMPRA ===== */

const COMPRAS_STATUS_ORDER = { critical: 0, alert: 1, ok: 2, excess: 3 };

function renderCompras() {
  _ensureComprasState();

  const filters = appState.filters.compras;
  const activeTab = filters.tab || 'analise';
  const analytics = _buildComprasAnalytics();
  const rows = _comprasFilteredRows(analytics.rows, filters);

  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">${analytics.summary.critical} critico(s) · ${analytics.summary.alert} em alerta · janela ${filters.horizonDays} dias</div>
        <h1 class="pg-title">Compras</h1>
      </div>
      <div class="pg-actions">
        <button class="btn btn-green btn-sm" onclick="_openComprasEntradaModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
          Entrada
        </button>
        <button class="btn btn-white btn-sm" onclick="_openComprasGlobalModal()">Parametros</button>
        <button class="btn btn-white btn-sm" onclick="_exportComprasCsv()">Exportar CSV</button>
      </div>
    </div>

    ${_renderComprasTabs(activeTab)}

    ${activeTab === 'catalogo' ? _renderComprasCatalogTab() : `
    <div class="kpi-grid">
      <div class="kpi-card kpi-orange">
        <div class="kpi-num">${analytics.summary.critical}</div>
        <div class="kpi-label">SKUs Criticos</div>
      </div>
      <div class="kpi-card kpi-blue">
        <div class="kpi-num">${analytics.summary.suggestedBars}</div>
        <div class="kpi-label">Barras Sugeridas</div>
      </div>
      <div class="kpi-card kpi-green">
        <div class="kpi-num">${_comprasFmtMCompact(analytics.summary.demandLen)}</div>
        <div class="kpi-label">Demanda ${filters.horizonDays} dias</div>
      </div>
      <div class="kpi-card kpi-purple">
        <div class="kpi-num">${_comprasCurrencyCompact(analytics.summary.estimatedValue)}</div>
        <div class="kpi-label">Valor Estimado</div>
      </div>
    </div>

    <div class="compras-panel">
      <div class="compras-panel-head">
        <div>
          <div class="compras-panel-title">Analise de Compra por SKU</div>
          <div class="compras-panel-subtitle">Combina estoque virgem, retalhos aproveitaveis, ordens em aberto, prazo de fornecedor e estoque de seguranca.</div>
        </div>
        <div class="compras-filters">
          <select class="form-control" onchange="_setComprasFilter('horizonDays', this.value)">
            ${[7, 15, 30, 60, 90].map(d => `<option value="${d}" ${filters.horizonDays === d ? 'selected' : ''}>${d} dias</option>`).join('')}
          </select>
          <select class="form-control" onchange="_setComprasFilter('status', this.value)">
            <option value="" ${!filters.status ? 'selected' : ''}>Todos status</option>
            <option value="critical" ${filters.status === 'critical' ? 'selected' : ''}>Criticos</option>
            <option value="alert" ${filters.status === 'alert' ? 'selected' : ''}>Alertas</option>
            <option value="ok" ${filters.status === 'ok' ? 'selected' : ''}>OK</option>
            <option value="excess" ${filters.status === 'excess' ? 'selected' : ''}>Excesso</option>
          </select>
          <div class="search-input-group compras-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" class="form-control" id="comprasSearchInput" placeholder="Buscar SKU, descricao ou fornecedor..." value="${_comprasEsc(filters.q)}" oninput="_updateComprasSearch(this.value)">
          </div>
        </div>
      </div>

      <div class="tbl-wrap compras-table-wrap">
        <table class="tbl compras-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>SKU</th>
              <th>Estoque Virgem</th>
              <th>Sobras Uteis</th>
              <th>Demanda</th>
              <th>Cobertura</th>
              <th>Ponto Compra</th>
              <th>Compra Sugerida</th>
              <th>Melhor Barra</th>
              <th style="text-align:right;">Acoes</th>
            </tr>
          </thead>
          <tbody id="comprasRowsBody">
            ${rows.length ? rows.map(_renderComprasRow).join('') : '<tr><td colspan="10" class="tbl-empty">Nenhum SKU encontrado para os filtros atuais.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="compras-grid">
      <div class="card compras-card">
        <div class="compras-card-title">Fila de Compra Recomendada</div>
        ${_renderComprasQueue(analytics.rows)}
      </div>
      <div class="card compras-card">
        <div class="compras-card-title">Cadastros que faltam</div>
        ${_renderComprasSetupGaps(analytics.rows)}
      </div>
    </div>
    `}
  `;
}

function _renderComprasTabs(activeTab) {
  return `
    <div class="tabs compras-tabs">
      <button class="tab ${activeTab === 'analise' ? 'active' : ''}" onclick="_setComprasTab('analise')">Analise de Compra</button>
      <button class="tab ${activeTab === 'catalogo' ? 'active' : ''}" onclick="_setComprasTab('catalogo')">Catalogo de SKU</button>
    </div>
  `;
}

function _setComprasTab(tab) {
  _ensureComprasState();
  appState.filters.compras.tab = tab === 'catalogo' ? 'catalogo' : 'analise';
  renderCompras();
}

function _renderComprasCatalogTab() {
  if (typeof _renderSkusCatalogHtml === 'function') {
    return _renderSkusCatalogHtml({ embedded: true });
  }
  return '<div class="tbl-empty">Catalogo de SKU indisponivel.</div>';
}

function _updateComprasSearch(value) {
  _ensureComprasState();
  appState.filters.compras.q = value;
  const rows = _comprasFilteredRows(_buildComprasAnalytics().rows, appState.filters.compras);
  const body = document.getElementById('comprasRowsBody');
  if (body) {
    body.innerHTML = rows.length ? rows.map(_renderComprasRow).join('') : '<tr><td colspan="10" class="tbl-empty">Nenhum SKU encontrado para os filtros atuais.</td></tr>';
  }
}

function _ensureComprasState() {
  if (!appState.filters) appState.filters = {};
  if (!appState.filters.compras) appState.filters.compras = _defaultComprasFilters();
  appState.filters.compras = { ..._defaultComprasFilters(), ...appState.filters.compras };
  appState.filters.compras.horizonDays = parseInt(appState.filters.compras.horizonDays, 10) || 30;
  appState.comprasConfig = _normalizeComprasConfig(appState.comprasConfig);
}

function _defaultComprasFilters() {
  const cfg = _normalizeComprasConfig(appState.comprasConfig);
  return { q: '', status: '', horizonDays: parseInt(cfg.global.horizonDays, 10) || 30, tab: 'analise' };
}

function _normalizeComprasConfig(raw) {
  const defaults = {
    global: {
      horizonDays: 30,
      defaultLeadTimeDays: 7,
      defaultSafetyDays: 5,
      defaultMinOrderBars: 1,
      defaultBarLength: 6000
    },
    skus: {}
  };
  const data = raw && typeof raw === 'object' ? raw : {};
  return {
    global: { ...defaults.global, ...(data.global || {}) },
    skus: data.skus && typeof data.skus === 'object' ? data.skus : {}
  };
}

function _setComprasFilter(key, value, inputEl = null) {
  _ensureComprasState();
  const focus = inputEl ? _captureInputFocus(inputEl) : null;
  if (key === 'horizonDays') {
    appState.filters.compras.horizonDays = parseInt(value, 10) || 30;
  } else {
    appState.filters.compras[key] = value;
  }
  renderCompras();
  _restoreInputFocus(focus);
}

function _buildComprasAnalytics() {
  _ensureComprasState();
  const filters = appState.filters.compras;
  const today = _comprasStartOfToday();
  const skuCodes = _comprasKnownSkuCodes();
  const rows = skuCodes.map(code => _comprasSkuAnalysis(code, filters.horizonDays, today))
    .sort((a, b) => {
      const statusDiff = COMPRAS_STATUS_ORDER[a.status] - COMPRAS_STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      if (b.purchaseBars !== a.purchaseBars) return b.purchaseBars - a.purchaseBars;
      return a.coverageDays - b.coverageDays;
    });

  const summary = rows.reduce((acc, row) => {
    if (row.status === 'critical') acc.critical++;
    if (row.status === 'alert') acc.alert++;
    acc.suggestedBars += row.purchaseBars;
    acc.estimatedValue += row.estimatedValue;
    acc.demandLen += row.demand.horizonLen;
    return acc;
  }, { critical: 0, alert: 0, suggestedBars: 0, estimatedValue: 0, demandLen: 0 });

  return { rows, summary };
}

function _comprasKnownSkuCodes() {
  const codes = new Set();
  (appState.skus || []).forEach(s => s.code && codes.add(s.code));
  (appState.ordens || []).forEach(o => o.sku && codes.add(o.sku));
  (appState.sobras || []).forEach(s => s.sku && codes.add(s.sku));
  (appState.planos || []).forEach(p => (p.mapa || []).forEach(b => b.sku && codes.add(b.sku)));
  return [...codes].sort();
}

function _comprasSkuAnalysis(sku, horizonDays, today) {
  const sObj = (appState.skus || []).find(s => s.code === sku) || { code: sku, desc: 'SKU nao cadastrado', dims: [] };
  const settings = _comprasSkuSettings(sku);
  const stock = _comprasStockStats(sObj);
  const demand = _comprasDemandStats(sku, horizonDays, today);
  const scrapCoverage = _comprasScrapCoverage(sku, demand.horizonPieces);
  const history = _comprasHistoryStats(sku);
  const simPieces = scrapCoverage.remainingPieces.length >= 3 ? scrapCoverage.remainingPieces : (demand.horizonPieces.length >= 3 ? demand.horizonPieces : history.pieceDims);
  const barSuggestion = _comprasSuggestBarLength(simPieces, sObj, settings);
  const purchaseLen = _comprasPurchaseLength(settings, stock, barSuggestion);
  const incomingLen = Math.max(0, settings.incomingBars) * Math.max(1, settings.incomingBarLength || purchaseLen);
  const dailyFromHistory = history.days > 0 ? history.usedLen / history.days : 0;
  const dailyFromDemand = horizonDays > 0 ? demand.horizonLen / horizonDays : 0;
  const dailyLen = Math.max(dailyFromHistory, dailyFromDemand);
  const reorderPointLen = dailyLen * (settings.leadTimeDays + settings.safetyDays);
  const availableStockLen = stock.totalLen + incomingLen;
  const demandShortageLen = Math.max(0, demand.horizonLen - scrapCoverage.usedLen - availableStockLen);
  const reorderShortageLen = Math.max(0, reorderPointLen - availableStockLen);
  const neededLen = Math.max(demandShortageLen, reorderShortageLen);
  const trim = _comprasTrim();
  const purchaseUsableLen = Math.max(1, purchaseLen - 50 - trim);
  let purchaseBars = neededLen > 0 ? Math.ceil(neededLen / purchaseUsableLen) : 0;
  if (purchaseBars > 0) purchaseBars = Math.max(purchaseBars, settings.minOrderBars);
  const estimatedValue = purchaseBars * (purchaseLen / 1000) * Math.max(0, settings.pricePerMeter);
  const coverageDays = dailyLen > 0 ? availableStockLen / dailyLen : (demand.horizonLen > 0 ? 0 : 9999);
  const status = _comprasStatus({
    demand,
    scrapCoverage,
    stock,
    incomingLen,
    coverageDays,
    reorderPointLen,
    purchaseBars,
    settings
  });

  return {
    sku,
    desc: sObj.short_desc || sObj.desc || '',
    supplier: settings.supplier,
    settings,
    stock,
    demand,
    scrapCoverage,
    history,
    dailyLen,
    coverageDays,
    reorderPointLen,
    purchaseLen,
    purchaseBars,
    neededLen,
    estimatedValue,
    barSuggestion,
    simulations: _comprasTopBarSimulations(simPieces, sObj, settings),
    status,
    reason: _comprasReason(status, purchaseBars, demand, scrapCoverage, coverageDays, settings)
  };
}

function _comprasSkuSettings(sku) {
  const cfg = _normalizeComprasConfig(appState.comprasConfig);
  const g = cfg.global;
  const raw = cfg.skus[sku] || {};
  return {
    supplier: raw.supplier || '',
    leadTimeDays: _comprasInt(raw.leadTimeDays, g.defaultLeadTimeDays),
    safetyDays: _comprasInt(raw.safetyDays, g.defaultSafetyDays),
    minOrderBars: Math.max(1, _comprasInt(raw.minOrderBars, g.defaultMinOrderBars)),
    preferredBarLength: _comprasInt(raw.preferredBarLength, 0),
    incomingBars: Math.max(0, _comprasInt(raw.incomingBars, 0)),
    incomingBarLength: _comprasInt(raw.incomingBarLength, raw.preferredBarLength || g.defaultBarLength),
    pricePerMeter: _comprasNumber(raw.pricePerMeter, 0),
    notes: raw.notes || ''
  };
}

function _comprasStockStats(sObj) {
  const dims = (sObj.dims || []).map(d => ({
    dim: _comprasInt(d.dim, 0),
    qty: Math.max(0, _comprasInt(d.qty, 0))
  })).filter(d => d.dim > 0);
  const totalBars = dims.reduce((sum, d) => sum + d.qty, 0);
  const totalLen = dims.reduce((sum, d) => sum + (d.dim * d.qty), 0);
  const primary = dims.slice().sort((a, b) => b.qty - a.qty || b.dim - a.dim)[0];
  return { dims, totalBars, totalLen, primaryDim: primary ? primary.dim : 0 };
}

function _comprasDemandStats(sku, horizonDays, today) {
  const openOrders = (appState.ordens || []).filter(o => o.sku === sku && o.status !== 'done');
  const windows = { d7: 0, d15: 0, horizon: 0 };
  const horizonPieces = [];
  const orders = openOrders.map(o => {
    const qty = Math.max(0, _comprasInt(o.qty, 0));
    const dim = Math.max(0, _comprasNumber(o.dim, 0));
    const len = qty * dim;
    const row = { ...o, qty, dim, len };
    if (_comprasDueWithin(o.entrega, today, 7)) windows.d7 += len;
    if (_comprasDueWithin(o.entrega, today, 15)) windows.d15 += len;
    if (_comprasDueWithin(o.entrega, today, horizonDays)) {
      windows.horizon += len;
      for (let i = 0; i < qty; i++) {
        horizonPieces.push({ sku, dim, op: o.id, entrega: o.entrega || '', cliente: o.cliente || '' });
      }
    }
    return row;
  });
  const allOpenLen = openOrders.reduce((sum, o) => sum + (Math.max(0, _comprasInt(o.qty, 0)) * Math.max(0, _comprasNumber(o.dim, 0))), 0);
  return { orders, openCount: openOrders.length, allOpenLen, d7Len: windows.d7, d15Len: windows.d15, horizonLen: windows.horizon, horizonPieces };
}

function _comprasScrapCoverage(sku, pieces) {
  const trim = _comprasTrim();
  const scraps = (appState.sobras || [])
    .filter(s => s.sku === sku && _comprasNumber(s.medida, 0) > 0)
    .map(s => ({ ...s, medida: _comprasNumber(s.medida, 0) }))
    .sort((a, b) => a.medida - b.medida);
  const remaining = (pieces || []).map((p, idx) => ({ ...p, _idx: idx })).sort((a, b) => b.dim - a.dim);
  const usedScraps = [];
  let usedLen = 0;
  let scrapLen = 0;
  let pieceCount = 0;

  scraps.forEach(scrap => {
    if (!remaining.length) return;
    const capacity = Math.max(0, scrap.medida - trim);
    let used = 0;
    const packed = [];
    remaining.forEach(pc => {
      if (used + pc.dim <= capacity) {
        used += pc.dim;
        packed.push(pc);
      }
    });
    if (!packed.length) return;
    const packedIds = new Set(packed.map(pc => pc._idx));
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (packedIds.has(remaining[i]._idx)) remaining.splice(i, 1);
    }
    usedLen += used;
    scrapLen += scrap.medida;
    pieceCount += packed.length;
    usedScraps.push({ ...scrap, usedLen: used, pieces: packed.length, rem: Math.max(0, capacity - used) });
  });

  return {
    scrapCount: usedScraps.length,
    availableScraps: scraps.length,
    scrapLen,
    usedLen,
    pieceCount,
    scraps: usedScraps,
    remainingPieces: remaining.map(p => ({ sku: p.sku, dim: p.dim, op: p.op, entrega: p.entrega, cliente: p.cliente }))
  };
}

function _comprasHistoryStats(sku) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  const bins = [];
  (appState.planos || []).forEach(plan => {
    const date = new Date(plan.data);
    if (isNaN(date) || date < start || date > end) return;
    (plan.mapa || []).forEach(bin => {
      if (bin.sku === sku) bins.push(bin);
    });
  });
  const pieceDims = [];
  let usedLen = 0;
  let virginBars = 0;
  bins.forEach(bin => {
    if (bin.type === 'virgin') virginBars++;
    (bin.pcs || []).forEach(pc => {
      const dim = _comprasNumber(pc.dim, 0);
      if (dim > 0) {
        pieceDims.push({ sku, dim, op: pc.op || '', entrega: pc.entrega || '' });
        usedLen += dim;
      }
    });
  });
  return { days: 90, usedLen, virginBars, pieceDims };
}

function _comprasSuggestBarLength(pieces, sObj, settings) {
  const sims = _comprasTopBarSimulations(pieces, sObj, settings);
  return sims.length ? sims[0] : null;
}

function _comprasTopBarSimulations(pieces, sObj, settings) {
  const list = (pieces || []).map(p => _comprasNumber(p.dim, 0)).filter(v => v > 0);
  if (!list.length) return [];
  const candidates = new Set();
  (sObj.dims || []).forEach(d => {
    const dim = _comprasInt(d.dim, 0);
    if (dim > 0) candidates.add(dim);
  });
  if (settings.preferredBarLength > 0) candidates.add(settings.preferredBarLength);
  if (settings.incomingBarLength > 0) candidates.add(settings.incomingBarLength);
  const largestPiece = Math.max(...list);
  const trim = _comprasTrim();
  let start = Math.ceil((largestPiece + trim + 50) / 100) * 100;
  start = Math.max(1000, start);
  for (let dim = start; dim <= 7000; dim += 100) candidates.add(dim);
  return [...candidates]
    .filter(dim => dim >= largestPiece + trim + 50)
    .map(dim => _comprasSimulateBarLength(list, dim))
    .filter(sim => sim.bars > 0)
    .sort((a, b) => b.efficiency - a.efficiency || a.bars - b.bars || a.dim - b.dim)
    .slice(0, 5);
}

function _comprasSimulateBarLength(pieces, dim) {
  const trim = _comprasTrim();
  const capacity = Math.max(0, dim - 50 - trim);
  const sorted = pieces.slice().sort((a, b) => b - a);
  const bins = [];
  sorted.forEach(piece => {
    let placed = false;
    for (const bin of bins) {
      if (bin.used + piece <= capacity) {
        bin.used += piece;
        placed = true;
        break;
      }
    }
    if (!placed && piece <= capacity) bins.push({ used: piece });
  });
  const usedLen = sorted.reduce((sum, v) => sum + v, 0);
  const barLen = bins.length * dim;
  return {
    dim,
    bars: bins.length,
    usedLen,
    barLen,
    wasteLen: Math.max(0, barLen - usedLen),
    efficiency: barLen > 0 ? (usedLen / barLen) * 100 : 0
  };
}

function _comprasPurchaseLength(settings, stock, barSuggestion) {
  if (settings.preferredBarLength > 0) return settings.preferredBarLength;
  if (barSuggestion && barSuggestion.dim > 0) return barSuggestion.dim;
  if (stock.primaryDim > 0) return stock.primaryDim;
  const g = _normalizeComprasConfig(appState.comprasConfig).global;
  return _comprasInt(g.defaultBarLength, 6000);
}

function _comprasStatus(ctx) {
  const availableForDemand = ctx.stock.totalLen + ctx.incomingLen + ctx.scrapCoverage.usedLen;
  if (ctx.demand.d7Len > 0 && availableForDemand < ctx.demand.d7Len) return 'critical';
  if (ctx.coverageDays < ctx.settings.leadTimeDays) return 'critical';
  if (ctx.purchaseBars > 0 || ctx.stock.totalLen < ctx.reorderPointLen) return 'alert';
  if (ctx.demand.horizonLen === 0 && ctx.coverageDays > 90 && ctx.stock.totalBars > 0) return 'excess';
  return 'ok';
}

function _comprasReason(status, purchaseBars, demand, scrapCoverage, coverageDays, settings) {
  if (status === 'critical') return 'risco de falta antes do prazo de reposicao';
  if (status === 'alert' && purchaseBars > 0) return 'abaixo do ponto de compra calculado';
  if (status === 'alert') return 'estoque proximo do limite de seguranca';
  if (status === 'excess') return 'estoque alto sem demanda recente no horizonte';
  if (scrapCoverage.usedLen > 0) return 'retalhos cobrem parte da demanda aberta';
  if (coverageDays >= settings.leadTimeDays + settings.safetyDays) return 'cobertura acima do prazo + seguranca';
  return 'sem acao imediata';
}

function _comprasFilteredRows(rows, filters) {
  const q = (filters.q || '').toLowerCase();
  return rows.filter(r => {
    if (filters.status && r.status !== filters.status) return false;
    if (!q) return true;
    return r.sku.toLowerCase().includes(q)
      || (r.desc || '').toLowerCase().includes(q)
      || (r.supplier || '').toLowerCase().includes(q);
  });
}

function _renderComprasRow(row) {
  const status = _comprasStatusMeta(row.status);
  const sc = skuColor(row.sku);
  return `
    <tr>
      <td>
        <span class="status-badge" style="background:${status.bg}; color:${status.color}; border:1px solid ${status.color}33;">${status.label}</span>
        <div class="compras-reason">${_comprasEsc(row.reason)}</div>
      </td>
      <td>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <span class="status-badge" style="align-self:flex-start; background:${sc.bg}; color:${sc.text}; border:1px solid ${sc.text}33;">${_comprasEsc(row.sku)}</span>
          <span class="compras-muted">${_comprasEsc(row.desc || '-')}</span>
          ${row.supplier ? `<span class="compras-muted">Fornecedor: ${_comprasEsc(row.supplier)}</span>` : ''}
        </div>
      </td>
      <td>
        <b>${row.stock.totalBars} barra(s)</b>
        <div class="compras-muted">${fmtM(row.stock.totalLen)}</div>
        <div class="compras-chips">${row.stock.dims.length ? row.stock.dims.map(d => `<span>${fmtM(d.dim)} · ${d.qty}x</span>`).join('') : '<span>sem estoque</span>'}</div>
      </td>
      <td>
        <b>${row.scrapCoverage.scrapCount}/${row.scrapCoverage.availableScraps}</b>
        <div class="compras-muted">${fmtM(row.scrapCoverage.usedLen)} em pecas</div>
      </td>
      <td>
        <b>${fmtM(row.demand.horizonLen)}</b>
        <div class="compras-muted">7d ${fmtM(row.demand.d7Len)} · 15d ${fmtM(row.demand.d15Len)}</div>
      </td>
      <td>
        <b>${_comprasCoverageLabel(row.coverageDays)}</b>
        <div class="compras-muted">${fmtM(row.dailyLen)}/dia estimado</div>
      </td>
      <td>
        <b>${fmtM(row.reorderPointLen)}</b>
        <div class="compras-muted">${row.settings.leadTimeDays}d prazo + ${row.settings.safetyDays}d seguranca</div>
      </td>
      <td>
        ${row.purchaseBars > 0
          ? `<b style="color:#16a34a;">${row.purchaseBars} barra(s)</b><div class="compras-muted">${fmtM(row.purchaseLen)} · ${_comprasCurrency(row.estimatedValue)}</div>`
          : '<span class="compras-muted">Sem compra agora</span>'}
      </td>
      <td>${_renderComprasBarSuggestion(row)}</td>
      <td style="text-align:right;">
        <div style="display:flex; gap:6px; justify-content:flex-end;">
          <button class="btn btn-white btn-sm" onclick="_openComprasSkuModal(${_comprasJsString(row.sku)})">Detalhes</button>
          <button class="btn btn-white btn-sm" onclick="_openComprasSkuConfigModal(${_comprasJsString(row.sku)})">Configurar</button>
        </div>
      </td>
    </tr>`;
}

function _renderComprasBarSuggestion(row) {
  if (!row.barSuggestion) return '<span class="compras-muted">Sem simulacao</span>';
  const usingPreferred = row.settings.preferredBarLength > 0;
  return `
    <div>
      <b>${fmtM(row.barSuggestion.dim)}</b>
      <div class="compras-muted">${_comprasFmtPct(row.barSuggestion.efficiency)} · ${row.barSuggestion.bars} barra(s)</div>
      ${usingPreferred && row.settings.preferredBarLength !== row.barSuggestion.dim ? `<div class="compras-muted">config: ${fmtM(row.settings.preferredBarLength)}</div>` : ''}
    </div>`;
}

function _renderComprasQueue(rows) {
  const queue = rows.filter(r => r.purchaseBars > 0).slice(0, 8);
  if (!queue.length) return '<div class="tbl-empty compras-empty-small">Nenhuma compra sugerida no momento.</div>';
  return `
    <div class="compras-queue">
      ${queue.map(r => {
        const status = _comprasStatusMeta(r.status);
        return `
          <div class="compras-queue-item">
            <div>
              <span class="status-badge" style="background:${status.bg}; color:${status.color}; border:1px solid ${status.color}33;">${status.label}</span>
              <b style="margin-left:8px;">${_comprasEsc(r.sku)}</b>
              <div class="compras-muted">${_comprasEsc(r.desc || '')}</div>
            </div>
            <div style="text-align:right;">
              <b>${r.purchaseBars}x ${fmtM(r.purchaseLen)}</b>
              <div class="compras-muted">${_comprasCurrency(r.estimatedValue)}</div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function _renderComprasSetupGaps(rows) {
  const gaps = [];
  rows.forEach(r => {
    if (!r.supplier) gaps.push({ sku: r.sku, label: 'fornecedor nao definido' });
    if (!r.settings.pricePerMeter) gaps.push({ sku: r.sku, label: 'preco por metro ausente' });
    if (!r.settings.preferredBarLength && !r.stock.primaryDim) gaps.push({ sku: r.sku, label: 'comprimento padrao ausente' });
  });
  const visible = gaps.slice(0, 8);
  if (!visible.length) return '<div class="tbl-empty compras-empty-small">Cadastros principais completos para a analise.</div>';
  return `
    <div class="compras-gap-list">
      ${visible.map(g => `
        <button class="compras-gap-item" onclick="_openComprasSkuConfigModal(${_comprasJsString(g.sku)})">
          <b>${_comprasEsc(g.sku)}</b>
          <span>${_comprasEsc(g.label)}</span>
        </button>
      `).join('')}
    </div>`;
}

function _openComprasSkuModal(sku) {
  const row = _buildComprasAnalytics().rows.find(r => r.sku === sku);
  if (!row) { showToast('SKU nao encontrado na analise.', 'error'); return; }
  const status = _comprasStatusMeta(row.status);
  const orders = row.demand.orders.slice().sort((a, b) => String(a.entrega || '').localeCompare(String(b.entrega || '')));
  openModal(`Analise de Compra · ${sku}`, `
    <div class="compras-detail-head">
      <div>
        <span class="status-badge" style="background:${status.bg}; color:${status.color}; border:1px solid ${status.color}33;">${status.label}</span>
        <div class="compras-detail-title">${_comprasEsc(row.desc || sku)}</div>
        <div class="compras-muted">${_comprasEsc(row.reason)}</div>
      </div>
      <div style="text-align:right;">
        <div class="compras-detail-buy">${row.purchaseBars > 0 ? `${row.purchaseBars}x ${fmtM(row.purchaseLen)}` : 'Sem compra'}</div>
        <div class="compras-muted">${_comprasCurrency(row.estimatedValue)}</div>
      </div>
    </div>

    <div class="compras-detail-grid">
      <div><span>Estoque virgem</span><b>${row.stock.totalBars} barra(s)</b><small>${fmtM(row.stock.totalLen)}</small></div>
      <div><span>Sobras uteis</span><b>${row.scrapCoverage.scrapCount}</b><small>${fmtM(row.scrapCoverage.usedLen)}</small></div>
      <div><span>Demanda janela</span><b>${fmtM(row.demand.horizonLen)}</b><small>${row.demand.openCount} OP(s) abertas</small></div>
      <div><span>Cobertura</span><b>${_comprasCoverageLabel(row.coverageDays)}</b><small>${fmtM(row.dailyLen)}/dia</small></div>
    </div>

    <div class="compras-modal-section">
      <h3>Simulador de comprimento</h3>
      ${_renderComprasSimulatorTable(row)}
    </div>

    <div class="compras-modal-section">
      <h3>Ordens consideradas</h3>
      ${orders.length ? `
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>OP</th><th>Entrega</th><th>Qtd</th><th>Corte</th><th>Total</th><th>Cliente</th></tr></thead>
            <tbody>
              ${orders.map(o => `
                <tr>
                  <td><b>${_comprasEsc(o.id)}</b></td>
                  <td>${_comprasEsc(_comprasFormatDate(o.entrega))}</td>
                  <td>${o.qty}</td>
                  <td>${fmtM(o.dim)}</td>
                  <td>${fmtM(o.len)}</td>
                  <td>${_comprasEsc(o.cliente || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : '<div class="tbl-empty compras-empty-small">Sem ordens abertas para este SKU.</div>'}
    </div>

    <div class="compras-modal-section">
      <h3>Retalhos aproveitaveis na janela</h3>
      ${row.scrapCoverage.scraps.length ? `
        <div class="compras-scrap-list">
          ${row.scrapCoverage.scraps.map(s => `
            <div>
              <b>${_comprasEsc(s.id)}</b>
              <span>${fmtM(s.medida)} · usa ${fmtM(s.usedLen)} · ${s.pieces} peca(s)${s.endereco ? ` · ${_comprasEsc(s.endereco)}` : ''}</span>
            </div>
          `).join('')}
        </div>` : '<div class="tbl-empty compras-empty-small">Nenhum retalho atual encaixa nas pecas da janela.</div>'}
    </div>
  `, `
    <button class="btn btn-white" onclick="_openComprasSkuConfigModal(${_comprasJsString(sku)})">Configurar SKU</button>
    <button class="btn btn-dark" onclick="closeModal()">Fechar</button>
  `);
}

function _renderComprasSimulatorTable(row) {
  if (!row.simulations.length) return '<div class="tbl-empty compras-empty-small">Sem pecas suficientes para simular.</div>';
  return `
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr><th>Comprimento</th><th>Barras</th><th>Aproveitamento</th><th>Refugo estimado</th></tr></thead>
        <tbody>
          ${row.simulations.map((sim, idx) => `
            <tr>
              <td><b>${fmtM(sim.dim)}</b>${idx === 0 ? ' <span class="status-badge badge-approved">melhor</span>' : ''}</td>
              <td>${sim.bars}</td>
              <td>${_comprasFmtPct(sim.efficiency)}</td>
              <td>${fmtM(sim.wasteLen)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function _openComprasGlobalModal() {
  _ensureComprasState();
  const cfg = _normalizeComprasConfig(appState.comprasConfig).global;
  openModal('Parametros de Compras', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Janela padrao (dias)</label>
        <input type="number" class="form-control" id="cmpGlobalHorizon" value="${cfg.horizonDays}">
      </div>
      <div class="form-group">
        <label class="form-label">Comprimento padrao (m)</label>
        <input type="number" step="0.001" class="form-control" id="cmpGlobalBar" value="${_comprasMValue(cfg.defaultBarLength)}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Prazo fornecedor padrao (dias)</label>
        <input type="number" class="form-control" id="cmpGlobalLead" value="${cfg.defaultLeadTimeDays}">
      </div>
      <div class="form-group">
        <label class="form-label">Estoque seguranca padrao (dias)</label>
        <input type="number" class="form-control" id="cmpGlobalSafety" value="${cfg.defaultSafetyDays}">
      </div>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Lote minimo padrao (barras)</label>
      <input type="number" class="form-control" id="cmpGlobalMinOrder" value="${cfg.defaultMinOrderBars}">
      <div class="form-hint">Usado quando o SKU ainda nao tem configuracao propria.</div>
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" onclick="_saveComprasGlobalConfig()">Salvar Parametros</button>
  `);
}

async function _saveComprasGlobalConfig() {
  _ensureComprasState();
  const cfg = _normalizeComprasConfig(appState.comprasConfig);
  cfg.global = {
    horizonDays: Math.max(1, _comprasInt(document.getElementById('cmpGlobalHorizon').value, 30)),
    defaultLeadTimeDays: Math.max(0, _comprasInt(document.getElementById('cmpGlobalLead').value, 7)),
    defaultSafetyDays: Math.max(0, _comprasInt(document.getElementById('cmpGlobalSafety').value, 5)),
    defaultMinOrderBars: Math.max(1, _comprasInt(document.getElementById('cmpGlobalMinOrder').value, 1)),
    defaultBarLength: Math.max(1, _comprasMetersToMm(document.getElementById('cmpGlobalBar').value, 6000))
  };
  appState.comprasConfig = cfg;
  appState.filters.compras.horizonDays = cfg.global.horizonDays;
  try {
    await DB.saveComprasConfig();
    await DB.log("Atualizou parametros de compras", "unilux_configs", "Parametros gerais de compras");
    closeModal();
    showToast('Parametros de compras salvos!', 'success');
    renderCompras();
  } catch (err) {
    console.error('Falha ao salvar parametros de compras:', err);
    showToast('Erro ao salvar parametros de compras.', 'error');
  }
}

function _openComprasSkuConfigModal(sku) {
  _ensureComprasState();
  const settings = _comprasSkuSettings(sku);
  const sObj = (appState.skus || []).find(s => s.code === sku);
  openModal(`Configurar Compras · ${sku}`, `
    <div class="form-group">
      <label class="form-label">Fornecedor preferencial</label>
      <input type="text" class="form-control" id="cmpSupplier" value="${_comprasEsc(settings.supplier)}" placeholder="Ex: Aco Perfil Ltda">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Prazo fornecedor (dias)</label>
        <input type="number" class="form-control" id="cmpLead" value="${settings.leadTimeDays}">
      </div>
      <div class="form-group">
        <label class="form-label">Seguranca (dias)</label>
        <input type="number" class="form-control" id="cmpSafety" value="${settings.safetyDays}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Lote minimo (barras)</label>
        <input type="number" class="form-control" id="cmpMinOrder" value="${settings.minOrderBars}">
      </div>
      <div class="form-group">
        <label class="form-label">Preco por metro</label>
        <input type="number" step="0.01" class="form-control" id="cmpPrice" value="${settings.pricePerMeter}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Comprimento preferencial (m)</label>
        <input type="number" step="0.001" class="form-control" id="cmpPreferredLen" value="${settings.preferredBarLength ? _comprasMValue(settings.preferredBarLength) : ''}" placeholder="${sObj && sObj.dims && sObj.dims[0] ? _comprasMValue(sObj.dims[0].dim) : '6.000'}">
      </div>
      <div class="form-group">
        <label class="form-label">Comprimento compras em aberto (m)</label>
        <input type="number" step="0.001" class="form-control" id="cmpIncomingLen" value="${settings.incomingBarLength ? _comprasMValue(settings.incomingBarLength) : ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Compras em aberto (barras)</label>
      <input type="number" class="form-control" id="cmpIncomingBars" value="${settings.incomingBars}">
      <div class="form-hint">Quantidade ja comprada/pendente de entrega, abatida da necessidade sugerida.</div>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Observacoes</label>
      <textarea class="form-control" id="cmpNotes" rows="3" placeholder="Pedido minimo especial, fornecedor alternativo, restricoes...">${_comprasEsc(settings.notes)}</textarea>
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" onclick="_saveComprasSkuConfig(${_comprasJsString(sku)})">Salvar Configuracao</button>
  `);
}

async function _saveComprasSkuConfig(sku) {
  _ensureComprasState();
  const cfg = _normalizeComprasConfig(appState.comprasConfig);
  cfg.skus[sku] = {
    supplier: document.getElementById('cmpSupplier').value.trim(),
    leadTimeDays: Math.max(0, _comprasInt(document.getElementById('cmpLead').value, cfg.global.defaultLeadTimeDays)),
    safetyDays: Math.max(0, _comprasInt(document.getElementById('cmpSafety').value, cfg.global.defaultSafetyDays)),
    minOrderBars: Math.max(1, _comprasInt(document.getElementById('cmpMinOrder').value, cfg.global.defaultMinOrderBars)),
    pricePerMeter: Math.max(0, _comprasNumber(document.getElementById('cmpPrice').value, 0)),
    preferredBarLength: _comprasMetersToMm(document.getElementById('cmpPreferredLen').value, 0),
    incomingBars: Math.max(0, _comprasInt(document.getElementById('cmpIncomingBars').value, 0)),
    incomingBarLength: _comprasMetersToMm(document.getElementById('cmpIncomingLen').value, cfg.global.defaultBarLength),
    notes: document.getElementById('cmpNotes').value.trim()
  };
  appState.comprasConfig = cfg;
  try {
    await DB.saveComprasConfig();
    await DB.log("Atualizou config de compras", "unilux_configs", `SKU ${sku}`);
    closeModal();
    showToast('Configuracao de compras salva!', 'success');
    renderCompras();
  } catch (err) {
    console.error('Falha ao salvar config de compras:', err);
    showToast('Erro ao salvar configuracao de compras.', 'error');
  }
}

function _openComprasEntradaModal() {
  const skuOptions = (appState.skus || [])
    .slice()
    .sort((a, b) => String(a.desc || a.code).localeCompare(String(b.desc || b.code), 'pt-BR'));

  openModal('Entrada Manual de SKU', `
    <div class="form-group">
      <label class="form-label">Descricao do SKU</label>
      <select class="form-control" id="entradaSkuSelect" onchange="_selectComprasEntradaSku(this.value)">
        <option value="">Selecione um SKU...</option>
        ${skuOptions.map(s => `<option value="${_comprasEsc(s.code)}">${_comprasEsc(s.desc || s.code)} · ${_comprasEsc(s.code)}</option>`).join('')}
      </select>
    </div>

    <div class="entrada-sku-info" id="entradaSkuInfo">
      ${_renderComprasEntradaSkuInfo(null)}
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Comprimento recebido (m)</label>
        <input type="number" step="0.001" min="0" class="form-control" id="entradaComprimento" placeholder="Ex: 6.000">
      </div>
      <div class="form-group">
        <label class="form-label">Qtd. barras</label>
        <input type="number" step="1" min="1" class="form-control" id="entradaQuantidade" placeholder="Ex: 20">
      </div>
    </div>

    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Observacao</label>
      <textarea class="form-control" id="entradaObs" rows="2" placeholder="Opcional"></textarea>
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-green" onclick="_saveComprasEntrada()">Salvar Entrada</button>
  `);
}

function _selectComprasEntradaSku(code) {
  const sku = (appState.skus || []).find(s => s.code === code) || null;
  const info = document.getElementById('entradaSkuInfo');
  if (info) info.innerHTML = _renderComprasEntradaSkuInfo(sku);

  const lenInput = document.getElementById('entradaComprimento');
  if (lenInput && sku && !lenInput.value) {
    const primary = (sku.dims || []).slice().sort((a, b) => (b.qty || 0) - (a.qty || 0) || (b.dim || 0) - (a.dim || 0))[0];
    if (primary && primary.dim) lenInput.value = _comprasMValue(primary.dim);
  }
}

function _renderComprasEntradaSkuInfo(sku) {
  if (!sku) {
    return `
      <div class="entrada-sku-field"><span>Codigo SKU</span><b>-</b></div>
      <div class="entrada-sku-field"><span>Nome resumido</span><b>-</b></div>
      <div class="entrada-sku-field"><span>Pasta</span><b>-</b></div>
      <div class="entrada-sku-stock"><span>Saldo atual</span><div class="compras-chips"><span>selecione um SKU</span></div></div>
    `;
  }

  const dims = (sku.dims || []).filter(d => _comprasInt(d.qty, 0) > 0 || _comprasInt(d.dim, 0) > 0);
  return `
    <div class="entrada-sku-field"><span>Codigo SKU</span><b>${_comprasEsc(sku.code)}</b></div>
    <div class="entrada-sku-field"><span>Nome resumido</span><b>${_comprasEsc(sku.short_desc || '-')}</b></div>
    <div class="entrada-sku-field"><span>Pasta</span><b>${_comprasEsc(sku.folder || '-')}</b></div>
    <div class="entrada-sku-stock">
      <span>Saldo atual</span>
      <div class="compras-chips">${dims.length ? dims.map(d => `<span>${fmtM(d.dim)} · ${_comprasInt(d.qty, 0)}x</span>`).join('') : '<span>sem estoque</span>'}</div>
    </div>
  `;
}

async function _saveComprasEntrada() {
  const code = document.getElementById('entradaSkuSelect')?.value || '';
  const sku = (appState.skus || []).find(s => s.code === code);
  if (!sku) { showToast('Selecione um SKU valido.', 'error'); return; }

  const lengthMm = _comprasMetersToMm(document.getElementById('entradaComprimento')?.value, 0);
  const qty = Math.max(0, _comprasInt(document.getElementById('entradaQuantidade')?.value, 0));
  const obs = document.getElementById('entradaObs')?.value.trim() || '';

  if (!lengthMm) { showToast('Informe o comprimento recebido.', 'error'); return; }
  if (!qty) { showToast('Informe a quantidade de barras recebidas.', 'error'); return; }

  const dims = Array.isArray(sku.dims) ? sku.dims : [];
  const existing = dims.find(d => Math.abs(_comprasInt(d.dim, 0) - lengthMm) <= 1);
  if (existing) {
    existing.qty = Math.max(0, _comprasInt(existing.qty, 0)) + qty;
    existing.dim = lengthMm;
  } else {
    dims.push({ dim: lengthMm, qty });
  }
  sku.dims = _comprasNormalizeSkuDims(dims);

  try {
    await DB.saveSku(sku);
    await DB.log("Entrada manual de SKU", "unilux_skus", `${sku.code}: +${qty} barra(s) de ${fmtM(lengthMm)}${obs ? ` · ${obs}` : ''}`);
    closeModal();
    showToast('Entrada registrada no estoque!', 'success');
    renderCompras();
  } catch (err) {
    console.error('Falha ao registrar entrada:', err);
    showToast('Erro ao salvar entrada no banco.', 'error');
  }
}

function _comprasNormalizeSkuDims(dims) {
  const merged = [];
  (dims || []).forEach(d => {
    const dim = _comprasInt(d.dim, 0);
    const qty = Math.max(0, _comprasInt(d.qty, 0));
    if (!dim) return;
    const current = merged.find(item => Math.abs(item.dim - dim) <= 1);
    if (current) current.qty += qty;
    else merged.push({ dim, qty });
  });
  return merged.sort((a, b) => b.dim - a.dim);
}

function _exportComprasCsv() {
  const filters = appState.filters.compras || _defaultComprasFilters();
  const rows = _comprasFilteredRows(_buildComprasAnalytics().rows, filters);
  const headers = [
    'Status', 'SKU', 'Descricao', 'Fornecedor', 'Estoque barras', 'Estoque metros',
    'Sobras uteis', 'Demanda janela metros', 'Demanda 7d metros', 'Cobertura dias',
    'Ponto compra metros', 'Compra barras', 'Compra comprimento metros', 'Valor estimado'
  ];
  const csvRows = [headers, ...rows.map(r => [
    _comprasStatusMeta(r.status).label,
    r.sku,
    r.desc,
    r.supplier,
    r.stock.totalBars,
    _comprasMmToNumberM(r.stock.totalLen),
    r.scrapCoverage.scrapCount,
    _comprasMmToNumberM(r.demand.horizonLen),
    _comprasMmToNumberM(r.demand.d7Len),
    r.coverageDays >= 9999 ? '' : r.coverageDays.toFixed(1),
    _comprasMmToNumberM(r.reorderPointLen),
    r.purchaseBars,
    _comprasMmToNumberM(r.purchaseLen),
    r.estimatedValue.toFixed(2)
  ])];
  const csv = csvRows.map(row => row.map(_comprasCsvCell).join(';')).join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `compras_${_comprasDateInputValue(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('CSV de compras exportado!', 'success');
}

function _comprasStatusMeta(status) {
  const map = {
    critical: { label: 'Critico', bg: '#fee2e2', color: '#b91c1c' },
    alert: { label: 'Alerta', bg: '#ffedd5', color: '#c2410c' },
    ok: { label: 'OK', bg: '#dcfce7', color: '#166534' },
    excess: { label: 'Excesso', bg: '#f3f4f6', color: '#6b7280' }
  };
  return map[status] || map.ok;
}

function _comprasDueWithin(value, today, days) {
  const date = _comprasParseDate(value);
  if (!date) return days >= 30;
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return date <= limit;
}

function _comprasParseDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d) ? null : d;
}

function _comprasStartOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function _comprasTrim() {
  if (!appState.configs) return 0;
  return _comprasNumber(appState.configs.trim_mm, _comprasNumber(appState.configs.trim_m, 0));
}

function _comprasCoverageLabel(days) {
  if (days >= 9999) return 'sem consumo';
  if (days < 1) return '<1 dia';
  return `${days.toFixed(0)} dia(s)`;
}

function _comprasFormatDate(value) {
  if (!value) return '-';
  const parts = String(value).split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function _comprasDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function _comprasFmtPct(value) {
  if (!Number.isFinite(value)) return '0,0%';
  return `${value.toFixed(1).replace('.', ',')}%`;
}

function _comprasCurrency(value) {
  if (!value) return 'sem preco';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function _comprasCurrencyCompact(value) {
  if (!value) return 'R$ 0';
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')} mi`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1).replace('.', ',')} mil`;
  return `R$ ${Math.round(value)}`;
}

function _comprasFmtMCompact(mm) {
  const m = (mm || 0) / 1000;
  if (m >= 1000) return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
  return `${m.toFixed(0).replace('.', ',')} m`;
}

function _comprasMValue(mm) {
  return ((mm || 0) / 1000).toFixed(3);
}

function _comprasMmToNumberM(mm) {
  return ((mm || 0) / 1000).toFixed(3).replace('.', ',');
}

function _comprasMetersToMm(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback || 0;
  const n = parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return fallback || 0;
  return Math.round(n * 1000);
}

function _comprasInt(value, fallback) {
  const n = parseInt(String(value ?? '').replace(',', '.'), 10);
  return Number.isFinite(n) ? n : fallback;
}

function _comprasNumber(value, fallback) {
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function _comprasEsc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function _comprasJsString(value) {
  return `'${String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')}'`;
}

function _comprasCsvCell(value) {
  const str = String(value ?? '');
  if (/[;"\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
