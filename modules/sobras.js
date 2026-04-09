/* ===== SOBRAS - WMS BATALHA NAVAL ===== */

const WMS_QUADS = [
  { id: 'VERDE',    name: 'Verde',    bg: '#22c55e', text: '#fff', rows: 11, cols: 11 },
  { id: 'ROXO',     name: 'Roxo',     bg: '#8b5cf6', text: '#fff', rows: 11, cols: 11 },
  { id: 'AZUL',     name: 'Azul',     bg: '#3b82f6', text: '#fff', rows: 11, cols: 11 },
  { id: 'PRETO',    name: 'Preto',    bg: '#111827', text: '#fff', rows: 11, cols: 11 },
  { id: 'ROSA',     name: 'Rosa',     bg: '#ec4899', text: '#fff', rows: 6, cols: 6 },
  { id: 'AMARELO',  name: 'Amarelo',  bg: '#eab308', text: '#fff', rows: 6, cols: 6 },
  { id: 'VERMELHO', name: 'Vermelho', bg: '#ef4444', text: '#fff', rows: 6, cols: 6 },
  { id: 'CINZA',    name: 'Cinza',    bg: '#6b7280', text: '#fff', rows: 6, cols: 6 },
  { id: 'BRANCO',   name: 'Branco',   bg: '#ffffff', text: '#111', rows: 9, cols: 9, border: '#d1d5db' }
];

const WMS_ROWS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let currentWmsQuad = null; // null = mostra o painel dos 9, senao mostra a matriz

function renderSobras() {
  const content = document.getElementById('contentArea');
  
  if (!currentWmsQuad) {
    // RENDERIZA OS 9 CARTÕES
    const cards = WMS_QUADS.map(q => {
      const capacity = q.rows * q.cols;
      const occupied = appState.sobras.filter(s => s.endereco && s.endereco.startsWith(q.id + '-')).length;
      const pct = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
      
      return `
        <div class="wms-card" style="background:${q.bg}; color:${q.text}; ${q.border ? `border:1px solid ${q.border}` : ''}" onclick="_openWmsGrid('${q.id}')">
          <div class="wms-card-name">${q.name}</div>
          <div class="wms-card-stats">
            <div>${occupied} / ${capacity}</div>
            <div class="wms-bar"><div class="wms-bar-fill" style="width:${pct}%; background:${q.text};"></div></div>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = `
      <div class="pg-header">
        <div>
          <div class="pg-eyebrow">Warehouse Management (WMS)</div>
          <h1 class="pg-title">Retalhos & Sobras</h1>
        </div>
        <button class="btn btn-green" onclick="_openWmsSearch()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          Buscar Retalho
        </button>
      </div>

      <div class="wms-dashboard">
        ${cards}
      </div>
      
      <!-- Listagem das Sobras Desalocadas (sem endereco formal) -->
      ${_renderUnallocated()}
    `;
  } else {
    // RENDERIZA A MATRIZ BATALHA NAVAL
    const q = WMS_QUADS.find(x => x.id === currentWmsQuad);
    
    let gridHtml = `<div class="wms-matrix" style="grid-template-columns: 40px repeat(${q.cols}, 1fr);">`;
    
    // Cabeçalho (Colunas)
    gridHtml += `<div class="wms-cell header"></div>`;
    for(let c=1; c<=q.cols; c++) {
      gridHtml += `<div class="wms-cell header">${c}</div>`;
    }
    
    // Linhas
    for(let r=0; r<q.rows; r++) {
      const rowChar = WMS_ROWS[r];
      gridHtml += `<div class="wms-cell header">${rowChar}</div>`;
      
      for(let c=1; c<=q.cols; c++) {
        const colStr = String(c).padStart(2, '0');
        const ender = `${q.id}-${rowChar}${colStr}`;
        
        // Verifica se tem sobra ali
        const s = appState.sobras.find(x => x.endereco === ender);
        if (s) {
          const skuInfo = appState.skus.find(sk => sk.code === s.sku) || { desc: '' };
          const cBg = skuColor(s.sku).bg;
          const cText = skuColor(s.sku).text;
          gridHtml += `
            <div class="wms-cell occupied" style="background:${cBg}; color:${cText}; border-color:${cText}44;" onclick="_clickWmsSlot('${ender}', true)" title="SKU: ${s.sku}\nMedida: ${s.medida}mm\nCadastrado: ${s.criacao}">
              <div class="sc-len">${s.medida}</div>
            </div>
          `;
        } else {
          gridHtml += `<div class="wms-cell empty" onclick="_clickWmsSlot('${ender}', false)" title="Vazio: ${ender}"></div>`;
        }
      }
    }
    gridHtml += `</div>`;

    content.innerHTML = `
      <div class="pg-header">
        <div>
          <div class="pg-eyebrow" style="cursor:pointer;" onclick="currentWmsQuad=null; renderSobras()">← Voltar ao Mapa Geral</div>
          <h1 class="pg-title">Quadrante ${q.name}</h1>
        </div>
      </div>
      
      <div class="table-card" style="padding:24px; overflow-x:auto;">
        ${gridHtml}
      </div>
    `;
  }
}

function _renderUnallocated() {
  const list = appState.sobras.filter(s => !s.endereco);
  if(list.length === 0) return '';
  return `
    <div style="margin-top:32px;">
      <h3 style="margin-bottom:12px; font-size:14px;">Retalhos Sem Endereço (${list.length})</h3>
      <div class="table-card"><table class="tbl">
        <thead><tr><th>ID</th><th>SKU</th><th>Medida</th><th>Ação</th></tr></thead>
        <tbody>
          ${list.map(s => `<tr>
            <td>${s.id}</td><td>${s.sku}</td><td>${s.medida}mm</td>
            <td><button class="btn btn-white btn-sm" onclick="_consumirSobra('${s.id}')">Excluir</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
  `;
}

function _clickWmsSlot(endereco, isOccupied) {
  if (isOccupied) {
    const s = appState.sobras.find(x => x.endereco === endereco);
    if(!s) return;
    const skuObj = appState.skus.find(sk => sk.code === s.sku);
    openModal(
      `Retalho Alocado: ${endereco}`,
      `
        <div style="background:#f9fafb; padding:16px; border-radius:6px; margin-bottom:16px; border:1px solid var(--border);">
          <div style="font-size:12px; color:var(--text-500); margin-bottom:4px;">Geração: ${s.criacao} | ${s.origem !== 'Manual' ? 'Lote: '+s.origem : 'Manual'}</div>
          <div style="font-size:20px; font-weight:800;">${s.sku} <span style="color:var(--text-400); font-weight:500;">· ${skuObj ? skuObj.desc : ''}</span></div>
          <div style="font-size:32px; font-weight:900; color:var(--orange); margin-top:8px;">${s.medida} mm</div>
        </div>
      `,
      `
        <div><button class="btn btn-white" style="color:var(--red);" onclick="_consumirSobra('${s.id}')">Excluir / Consumir</button></div>
        <button class="btn btn-white" onclick="closeModal()">Fechar</button>
      `
    );
  } else {
    // Vazio -> Cadastrar
    openModal(
      `Estocar no Slot: ${endereco}`,
      `
        <div class="form-group">
          <label class="form-label">Endereço Destino</label>
          <input type="text" class="form-control" id="soEnd" value="${endereco}" disabled>
        </div>
        <div class="form-row">
           <div class="form-group">
             <label class="form-label">SKU</label>
             <select class="form-control" id="soSku">
                <option value="">-- selecione --</option>
                ${appState.skus.map(sk => `<option value="${sk.code}">${sk.code} - ${sk.desc}</option>`).join('')}
             </select>
           </div>
           <div class="form-group">
             <label class="form-label">Medida (mm)</label>
             <input type="number" class="form-control" id="soMed">
           </div>
        </div>
      `,
      `
        <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-green" onclick="_salvarSobra('${endereco}')">Guardar no WMS</button>
      `
    );
  }
}

function _salvarSobra(endForced) {
  const sku = document.getElementById('soSku').value;
  const med = parseInt(document.getElementById('soMed').value);
  if (!sku || !med) { showToast('Informe SKU e Medida!', 'error'); return; }
  
  const endereco = document.getElementById('soEnd') ? document.getElementById('soEnd').value : endForced;
  const novaSobra = { 
    id: `SC-${String(appState.nextSobraId++).padStart(3,'0')}`, 
    sku, 
    medida: med, 
    criacao: new Date().toISOString().split('T')[0], 
    origem: 'Manual',
    endereco 
  };
  
  appState.sobras.push(novaSobra);
  DB.saveSobra(novaSobra);
  closeModal(); showToast(`Sobra física alocada em ${endereco}`, 'success');
  renderSobras(); updateBadges();
}

function _consumirSobra(id) {
  appState.sobras = appState.sobras.filter(s => s.id !== id);
  DB.deleteSobra(id); showToast('Retalho removido.', 'info');
  closeModal(); renderSobras(); updateBadges();
}

function _openWmsSearch() {
  // Uma funcionalidade extra para listar tudo e procurar por medida
  showToast('Em breve: Busca de Peças perdidas!', 'info');
}
