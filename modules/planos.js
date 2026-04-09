/* ===== MODULE: PLANOS DE CORTE (KANBAN) ===== */

function renderPlanos() {
  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Planos de Corte</h1>
        <p class="page-subtitle">Acompanhe o status dos planos aprovados em tempo real</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="navigate('otimizador')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Novo Plano
        </button>
      </div>
    </div>

    <!-- KANBAN STATS -->
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px;">
      ${[
        { col:'pending',    label:'Pendente',     color:'var(--yellow)', icon:'🕐' },
        { col:'inprogress', label:'Em Andamento',  color:'var(--purple)', icon:'⚙️' },
        { col:'done',       label:'Concluído',     color:'var(--green)',  icon:'✅' },
      ].map(c => {
        const count = appState.planos.filter(p => p.status === c.col).length;
        return `
          <div class="kpi-card" style="border-top:3px solid ${c.color};">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:24px;">${c.icon}</span>
              <div>
                <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">${c.label}</div>
                <div style="font-size:28px;font-weight:800;">${count}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- KANBAN BOARD -->
    <div class="kanban-board" id="kanbanBoard">
      ${_buildKanbanCol('pending',    'Pendente',    '#f59e0b', '🕐')}
      ${_buildKanbanCol('inprogress', 'Em Andamento', '#8b5cf6', '⚙️')}
      ${_buildKanbanCol('done',       'Concluído',   '#10b981', '✅')}
    </div>
  `;

  _initDragDrop();
}

function _buildKanbanCol(status, title, color, icon) {
  const planos = appState.planos.filter(p => p.status === status);
  return `
    <div class="kanban-col" data-col="${status}">
      <div class="kanban-col-header">
        <div class="kanban-col-title">
          <div class="col-dot" style="background:${color};"></div>
          ${icon} ${title}
        </div>
        <div class="kanban-col-count">${planos.length}</div>
      </div>
      <div class="kanban-cards" id="col-${status}" data-col="${status}">
        ${planos.map(p => _buildKanbanCard(p)).join('')}
        ${planos.length === 0 ? `<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:20px;">Arraste cards aqui</div>` : ''}
      </div>
    </div>
  `;
}

function _buildKanbanCard(p) {
  const statusColor = { pending:'var(--yellow)', inprogress:'var(--purple)', done:'var(--green)' }[p.status];
  const pill = { pending:'status-pending', inprogress:'status-progress', done:'status-active' }[p.status];

  return `
    <div class="kanban-card" draggable="true" id="card-${p.id}" data-plan="${p.id}">
      <div class="kanban-card-id">${p.lote} · ${p.id}</div>
      <div class="kanban-card-title">${_skuTag(p.sku)}</div>
      <div class="kanban-card-meta">
        <div class="kanban-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="9" width="20" height="6" rx="2"/>
          </svg>
          ${p.barras > 0 ? p.barras + ' barras' : 'N/A'}
        </div>
        <div class="kanban-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          ${formatDate(p.criacao)}
        </div>
        ${p.aproveitamento > 0 ? `
          <div class="kanban-meta-item text-green font-600">
            📈 ${p.aproveitamento}%
          </div>
        ` : ''}
      </div>
      <div class="kanban-card-footer">
        <span style="font-size:11.5px;color:var(--text-muted);">${p.notes}</span>
        <div style="display:flex;gap:6px;">
          ${p.status === 'pending' ? `<button class="btn btn-sm btn-secondary" onclick="_moverCard('${p.id}','inprogress')">Iniciar</button>` : ''}
          ${p.status === 'inprogress' ? `<button class="btn btn-sm btn-success" onclick="_moverCard('${p.id}','done')">Concluir</button>` : ''}
          ${p.status === 'done' ? `<span class="badge badge-success">✓ Concluído</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function _moverCard(planId, newStatus) {
  const plano = appState.planos.find(p => p.id === planId);
  if (plano) { plano.status = newStatus; }
  showToast(`Plano ${planId} movido para "${newStatus === 'inprogress' ? 'Em Andamento' : 'Concluído'}"!`, 'success');
  renderPlanos();
}

function _initDragDrop() {
  const cards = document.querySelectorAll('.kanban-card');
  const cols  = document.querySelectorAll('.kanban-cards');
  let dragged = null;

  cards.forEach(card => {
    card.addEventListener('dragstart', () => { dragged = card; setTimeout(() => card.classList.add('dragging'), 0); });
    card.addEventListener('dragend',   () => { card.classList.remove('dragging'); dragged = null; });
  });

  cols.forEach(col => {
    col.addEventListener('dragover',  e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', ()  => col.classList.remove('drag-over'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      if (!dragged) return;
      const planId  = dragged.dataset.plan;
      const newCol  = col.dataset.col;
      const plano   = appState.planos.find(p => p.id === planId);
      if (plano && plano.status !== newCol) {
        plano.status = newCol;
        showToast(`Plano ${planId} movido!`, 'success');
        renderPlanos();
      }
    });
  });
}
