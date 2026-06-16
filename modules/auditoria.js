async function renderAuditoria() {
  if (appState.currentUser?.role !== 'admin') {
     document.getElementById('contentArea').innerHTML = `<h3>Acesso negado.</h3>`;
     return;
  }

  _ensureAuditoriaState();
  const logs = await DB.fetchAudit();
  appState.audit = logs || [];
  const visibleLogs = _auditoriaFilteredLogs(appState.audit);
  const actions = _auditoriaActions(appState.audit);

  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">Sistema</div>
        <h1 class="pg-title">Registro de Auditoria</h1>
      </div>
      <button class="btn btn-white" onclick="renderAuditoria()">Atualizar Logs</button>
    </div>

    <div class="search-bar-card" style="margin-bottom:16px;">
      <div class="search-input-group">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" class="form-control"
               id="auditoriaSearchInput"
               placeholder="Pesquisar por ação, usuário, recurso ou detalhes..."
               value="${_auditEsc(appState.filters.auditoria.q)}"
               oninput="_setAuditoriaFilter('q', this.value)">
      </div>
      <select class="form-control" style="width:240px; flex:0 0 240px;" onchange="_setAuditoriaFilter('action', this.value)">
        <option value="">Todas as ações</option>
        ${actions.map(action => `<option value="${_auditEsc(action)}" ${appState.filters.auditoria.action === action ? 'selected' : ''}>${_auditEsc(action)}</option>`).join('')}
      </select>
      <span class="search-results-stats" id="auditoriaStats">${visibleLogs.length} registro(s)</span>
    </div>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Usuário</th>
            <th>Ação</th>
            <th>Recurso</th>
            <th>Detalhes</th>
          </tr>
        </thead>
        <tbody id="auditoriaRowsBody">
          ${_auditoriaRows(visibleLogs)}
        </tbody>
      </table>
    </div>
  `;
}

function _ensureAuditoriaState() {
  if (!appState.filters) appState.filters = {};
  if (!appState.filters.auditoria) appState.filters.auditoria = { q: '', action: '' };
  appState.filters.auditoria = { q: '', action: '', ...appState.filters.auditoria };
}

function _setAuditoriaFilter(key, value) {
  _ensureAuditoriaState();
  appState.filters.auditoria[key] = value || '';
  const rows = _auditoriaFilteredLogs(appState.audit || []);

  const body = document.getElementById('auditoriaRowsBody');
  if (body) body.innerHTML = _auditoriaRows(rows);

  const stats = document.getElementById('auditoriaStats');
  if (stats) stats.textContent = `${rows.length} registro(s)`;
}

function _auditoriaFilteredLogs(logs) {
  _ensureAuditoriaState();
  const q = (appState.filters.auditoria.q || '').toLowerCase();
  const action = appState.filters.auditoria.action || '';
  return (logs || []).filter(l => {
    if (action && l.action !== action) return false;
    if (!q) return true;
    return String(l.action || '').toLowerCase().includes(q)
      || String(l.user_name || '').toLowerCase().includes(q)
      || String(l.target_table || '').toLowerCase().includes(q)
      || String(l.details || '').toLowerCase().includes(q);
  });
}

function _auditoriaActions(logs) {
  return [...new Set((logs || []).map(l => l.action).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function _auditoriaRows(logs) {
  if (!logs.length) {
    return '<tr><td colspan="5" class="tbl-empty">Nenhum registro encontrado para os filtros atuais.</td></tr>';
  }
  return logs.map(l => {
    const dt = l.timestamp ? new Date(l.timestamp).toLocaleString() : '-';
    return `
      <tr>
        <td style="font-size:11px; color:var(--text-400);">${_auditEsc(dt)}</td>
        <td><div class="fw-700">${_auditEsc(l.user_name || '-')}</div></td>
        <td><span class="status-badge badge-batch">${_auditEsc(l.action || '-')}</span></td>
        <td><code style="background:#f3f4f6; padding:2px 4px; border-radius:4px;">${_auditEsc(l.target_table || '-')}</code></td>
        <td style="font-size:12px;">${_auditEsc(l.details || '-')}</td>
      </tr>
    `;
  }).join('');
}

function _auditEsc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}
