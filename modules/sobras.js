/* ===== MODULE: SOBRAS (GRID BATALHA NAVAL) ===== */

const COLS_LABELS = ['A','B','C','D','E','F','G','H'];
const ROWS_COUNT  = 11;

function renderSobras() {
  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Sobras – Grid de Retalhos</h1>
        <p class="page-subtitle">Mapa visual de posicionamento físico dos retalhos disponíveis</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="_openAddSobraManual()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Sobra
        </button>
      </div>
    </div>

    <!-- STATS -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px;">
      <div class="kpi-card kpi-accent">
        <span class="kpi-label">Posições Ocupadas</span>
        <span class="kpi-value">${appState.sobras.length}</span>
        <span class="kpi-delta neu">→ de ${COLS_LABELS.length * ROWS_COUNT} disponíveis</span>
      </div>
      <div class="kpi-card kpi-green">
        <span class="kpi-label">Posições Livres</span>
        <span class="kpi-value">${COLS_LABELS.length * ROWS_COUNT - appState.sobras.length}</span>
        <span class="kpi-delta up">↑ disponíveis</span>
      </div>
      <div class="kpi-card kpi-yellow">
        <span class="kpi-label">Comprimento Total</span>
        <span class="kpi-value">${(appState.sobras.reduce((s,x)=>s+x.medida,0)/1000).toFixed(1)}m</span>
        <span class="kpi-delta neu">→ em retalhos</span>
      </div>
      <div class="kpi-card kpi-blue">
        <span class="kpi-label">Histórico Consumido</span>
        <span class="kpi-value">${appState.historico.length}</span>
        <span class="kpi-delta neu">→ retalhos usados</span>
      </div>
    </div>

    <div class="grid-2-1" style="align-items:start;">
      <!-- GRID PRINCIPAL -->
      <div class="card">
        <div class="card-header">
          <span class="card-title-lg">📦 Mapa de Posições</span>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-size:12px;color:var(--text-muted);">Clique numa célula para detalhes</span>
          </div>
        </div>
        <div class="grid-container">
          <table class="grid-table" id="sobrasGrid">
            <thead>
              <tr>
                <th style="width:40px;">#</th>
                ${COLS_LABELS.map(c => `<th>${c}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${Array.from({length: ROWS_COUNT}, (_,row) => `
                <tr>
                  <td class="col-label">${row+1}</td>
                  ${COLS_LABELS.map((_,col) => {
                    const sobra = appState.sobras.find(s => s.col === col && s.row === row);
                    if (sobra) {
                      const c = skuColor(sobra.sku);
                      return `
                        <td>
                          <div class="grid-cell occupied" 
                               style="background:${c.bg};color:${c.text};border:2px solid ${c.border};"
                               onclick="_showSobraDetail('${sobra.id}')"
                               title="${sobra.id} | ${sobra.sku} | ${sobra.medida}mm">
                            <span class="grid-cell-sku">${sobra.sku.split('-')[0]}</span>
                            <span class="grid-cell-size">${sobra.medida}mm</span>
                            <span class="grid-cell-date">${formatDate(sobra.criacao)}</span>
                          </div>
                        </td>
                      `;
                    } else {
                      return `
                        <td>
                          <div class="grid-cell empty" onclick="_openAddSobraPosition(${col},${row})" title="Posição ${COLS_LABELS[col]}${row+1} – vazia">
                            +
                          </div>
                        </td>
                      `;
                    }
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- LEGENDA -->
        <div class="legend">
          ${[...new Set(appState.sobras.map(s=>s.sku))].map(sku => {
            const c = skuColor(sku);
            return `<div class="legend-item"><div class="legend-dot" style="background:${c.bg};border:2px solid ${c.border};"></div>${sku}</div>`;
          }).join('')}
          <div class="legend-item"><div class="legend-dot" style="background:var(--surface-2);border:2px solid var(--border);"></div>Vazia</div>
        </div>
      </div>

      <!-- PAINEL LATERAL -->
      <div style="display:flex;flex-direction:column;gap:16px;">

        <!-- DETALHE SELECIONADO -->
        <div class="card" id="sobraDetail">
          <div class="card-header"><span class="card-title-lg">🔍 Detalhe</span></div>
          <div class="empty-state" style="padding:30px 10px;">
            <div class="empty-state-icon" style="font-size:32px;">👆</div>
            <div class="empty-state-desc">Clique em uma célula ocupada para ver detalhes</div>
          </div>
        </div>

        <!-- HISTÓRICO -->
        <div class="history-panel">
          <div class="table-header">
            <span class="table-title">📁 Histórico de Utilização</span>
          </div>
          <div style="max-height:320px;overflow-y:auto;">
            <table>
              <thead>
                <tr><th>SKU</th><th>Medida</th><th>Lote</th><th>Data</th></tr>
              </thead>
              <tbody>
                ${appState.historico.length === 0
                  ? `<tr><td colspan="4"><div class="table-empty">Sem histórico</div></td></tr>`
                  : appState.historico.map(h => `
                    <tr>
                      <td>${_skuTag(h.sku)}</td>
                      <td class="font-600">${h.medida}mm</td>
                      <td><span class="badge badge-gray">${h.lote}</span></td>
                      <td class="text-muted">${formatDate(h.consumido)}</td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function _showSobraDetail(id) {
  const s = appState.sobras.find(x => x.id === id);
  if (!s) return;
  const c = skuColor(s.sku);
  const pos = `${COLS_LABELS[s.col]}${s.row+1}`;

  document.getElementById('sobraDetail').innerHTML = `
    <div class="card-header">
      <span class="card-title-lg">🔍 Detalhe – ${s.id}</span>
      <span class="badge" style="background:${c.bg};color:${c.text};">${pos}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;padding-top:4px;">
      <div style="background:${c.bg};border:2px solid ${c.border};border-radius:var(--radius);padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:${c.text};">${s.medida}mm</div>
        <div style="font-size:12px;color:${c.text};opacity:0.8;">${(s.medida/1000).toFixed(3)} m</div>
      </div>
      ${[
        ['SKU',      s.sku],
        ['Posição',  pos],
        ['Criado em', formatDate(s.criacao)],
        ['ID',       s.id],
      ].map(([l,v]) => `
        <div style="display:flex;justify-content:space-between;font-size:13px;border-bottom:1px solid var(--border);padding-bottom:8px;">
          <span style="color:var(--text-muted);font-weight:600;">${l}</span>
          <span class="font-600">${v}</span>
        </div>
      `).join('')}
      <button class="btn btn-danger btn-sm" onclick="_consumirSobra('${id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        Descartar / Consumir
      </button>
    </div>
  `;
}

function _consumirSobra(id) {
  const idx = appState.sobras.findIndex(s => s.id === id);
  if (idx === -1) return;
  const removed = appState.sobras.splice(idx, 1)[0];
  appState.historico.unshift({
    id: `HC-${String(appState.historico.length+1).padStart(3,'0')}`,
    sku: removed.sku, medida: removed.medida,
    consumido: new Date().toISOString().split('T')[0],
    lote: 'Manual', motivo: 'Removido manualmente'
  });
  showToast(`Sobra ${id} removida e adicionada ao histórico`, 'success');
  renderSobras();
  updateBadges();
}

function _openAddSobraManual() {
  const skuOpts = appState.skus.map(s => `<option value="${s.code}">${s.code}</option>`).join('');
  const free = [];
  for (let row=0;row<ROWS_COUNT;row++) for(let col=0;col<COLS_LABELS.length;col++) {
    if (!appState.sobras.some(s=>s.col===col&&s.row===row)) free.push({col,row,label:`${COLS_LABELS[col]}${row+1}`});
  }
  const posOpts = free.map(f=>`<option value="${f.col}_${f.row}">${f.label}</option>`).join('');
  openModal('Adicionar Sobra Manualmente', `
    <div class="form-group"><label class="form-label">SKU *</label><select class="form-select" id="addSoraSku">${skuOpts}</select></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Medida (mm) *</label><input class="form-input" type="number" id="addSoraMed" placeholder="ex: 1500" min="1"></div>
      <div class="form-group"><label class="form-label">Posição *</label><select class="form-select" id="addSoraPos">${posOpts}</select></div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_salvarSobraManual()">Adicionar</button>
  `);
}

function _openAddSobraPosition(col, row) {
  const skuOpts = appState.skus.map(s => `<option value="${s.code}">${s.code}</option>`).join('');
  openModal(`Adicionar Sobra – ${COLS_LABELS[col]}${row+1}`, `
    <div class="form-group"><label class="form-label">SKU *</label><select class="form-select" id="addSoraSku">${skuOpts}</select></div>
    <div class="form-group"><label class="form-label">Medida (mm) *</label><input class="form-input" type="number" id="addSoraMed" placeholder="ex: 1500" min="1"></div>
    <input type="hidden" id="addSoraPos" value="${col}_${row}">
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_salvarSobraManual()">Adicionar</button>
  `);
}

function _salvarSobraManual() {
  const sku = document.getElementById('addSoraSku').value;
  const med = parseInt(document.getElementById('addSoraMed').value);
  const pos = document.getElementById('addSoraPos').value;
  if (!med || !pos) { showToast('Preencha todos os campos!', 'error'); return; }
  const [col, row] = pos.split('_').map(Number);
  appState.sobras.push({
    id: `SC-${String(appState.nextSobraId++).padStart(3,'0')}`,
    sku, medida: med, criacao: new Date().toISOString().split('T')[0], col, row
  });
  closeModal();
  showToast('Sobra adicionada ao grid!', 'success');
  renderSobras();
  updateBadges();
}
