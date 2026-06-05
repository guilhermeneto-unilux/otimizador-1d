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
  const skuOptions = _dashboardSkuOptions();
  const selectedSkuLabel = filters.sku ? filters.sku : 'Todos os SKUs';

  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">${today}</div>
        <h1 class="pg-title">Dashboard</h1>
      </div>
      <div class="pg-actions" style="flex-wrap:wrap; justify-content:flex-end;">
        <input type="date" class="form-control" style="width:145px; padding:7px 10px; font-size:12px;" value="${filters.start}" onchange="_setDashboardFilter('start', this.value)">
        <span style="font-size:12px; color:var(--text-400);">até</span>
        <input type="date" class="form-control" style="width:145px; padding:7px 10px; font-size:12px;" value="${filters.end}" onchange="_setDashboardFilter('end', this.value)">
        <select class="form-control" style="width:220px; padding:7px 10px; font-size:12px;" onchange="_setDashboardFilter('sku', this.value)">
          <option value="">Todos os SKUs</option>
          ${skuOptions.map(s => `<option value="${_dashEsc(s.code)}" ${filters.sku === s.code ? 'selected' : ''}>${_dashEsc(s.code)}${s.short ? ` - ${_dashEsc(s.short)}` : ''}</option>`).join('')}
        </select>
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

    <div class="dashboard-analytics-grid">
      <div class="card" style="padding:20px;">
        <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:18px;">
          <div>
            <div style="font-size:15px; font-weight:700; color:var(--text-900);">Sobras Geradas x Utilizadas</div>
            <div style="font-size:12px; color:var(--text-400); margin-top:2px;">Período selecionado</div>
          </div>
          <span class="status-badge" style="background:#f9fafb; color:var(--text-700); border:1px solid var(--border);">${analytics.scraps.generatedCount + analytics.scraps.usedCount} evento(s)</span>
        </div>
        ${_renderScrapIndicator(analytics.scraps)}
      </div>

      <div class="card" style="padding:0; overflow:hidden;">
        <div style="padding:16px 20px; border-bottom:1px solid var(--border); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-400);">Top 5 perfis mais demandados</div>
        ${_renderDemandTable(analytics.topDemand)}
      </div>
    </div>
  `;
}

function _ensureDashboardFilters() {
  if (!appState.filters) appState.filters = {};
  if (!appState.filters.dashboard) appState.filters.dashboard = _defaultDashboardFilters();
}

function _defaultDashboardFilters() {
  const end = _dateInputValue(new Date());
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return { start: _dateInputValue(startDate), end, sku: '' };
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
  const overall = _metricFromBins(bins);
  const skuMetrics = _skuMetricsFromPlans(plans, filters.sku);
  const months = _monthlyMetrics(plans, filters);
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

  return {
    plans,
    planCount: new Set(bins.map(b => b.planId)).size,
    overall,
    months,
    worstSkus,
    bestSkus,
    topDemand,
    scraps: {
      generatedCount: overall.generatedCount,
      generatedLen: overall.generatedLen,
      usedCount: overall.scrapBars,
      usedLen: overall.scrapLen
    }
  };
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
      pieces,
      ...metric
    };
  });
}

function _metricFromBins(bins) {
  const metric = {
    bars: 0, virginBars: 0, scrapBars: 0, pieces: 0,
    barLen: 0, usedLen: 0, usefulLen: 0, generatedCount: 0,
    generatedLen: 0, scrapLen: 0, discardLen: 0, efficiency: 0
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
  if (!metric.pieces.length) return null;

  const maxLen = 7000;
  const step = 100;
  const trim = metric.trim || 0;
  const largestPiece = Math.max(...metric.pieces);
  let firstCandidate = Math.ceil((largestPiece + trim + 50) / step) * step;
  firstCandidate = Math.max(step, firstCandidate);
  if (firstCandidate > maxLen) return null;

  let best = null;
  for (let dim = firstCandidate; dim <= maxLen; dim += step) {
    const simulation = _simulateSingleBarSize(metric.pieces, dim, trim, metric.minSobra);
    if (!best || simulation.efficiency > best.efficiency || (simulation.efficiency === best.efficiency && simulation.bars < best.bars)) {
      best = simulation;
    }
  }

  if (!best || best.efficiency <= metric.efficiency + 0.1) return null;
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
            <td>${r.suggestion ? `<div style="font-size:12px;"><b>${fmtM(r.suggestion.dim)}</b> · ${_fmtPct(r.suggestion.efficiency)} <span style="color:#16a34a;">(+${_fmtPct(r.suggestion.gain)})</span></div>` : '<span style="color:var(--text-400); font-size:12px;">Sem ganho estimado</span>'}</td>
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
