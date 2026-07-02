/* ===== DASHBOARD – UNILUX 1D ===== */

function renderDashboard() {
  _ensureDashboardFilters();

  const filters = appState.filters.dashboard;
  const pending  = appState.ordens.filter(o => o.status === 'pending').length;
  const inBatch  = appState.lotes.filter(l => l.status === 'pending').length;
  const barTotal = appState.skus.reduce((sum, s) => sum + ((s.dims || []).reduce((a, d) => a + (parseInt(d.qty, 10) || 0), 0)), 0);
  const sobras   = appState.sobras.length;
  const today = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

  const analytics = _buildDashboardAnalytics(filters);
  const inventoryFinancials = _currentInventoryFinancials(filters.sku);
  const planFinancials = _aggregatePlanFinancials(analytics.plans, filters.sku);
  const skuOptions = _dashboardSkuOptions();
  const selectedSkuLabel = filters.sku ? filters.sku : 'Todos os SKUs';
  const selectedSkuInputValue = _dashboardSkuInputValue(filters.sku, skuOptions);

  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">${today}</div>
        <h1 class="pg-title">Dashboard</h1>
      </div>
    </div>

    <div class="search-bar-card dashboard-filter-bar">
      <div class="dashboard-date-filter">
        <input type="date" class="form-control" value="${filters.start}" onchange="_setDashboardFilter('start', this.value)">
        <span style="font-size:12px; color:var(--text-400);">até</span>
        <input type="date" class="form-control" value="${filters.end}" onchange="_setDashboardFilter('end', this.value)">
      </div>
      <div class="search-input-group dashboard-top-sku-filter">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text"
               class="form-control"
               id="dashboardSkuFilterInput"
               list="dashboardSkuFilterList"
               placeholder="Pesquisar SKU ou perfil..."
               value="${_dashEsc(selectedSkuInputValue)}"
               onchange="_applyDashboardSkuFilterInput(this.value)"
               onkeydown="if(event.key === 'Enter') { event.preventDefault(); _applyDashboardSkuFilterInput(this.value); }">
        <datalist id="dashboardSkuFilterList">
          ${skuOptions.map(s => `<option value="${_dashEsc(_dashboardSkuOptionLabel(s))}"></option>`).join('')}
        </datalist>
      </div>
      <div class="dashboard-filter-actions">
        ${filters.sku ? _renderClearDashboardSkuButton() : ''}
        <button class="btn btn-white btn-sm" onclick="_resetDashboardFilters()">Últimos 30 dias</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card kpi-orange">
        <div class="kpi-num">${pending}</div>
        <div class="kpi-label">Ordens Pendentes</div>
      </div>
      <div class="kpi-card kpi-blue">
        <div class="kpi-num">${inBatch}</div>
        <div class="kpi-label">Planos Planejados</div>
      </div>
      <div class="kpi-card kpi-green">
        <div class="kpi-num">${barTotal}</div>
        <div class="kpi-label">Barras Virgens em Estoque</div>
      </div>
      <div class="kpi-card kpi-purple">
        <div class="kpi-num">${sobras}</div>
        <div class="kpi-label">Sobras Disponíveis</div>
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-end; margin:2px 0 10px; flex-wrap:wrap;">
      <div>
        <div style="font-size:15px; font-weight:700; color:var(--text-900);">Indicadores Financeiros</div>
        <div style="font-size:12px; color:var(--text-400); margin-top:2px;">Estoque na posição atual · consumo e descarte no período selecionado.</div>
      </div>
      ${(inventoryFinancials.unpricedSkuCount || planFinancials.unpricedSkuCount) ? `
        <span class="status-badge badge-pending" title="Os valores abaixo somam apenas SKUs com preço por metro cadastrado.">
          ${Math.max(inventoryFinancials.unpricedSkuCount, planFinancials.unpricedSkuCount)} SKU(s) com preço pendente
        </span>
      ` : '<span class="status-badge badge-approved">Cobertura de preços completa</span>'}
    </div>
    <div class="kpi-grid dashboard-financial-kpis">
      <div class="kpi-card kpi-green">
        <div class="kpi-num">${fmtBRLCompact(inventoryFinancials.virginValue)}</div>
        <div class="kpi-label">Valor em Estoque Virgem</div>
        <div class="kpi-finance-note">${fmtM(inventoryFinancials.virginMm)} na posição atual</div>
      </div>
      <div class="kpi-card kpi-purple">
        <div class="kpi-num">${fmtBRLCompact(inventoryFinancials.scrapValue)}</div>
        <div class="kpi-label">Valor em Sobras</div>
        <div class="kpi-finance-note">${fmtM(inventoryFinancials.scrapMm)} disponíveis</div>
      </div>
      <div class="kpi-card kpi-blue">
        <div class="kpi-num">${fmtBRLCompact(planFinancials.piecesValue)}</div>
        <div class="kpi-label">Valor Utilizado em Peças</div>
        <div class="kpi-finance-note">${fmtM(planFinancials.piecesMm)} no período</div>
      </div>
      <div class="kpi-card kpi-orange">
        <div class="kpi-num">${fmtBRLCompact(planFinancials.discardValue)}</div>
        <div class="kpi-label">Valor Descartado</div>
        <div class="kpi-finance-note">${fmtM(planFinancials.discardMm)} entre refugo e refile</div>
      </div>
    </div>

    <div class="card" style="padding:24px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:18px; flex-wrap:wrap;">
        <div>
          <div style="font-size:15px; font-weight:700; color:var(--text-900);">Aproveitamento por Mês</div>
          <div style="font-size:12px; color:var(--text-400); margin-top:2px;">
            ${_dashEsc(_formatDashDate(filters.start))} até ${_dashEsc(_formatDashDate(filters.end))} · ${_dashEsc(selectedSkuLabel)} ·
            Média: <strong style="color:${_effColor(analytics.overall.efficiency)}">${_fmtPct(analytics.overall.efficiency)}</strong> ·
            ${fmtM(analytics.overall.usedLen)} cortados · ${analytics.planCount} plano(s)
          </div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <span class="status-badge" style="background:#f9fafb; color:var(--text-700); border:1px solid var(--border);">${analytics.overall.bars} barra(s)</span>
          <span class="status-badge" style="background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0;">${_fmtPct(analytics.overall.efficiency)} aproveitamento</span>
        </div>
      </div>

      ${_renderMonthlyChart(analytics.months)}

      <div class="chart-legend">
        <div class="legend-item"><span class="legend-dot" style="background:var(--green)"></span> ≥80% - Ótimo</div>
        <div class="legend-item"><span class="legend-dot" style="background:var(--orange)"></span> 65-79% - Regular</div>
        <div class="legend-item"><span class="legend-dot" style="background:var(--red)"></span> &lt;65% - Baixo</div>
      </div>
    </div>

    <div class="dashboard-analytics-grid dashboard-gap-bottom">
      <div class="card" style="padding:0; overflow:hidden;">
        <div style="padding:16px 20px; border-bottom:1px solid var(--border);">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-400);">10 piores SKUs em aproveitamento</div>
          <div style="font-size:12px; color:var(--text-400); margin-top:4px;">Sugestão simula barras virgens arredondadas de 100 em 100 mm, até 7000 mm.</div>
        </div>
        ${_renderWorstSkuTable(analytics.worstSkus)}
      </div>

      <div class="card" style="padding:0; overflow:hidden;">
        <div style="padding:16px 20px; border-bottom:1px solid var(--border); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-400);">10 melhores SKUs em aproveitamento</div>
        ${_renderBestSkuTable(analytics.bestSkus)}
      </div>
    </div>

    <div class="card" style="padding:0; overflow:hidden; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start; padding:16px 20px; border-bottom:1px solid var(--border); flex-wrap:wrap;">
        <div>
          <div style="font-size:15px; font-weight:700; color:var(--text-900);">Tamanho ideal para guardar sobra por SKU</div>
          <div style="font-size:12px; color:var(--text-400); margin-top:4px;">Compara a sobra mínima atual com uma simulação baseada nas peças cortadas, sobras geradas e capacidade disponível do WMS.</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
          <span class="status-badge" style="background:#f9fafb; color:var(--text-700); border:1px solid var(--border);">WMS ${analytics.scrapStorage.occupied}/${analytics.scrapStorage.capacity} · ${analytics.scrapStorage.occupancyPct}%</span>
          <span class="status-badge" style="background:#f9fafb; color:var(--text-700); border:1px solid var(--border);">${analytics.scrapSizing.length} recomendação(ões)</span>
        </div>
      </div>
      ${_renderScrapSizingTable(analytics.scrapSizing)}
    </div>

    <div class="dashboard-analytics-grid">
      <div class="card" style="padding:20px;">
        <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:18px;">
          <div>
            <div style="font-size:15px; font-weight:700; color:var(--text-900);">Sobras Geradas x Utilizadas</div>
            <div style="font-size:12px; color:var(--text-400); margin-top:2px;">Período selecionado · ${filters.scrapSku ? _dashEsc(filters.scrapSku) : 'Todos os SKUs'}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
            <select class="form-control" style="width:190px; padding:6px 9px; font-size:12px;" onchange="_setDashboardFilter('scrapSku', this.value)">
              <option value="">Todos os SKUs</option>
              ${skuOptions.map(s => `<option value="${_dashEsc(s.code)}" ${filters.scrapSku === s.code ? 'selected' : ''}>${_dashEsc(s.code)}${s.short ? ` - ${_dashEsc(s.short)}` : ''}</option>`).join('')}
            </select>
            <span class="status-badge" style="background:#f9fafb; color:var(--text-700); border:1px solid var(--border);">${analytics.scraps.generatedCount + analytics.scraps.usedCount} evento(s)</span>
          </div>
        </div>
        ${_renderScrapIndicator(analytics.scraps)}
      </div>

      <div class="card" style="padding:0; overflow:hidden;">
        <div style="padding:16px 20px; border-bottom:1px solid var(--border); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-400);">Top 5 perfis mais demandados</div>
        ${_renderDemandTable(analytics.topDemand)}
      </div>
    </div>

    ${_renderSkuPerformanceSection(analytics, filters)}
  `;
}

function _ensureDashboardFilters() {
  if (!appState.filters) appState.filters = {};
  if (!appState.filters.dashboard) appState.filters.dashboard = _defaultDashboardFilters();
  if (appState.filters.dashboard.scrapSku === undefined) appState.filters.dashboard.scrapSku = '';
  if (appState.filters.dashboard.skuPerformanceQ === undefined) appState.filters.dashboard.skuPerformanceQ = '';
}

function _defaultDashboardFilters() {
  const end = _dateInputValue(new Date());
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return { start: _dateInputValue(startDate), end, sku: '', scrapSku: '', skuPerformanceQ: '' };
}

function _setDashboardFilter(key, value) {
  _ensureDashboardFilters();
  appState.filters.dashboard[key] = value;
  if (key === 'start' || key === 'end') _normalizeDashboardDateRange();
  renderDashboard();
}

function _resetDashboardFilters() {
  appState.filters.dashboard = _defaultDashboardFilters();
  renderDashboard();
}

function _applyDashboardSkuFilterInput(value) {
  _ensureDashboardFilters();
  const raw = String(value || '').trim();

  if (!raw) {
    if (appState.filters.dashboard.sku) {
      _setDashboardFilter('sku', '');
    } else {
      const input = document.getElementById('dashboardSkuFilterInput');
      if (input) input.value = '';
    }
    return;
  }

  const sku = _dashboardSkuFromInput(raw);
  if (sku) {
    _setDashboardFilter('sku', sku);
    return;
  }

  const matches = _dashboardSkuSearchMatches(raw);
  if (matches.length) {
    showToast(`Encontrei ${matches.length} SKU(s). Selecione uma opção da lista para aplicar o filtro.`, 'info');
  } else {
    showToast('Nenhum SKU encontrado para esse texto.', 'info');
  }

  const input = document.getElementById('dashboardSkuFilterInput');
  if (input) input.value = _dashboardSkuInputValue(appState.filters.dashboard.sku);
}

function _dashboardSkuFromInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const options = _dashboardSkuOptions();
  const rawKey = _dashSearchKey(raw);
  const exact = options.find(opt => {
    const codeKey = _dashSearchKey(opt.code);
    const labelKey = _dashSearchKey(_dashboardSkuOptionLabel(opt));
    return rawKey === codeKey || rawKey === labelKey;
  });
  if (exact) return exact.code;

  const prefix = options
    .slice()
    .sort((a, b) => String(b.code).length - String(a.code).length)
    .find(opt => rawKey.startsWith(`${_dashSearchKey(opt.code)} - `));
  if (prefix) return prefix.code;

  const matches = _dashboardSkuSearchMatches(raw);
  return matches.length === 1 ? matches[0].code : '';
}

function _dashboardSkuSearchMatches(value) {
  const terms = _dashSearchTerms(value);
  if (!terms.length) return [];
  return _dashboardSkuOptions().filter(opt => {
    const haystack = _dashSearchKey([opt.code, opt.short, _dashboardSkuOptionLabel(opt)].filter(Boolean).join(' '));
    let cursor = 0;
    return terms.every(term => {
      const idx = haystack.indexOf(term, cursor);
      if (idx === -1) return false;
      cursor = idx + term.length;
      return true;
    });
  });
}

function _dashboardSkuInputValue(sku, options = _dashboardSkuOptions()) {
  if (!sku) return '';
  const opt = options.find(o => o.code === sku);
  return opt ? _dashboardSkuOptionLabel(opt) : sku;
}

function _dashboardSkuOptionLabel(opt) {
  if (!opt) return '';
  return opt.short ? `${opt.short} — ${opt.code}` : opt.code;
}

function _renderClearDashboardSkuButton() {
  return `<button class="btn btn-white btn-sm" onclick="_setDashboardFilter('sku', '')">Limpar SKU</button>`;
}

function _normalizeDashboardDateRange() {
  const f = appState.filters.dashboard;
  if (f.start && f.end && f.start > f.end) {
    const oldStart = f.start;
    f.start = f.end;
    f.end = oldStart;
  }
}

function _buildDashboardAnalytics(filters) {
  const plans = _dashboardPlansInRange(filters);
  const bins = _dashboardBinsFromPlans(plans, filters.sku);
  const scrapBins = _dashboardBinsFromPlans(plans, filters.scrapSku || '');
  const overall = _metricFromBins(bins);
  const allSkuMetrics = _skuMetricsFromPlans(plans, '');
  const skuMetrics = filters.sku ? allSkuMetrics.filter(m => m.sku === filters.sku) : allSkuMetrics;
  const months = _monthlyMetrics(plans, filters);
  const scrapStorage = _dashboardScrapStorageStats();
  const skuPerformanceRows = allSkuMetrics
    .filter(m => m.bars > 0)
    .map(m => _enrichSkuPerformanceMetric(m, plans, filters))
    .sort((a, b) => a.realEfficiency - b.realEfficiency || b.discardLen - a.discardLen || b.bars - a.bars);
  const worstSkus = skuMetrics
    .filter(m => m.bars > 0)
    .sort((a, b) => a.efficiency - b.efficiency || b.bars - a.bars)
    .slice(0, 10)
    .map(m => ({ ...m, suggestion: _suggestBetterBar(m) }));
  const bestSkus = skuMetrics
    .filter(m => m.bars > 0)
    .sort((a, b) => b.efficiency - a.efficiency || b.bars - a.bars)
    .slice(0, 10);
  const topDemand = skuMetrics
    .filter(m => m.bars > 0)
    .sort((a, b) => b.bars - a.bars || b.barLen - a.barLen)
    .slice(0, 5);
  const scrapSizing = _scrapSizingRecommendations(skuMetrics, scrapStorage)
    .filter(r => r.confidence !== 'baixa' || Math.abs(r.diff) >= 300 || r.estimatedGainLen >= 1000)
    .sort((a, b) => b.opportunityScore - a.opportunityScore || b.estimatedGainLen - a.estimatedGainLen)
    .slice(0, 12);

  return {
    plans,
    planCount: new Set(bins.map(b => b.planId)).size,
    overall,
    months,
    selectedSkuPerformance: filters.sku
      ? (skuPerformanceRows.find(row => row.sku === filters.sku) || _emptySkuPerformance(filters.sku, plans, filters))
      : null,
    skuPerformanceRows,
    scrapStorage,
    worstSkus,
    bestSkus,
    topDemand,
    scrapSizing,
    scraps: _scrapMetricFromBins(scrapBins, filters.scrapSku || '')
  };
}

function _scrapMetricFromBins(bins, sku) {
  const metric = _metricFromBins(bins);
  return {
    sku,
    generatedCount: metric.generatedCount,
    generatedLen: metric.generatedLen,
    usedCount: metric.scrapBars,
    usedLen: metric.scrapLen
  };
}

function _enrichSkuPerformanceMetric(metric, plans, filters) {
  const financials = _aggregatePlanFinancials(plans, metric.sku);
  const inventory = _currentInventoryFinancials(metric.sku);
  return {
    ...metric,
    financials,
    inventory,
    trend: _skuPerformanceTrend(metric.sku, filters, metric.realEfficiency)
  };
}

function _emptySkuPerformance(sku, plans, filters) {
  const sObj = appState.skus.find(s => s.code === sku);
  const empty = {
    sku,
    desc: sObj ? (sObj.short_desc || sObj.desc || '') : '',
    minSobra: _skuMinSobra(sku),
    trim: 0,
    currentDims: [],
    pieceDims: [],
    generatedRems: [],
    planCount: 0,
    bars: 0,
    virginBars: 0,
    scrapBars: 0,
    pieces: 0,
    barLen: 0,
    usedLen: 0,
    usefulLen: 0,
    generatedCount: 0,
    generatedLen: 0,
    scrapLen: 0,
    discardLen: 0,
    efficiency: 0,
    realEfficiency: 0,
    discardPct: 0,
    generatedPct: 0,
    financials: _aggregatePlanFinancials(plans, sku),
    inventory: _currentInventoryFinancials(sku),
    trend: _skuPerformanceTrend(sku, filters, 0)
  };
  return empty;
}

function _skuPerformanceTrend(sku, filters, currentRealEfficiency = null) {
  const start = _parseDateStart(filters.start);
  const end = _parseDateEnd(filters.end);
  if (!start || !end || start > end) return { status: 'sem-base', label: 'sem base', diff: null };

  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.round((end - start) / dayMs) + 1);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days + 1);
  const previousFilters = {
    ...filters,
    start: _dateInputValue(prevStart),
    end: _dateInputValue(prevEnd)
  };
  const previousMetric = _metricFromBins(_dashboardBinsFromPlans(_dashboardPlansInRange(previousFilters), sku));
  if (!previousMetric.bars) return { status: 'sem-base', label: 'sem base', diff: null };

  const current = Number.isFinite(currentRealEfficiency)
    ? currentRealEfficiency
    : _metricFromBins(_dashboardBinsFromPlans(_dashboardPlansInRange(filters), sku)).realEfficiency;
  const diff = current - previousMetric.realEfficiency;
  if (diff > 1) return { status: 'melhorou', label: 'melhorou', diff };
  if (diff < -1) return { status: 'piorou', label: 'piorou', diff };
  return { status: 'estavel', label: 'estável', diff };
}

function _dashboardPlansInRange(filters) {
  const start = _parseDateStart(filters.start);
  const end = _parseDateEnd(filters.end);
  return (appState.planos || []).filter(p => {
    if (!p || !Array.isArray(p.mapa)) return false;
    const d = new Date(p.data);
    if (isNaN(d)) return false;
    return (!start || d >= start) && (!end || d <= end);
  });
}

function _dashboardBinsFromPlans(plans, sku) {
  const bins = [];
  plans.forEach(plan => {
    (plan.mapa || []).forEach(bin => {
      if (sku && bin.sku !== sku) return;
      bins.push({ ...bin, planId: plan.id, planDate: plan.data, planTrim: plan.trim_mm || 0 });
    });
  });
  return bins;
}

function _skuMetricsFromPlans(plans, selectedSku) {
  const grouped = {};
  _dashboardBinsFromPlans(plans, selectedSku).forEach(bin => {
    if (!grouped[bin.sku]) grouped[bin.sku] = [];
    grouped[bin.sku].push(bin);
  });

  return Object.entries(grouped).map(([sku, bins]) => {
    const metric = _metricFromBins(bins);
    const sObj = appState.skus.find(s => s.code === sku);
    const pieces = [];
    bins.forEach(bin => (bin.pcs || []).forEach(pc => pieces.push(parseFloat(pc.dim) || 0)));
    const generatedRems = bins
      .map(bin => Math.max(0, parseFloat(bin.rem) || 0))
      .filter(rem => rem > 0);
    const virginDims = bins
      .filter(b => b.type === 'virgin' && b.srcId && b.srcId.includes('|'))
      .map(b => parseFloat(String(b.srcId).split('|')[1]))
      .filter(v => Number.isFinite(v) && v > 0);
    return {
      sku,
      desc: sObj ? (sObj.short_desc || sObj.desc || '') : '',
      minSobra: _skuMinSobra(sku),
      trim: _dashboardTrimForBins(bins),
      currentDims: [...new Set(virginDims)].sort((a,b) => a-b),
      pieceDims: pieces,
      generatedRems,
      planCount: new Set(bins.map(b => b.planId).filter(Boolean)).size,
      ...metric
    };
  });
}

function _metricFromBins(bins) {
  const metric = {
    bars: 0, virginBars: 0, scrapBars: 0, pieces: 0,
    barLen: 0, usedLen: 0, usefulLen: 0, generatedCount: 0,
    generatedLen: 0, scrapLen: 0, discardLen: 0, efficiency: 0,
    realEfficiency: 0, discardPct: 0, generatedPct: 0
  };

  bins.forEach(bin => {
    const len = parseFloat(bin.len) || 0;
    const used = (bin.pcs || []).reduce((sum, pc) => sum + (parseFloat(pc.dim) || 0), 0);
    const rem = Math.max(0, parseFloat(bin.rem) || 0);
    const minSobra = _skuMinSobra(bin.sku);
    const generated = rem >= minSobra;

    metric.bars++;
    metric.pieces += (bin.pcs || []).length;
    metric.barLen += len;
    metric.usedLen += used;
    metric.usefulLen += used + (generated ? rem : 0);
    if (bin.type === 'scrap') {
      metric.scrapBars++;
      metric.scrapLen += len;
    } else {
      metric.virginBars++;
    }
    if (generated) {
      metric.generatedCount++;
      metric.generatedLen += rem;
    } else {
      metric.discardLen += rem;
    }
  });

  metric.efficiency = metric.barLen > 0 ? (metric.usefulLen / metric.barLen) * 100 : 0;
  metric.realEfficiency = metric.barLen > 0 ? (metric.usedLen / metric.barLen) * 100 : 0;
  metric.discardPct = metric.barLen > 0 ? (metric.discardLen / metric.barLen) * 100 : 0;
  metric.generatedPct = metric.barLen > 0 ? (metric.generatedLen / metric.barLen) * 100 : 0;
  return metric;
}

function _monthlyMetrics(plans, filters) {
  const months = _monthKeysBetween(filters.start, filters.end);
  return months.map(key => {
    const monthPlans = plans.filter(p => _monthKey(p.data) === key);
    const bins = _dashboardBinsFromPlans(monthPlans, filters.sku);
    return { key, label: _monthLabel(key), ..._metricFromBins(bins) };
  });
}

function _suggestBetterBar(metric) {
  const pieces = metric.pieceDims || [];
  if (!pieces.length) return null;

  const maxLen = 7000;
  const step = 100;
  const trim = metric.trim || 0;
  const largestPiece = Math.max(...pieces);
  let firstCandidate = Math.ceil((largestPiece + trim + 50) / step) * step;
  firstCandidate = Math.max(step, firstCandidate);
  if (firstCandidate > maxLen) return null;

  let best = null;
  for (let dim = firstCandidate; dim <= maxLen; dim += step) {
    const simulation = _simulateSingleBarSize(pieces, dim, trim, metric.minSobra);
    if (!best || simulation.efficiency > best.efficiency || (simulation.efficiency === best.efficiency && simulation.bars < best.bars)) {
      best = simulation;
    }
  }

  if (!best) return null;
  return {
    dim: best.dim,
    efficiency: best.efficiency,
    gain: best.efficiency - metric.efficiency,
    bars: best.bars
  };
}

function _simulateSingleBarSize(pieces, dim, trim, minSobra) {
  const effectiveLen = dim - 50;
  const capacity = effectiveLen - trim;
  const sorted = pieces.filter(v => v > 0).sort((a, b) => b - a);
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
    if (!placed) bins.push({ used: piece });
  });

  const usedLen = sorted.reduce((sum, v) => sum + v, 0);
  const usefulLen = bins.reduce((sum, bin) => {
    const rem = Math.max(0, capacity - bin.used);
    return sum + bin.used + (rem >= minSobra ? rem : 0);
  }, 0);
  const barLen = bins.length * effectiveLen;
  return {
    dim,
    bars: bins.length,
    usedLen,
    usefulLen,
    barLen,
    efficiency: barLen > 0 ? (usefulLen / barLen) * 100 : 0
  };
}

function _renderSkuPerformanceSection(analytics, filters) {
  const selected = analytics.selectedSkuPerformance;
  const q = filters.skuPerformanceQ || '';
  const rows = _dashboardFilteredSkuPerformanceRows(analytics.skuPerformanceRows || [], q);

  return `
    <div class="card dashboard-sku-performance">
      <div class="dashboard-sku-head">
        <div>
          <div class="dashboard-section-title">Desempenho por SKU</div>
          <div class="dashboard-section-subtitle">
            Acompanha ocupação real, aproveitamento com sobra útil, desperdício e valor descartado por perfil no período selecionado.
          </div>
        </div>
        <div class="dashboard-sku-head-actions">
          <input type="text"
                 class="form-control"
                 id="skuPerformanceSearchInput"
                 placeholder="Buscar SKU ou nome resumido..."
                 value="${_dashEsc(q)}"
                 oninput="_updateDashboardSkuPerformanceSearch(this.value)">
          <span class="search-results-stats" id="skuPerformanceStats">${rows.length} SKU(s)</span>
        </div>
      </div>

      ${selected ? _renderSelectedSkuPerformance(selected, filters) : `
        <div class="dashboard-sku-empty-detail">
          Selecione um SKU no filtro superior para abrir a ficha detalhada. A tabela abaixo mostra todos os SKUs com planos aprovados no período.
        </div>
      `}

      ${_renderSkuPerformanceTable(rows, filters.sku)}
    </div>
  `;
}

function _renderSelectedSkuPerformance(metric, filters) {
  const hasData = metric.bars > 0;
  const title = metric.desc ? `${metric.sku} · ${metric.desc}` : metric.sku;
  const financialNote = metric.financials.unpricedSkuCount
    ? `${metric.financials.unpricedSkuCount} SKU com preço pendente no cálculo financeiro.`
    : 'Valores financeiros com preço por metro cadastrado.';
  return `
    <div class="dashboard-sku-selected">
      <div class="dashboard-sku-selected-title">
        <div>
          <div class="dashboard-sku-eyebrow">Ficha do SKU selecionado</div>
          <div class="dashboard-sku-name">${_dashEsc(title)}</div>
          <div class="dashboard-section-subtitle">${_dashEsc(_formatDashDate(filters.start))} até ${_dashEsc(_formatDashDate(filters.end))} · ${metric.planCount} plano(s) · ${metric.bars} barra(s)</div>
        </div>
        ${_renderTrendBadge(metric.trend)}
      </div>

      ${hasData ? `
        <div class="dashboard-sku-kpi-grid">
          ${_renderSkuPerfKpi('Ocupação real', _fmtPct(metric.realEfficiency), 'Só peças cortadas ÷ material aberto', _effColor(metric.realEfficiency))}
          ${_renderSkuPerfKpi('Aproveitamento c/ sobra útil', _fmtPct(metric.efficiency), 'Peças + sobras guardáveis ÷ material aberto', _effColor(metric.efficiency))}
          ${_renderSkuPerfKpi('Desperdício', _fmtPct(metric.discardPct), `${fmtM(metric.discardLen)} descartados`, metric.discardPct > 10 ? '#ef4444' : '#16a34a')}
          ${_renderSkuPerfKpi('Valor descartado', fmtBRLCompact(metric.financials.discardValue), financialNote, metric.financials.discardValue > 0 ? '#ef4444' : '#16a34a')}
          ${_renderSkuPerfKpi('Material aberto', fmtM(metric.barLen), `${fmtM(metric.usedLen)} viraram peças`, '#374151')}
          ${_renderSkuPerfKpi('Sobras geradas/usadas', `${metric.generatedCount}/${metric.scrapBars}`, `${fmtM(metric.generatedLen)} gerados · ${fmtM(metric.scrapLen)} reutilizados`, '#f59e0b')}
        </div>
        <div class="dashboard-sku-meta-row">
          <span>Peças cortadas: <b>${metric.pieces}</b></span>
          <span>Barras virgens: <b>${metric.virginBars}</b></span>
          <span>Retalhos usados: <b>${metric.scrapBars}</b></span>
          <span>Valor em peças: <b>${fmtBRLCompact(metric.financials.piecesValue)}</b></span>
          <span>Estoque atual do SKU: <b>${fmtM(metric.inventory.virginMm + metric.inventory.scrapMm)}</b></span>
        </div>
      ` : `
        <div class="dashboard-sku-empty-detail">
          Este SKU não teve plano aprovado no período selecionado. Ajuste as datas ou selecione outro SKU para ver a ficha.
        </div>
      `}
    </div>
  `;
}

function _renderSkuPerfKpi(label, value, note, color) {
  return `
    <div class="dashboard-sku-kpi">
      <div class="dashboard-sku-kpi-label">${_dashEsc(label)}</div>
      <div class="dashboard-sku-kpi-value" style="color:${color};">${_dashEsc(value)}</div>
      <div class="dashboard-sku-kpi-note">${_dashEsc(note)}</div>
    </div>
  `;
}

function _renderSkuPerformanceTable(rows, selectedSku = '') {
  return `
    <div class="tbl-wrap dashboard-sku-table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Ocupação real</th>
            <th>Aproveit. c/ sobra</th>
            <th>Desperdício</th>
            <th>Valor descartado</th>
            <th>Barras</th>
            <th>Planos</th>
            <th>Tendência</th>
            <th style="text-align:right;">Ação</th>
          </tr>
        </thead>
        <tbody id="skuPerformanceRowsBody">
          ${rows.length ? rows.map(r => _renderSkuPerformanceRow(r, selectedSku)).join('') : '<tr><td colspan="9" class="tbl-empty">Sem dados de SKU no período ou na busca atual.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function _renderSkuPerformanceRow(r, selectedSku = '') {
  const selected = selectedSku && selectedSku === r.sku;
  return `
    <tr ${selected ? 'style="background:#f8fafc;"' : ''}>
      <td>${_renderSkuCell(r)}</td>
      <td><span class="status-badge" style="background:${_effBg(r.realEfficiency)}; color:${_effColor(r.realEfficiency)}; border:1px solid ${_effColor(r.realEfficiency)}33;">${_fmtPct(r.realEfficiency)}</span></td>
      <td><span class="status-badge" style="background:${_effBg(r.efficiency)}; color:${_effColor(r.efficiency)}; border:1px solid ${_effColor(r.efficiency)}33;">${_fmtPct(r.efficiency)}</span></td>
      <td>
        <b style="color:${r.discardPct > 10 ? '#ef4444' : 'var(--text-700)'};">${_fmtPct(r.discardPct)}</b>
        <div style="font-size:11px; color:var(--text-400); margin-top:2px;">${fmtM(r.discardLen)}</div>
      </td>
      <td>
        <b>${fmtBRLCompact(r.financials.discardValue)}</b>
        ${r.financials.unpricedSkuCount ? '<div style="font-size:11px; color:#f59e0b; margin-top:2px;">preço pendente</div>' : ''}
      </td>
      <td>${r.bars} <span style="color:var(--text-400); font-size:11px;">(${fmtM(r.barLen)})</span></td>
      <td>${r.planCount}</td>
      <td>${_renderTrendBadge(r.trend)}</td>
      <td style="text-align:right;">
        ${selected
          ? '<span class="compras-muted">Selecionado</span>'
          : `<button class="btn btn-white btn-sm" onclick="_setDashboardFilter('sku', ${_dashJsString(r.sku)})">Ver ficha</button>`}
      </td>
    </tr>
  `;
}

function _dashboardFilteredSkuPerformanceRows(rows, q = '') {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return rows;
  const compact = needle.replace(/[\s.-]/g, '');
  return rows.filter(r => {
    const text = [r.sku, r.desc].filter(Boolean).join(' ').toLowerCase();
    const textCompact = text.replace(/[\s.-]/g, '');
    return text.includes(needle) || (compact && textCompact.includes(compact));
  });
}

function _updateDashboardSkuPerformanceSearch(value) {
  _ensureDashboardFilters();
  appState.filters.dashboard.skuPerformanceQ = value || '';
  const analytics = _buildDashboardAnalytics(appState.filters.dashboard);
  const rows = _dashboardFilteredSkuPerformanceRows(analytics.skuPerformanceRows || [], appState.filters.dashboard.skuPerformanceQ);
  const body = document.getElementById('skuPerformanceRowsBody');
  if (body) {
    body.innerHTML = rows.length
      ? rows.map(r => _renderSkuPerformanceRow(r, appState.filters.dashboard.sku)).join('')
      : '<tr><td colspan="9" class="tbl-empty">Sem dados de SKU no período ou na busca atual.</td></tr>';
  }
  const stats = document.getElementById('skuPerformanceStats');
  if (stats) stats.textContent = `${rows.length} SKU(s)`;
}

function _renderTrendBadge(trend) {
  if (!trend || !Number.isFinite(trend.diff)) {
    return '<span class="status-badge" style="background:#f3f4f6; color:var(--text-500); border:1px solid var(--border);">sem base</span>';
  }
  const diffText = `${trend.diff > 0 ? '+' : ''}${trend.diff.toFixed(1).replace('.', ',')} p.p.`;
  if (trend.status === 'melhorou') {
    return `<span class="status-badge" title="Comparado ao período anterior do mesmo tamanho" style="background:#dcfce7; color:#16a34a; border:1px solid #bbf7d0;">↑ ${diffText}</span>`;
  }
  if (trend.status === 'piorou') {
    return `<span class="status-badge" title="Comparado ao período anterior do mesmo tamanho" style="background:#fee2e2; color:#ef4444; border:1px solid #fecaca;">↓ ${diffText}</span>`;
  }
  return `<span class="status-badge" title="Comparado ao período anterior do mesmo tamanho" style="background:#f3f4f6; color:var(--text-500); border:1px solid var(--border);">≈ ${diffText}</span>`;
}

function _scrapSizingRecommendations(metrics, storage) {
  return metrics
    .filter(m => m && m.sku && (m.pieceDims || []).length >= 3)
    .map(m => _scrapSizingRecommendation(m, storage))
    .filter(Boolean);
}

function _scrapSizingRecommendation(metric, storage) {
  const current = Math.round(metric.minSobra || 1000);
  const pieces = (metric.pieceDims || []).filter(v => Number.isFinite(v) && v > 0);
  const remainders = metric.generatedRems.filter(v => Number.isFinite(v) && v > 0);
  if (pieces.length < 3 || !remainders.length) return null;

  const storageStats = storage || _dashboardScrapStorageStats();
  const minOperational = _minScrapThresholdByStorage(storageStats);
  const maxCandidate = Math.min(4000, Math.max(1000, _percentile(pieces, 0.9), _percentile(remainders, 0.9), current + 1000));
  const start = Math.min(current, minOperational);
  const end = Math.max(start, Math.ceil(maxCandidate / 100) * 100);
  const currentSim = _simulateScrapThreshold(current, pieces, remainders);
  let best = null;

  for (let threshold = start; threshold <= end; threshold += 100) {
    const sim = _simulateScrapThreshold(threshold, pieces, remainders);
    const scored = _applyStoragePressureToScrapSim(sim, currentSim, storageStats, current);
    if (!best || scored.adjustedScore > best.adjustedScore || (scored.adjustedScore === best.adjustedScore && Math.abs(threshold - current) < Math.abs(best.threshold - current))) {
      best = scored;
    }
  }

  if (!best) return null;
  const diff = best.threshold - current;
  const confidence = _scrapRecommendationConfidence(pieces.length, remainders.length, metric.bars);
  const estimatedGainLen = Math.max(0, best.adjustedScore - currentSim.score);
  const opportunityScore = estimatedGainLen + Math.abs(diff) * 0.25 + (confidence === 'alta' ? 700 : confidence === 'media' ? 300 : 0) - best.extraKeptCount * 80;
  const action = Math.abs(diff) < 100 ? 'manter' : diff > 0 ? 'subir' : 'baixar';

  return {
    sku: metric.sku,
    desc: metric.desc,
    current,
    ideal: best.threshold,
    diff,
    action,
    confidence,
    piecesCount: pieces.length,
    remaindersCount: remainders.length,
    reuseRate: best.reuseRate,
    keptRate: best.keptRate,
    extraKeptCount: best.extraKeptCount,
    estimatedGainLen,
    opportunityScore,
    reason: _scrapRecommendationReason(action, best, currentSim, storageStats)
  };
}

function _simulateScrapThreshold(threshold, pieces, remainders) {
  const kept = remainders.filter(rem => rem >= threshold);
  const reusable = kept.filter(rem => pieces.some(piece => piece <= rem));
  const reusableLen = reusable.reduce((sum, rem) => sum + _bestPieceFit(rem, pieces), 0);
  const deadLen = kept.reduce((sum, rem) => {
    const bestFit = _bestPieceFit(rem, pieces);
    return sum + (bestFit > 0 ? Math.max(0, rem - bestFit) * 0.25 : rem);
  }, 0);
  const discardedUsefulLen = remainders
    .filter(rem => rem < threshold && pieces.some(piece => piece <= rem))
    .reduce((sum, rem) => sum + _bestPieceFit(rem, pieces) * 0.35, 0);

  return {
    threshold,
    keptCount: kept.length,
    reusableCount: reusable.length,
    keptRate: remainders.length ? kept.length / remainders.length : 0,
    reuseRate: kept.length ? reusable.length / kept.length : 0,
    score: reusableLen - deadLen - discardedUsefulLen
  };
}

function _applyStoragePressureToScrapSim(sim, currentSim, storage, currentThreshold) {
  const extraKeptCount = Math.max(0, sim.keptCount - currentSim.keptCount);
  const isLowering = sim.threshold < currentThreshold;
  const pressure = storage.capacity > 0 ? storage.occupied / storage.capacity : 0.75;
  const scarcity = storage.freeSlots <= 0 ? 2 : Math.max(0, 1 - Math.min(1, storage.freeSlots / Math.max(1, storage.capacity * 0.25)));
  const tinyPenalty = sim.threshold < 500 ? 1200 : sim.threshold < 700 ? 450 : 0;
  const slotPenalty = isLowering ? extraKeptCount * (180 + pressure * 520 + scarcity * 480) : 0;
  const adjustedScore = sim.score - slotPenalty - tinyPenalty;
  return { ...sim, extraKeptCount, adjustedScore, storagePenalty: slotPenalty + tinyPenalty };
}

function _dashboardScrapStorageStats() {
  let capacity = 0;
  if (typeof window !== 'undefined' && Array.isArray(window.WMS_QUADS || undefined) && typeof window._getCapacity === 'function') {
    capacity = window.WMS_QUADS.reduce((sum, q) => sum + window._getCapacity(q), 0);
  } else if (typeof WMS_QUADS !== 'undefined' && typeof _getCapacity === 'function') {
    capacity = WMS_QUADS.reduce((sum, q) => sum + _getCapacity(q), 0);
  } else {
    capacity = Math.max(1, (appState.sobras || []).length);
  }
  const occupied = (appState.sobras || []).filter(s => s.endereco).length;
  const unallocated = (appState.sobras || []).filter(s => !s.endereco).length;
  const freeSlots = Math.max(0, capacity - occupied);
  const occupancyPct = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
  return { capacity, occupied, unallocated, freeSlots, occupancyPct };
}

function _minScrapThresholdByStorage(storage) {
  if (!storage || !storage.capacity) return 800;
  const occupancy = storage.occupied / storage.capacity;
  if (storage.freeSlots <= 0 || occupancy >= 0.85) return 1200;
  if (occupancy >= 0.70) return 1000;
  if (occupancy >= 0.50) return 800;
  if (occupancy >= 0.30) return 600;
  return 500;
}

function _bestPieceFit(rem, pieces) {
  let best = 0;
  pieces.forEach(piece => {
    if (piece <= rem && piece > best) best = piece;
  });
  return best;
}

function _percentile(values, pct) {
  const sorted = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * pct) - 1));
  return sorted[idx];
}

function _scrapRecommendationConfidence(pieceCount, remainderCount, bars) {
  if (pieceCount >= 60 && remainderCount >= 20 && bars >= 20) return 'alta';
  if (pieceCount >= 20 && remainderCount >= 8 && bars >= 8) return 'media';
  return 'baixa';
}

function _scrapRecommendationReason(action, best, currentSim, storage) {
  if (action === 'manter') return 'limite atual ja esta perto do melhor ponto simulado';
  if (action === 'subir') return 'sobras menores tendem a virar estoque pouco reaproveitado';
  if (best.storagePenalty > 0 && storage.occupancyPct >= 50) return 'baixar geraria mais sobras, mas a ocupacao do WMS limita o ganho';
  if (best.extraKeptCount > 0) return `ganho compensa guardar cerca de ${best.extraKeptCount} sobra(s) a mais no periodo`;
  if (best.reuseRate > currentSim.reuseRate + 0.08) return 'limite menor captura retalhos com boa chance de uso';
  return 'historico mostra demanda para pecas menores que o limite atual';
}

function _renderMonthlyChart(months) {
  const hasData = months.some(m => m.bars > 0);
  if (!hasData) {
    return `<div style="height:220px; display:flex; align-items:center; justify-content:center; background:#fafafa; border-radius:6px; border:1px dashed var(--border);">
      <span style="color:var(--text-400); font-size:13px;">Sem dados de planos aprovados no período.</span>
    </div>`;
  }

  return `
    <div style="height:240px; display:grid; grid-template-columns:repeat(${months.length}, minmax(52px, 1fr)); gap:10px; align-items:end; padding:16px 10px 8px; background:#fafafa; border-radius:6px; border:1px solid var(--border); overflow-x:auto;">
      ${months.map(m => {
        const h = Math.max(8, Math.min(100, m.efficiency));
        return `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:8px; min-width:52px; height:100%;">
            <div style="font-size:11px; font-weight:700; color:${_effColor(m.efficiency)};">${m.bars ? _fmtPct(m.efficiency) : '-'}</div>
            <div title="${_dashEsc(m.label)} · ${m.bars} barra(s)" style="width:100%; max-width:44px; height:${h}%; min-height:${m.bars ? 12 : 2}px; background:${m.bars ? _effColor(m.efficiency) : '#e5e7eb'}; border-radius:5px 5px 2px 2px;"></div>
            <div style="font-size:11px; color:var(--text-400); white-space:nowrap;">${_dashEsc(m.label)}</div>
          </div>`;
      }).join('')}
    </div>`;
}

function _renderWorstSkuTable(rows) {
  if (!rows.length) return `<div class="tbl-empty">Sem dados de SKUs no período.</div>`;
  return `
    <table class="tbl">
      <thead><tr><th>SKU</th><th>Aproveitamento</th><th>Barras</th><th>Sugestão até 7m</th></tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${_renderSkuCell(r)}</td>
            <td><span class="status-badge" style="background:${_effBg(r.efficiency)}; color:${_effColor(r.efficiency)}; border:1px solid ${_effColor(r.efficiency)}33;">${_fmtPct(r.efficiency)}</span></td>
            <td>${r.bars}</td>
            <td>${_renderBarSuggestion(r.suggestion)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function _renderBestSkuTable(rows) {
  if (!rows.length) return `<div class="tbl-empty">Sem dados de SKUs no período.</div>`;
  return `
    <table class="tbl">
      <thead><tr><th>SKU</th><th>Aproveitamento</th><th>Barras</th><th>Cortado</th></tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${_renderSkuCell(r)}</td>
            <td><span class="status-badge" style="background:${_effBg(r.efficiency)}; color:${_effColor(r.efficiency)}; border:1px solid ${_effColor(r.efficiency)}33;">${_fmtPct(r.efficiency)}</span></td>
            <td>${r.bars}</td>
            <td>${fmtM(r.usedLen)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function _renderBarSuggestion(suggestion) {
  if (!suggestion) return '<span style="color:var(--text-400); font-size:12px;">Sem tamanho viável até 7m</span>';

  const gain = suggestion.gain;
  const gainText = gain > 0.05 ? `+${_fmtPct(gain)}` : _fmtPct(gain);
  const gainColor = gain > 0.05 ? '#16a34a' : gain < -0.05 ? '#ef4444' : 'var(--text-400)';
  const label = gain > 0.05 ? 'Melhor ganho' : 'Melhor simulado';

  return `
    <div style="font-size:12px;">
      <div style="font-weight:700;">${fmtM(suggestion.dim)} · ${_fmtPct(suggestion.efficiency)}</div>
      <div style="color:var(--text-400); margin-top:2px;">${label} <span style="color:${gainColor}; font-weight:700;">(${gainText})</span></div>
    </div>`;
}

function _renderScrapIndicator(scraps) {
  const total = scraps.generatedCount + scraps.usedCount;
  const genPct = total > 0 ? (scraps.generatedCount / total) * 100 : 0;
  const usePct = total > 0 ? (scraps.usedCount / total) * 100 : 0;
  return `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
      <div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
        <div style="font-size:11px; font-weight:700; color:var(--text-400); text-transform:uppercase;">Sobras Geradas</div>
        <div style="font-size:28px; font-weight:800; color:#16a34a; margin-top:4px;">${scraps.generatedCount}</div>
        <div style="font-size:12px; color:var(--text-500);">${fmtM(scraps.generatedLen)}</div>
      </div>
      <div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
        <div style="font-size:11px; font-weight:700; color:var(--text-400); text-transform:uppercase;">Sobras Utilizadas</div>
        <div style="font-size:28px; font-weight:800; color:#f59e0b; margin-top:4px;">${scraps.usedCount}</div>
        <div style="font-size:12px; color:var(--text-500);">${fmtM(scraps.usedLen)}</div>
      </div>
    </div>
    <div style="height:18px; display:flex; border-radius:5px; overflow:hidden; background:#f3f4f6; border:1px solid var(--border);">
      <div style="width:${genPct}%; background:#22c55e;"></div>
      <div style="width:${usePct}%; background:#f59e0b;"></div>
    </div>
    <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:12px; color:var(--text-400);">
      <span>Geradas ${genPct.toFixed(0)}%</span>
      <span>Utilizadas ${usePct.toFixed(0)}%</span>
    </div>`;
}

function _renderDemandTable(rows) {
  if (!rows.length) return `<div class="tbl-empty">Sem demanda no período.</div>`;
  return `
    <table class="tbl">
      <thead><tr><th>Perfil</th><th>Barras</th><th>Peças</th><th>Total</th></tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${_renderSkuCell(r)}</td>
            <td><b>${r.bars}</b></td>
            <td>${r.pieces}</td>
            <td>${fmtM(r.barLen)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function _renderScrapSizingTable(rows) {
  if (!rows.length) {
    return `<div class="tbl-empty">Sem histórico suficiente para recomendar ajuste de sobra mínima no período.</div>`;
  }
  return `
    <table class="tbl">
      <thead><tr><th>SKU</th><th>Sobra atual</th><th>Ideal simulado</th><th>Ajuste</th><th>Confiança</th><th>Impacto estimado</th><th>Motivo</th><th style="text-align:right;">Ação</th></tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${_renderSkuCell(r)}</td>
            <td><b>${fmtM(r.current)}</b></td>
            <td><b style="color:${r.action === 'manter' ? 'var(--text-700)' : '#16a34a'};">${fmtM(r.ideal)}</b></td>
            <td>${_renderScrapSizingDiff(r)}</td>
            <td>${_renderConfidenceBadge(r.confidence)}</td>
            <td>
              <div style="font-size:12px; font-weight:700;">${fmtM(r.estimatedGainLen)}</div>
              <div style="font-size:11px; color:var(--text-400); margin-top:2px;">${r.piecesCount} peça(s) · ${r.remaindersCount} sobra(s)</div>
            </td>
            <td style="font-size:12px; color:var(--text-500); max-width:230px; white-space:normal;">${_dashEsc(r.reason)}</td>
            <td style="text-align:right;">${_renderApplyScrapSizingButton(r)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function _renderScrapSizingDiff(r) {
  if (r.action === 'manter') return '<span style="color:var(--text-400); font-size:12px;">manter</span>';
  const color = r.action === 'subir' ? '#f59e0b' : '#16a34a';
  const label = r.action === 'subir' ? 'subir' : 'baixar';
  return `<span class="status-badge" style="background:${r.action === 'subir' ? '#ffedd5' : '#dcfce7'}; color:${color}; border:1px solid ${color}33;">${label} ${fmtM(Math.abs(r.diff))}</span>`;
}

function _renderConfidenceBadge(confidence) {
  const color = confidence === 'alta' ? '#16a34a' : confidence === 'media' ? '#f59e0b' : 'var(--text-400)';
  const bg = confidence === 'alta' ? '#dcfce7' : confidence === 'media' ? '#ffedd5' : '#f3f4f6';
  return `<span class="status-badge" style="background:${bg}; color:${color}; border:1px solid ${color}33;">${confidence}</span>`;
}

function _renderApplyScrapSizingButton(r) {
  if (r.action === 'manter') return '<span style="color:var(--text-400); font-size:12px;">-</span>';
  if (!userCan('scraps:write')) return '<span class="compras-muted">Consulta</span>';
  return `<button class="btn btn-white btn-sm" onclick="_applyScrapSizingRecommendation(${_dashJsString(r.sku)}, ${r.ideal})">Aplicar</button>`;
}

async function _applyScrapSizingRecommendation(sku, ideal) {
  if (!requirePermission('scraps:write')) return;
  const s = appState.skus.find(x => x.code === sku);
  if (!s) { showToast('SKU não encontrado para aplicar sugestão.', 'error'); return; }
  if (!confirm(`Atualizar sobra mínima do SKU ${sku} para ${fmtM(ideal)}?`)) return;

  const old = s.min_sobra;
  s.min_sobra = Math.round(ideal);
  try {
    await DB.saveSku(s);
    await DB.log("Aplicou sugestão de sobra mínima", "unilux_skus", `${sku}: ${fmtM(old)} -> ${fmtM(s.min_sobra)}`);
    showToast('Sobra mínima atualizada!', 'success');
    renderDashboard();
  } catch (err) {
    s.min_sobra = old;
    console.error('Falha ao aplicar sugestão de sobra:', err);
    showToast('Erro ao salvar sugestão no banco.', 'error');
  }
}

function _renderSkuCell(r) {
  const sc = skuColor(r.sku);
  return `<div style="display:flex; flex-direction:column; gap:4px;">
    <span class="status-badge" style="align-self:flex-start; background:${sc.bg}; color:${sc.text}; border:1px solid ${sc.text}33;">${_dashEsc(r.sku)}</span>
    ${r.desc ? `<span style="font-size:12px; color:var(--text-400);">${_dashEsc(r.desc)}</span>` : ''}
  </div>`;
}

function _dashboardSkuOptions() {
  const fromPlans = new Set();
  (appState.planos || []).forEach(p => (p.mapa || []).forEach(b => b.sku && fromPlans.add(b.sku)));
  const all = [...appState.skus.map(s => s.code), ...fromPlans];
  return [...new Set(all)].sort().map(code => {
    const s = appState.skus.find(x => x.code === code);
    return { code, short: s ? (s.short_desc || s.desc || '') : '' };
  });
}

function _dashboardTrimForBins(bins) {
  const first = bins.find(b => b.planTrim !== undefined && b.planTrim !== null);
  if (first) return parseFloat(first.planTrim) || 0;
  return appState.configs ? (parseFloat(appState.configs.trim_mm) || 0) : 0;
}

function _skuMinSobra(sku) {
  const sObj = appState.skus.find(s => s.code === sku);
  return sObj && sObj.min_sobra !== undefined && sObj.min_sobra !== null ? parseFloat(sObj.min_sobra) || 1000 : 1000;
}

function _parseDateStart(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d) ? null : d;
}

function _parseDateEnd(value) {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59`);
  return isNaN(d) ? null : d;
}

function _dateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function _monthKey(value) {
  const d = new Date(value);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function _monthKeysBetween(start, end) {
  const s = _parseDateStart(start) || new Date();
  const e = _parseDateEnd(end) || new Date();
  const cur = new Date(s.getFullYear(), s.getMonth(), 1);
  const last = new Date(e.getFullYear(), e.getMonth(), 1);
  const keys = [];
  while (cur <= last && keys.length < 36) {
    keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys.length ? keys : [_monthKey(new Date())];
}

function _monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month:'short', year:'2-digit' }).replace('.', '');
}

function _formatDashDate(value) {
  if (!value) return 'sem data';
  return formatDate(value);
}

function _fmtPct(value) {
  if (!Number.isFinite(value)) return '0,0%';
  return `${value.toFixed(1).replace('.', ',')}%`;
}

function _effColor(value) {
  if (value >= 80) return '#16a34a';
  if (value >= 65) return '#f59e0b';
  return '#ef4444';
}

function _effBg(value) {
  if (value >= 80) return '#dcfce7';
  if (value >= 65) return '#ffedd5';
  return '#fee2e2';
}

function _dashEsc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function _dashSearchKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function _dashSearchTerms(value) {
  return _dashSearchKey(value)
    .split('*')
    .map(term => term.trim())
    .filter(Boolean);
}

function _dashJsString(value) {
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

function _seedTestData() {
  DB.init(APP_MOCK);
  showToast('Dados de teste criados!', 'success');
  renderDashboard();
  updateBadges();
}

function _limparDados() {
  if(!confirm('Apagar TODOS os dados do sistema? (Isto apaga o cache local, limpe o Supabase manualmente!)')) return;
  appState.ordens = []; appState.lotes = []; appState.planos = []; appState.barras = []; appState.sobras = []; appState.skus = [];
  console.warn("Aviso: o cache local foi resetado. No Supabase, execute um TRUNCATE nas tabelas para reset limpo.");
  showToast('Sistema resetado (Apenas local)', 'success');
  renderDashboard(); updateBadges();
}
