/* ===================================================
   APP.JS  –  State, Router & Utilities
   =================================================== */

// ─── MOCK DATA (seeded via "Criar Dados de Teste") ──────────────
const APP_MOCK = {
  skus: [
    { id:'S01', code:'PER-40X40', desc:'Perfil Quadrado 40×40mm',   dims: [{dim: 6000, qty: 40}] },
    { id:'S02', code:'PER-50X30', desc:'Perfil Retangular 50×30mm', dims: [{dim: 6000, qty: 25}] },
    { id:'S03', code:'PER-20X20', desc:'Perfil Quadrado 20×20mm',   dims: [{dim: 3000, qty: 60}] },
    { id:'S04', code:'TUBO-60X2', desc:'Tubo Redondo 60×2mm',       dims: [{dim: 6000, qty: 15}] },
    { id:'S05', code:'CAN-25X25', desc:'Cantoneira 25×25mm',        dims: [{dim: 6000, qty: 8}] },
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
  if (!s || !s.dims || s.dims.length === 0) return 6000;
  return Math.max(...s.dims.map(d => d.dim)); // Returns the largest standard bar initially
}

// ─── ROUTER ─────────────────────────────────────────────────────
const ROUTES = {
  dashboard:     renderDashboard,
  ordens:        renderOrdens,
  otimizador:    renderOtimizador,
  planos:        renderPlanos,
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
function openModal(title, body, footer = '') {
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
  await DB.init(APP_MOCK);
  
  // One-time session invalidation: force everyone to log in fresh
  const APP_VERSION = '2.14';
  if (localStorage.getItem('unilux_app_version') !== APP_VERSION) {
    localStorage.removeItem('unilux_session');
    localStorage.setItem('unilux_app_version', APP_VERSION);
  }
  
  initAuth();

  document.querySelectorAll('.nav-item[data-route]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.route); });
  });

  const mClose = document.getElementById('modalClose');
  if (mClose) mClose.addEventListener('click', closeModal);

  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  navigate('dashboard');
});

function initAuth() {
  const saved = localStorage.getItem('unilux_session');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Validate session against loaded users from DB
      const validUser = appState.users.find(u => u.id === parsed.id && u.email === parsed.email);
      if (validUser) {
        appState.currentUser = validUser;
        if (validUser.role === 'admin') document.body.classList.add('is-admin');
      } else {
        // Stale session — clear it
        localStorage.removeItem('unilux_session');
        appState.currentUser = null;
      }
    } catch(e) {
      localStorage.removeItem('unilux_session');
      appState.currentUser = null;
    }
  }
  _updateLoginUI();
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
            <input type="email" id="lEmail" class="form-control" placeholder="seu.email@empresa.com" autocomplete="username" required maxlength="120">
          </div>
          <div class="form-group" style="text-align:left;">
            <label class="form-label">Senha</label>
            <input type="password" id="lPass" class="form-control" placeholder="••••••" autocomplete="current-password" required maxlength="128">
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
            <div class="dot"></div> ${appState.currentUser.name}
            <div style="font-size:9px; margin-top:2px; opacity:0.6;">${appState.currentUser.role.toUpperCase()}</div>
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
  const email = document.getElementById('lEmail').value.trim();
  const pass = document.getElementById('lPass').value;
  
  const user = appState.users.find(u => u.email === email && u.password === pass);
  if (user) {
    appState.currentUser = user;
    localStorage.setItem('unilux_session', JSON.stringify(user));
    if (user.role === 'admin') document.body.classList.add('is-admin');
    _updateLoginUI();
    showToast(`Bem-vindo, ${user.name}!`, 'success');
  } else {
    showToast('Credenciais inválidas.', 'error');
  }
}

function doLogout() {
  localStorage.removeItem('unilux_session');
  appState.currentUser = null;
  document.body.classList.remove('is-admin');
  _updateLoginUI();
  navigate('dashboard');
}
