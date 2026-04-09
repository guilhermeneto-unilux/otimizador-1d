/* ===== MODULE: DASHBOARD ===== */

function renderDashboard() {
  const ordens = appState.ordens;
  const pendentes = ordens.filter(o => o.status === 'pending').length;
  const emLote    = appState.lotes.filter(l => l.status === 'pending' || l.status === 'approved').length;
  const barrasAtivas = appState.barras.reduce((s, b) => s + b.qty, 0);
  const sobrasQty = appState.sobras.length;

  const avgAprov = MOCK.kpiMensal.reduce((s, k) => s + k.aproveitamento, 0) / MOCK.kpiMensal.length;

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Visão geral da operação – ${new Date().toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</p>
      </div>
    </div>

    <!-- KPI CARDS -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-accent">
        <div class="kpi-icon ic-accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
          </svg>
        </div>
        <span class="kpi-label">Ordens Pendentes</span>
        <span class="kpi-value">${pendentes}</span>
        <span class="kpi-delta up">↑ aguardando lote</span>
      </div>
      <div class="kpi-card kpi-blue">
        <div class="kpi-icon ic-blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/>
          </svg>
        </div>
        <span class="kpi-label">Lotes em Andamento</span>
        <span class="kpi-value">${emLote}</span>
        <span class="kpi-delta neu">→ planejados</span>
      </div>
      <div class="kpi-card kpi-green">
        <div class="kpi-icon ic-green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="9" width="20" height="6" rx="2"/>
          </svg>
        </div>
        <span class="kpi-label">Barras em Estoque</span>
        <span class="kpi-value">${barrasAtivas}</span>
        <span class="kpi-delta up">↑ unidades totais</span>
      </div>
      <div class="kpi-card kpi-yellow">
        <div class="kpi-icon ic-yellow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <span class="kpi-label">Sobras Disponíveis</span>
        <span class="kpi-value">${sobrasQty}</span>
        <span class="kpi-delta neu">→ no grid</span>
      </div>
    </div>

    <!-- CHART + FLUXO -->
    <div class="grid-2-1 mb-24">
      <div class="card">
        <div class="card-header">
          <span class="card-title-lg">📈 Aproveitamento de Material</span>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-size:12px;color:var(--text-muted);">Últimos 7 meses</span>
            <span class="badge badge-success">${avgAprov.toFixed(1)}% médio</span>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="aprovChart" height="200"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title-lg">🔄 Fluxo Operacional</span>
        </div>
        <div class="flow-steps">
          ${[
            { icon:'📋', title:'1. Ordens',    desc:'Cadastre as ordens de produção' },
            { icon:'📦', title:'2. Lote',      desc:'Agrupe ordens em um lote' },
            { icon:'⚙️', title:'3. Otimize',  desc:'Execute o algoritmo de corte' },
            { icon:'✅', title:'4. Aprove',    desc:'Confirme e gere o plano' },
            { icon:'🏭', title:'5. Produza',   desc:'Inicie o corte physical' },
          ].map((s, i, arr) => `
            <div class="flow-step">
              <div class="flow-step-content">
                <div class="flow-step-icon" style="background:${['var(--accent-bg)','var(--blue-bg)','var(--purple-bg)','var(--green-bg)','var(--yellow-bg)'][i]}">
                  ${s.icon}
                </div>
                <div class="flow-step-title">${s.title}</div>
                <div class="flow-step-desc">${s.desc}</div>
              </div>
              ${i < arr.length-1 ? `<div class="flow-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- ÚLTIMOS LOTES -->
    <div class="table-wrapper mb-24">
      <div class="table-header">
        <span class="table-title">📋 Últimos Lotes Otimizados</span>
        <button class="btn btn-secondary btn-sm" onclick="navigate('planos')">Ver todos →</button>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Lote</th><th>SKU</th><th>Barras Usadas</th><th>Sobras Geradas</th>
              <th>Aproveitamento</th><th>Data</th>
            </tr>
          </thead>
          <tbody>
            ${MOCK.ultimosLotes.map(l => `
              <tr>
                <td><span class="font-700">${l.id}</span></td>
                <td>${_skuTag(l.sku)}</td>
                <td>${l.barras}</td>
                <td>${l.sobras}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div class="progress-bar" style="width:100px;">
                      <div class="progress-fill" style="width:${l.aproveitamento}"></div>
                    </div>
                    <span class="font-600 text-green">${l.aproveitamento}</span>
                  </div>
                </td>
                <td class="text-muted">${formatDate(l.data)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ALERTAS RÁPIDOS -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title-lg">⚠️ Estoques Baixos</span></div>
        ${appState.barras.filter(b => b.status === 'low').map(b => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
            <div>
              <div class="font-600">${b.sku}</div>
              <div style="font-size:12px;color:var(--text-muted);">Lote ${b.lote}</div>
            </div>
            <span class="status-pill status-low">${b.qty} barras</span>
          </div>
        `).join('')}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title-lg">📅 Próximas Entregas</span></div>
        ${appState.ordens.filter(o=>o.status==='pending').slice(0,4).sort((a,b)=>a.entrega.localeCompare(b.entrega)).map(o => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
            <div>
              <div class="font-600">${o.id} – ${o.cliente}</div>
              <div style="font-size:12px;color:var(--text-muted);">${o.qty}× ${o.dim}mm – ${o.sku}</div>
            </div>
            <span class="font-600" style="font-size:13px;color:var(--accent);">${formatDate(o.entrega)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  _drawAprovChart();
}

function _skuTag(sku) {
  const c = skuColor(sku);
  return `<span style="background:${c.bg};color:${c.text};padding:2px 8px;border-radius:20px;font-size:11.5px;font-weight:700;">${sku}</span>`;
}

function _drawAprovChart() {
  const canvas = document.getElementById('aprovChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = MOCK.kpiMensal;
  const W = canvas.offsetWidth || 400;
  const H = 200;
  canvas.width = W; canvas.height = H;

  const pad = { top: 20, right: 20, bottom: 36, left: 44 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW = (chartW / data.length) * 0.55;
  const barGap = chartW / data.length;

  const minV = 80, maxV = 100;

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const v = minV + (maxV - minV) * (i / 4);
    const y = pad.top + chartH - (v - minV) / (maxV - minV) * chartH;
    ctx.strokeStyle = '#e5e9f2';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9aa3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(0) + '%', pad.left - 6, y + 4);
  }

  // Bars
  data.forEach((d, i) => {
    const x = pad.left + i * barGap + (barGap - barW) / 2;
    const barH = (d.aproveitamento - minV) / (maxV - minV) * chartH;
    const y = pad.top + chartH - barH;

    const grad = ctx.createLinearGradient(x, y, x, pad.top + chartH);
    grad.addColorStop(0, '#818cf8');
    grad.addColorStop(1, '#6366f1');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [5, 5, 0, 0]);
    ctx.fill();

    // Value on top
    ctx.fillStyle = '#0d1226';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.aproveitamento.toFixed(1) + '%', x + barW / 2, y - 6);

    // Label
    ctx.fillStyle = '#9aa3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(d.mes, x + barW / 2, pad.top + chartH + 18);
  });
}
