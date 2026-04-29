/* ===== SKUs & ESTOQUE UNIFICADO ===== */

function renderSkus() {
  const content = document.getElementById('contentArea');
  
  const rows = appState.skus.map(s => {
    const sc = skuColor(s.code);
    
    // Calcula o total de barras em estoque desse SKU
    const totalQty = s.dims ? s.dims.reduce((acc, d) => acc + (parseInt(d.qty)||0), 0) : 0;
    
    // Lista das dimensões para exibição
    const dimsText = s.dims && s.dims.length > 0 
      ? s.dims.map(d => `<span style="background:#e5e7eb; padding:2px 6px; border-radius:4px; font-size:11px;">${d.dim}mm (${d.qty}x)</span>`).join(' ')
      : '<span style="color:#9ca3af;">Sem estoque</span>';

    return `
      <tr>
        <td>
          <span class="status-badge" style="background:${sc.bg}; color:${sc.text}; border:1px solid ${sc.text}33;">
            ${s.code}
          </span>
        </td>
        <td><div style="font-weight:500;">${s.desc}</div></td>
        <td><div style="display:flex; gap:4px; flex-wrap:wrap;">${dimsText}</div></td>
        <td>
          <div style="font-weight:700; color:${totalQty > 0 ? 'var(--text)' : 'var(--red)'};">
            ${totalQty} barras
          </div>
        </td>
        <td>
          <div style="font-weight:600; color:var(--text-400);">${s.min_sobra !== undefined ? s.min_sobra : 1000} mm</div>
        </td>
        <td style="text-align:right;">
          <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
            <button class="btn btn-white btn-sm" onclick="_editSkuModal('${s.id}')">Editar Estoque</button>
            <div style="width:1px; height:16px; background:var(--border);"></div>
            <button class="btn btn-white btn-sm" style="color:var(--red);" onclick="if(confirm('Excluir permanentemente o perfil ${s.code}?')) _deleteSku('${s.id}')">Remover</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  content.innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">${appState.skus.length} perfis cadastrados</div>
        <h1 class="pg-title">Catálogo e Estoque Virgem</h1>
      </div>
      <button class="btn btn-green" onclick="_newSkuModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Novo Perfil & Estoque
      </button>
    </div>

    <div class="tbl-wrap" style="margin-top:24px;">
      <table class="tbl">
        <thead>
          <tr>
            <th>Código SKU</th>
            <th>Descrição do Perfil</th>
            <th>Dimensões & Lotes (mm)</th>
            <th>Total Virgem em Estoque</th>
            <th>Sobra Mínima</th>
            <th style="text-align:right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows : '<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-400);">Nenhum perfil cadastrado.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function _getSkuFormHtml(sku = null) {
  const code = sku ? sku.code : '';
  const desc = sku ? sku.desc : '';
  
  // Extrai até 3 dimensões (se não tiver, deixa vazio)
  const d1 = sku && sku.dims && sku.dims[0] ? sku.dims[0] : {dim:'', qty:''};
  const d2 = sku && sku.dims && sku.dims[1] ? sku.dims[1] : {dim:'', qty:''};
  const d3 = sku && sku.dims && sku.dims[2] ? sku.dims[2] : {dim:'', qty:''};

  return `
    <div class="form-group">
      <label class="form-label">Código SKU (Ex: PER-40X40)</label>
      <input type="text" class="form-control" id="skCode" value="${code}" ${sku ? 'disabled' : ''} style="text-transform:uppercase;">
    </div>
    <div class="form-group">
      <label class="form-label">Descrição Comercial</label>
      <input type="text" class="form-control" id="skDesc" value="${desc}">
    </div>
    <div class="form-group">
      <label class="form-label">Nome Resumido do Perfil</label>
      <input type="text" class="form-control" id="skShortDesc" value="${sku && sku.short_desc ? sku.short_desc : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">Pasta</label>
      <input type="text" class="form-control" id="skFolder" value="${sku && sku.folder ? sku.folder : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">Sobra Mínima para Guarda (mm) <span style="font-weight:400; color:var(--text-400);">(Descartes menores irão para o lixo)</span></label>
      <input type="number" class="form-control" id="skMinSobra" value="${sku && sku.min_sobra !== undefined ? sku.min_sobra : 1000}">
    </div>

    <div style="margin:24px 0 16px; border-bottom:1px solid var(--border);">
      <span style="font-size:12px; font-weight:700; color:var(--text-400); text-transform:uppercase;">Medidas & Estoque (Até 3 tamanhos por SKU)</span>
    </div>

    <!-- MEDIDA 1 -->
    <div style="display:flex; gap:16px;">
      <div class="form-group" style="flex:1;">
        <label class="form-label">Comprimento 1 (mm)</label>
        <input type="number" class="form-control" id="skDim1" value="${d1.dim}" placeholder="Ex: 6000">
      </div>
      <div class="form-group" style="flex:1;">
        <label class="form-label">Qtd Barras 1</label>
        <input type="number" class="form-control" id="skQty1" value="${d1.qty}" placeholder="Ex: 50">
      </div>
    </div>

    <!-- MEDIDA 2 -->
    <div style="display:flex; gap:16px;">
      <div class="form-group" style="flex:1;">
        <label class="form-label">Comprimento 2 (mm) <span style="font-weight:400; color:var(--text-400);">(opcional)</span></label>
        <input type="number" class="form-control" id="skDim2" value="${d2.dim}">
      </div>
      <div class="form-group" style="flex:1;">
        <label class="form-label">Qtd Barras 2</label>
        <input type="number" class="form-control" id="skQty2" value="${d2.qty}">
      </div>
    </div>

    <!-- MEDIDA 3 -->
    <div style="display:flex; gap:16px; margin-bottom:0;">
      <div class="form-group" style="flex:1;">
        <label class="form-label">Comprimento 3 (mm) <span style="font-weight:400; color:var(--text-400);">(opcional)</span></label>
        <input type="number" class="form-control" id="skDim3" value="${d3.dim}">
      </div>
      <div class="form-group" style="flex:1;">
        <label class="form-label">Qtd Barras 3</label>
        <input type="number" class="form-control" id="skQty3" value="${d3.qty}">
      </div>
    </div>
  `;
}

function _extractDimsFromForm() {
  const dims = [];
  for (let i=1; i<=3; i++) {
    const d = parseInt(document.getElementById('skDim'+i).value);
    const q = parseInt(document.getElementById('skQty'+i).value);
    if (!isNaN(d) && d > 0 && !isNaN(q) && q >= 0) {
      dims.push({ dim: d, qty: q });
    }
  }
  return dims; // Ordena de forma decrescente para otimizador favorecer o maior? O Otimizador decide.
}

function _newSkuModal() {
  openModal(
    'Cadastrar Perfil & Estoque',
    _getSkuFormHtml(),
    `<button class="btn btn-white" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-green" onclick="_salvarSku()">Salvar Perfil</button>`
  );
}

async function _salvarSku() {
  let code = document.getElementById('skCode').value.toUpperCase().trim();
  const desc = document.getElementById('skDesc').value.trim();
  const short_desc = document.getElementById('skShortDesc').value.trim();
  const folder = document.getElementById('skFolder').value.trim();
  const minSobra = parseInt(document.getElementById('skMinSobra').value) || 1000;
  
  if (!code || !desc) { showToast('Preencha código e descrição!', 'error'); return; }
  if (appState.skus.some(s => s.code === code)) { showToast('SKU já existe!', 'error'); return; }

  const dims = _extractDimsFromForm();
  if (dims.length === 0) { showToast('Cadastre ao menos 1 comprimento válido!', 'error'); return; }

  const id = `S${String(appState.skus.length + 1).padStart(2,'0')}`;
  const s = { id, code, desc, short_desc, folder, dims, min_sobra: minSobra };
  
  appState.skus.push(s);
  await DB.saveSku(s);
  await DB.log("Cadastrou SKU", "unilux_skus", `${s.code} - ${s.desc}`);
  
  closeModal(); showToast('Perfil salvo com sucesso!', 'success'); renderSkus();
}

function _editSkuModal(id) {
  const s = appState.skus.find(x => x.id === id);
  if (!s) return;
  openModal(
    `Editar Estoque: ${s.code}`,
    _getSkuFormHtml(s),
    `<div><button class="btn btn-white" style="color:var(--red);" onclick="if(confirm('Excluir este SKU e todo o seu estoque associado? irreversível.')) _deleteSku('${id}')">Excluir Tudo</button></div>
     <div style="display:flex; gap:8px;">
       <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
       <button class="btn btn-green" onclick="_saveEditSku('${id}')">Atualizar Estoque</button>
     </div>`
  );
  document.getElementById('modalFooter').style.justifyContent = 'space-between';
}

async function _saveEditSku(id) {
  const s = appState.skus.find(x => x.id === id);
  if (s) {
    s.desc = document.getElementById('skDesc').value.trim();
    s.short_desc = document.getElementById('skShortDesc').value.trim();
    s.folder = document.getElementById('skFolder').value.trim();
    s.min_sobra = parseInt(document.getElementById('skMinSobra').value) || 1000;
    const dims = _extractDimsFromForm();
    if (dims.length === 0) { showToast('Cadastre ao menos 1 comprimento!', 'error'); return; }
    s.dims = dims;
    await DB.saveSku(s);
    await DB.log("Editou SKU", "unilux_skus", `${s.code} - ${s.desc}`);
  }
  closeModal(); showToast('Estoque atualizado!', 'success'); renderSkus();
}

async function _deleteSku(id) {
  appState.skus = appState.skus.filter(x => x.id !== id);
  await DB.deleteSku(id);
  await DB.log("Removeu SKU", "unilux_skus", id);
  showToast('SKU removido.', 'info'); 
  closeModal(); renderSkus();
}
