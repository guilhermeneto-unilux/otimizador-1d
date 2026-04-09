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
};

// ─── SKU COLOR MAP ──────────────────────────────────────────────
const SKU_COLOR_MAP = {
  'PER-40X40': { bg:'#dbeafe', text:'#1d4ed8' },
  'PER-50X30': { bg:'#dcfce7', text:'#166534' },
  'PER-20X20': { bg:'#fef3c7', text:'#92400e' },
  'TUBO-60X2': { bg:'#ede9fe', text:'#6d28d9' },
  'CAN-25X25': { bg:'#fee2e2', text:'#991b1b' },
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
};

function navigate(route) {
  appState.currentRoute = route;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('nav-' + route);
  if (el) el.classList.add('active');
  if (ROUTES[route]) ROUTES[route]();
  updateBadges();
}

function updateBadges() {
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

  document.querySelectorAll('.nav-item[data-route]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.route); });
  });

  const mClose = document.getElementById('modalClose');
  if (mClose) mClose.addEventListener('click', closeModal);

  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  navigate('dashboard');
});
