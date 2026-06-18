/* ===================================================
   APP.JS  –  State, Router & Utilities
   =================================================== */

// ─── MOCK DATA (seeded via "Criar Dados de Teste") ──────────────
const APP_MOCK = {
  skus: [
    { id:'S01', code:'PER-40X40', desc:'Perfil Quadrado 40×40',   dims: [{dim: 6000, qty: 40}] },
    { id:'S02', code:'PER-50X30', desc:'Perfil Retangular 50×30', dims: [{dim: 6000, qty: 25}] },
    { id:'S03', code:'PER-20X20', desc:'Perfil Quadrado 20×20',   dims: [{dim: 3000, qty: 60}] },
    { id:'S04', code:'TUBO-60X2', desc:'Tubo Redondo 60×2',       dims: [{dim: 6000, qty: 15}] },
    { id:'S05', code:'CAN-25X25', desc:'Cantoneira 25×25',        dims: [{dim: 6000, qty: 8}] },
  ],
  // Barras movidas para dentro de skus.dims
  ordens: [
    { id:'OP-001', sku:'PER-40X40', dim:1200, qty:8,  entrega:'2026-04-15', cliente:'Metalfab Ltda',     status:'pending', lote:null },
    { id:'OP-002', sku:'PER-50X30', dim:850,  qty:12, entrega:'2026-04-16', cliente:'Estrutura Tech',    status:'pending', lote:null },
    { id:'OP-003', sku:'PER-20X20', dim:500,  qty:20, entrega:'2026-04-14', cliente:'Construção Rápida', status:'pending', lote:null },
  ],
  lotes:    [],
  planos:   [],
  sobras:   [
    { id:'SC-001', sku:'PER-40X40', medida:2400, criacao:'2026-04-07', origem:'Manual' },
    { id:'SC-002', sku:'PER-50X30', medida:1850, criacao:'2026-04-06', origem:'Manual' },
  ],
  historico: [],
  nextLoteId:  1,
  nextSobraId: 3,
  nextPlanoId: 1,
  configs: { trim_mm: 0, scrap_penalty_pct: 0 }
};

// ─── SKU COLOR MAP ──────────────────────────────────────────────
const SKU_COLOR_MAP = {
  'PER-40X40': { bg:'#dbeafe', text:'#1d4ed8' },
  'PER-50X30': { bg:'#e0f2fe', text:'#0369a1' }, // Sky Blue instead of green
  'PER-20X20': { bg:'#fef3c7', text:'#92400e' },
  'TUBO-60X2': { bg:'#ede9fe', text:'#6d28d9' },
  'CAN-25X25': { bg:'#ffedd5', text:'#c2410c' }, // Orange instead of red
};
function skuColor(code) {
  return SKU_COLOR_MAP[code] || { bg:'#f3f4f6', text:'#374151' };
}
function formatDate(iso) {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function getSkuDim(code) {
  const s = appState.skus.find(x => x.code === code);
  return 6000; // Returns the largest standard bar initially in mm
}

// ─── FORMATTING UTILITIES ───────────────────────────────────────
function fmtM(val) {
  if (val === undefined || val === null || isNaN(val)) return '0,000 m';
  // Converte milímetros (DB) para metros (UI) e formata com 3 casas decimais
  return (parseFloat(val) / 1000).toFixed(3).replace('.', ',') + ' m';
}

function _uiEsc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function _uiEscAttr(value) {
  return _uiEsc(value);
}

function _captureInputFocus(input) {
  if (!input || !input.id) return null;
  return {
    id: input.id,
    start: typeof input.selectionStart === 'number' ? input.selectionStart : null,
    end: typeof input.selectionEnd === 'number' ? input.selectionEnd : null
  };
}

function _restoreInputFocus(focus) {
  if (!focus || !focus.id) return;
  const restore = () => {
    const input = document.getElementById(focus.id);
    if (!input) return;
    input.focus({ preventScroll: true });
    if (typeof input.setSelectionRange === 'function' && focus.start !== null && focus.end !== null) {
      const len = String(input.value || '').length;
      input.setSelectionRange(Math.min(focus.start, len), Math.min(focus.end, len));
    }
  };
  restore();
  requestAnimationFrame(restore);
}

function _pieceLabel(pc) {
  if (!pc) return '';
  const op = pc.baseOp || pc.op || '';
  return pc.qty > 1 && pc.pieceNo ? `${op} (${pc.pieceNo}/${pc.qty})` : op;
}

function _pieceExportId(pc) {
  return _opDigits(pc?.baseOp || pc?.op || pc?.pieceId || '');
}

function _opDigits(value) {
  return String(value ?? '').split('#')[0].replace(/-L\d+$/i, '').replace(/^OP[\s-]*/i, '').replace(/\D/g, '');
}

// ─── ROUTER ─────────────────────────────────────────────────────
const ROUTES = {
  dashboard:     renderDashboard,
  ordens:        renderOrdens,
  otimizador:    renderOtimizador,
  planos:        renderPlanos,
  compras:       renderCompras,
  sobras:        renderSobras,
  skus:          renderSkus,
  configuracoes: renderConfiguracoes,
  usuarios:      renderUsuarios,
  auditoria:     renderAuditoria,
  manual:        renderManual
};

function navigate(route) {
  if (['configuracoes', 'usuarios', 'auditoria'].includes(route) && (!appState.currentUser || appState.currentUser.role !== 'admin')) {
    showToast('Acesso negado', 'error');
    return;
  }
  appState.currentRoute = route;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('nav-' + route);
  if (el) el.classList.add('active');
  if (ROUTES[route]) ROUTES[route]();
  updateBadges();
  console.log(`[LOG] Navegação para: ${route}`);
}

function updateBadges() {
  if (!appState.ordens || !appState.sobras) return;
  const p = appState.ordens.filter(o => o.status === 'pending').length;
  const s = appState.sobras.length;
  const bO = document.getElementById('badge-ordens'); if (bO) bO.textContent = p;
  const bS = document.getElementById('badge-sobras'); if (bS) bS.textContent = s;
}

// ─── UI UTILITIES ────────────────────────────────────────────────
function openModal(title, body, footer = '', modalClass = '') {
  const modal = document.getElementById('modal');
  modal.className = modalClass ? `modal ${modalClass}` : 'modal';
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML   = body;
  document.getElementById('modalFooter').innerHTML = footer;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function showToast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'slideOutRight .25s ease forwards';
    setTimeout(() => t.remove(), 280);
  }, 3000);
}

// ─── INIT ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  localStorage.removeItem('unilux_session');
  await initAuth();

  document.querySelectorAll('.nav-item[data-route]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.route); });
  });

  const mClose = document.getElementById('modalClose');
  if (mClose) mClose.addEventListener('click', closeModal);

  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  if (appState.currentUser) {
    await DB.init(APP_MOCK);
    _updateLoginUI();
    navigate('dashboard');
  }
});

async function initAuth() {
  localStorage.removeItem('unilux_session');
  if (!supabaseClient) {
    appState.currentUser = null;
    document.body.classList.remove('is-admin');
    _updateLoginUI();
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  const authUser = data?.session?.user;
  if (error || !authUser) {
    appState.currentUser = null;
    document.body.classList.remove('is-admin');
    _updateLoginUI();
    return;
  }

  const profile = await DB.fetchCurrentUserProfile(authUser);
  if (!profile) {
    await supabaseClient.auth.signOut();
    appState.currentUser = null;
    document.body.classList.remove('is-admin');
    _updateLoginUI();
    showToast('Perfil de acesso não encontrado.', 'error');
    return;
  }

  appState.currentUser = profile;
  document.body.classList.toggle('is-admin', profile.role === 'admin');
  _updateLoginUI();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function _updateLoginUI() {
  const overlay = document.getElementById('loginOverlay');
  if (!appState.currentUser) {
    overlay.innerHTML = `
      <div class="login-card">
        <div class="logo-box" style="margin: 0 auto 16px; width:48px; height:48px; font-size:24px;">U</div>
        <h2 style="margin-bottom:8px;">Bem-vindo</h2>
        <p style="color:var(--text-400); font-size:13px; margin-bottom:24px;">Acesse o Otimizador Unilux</p>
        <form onsubmit="doLogin(); return false;" autocomplete="on">
          <div class="form-group" style="text-align:left;">
            <label class="form-label">Email</label>
            <input type="email" id="lEmail" class="form-control" placeholder="seu.email@empresa.com" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" required maxlength="120">
          </div>
          <div class="form-group" style="text-align:left;">
            <label class="form-label">Senha</label>
            <input type="password" id="lPass" class="form-control" placeholder="••••••" autocomplete="current-password" autocapitalize="none" spellcheck="false" required maxlength="128">
          </div>
          <button type="submit" class="btn btn-dark" style="width:100%; justify-content:center; padding:12px;">Entrar no Sistema</button>
        </form>
      </div>
    `;
    overlay.classList.add('active');
  } else {
    overlay.classList.remove('active');
    const footer = document.querySelector('.sidebar-footer');
    if (footer) {
      footer.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <div>
            <div class="dot"></div> ${_uiEsc(appState.currentUser.name)}
            <div style="font-size:9px; margin-top:2px; opacity:0.6;">${_uiEsc(appState.currentUser.role.toUpperCase())}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="doLogout()" title="Sair" style="padding:4px;">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      `;
    }
  }
}

async function doLogin() {
  const email = normalizeEmail(document.getElementById('lEmail').value);
  const pass = document.getElementById('lPass').value;

  if (!supabaseClient) {
    showToast('Supabase indisponível.', 'error');
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
  if (error || !data?.user) {
    showToast('Email ou senha inválidos.', 'error');
    return;
  }

  const profile = await DB.fetchCurrentUserProfile(data.user);
  if (profile) {
    appState.currentUser = profile;
    document.body.classList.toggle('is-admin', profile.role === 'admin');
    _updateLoginUI();
    await DB.init(APP_MOCK);
    _updateLoginUI();
    navigate('dashboard');
    showToast(`Bem-vindo, ${profile.name}!`, 'success');
  } else {
    await supabaseClient.auth.signOut();
    appState.currentUser = null;
    document.body.classList.remove('is-admin');
    _updateLoginUI();
    showToast('Perfil de acesso não encontrado.', 'error');
  }
}

async function doLogout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  localStorage.removeItem('unilux_session');
  appState.currentUser = null;
  document.body.classList.remove('is-admin');
  DB.clearSensitiveState();
  document.getElementById('contentArea').innerHTML = '';
  _updateLoginUI();
}
