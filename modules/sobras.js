/* ===== SOBRAS – UNILUX 1D ===== */

function renderSobras() {
  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">${appState.sobras.length} retalho(s) disponível(is)</div>
        <h1 class="pg-title">Sobras</h1>
      </div>
      <div class="pg-actions">
        <button class="btn btn-green" onclick="_novaSobraModal()">+ Adicionar Sobra</button>
      </div>
    </div>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr><th>ID</th><th>SKU</th><th>Medida</th><th>Data Geração</th><th>Origem</th><th></th></tr>
        </thead>
        <tbody>${_sobrasRows()}</tbody>
      </table>
    </div>
  `;
}

function _sobrasRows() {
  if (!appState.sobras.length) {
    return `<tr><td colspan="6" class="tbl-empty">Nenhuma sobra cadastrada. Elas aparecem automaticamente após aprovar planos de corte.</td></tr>`;
  }
  return appState.sobras.map(s => {
    const c = skuColor(s.sku);
    return `
    <tr>
      <td class="fw-700" style="font-size:12px; color:var(--text-400);">${s.id}</td>
      <td><span class="sku-tag" style="background:${c.bg};color:${c.text};">${s.sku}</span></td>
      <td class="fw-700">${s.medida} mm</td>
      <td style="color:var(--text-400);">${s.criacao || '—'}</td>
      <td style="color:var(--text-400); font-size:12px;">${s.origem || 'Manual'}</td>
      <td style="text-align:right;">
        <button class="btn btn-ghost btn-sm text-red" onclick="_consumirSobra('${s.id}')">Consumir</button>
      </td>
    </tr>`;
  }).join('');
}

function _novaSobraModal() {
  const skuOpts = appState.skus.map(s => `<option value="${s.code}">${s.code}</option>`).join('');
  openModal('Adicionar Sobra Manual', `
    <div class="form-group">
      <label class="form-label">SKU</label>
      <select class="form-control" id="soSku">${skuOpts}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Medida (mm)</label>
      <input class="form-control" type="number" id="soMed" placeholder="ex: 1450">
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" onclick="_salvarSobra()">Salvar</button>
  `);
}

function _salvarSobra() {
  const sku   = document.getElementById('soSku').value;
  const med   = parseInt(document.getElementById('soMed').value);
  if (!med) { showToast('Informe a medida!', 'error'); return; }
  const id = `SC-${String(appState.sobras.length + 1).padStart(3,'0')}`;
  appState.sobras.push({ id, sku, medida: med, criacao: new Date().toISOString().split('T')[0], origem: 'Manual' });
  DB.save();
  closeModal(); showToast('Sobra adicionada!', 'success');
  renderSobras(); updateBadges();
}

function _consumirSobra(id) {
  appState.sobras = appState.sobras.filter(s => s.id !== id);
  DB.save(); showToast('Sobra consumida.', 'info');
  renderSobras(); updateBadges();
}
