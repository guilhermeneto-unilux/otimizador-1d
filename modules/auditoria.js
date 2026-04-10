async function renderAuditoria() {
  if (appState.currentUser?.role !== 'admin') {
     document.getElementById('contentArea').innerHTML = `<h3>Acesso negado.</h3>`;
     return;
  }

  const logs = await DB.fetchAudit();

  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">Sistema</div>
        <h1 class="pg-title">Registro de Auditoria</h1>
      </div>
      <button class="btn btn-white" onclick="renderAuditoria()">Atualizar Logs</button>
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
        <tbody>
          ${logs.map(l => {
            const dt = new Date(l.timestamp).toLocaleString();
            return `
              <tr>
                <td style="font-size:11px; color:var(--text-400);">${dt}</td>
                <td><div class="fw-700">${l.user_name}</div></td>
                <td><span class="status-badge badge-batch">${l.action}</span></td>
                <td><code style="background:#f3f4f6; padding:2px 4px; border-radius:4px;">${l.target_table}</code></td>
                <td style="font-size:12px;">${l.details || '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}
