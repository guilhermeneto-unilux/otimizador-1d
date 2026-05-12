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

function _openWmsGrid(id) {
  currentWmsQuad = id;
  renderSobras();
}

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
        <div class="pg-actions">
          <button class="btn btn-green" onclick="_openManualSobraModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Novo Retalho Manual
          </button>
          <button class="btn btn-white" onclick="_imprimirQrCodes()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h6v7"></path><path d="M18 9V2h-6"></path><path d="M6 22v-7h6"></path><path d="M18 22v-7h-6"></path></svg>
            Imprimir QR Codes
          </button>
        </div>
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
        const cellLabel = `${rowChar}${colStr}`;
        
        if (s) {
          const cBg = skuColor(s.sku).bg;
          const cText = skuColor(s.sku).text;
          gridHtml += `
            <div class="wms-cell occupied" style="background:${cBg}; color:${cText}; border-color:${cText}44;" onclick="_clickWmsSlot('${ender}', true)" title="SKU: ${s.sku}\nMedida: ${fmtM(s.medida)}">
              <div style="font-size:9px; opacity:0.7; position:absolute; top:2px; left:4px;">${cellLabel}</div>
              <div class="sc-len">${fmtM(s.medida)}</div>
              <div style="font-size:8px; font-weight:700; opacity:0.9;">${s.sku}</div>
            </div>
          `;
        } else {
          gridHtml += `
            <div class="wms-cell empty" onclick="_clickWmsSlot('${ender}', false)" title="Vazio: ${ender}">
              <div style="font-size:14px; opacity:0.6; font-weight:400; margin-bottom:2px;">+</div>
              <span style="opacity:0.3; font-size:9px;">${cellLabel}</span>
            </div>
          `;
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
            <td>${s.id}</td><td>${s.sku}</td><td>${fmtM(s.medida)}</td>
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
          <div style="font-size:32px; font-weight:900; color:var(--orange); margin-top:8px;">${fmtM(s.medida)}</div>
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
          <label class="form-label">Endereço (Gaveta/Posição)</label>
          <select class="form-control" id="soEnd">
            ${_getAllWmsSlots().map(adr => {
              const isOcc = appState.sobras.some(x => x.endereco === adr);
              return `<option value="${adr}" ${adr === endereco ? 'selected' : ''} ${isOcc ? 'disabled' : ''}>
                ${adr} ${isOcc ? '(OCUPADO)' : ''}
              </option>`;
            }).join('')}
          </select>
          <div class="form-hint">Ocupados aparecem desabilitados. Selecione um espaço livre.</div>
        </div>
        <div class="form-group">
             <label class="form-label">SKU (Pesquise por código ou nome)</label>
             <div style="position:relative;">
               <input type="text" class="form-control" id="soSkuInput" placeholder="🔍 Digite código ou nome..." autocomplete="off" 
                      oninput="_filterSkuDropdown(this.value)" 
                      onfocus="_showSkuDropdown(this)"
                      onkeydown="_handleSkuKeydown(event, this)">
               <div id="soSkuDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:220px; overflow-y:auto; background:#fff; border:1px solid var(--border); border-radius:6px; z-index:9000; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); text-align:left;">
                 <div id="skuNoResults" style="padding:12px; color:var(--text-400); display:none; font-size:13px;">Nenhum item encontrado...</div>
                 ${appState.skus.map(sk => `<div class="sku-option" style="padding:10px 12px; border-bottom:1px solid #f3f4f6; cursor:pointer;" onclick="_selectSku('${sk.code}', '${sk.desc.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')"><strong>${sk.code}</strong><br><span style="color:#6b7280; font-size:12px;">${sk.desc}</span></div>`).join('')}
               </div>
             </div>
        </div>
        <div class="form-group">
             <label class="form-label">Medida (m)</label>
             <input type="number" step="0.001" class="form-control" id="soMed">
        </div>
      `,
      `
        <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-green" onclick="_salvarSobra(this)">Guardar no WMS</button>
      `
    );
    // Para fluxo manual via clique no '+', adicionamos o hidden input esperado pelo _salvarSobra
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = 'soEndTarget';
    hidden.value = endereco;
    document.getElementById('modalBody').appendChild(hidden);
  }
}

async function _salvarSobra(btnEl) {
  if (btnEl) {
    btnEl.dataset.originalText = btnEl.textContent;
    btnEl.disabled = true;
    btnEl.textContent = 'Aguarde...';
  }

  const elSkuInput = document.getElementById('soSkuInput');
  const elMed = document.getElementById('soMed');
  const elEnd = document.getElementById('soEndTarget');
  
  if (!elSkuInput || !elMed || !elEnd) {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = btnEl.dataset.originalText; }
    return;
  }

  const skuVal = elSkuInput.value.trim();
  const skuPart = skuVal.includes(' - ') ? skuVal.split(' - ')[0].trim() : skuVal;
  
  // Converte Metros (input) para Milímetros (DB)
  const med = Math.round(parseFloat(elMed.value.replace(',', '.')) * 1000);
  const endereco = elEnd.value;
  
  if (!skuVal || !med || !endereco) { 
    showToast('Informe SKU, Medida e Endereço!', 'error'); 
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = btnEl.dataset.originalText; }
    return; 
  }

  // Busca o SKU oficial no appState.skus por código exato ou por match de "CODE - DESC"
  const skuObj = appState.skus.find(s => s.code === skuPart || `${s.code} - ${s.desc}` === skuVal);

  if (!skuObj) {
    showToast('SKU não reconhecido. Selecione uma opção das sugestões.', 'error');
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = btnEl.dataset.originalText; }
    return;
  }

  const sku = skuObj.code;

  // Verificação de segurança: já tem algo aqui?
  if (appState.sobras.some(s => s.endereco === endereco)) {
    showToast(`O endereço ${endereco} já está ocupado!`, 'error');
    closeModal();
    return;
  }

  const novaSobra = { 
    id: `SC-${String(appState.nextSobraId++).padStart(3,'0')}`, 
    sku, 
    medida: med, 
    criacao: new Date().toISOString().split('T')[0], 
    origem: 'Manual',
    endereco 
  };
  
  try {
    appState.sobras.push(novaSobra);
    
    // Atualiza o contador no configs para persistência
    appState.configs.nextSobraId = appState.nextSobraId;
    
    // Salva a sobra e as configurações (novo contador)
    await Promise.all([
      DB.saveSobra(novaSobra),
      DB.saveConfig(appState.configs)
    ]);

    DB.log("Cadastrou Sobra Manual", "unilux_sobras", `${novaSobra.sku} em ${endereco}`);
    
    closeModal(); 
    showToast(`Sobra física alocada em ${endereco}`, 'success');
  } catch (err) {
    console.error('Erro ao salvar sobra:', err);
    showToast('Erro ao salvar no banco de dados. Verifique sua conexão.', 'error');
    // Remove da memória se falhou no banco
    appState.sobras = appState.sobras.filter(s => s.id !== novaSobra.id);
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = btnEl.dataset.originalText; }
    return;
  }
  
  renderSobras(); updateBadges();
}

function _consumirSobra(id) {
  const s = appState.sobras.find(x => x.id === id);
  appState.sobras = appState.sobras.filter(s => s.id !== id);
  DB.deleteSobra(id); 
  DB.log("Consumiu Sobra", "unilux_sobras", `${s ? s.sku : id} de ${s ? s.endereco : '?'}`);
  showToast('Retalho removido.', 'info');
  closeModal(); renderSobras(); updateBadges();
}

// ─── NOVO FLUXO: PASSO 1 (ESCANEAR) ───────────────────────────
function _openManualSobraModal() {
  // Modal 1: Identificação da Prateleira
  const btns = WMS_QUADS.map(q => {
    return `<button class="btn btn-dark" style="background:${q.bg}; color:${q.text}; ${q.border ? 'border:1px solid '+q.border : ''}; padding:14px; font-size:13px; font-weight:700;" onclick="_avancarCadastroSobra('${q.id}')">${q.name.toUpperCase()}</button>`;
  }).join('');

  openModal(
    'Identificação da Prateleira',
    `
      <div style="text-align:center; padding:16px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; color:var(--green);"><path d="M4 5h16M4 12h16M4 19h16"/></svg>
        <h3 style="margin-bottom:8px;">Aponte o leitor para o QR Code da prateleira</h3>
        
        <input type="text" id="scanQuadInput" 
               style="width: 100%; text-align: center; font-size: 20px; font-weight: 800; padding: 16px; border: 2px dashed var(--text-400); border-radius: 8px; margin-bottom: 24px; text-transform: uppercase;" 
               placeholder="BIPAR CÓDIGO AQUI" autocomplete="off">
               
        <p style="font-size:12px; color:var(--text-400); margin-bottom:16px; font-weight:700; text-transform:uppercase;">Ou selecione manualmente abaixo se estiver sem leitor:</p>
        
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
          ${btns}
        </div>
      </div>
    `,
    `<button class="btn btn-white" onclick="closeModal()">Cancelar e Voltar</button>`
  );

  // Auto-focus no campo pra pegar a leitura da pistola
  const scanInput = document.getElementById('scanQuadInput');
  setTimeout(() => scanInput.focus(), 100);

  // Escutar 'Enter' no campo de scan
  scanInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = scanInput.value.toUpperCase().trim();
      if (WMS_QUADS.some(q => q.id === val)) {
        _avancarCadastroSobra(val);
      } else {
        showToast('Código de quadrante não reconhecido!', 'error');
        scanInput.value = '';
      }
    }
  });
}

function _findNextWmsSlotByQuad(quadId) {
  const occupied = appState.sobras.map(s => s.endereco).filter(Boolean);
  const q = WMS_QUADS.find(x => x.id === quadId);
  if(!q) return null;
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  for(let r=0; r<q.rows; r++) {
    for(let c=1; c<=q.cols; c++) {
      const adr = `${q.id}-${L[r]}${String(c).padStart(2,'0')}`;
      if (!occupied.includes(adr)) return adr;
    }
  }
  return null;
}

// ─── NOVO FLUXO: PASSO 2 (PREENCHER DADOS) ─────────────────────
function _avancarCadastroSobra(quadId) {
  const nextSlot = _findNextWmsSlotByQuad(quadId);
  const q = WMS_QUADS.find(x => x.id === quadId);
  
  if (!nextSlot) {
    showToast(`O quadrante ${q.name} está completamento cheio!`, 'error');
    return;
  }

  // Prepara o formulário com o target locado
  openModal(
    `Cadastrar Retalho: Quadrante ${q.name}`,
    `
      <div style="background:#f9fafb; padding:20px; border-radius:8px; border:2px solid var(--border); text-align:center; margin-bottom:24px;">
        <div style="font-size:11px; font-weight:800; color:var(--text-400); text-transform:uppercase; margin-bottom:4px;">Guardar na Posição</div>
        <div style="font-size:32px; font-weight:900; color:var(--green-dk);">${nextSlot}</div>
        <input type="hidden" id="soEndTarget" value="${nextSlot}">
      </div>

      <div class="form-row">
         <div class="form-group">
           <label class="form-label" style="font-weight:700;">Perfil da Sobra (Pesquise)</label>
           <div style="position:relative; text-align:left;">
             <input type="text" class="form-control" id="soSkuInput" placeholder="🔍 Digite código ou nome..." autocomplete="off" style="font-size:16px; padding:12px;" 
                    oninput="_filterSkuDropdown(this.value)" 
                    onfocus="_showSkuDropdown(this)"
                    onkeydown="_handleSkuKeydown(event, this)">
             <div id="soSkuDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:250px; overflow-y:auto; background:#fff; border:1px solid var(--border); border-radius:6px; z-index:9000; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
               <div id="skuNoResults" style="padding:12px; color:var(--text-400); display:none; font-size:13px;">Nenhum item encontrado...</div>
               ${appState.skus.map(sk => `<div class="sku-option" style="padding:12px; border-bottom:1px solid #f3f4f6; cursor:pointer;" onclick="_selectSku('${sk.code}', '${sk.desc.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')"><strong>${sk.code}</strong><br><span style="color:#6b7280; font-size:13px;">${sk.desc}</span></div>`).join('')}
             </div>
           </div>
         </div>
          <div class="form-group">
           <label class="form-label" style="font-weight:700;">Tamanho (m)</label>
            <input type="number" step="0.001" class="form-control" id="soMed" placeholder="Ex: 2,400" style="font-size:16px; padding:12px;">
         </div>
      </div>
    `,
    `
      <button class="btn btn-white" onclick="_openManualSobraModal()">← Voltar</button>
      <button class="btn btn-green" onclick="_salvarSobra(this)">✓ Salvar Posição</button>
    `
  );
  
  // Auto-focus no campo de pesquisa de SKU
  setTimeout(() => document.getElementById('soSkuInput').focus(), 150);
}

function _getAllWmsSlots() {
  const slots = [];
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  WMS_QUADS.forEach(q => {
    for(let r=0; r<q.rows; r++) {
      for(let c=1; c<=q.cols; c++) {
        slots.push(`${q.id}-${L[r]}${String(c).padStart(2,'0')}`);
      }
    }
  });
  return slots;
}

function _openWmsSearch() {
  showToast('Em breve: Busca de Peças perdidas!', 'info');
}

function _imprimirQrCodes() {
  // Gera QR codes simples (apenas o TEXTO do ID do quadrante, ex: "VERDE", "ROXO", etc.)
  const qrHtml = WMS_QUADS.map(q => {
    const dataTxt = encodeURIComponent(q.id);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${dataTxt}`;
    return `
      <div class="qr-print-card" style="border-top: 8px solid ${q.bg}; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; text-align: center;">
        <img src="${qrUrl}" alt="QR ${q.name}" width="200" height="200" style="margin-bottom: 20px; image-rendering: pixelated;">
        <div style="font-size: 28px; font-weight: 900; letter-spacing: 2px; color:${q.bg === '#ffffff' ? '#111' : q.bg};">${q.name.toUpperCase()}</div>
        <div style="font-size: 14px; color: #9ca3af; margin-top: 8px; font-weight: 600;">Leia com o scanner da fábrica</div>
      </div>
    `;
  }).join('');

  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <!DOCTYPE html>
    <html><head>
      <title>Códigos de Prateleira - WMS Unilux</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; padding: 40px; background: #f9fafb; }
        h1 { text-align: center; margin-bottom: 40px; font-size: 24px; color: #111827; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; max-width: 900px; margin: 0 auto; }
        @media print { 
          body { padding: 0; background: #fff; } 
          .grid { gap: 16px; max-width: 100%; } 
          .qr-print-card { break-inside: avoid; border: 2px solid #000 !important; }
        }
      </style>
    </head><body>
      <h1>CÓDIGOS DE ESCANEAMENTO · WMS UNILUX</h1>
      <div class="grid">${qrHtml}</div>
      <script>setTimeout(() => window.print(), 800);</script>
    </body></html>
  `);
  printWin.document.close();
}

/* ====== CUSTOM SKU DROPDOWN LOGIC ====== */
function _filterSkuDropdown(val) {
  const q = _normalizeStr(val);
  const opts = document.querySelectorAll('#soSkuDropdown .sku-option');
  let found = false;
  
  opts.forEach(opt => {
    const txt = _normalizeStr(opt.textContent);
    if(txt.includes(q)) {
      opt.style.display = 'block';
      found = true;
    } else {
      opt.style.display = 'none';
    }
  });

  const noRes = document.getElementById('skuNoResults');
  if(noRes) noRes.style.display = (found || q === '') ? 'none' : 'block';
}

function _normalizeStr(str) {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function _showSkuDropdown(inp) {
  const dd = document.getElementById('soSkuDropdown');
  if (dd) {
    dd.style.display = 'block';
    if (inp) _filterSkuDropdown(inp.value);
  }
}

function _handleSkuKeydown(e, inp) {
  if (e.key === 'Enter') {
    e.preventDefault();
    // Tenta selecionar o primeiro item VISÍVEL
    const firstVisible = document.querySelector('#soSkuDropdown .sku-option[style*="display: block"]');
    if (firstVisible) {
      firstVisible.click();
      // Pula para o próximo campo (Medida)
      setTimeout(() => {
        const med = document.getElementById('soMed');
        if (med) med.focus();
      }, 50);
    }
  }
}

function _selectSku(code, desc) {
  const inp = document.getElementById('soSkuInput');
  if (inp) {
    inp.value = `${code} - ${desc}`;
    inp.blur();
  }
  const dd = document.getElementById('soSkuDropdown');
  if (dd) dd.style.display = 'none';
}

document.addEventListener('click', function(e) {
  const dd = document.getElementById('soSkuDropdown');
  const inp = document.getElementById('soSkuInput');
  if(dd && inp && e.target !== inp && !dd.contains(e.target)) {
    dd.style.display = 'none';
  }
});
