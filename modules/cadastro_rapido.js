/* ===== CADASTRO RÁPIDO DE SOBRAS (Modo Operador / QR) ===== */

function renderCadastroRapido(quadranteId) {
  const q = WMS_QUADS.find(x => x.id === quadranteId);
  if (!q) { showToast('Quadrante inválido!', 'error'); return; }

  // Esconder sidebar e dar fullscreen ao conteúdo
  document.querySelector('.sidebar').style.display = 'none';
  document.querySelector('.main-wrapper').style.marginLeft = '0';

  const nextSlot = _findNextSlotInQuad(quadranteId);
  const skuOptions = appState.skus.map(sk => {
    const sc = skuColor(sk.code);
    return `<option value="${sk.code}" data-desc="${sk.desc}">${sk.code} — ${sk.desc}</option>`;
  }).join('');

  document.getElementById('contentArea').innerHTML = `
    <div class="qr-rapido">
      <div class="qr-rapido-header" style="background:${q.bg}; color:${q.text};">
        <div class="qr-rapido-quad-name">${q.name.toUpperCase()}</div>
        <div class="qr-rapido-subtitle">Cadastro Rápido de Sobras</div>
        <button class="qr-rapido-exit" onclick="_exitModoRapido()" title="Sair do Modo Rápido">✕</button>
      </div>

      <div class="qr-rapido-body">
        <!-- ENDEREÇO SUGERIDO -->
        <div class="qr-rapido-slot-display">
          <div class="qr-rapido-slot-label">GUARDAR NA POSIÇÃO</div>
          <div class="qr-rapido-slot-value" id="qrSlotValue">${nextSlot || 'CHEIO'}</div>
          <div class="qr-rapido-slot-hint">Posição sugerida automaticamente (próximo espaço vazio)</div>
        </div>

        <!-- PERFIL -->
        <div class="qr-rapido-field">
          <label class="qr-rapido-label">Tipo de Perfil</label>
          <select class="qr-rapido-select" id="qrSku">
            <option value="">— Selecione o perfil —</option>
            ${skuOptions}
          </select>
        </div>

        <!-- MEDIDA -->
        <div class="qr-rapido-field">
          <label class="qr-rapido-label">Medida da Sobra (mm)</label>
          <input type="number" class="qr-rapido-input" id="qrMedida" 
                 placeholder="Ex: 2400" inputmode="numeric" pattern="[0-9]*">
        </div>

        <!-- BOTÃO SALVAR -->
        <button class="qr-rapido-save" id="qrBtnSalvar" onclick="_salvarRapido('${quadranteId}')">
          ✓ SALVAR E CONTINUAR
        </button>
      </div>

      <!-- FEEDBACK (oculto inicialmente) -->
      <div class="qr-rapido-feedback" id="qrFeedback" style="display:none;">
        <div class="qr-rapido-feedback-icon">✓</div>
        <div class="qr-rapido-feedback-text" id="qrFeedbackText"></div>
      </div>
    </div>
  `;
}

function _findNextSlotInQuad(quadId) {
  const q = WMS_QUADS.find(x => x.id === quadId);
  if (!q) return null;
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const occupied = appState.sobras.map(s => s.endereco).filter(Boolean);
  
  for (let r = 0; r < q.rows; r++) {
    for (let c = 1; c <= q.cols; c++) {
      const adr = `${quadId}-${L[r]}${String(c).padStart(2, '0')}`;
      if (!occupied.includes(adr)) return adr;
    }
  }
  return null;
}

async function _salvarRapido(quadranteId) {
  const sku = document.getElementById('qrSku').value;
  const med = parseInt(document.getElementById('qrMedida').value);
  const endereco = document.getElementById('qrSlotValue').textContent.trim();

  if (!sku) { showToast('Selecione o tipo de perfil!', 'error'); return; }
  if (!med || med <= 0) { showToast('Informe a medida em mm!', 'error'); return; }
  if (endereco === 'CHEIO') { showToast('Quadrante lotado! Tente outro.', 'error'); return; }

  const novaSobra = {
    id: `SC-${String(appState.nextSobraId++).padStart(3, '0')}`,
    sku,
    medida: med,
    criacao: new Date().toISOString().split('T')[0],
    origem: 'Rapido',
    endereco
  };

  appState.sobras.push(novaSobra);
  DB.saveSobra(novaSobra);
  DB.log('Cadastro Rápido', 'unilux_sobras', `${sku} ${med}mm em ${endereco}`);

  // Feedback visual
  const fb = document.getElementById('qrFeedback');
  document.getElementById('qrFeedbackText').textContent = `${sku} · ${med}mm → ${endereco}`;
  fb.style.display = 'flex';

  setTimeout(() => {
    fb.style.display = 'none';
    // Recarregar formulário com o próximo slot
    renderCadastroRapido(quadranteId);
  }, 1800);
}

function _exitModoRapido() {
  document.querySelector('.sidebar').style.display = '';
  document.querySelector('.main-wrapper').style.marginLeft = '';
  navigate('sobras');
}

// ── QR Code Generator (usa a API pública qrserver.com) ──
function _imprimirQrCodes() {
  const baseUrl = window.location.origin + window.location.pathname;
  
  const qrHtml = WMS_QUADS.map(q => {
    const url = `${baseUrl}?modo=rapido&q=${q.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    return `
      <div class="qr-print-card" style="border-top: 6px solid ${q.bg};">
        <img src="${qrUrl}" alt="QR ${q.name}" width="180" height="180">
        <div class="qr-print-name" style="color:${q.bg === '#ffffff' ? '#111' : q.bg};">${q.name.toUpperCase()}</div>
        <div class="qr-print-hint">Aponte a câmera do celular</div>
      </div>
    `;
  }).join('');

  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <!DOCTYPE html>
    <html><head>
      <title>QR Codes — Quadrantes WMS Unilux</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; padding: 24px; background: #fff; }
        h1 { text-align: center; margin-bottom: 24px; font-size: 18px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 700px; margin: 0 auto; }
        .qr-print-card { text-align: center; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
        .qr-print-card img { margin-bottom: 12px; }
        .qr-print-name { font-size: 16px; font-weight: 900; margin-bottom: 4px; }
        .qr-print-hint { font-size: 10px; color: #9ca3af; }
        @media print { body { padding: 0; } .grid { gap: 12px; } }
      </style>
    </head><body>
      <h1>UNILUX · QR Codes dos Quadrantes WMS</h1>
      <div class="grid">${qrHtml}</div>
      <script>setTimeout(() => window.print(), 800);</script>
    </body></html>
  `);
  printWin.document.close();
}
