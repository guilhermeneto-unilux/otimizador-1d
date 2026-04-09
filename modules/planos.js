/* ===== PLANOS DE CORTE – UNILUX 1D ===== */

function renderPlanos() {
  const lotes = appState.lotes;

  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header" style="margin-bottom:24px;">
      <div>
        <div class="pg-eyebrow">${lotes.filter(l=>l.status==='pending').length} aberto(s) · ${lotes.filter(l=>l.status==='approved').length} concluído(s)</div>
        <h1 class="pg-title">Planos de Corte</h1>
      </div>
    </div>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Lote</th>
            <th>Ordens</th>
            <th>SKUs</th>
            <th>Data</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${_planosRows(lotes)}
        </tbody>
      </table>
    </div>
  `;
}

function _planosRows(lotes) {
  if (!lotes.length) {
    return `<tr><td colspan="6" class="tbl-empty">Nenhum lote criado ainda. <button class="btn btn-dark btn-sm" style="margin-top:12px;" onclick="navigate('ordens')">Criar Lote →</button></td></tr>`;
  }
  return lotes.map(l => {
    const isApproved = l.status === 'approved';
    return `
    <tr>
      <td class="fw-700">${l.id}</td>
      <td style="color:var(--text-400);">${(l.ordens || []).length} ordens</td>
      <td>${(l.skus || []).map(s => { const c = skuColor(s); return `<span class="sku-tag" style="background:${c.bg};color:${c.text};margin-right:4px;">${s}</span>`; }).join('')}</td>
      <td style="color:var(--text-400);">${l.criacao || '—'}</td>
      <td>
        <span class="status-badge ${isApproved ? 'badge-approved' : 'badge-pending'}">
          ${isApproved ? 'Aprovado' : 'Aberto'}
        </span>
      </td>
      <td style="text-align:right;">
        ${isApproved
          ? `<button class="btn btn-ghost btn-sm" disabled style="color:var(--text-400)">Concluído</button>`
          : `<button class="btn btn-dark btn-sm" onclick="_abrirLoteNoOtimizador('${l.id}')">Ver Plano →</button>`}
      </td>
    </tr>`;
  }).join('');
}

function _abrirLoteNoOtimizador(loteId) {
  navigate('otimizador');
  // Pre-select the lote after render
  setTimeout(() => {
    const sel = document.getElementById('otimLoteSelect');
    if (sel) sel.value = loteId;
  }, 100);
}
