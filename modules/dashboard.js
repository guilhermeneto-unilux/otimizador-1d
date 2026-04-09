/* ===== DASHBOARD – UNILUX 1D ===== */

function renderDashboard() {
  const pending  = appState.ordens.filter(o => o.status === 'pending').length;
  const inBatch  = appState.lotes.filter(l => l.status === 'pending').length;
  const barTotal = appState.barras.reduce((s, b) => s + b.qty, 0);
  const sobras   = appState.sobras.length;

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday:'long', day:'2-digit', month:'long', year:'numeric'
  });

  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">${today}</div>
        <h1 class="pg-title">Dashboard</h1>
      </div>
      <div class="pg-actions">
        <button class="btn btn-white btn-sm" onclick="_seedTestData()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Criar Dados de Teste
        </button>
        <button class="btn btn-red btn-sm" onclick="_clearAppData()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Limpar Dados de Teste
        </button>
      </div>
    </div>

    <!-- KPIs -->
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
        <div class="kpi-label">Barras em Estoque</div>
      </div>
      <div class="kpi-card kpi-purple">
        <div class="kpi-num">${sobras}</div>
        <div class="kpi-label">Sobras Disponíveis</div>
      </div>
    </div>

    <!-- Chart card -->
    <div class="card" style="padding:24px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
        <div>
          <div style="font-size:15px; font-weight:700; color:var(--text-900);">Aproveitamento por Mês</div>
          <div style="font-size:12px; color:var(--text-400); margin-top:2px;">
            Últimos 7 meses · Média: <strong style="color:var(--red)">0,0%</strong> · Total cortado: 0,0m · 0 plano(s)
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="date" class="form-control" style="width:140px; padding:6px 10px; font-size:12px;">
          <span style="font-size:12px; color:var(--text-400);">até</span>
          <input type="date" class="form-control" style="width:140px; padding:6px 10px; font-size:12px;">
        </div>
      </div>

      <div style="height:200px; display:flex; align-items:center; justify-content:center; background:#fafafa; border-radius:6px; border:1px dashed var(--border);">
        <span style="color:var(--text-400); font-size:13px;">Sem dados de planos aprovados ainda.</span>
      </div>

      <div class="chart-legend">
        <div class="legend-item"><span class="legend-dot" style="background:var(--green)"></span> ≥80% — Ótimo</div>
        <div class="legend-item"><span class="legend-dot" style="background:var(--orange)"></span> 65-79% — Regular</div>
        <div class="legend-item"><span class="legend-dot" style="background:var(--red)"></span> &lt;65% — Baixo</div>
      </div>
    </div>

    <!-- Lower section -->
    <div class="dashboard-lower">
      <!-- Últimos Lotes -->
      <div class="card" style="padding:0; overflow:hidden;">
        <div style="padding:16px 20px; border-bottom:1px solid var(--border); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-400);">Últimos Lotes</div>
        ${appState.lotes.length === 0 ? `
          <div class="tbl-empty">
            <div style="margin-bottom:16px;">Nenhum lote ainda.</div>
            <button class="btn btn-dark btn-sm" onclick="navigate('ordens')">Criar primeiro lote →</button>
          </div>
        ` : `
          <table class="tbl">
            <thead><tr><th>Lote</th><th>Data</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${appState.lotes.slice(-5).reverse().map(l => `
                <tr>
                  <td class="fw-700">${l.id}</td>
                  <td style="color:var(--text-400)">${l.criacao || '—'}</td>
                  <td><span class="status-badge ${l.status === 'approved' ? 'badge-approved' : 'badge-pending'}">${l.status === 'approved' ? 'Aprovado' : 'Aberto'}</span></td>
                  <td><button class="btn btn-ghost btn-sm" onclick="navigate('planos')">Abrir →</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- Fluxo Operacional -->
      <div class="card" style="padding:0; overflow:hidden;">
        <div style="padding:16px 20px; border-bottom:1px solid var(--border); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-400);">Fluxo Operacional</div>
        <div style="padding:8px 20px;">
          <ul class="flow-list">
            ${[
              ['Cadastrar SKUs e Barras',      'skus'],
              ['Lançar Ordens de Produção',    'ordens'],
              ['Criar lote e otimizar',        'otimizador'],
              ['Aprovar planos',               'planos'],
              ['Baixa de produção',            'planos'],
            ].map(([txt, route], i) => `
              <li class="flow-item">
                <span class="flow-num">${i+1}</span>
                <span class="flow-text">${txt}</span>
                <button class="btn btn-ghost btn-sm flow-arr" onclick="navigate('${route}')">→</button>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;
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
