/* ===================================================
   APP.JS  –  Core: Mock Data, State, Router, Utilities
   =================================================== */

// ─── MOCK DATA ───────────────────────────────────────────────────────────────

const MOCK = {

  skus: [
    { id: 'S01', code: 'PER-40X40',  desc: 'Perfil Quadrado 40×40mm',  dim: 6000 },
    { id: 'S02', code: 'PER-50X30',  desc: 'Perfil Retangular 50×30mm', dim: 6000 },
    { id: 'S03', code: 'PER-20X20',  desc: 'Perfil Quadrado 20×20mm',  dim: 3000 },
    { id: 'S04', code: 'TUBO-60X2',  desc: 'Tubo Redondo 60×2mm',      dim: 6000 },
    { id: 'S05', code: 'CAN-25X25',  desc: 'Cantoneira 25×25mm',       dim: 6000 },
  ],

  barras: [
    { id: 'B001', sku: 'PER-40X40', lote: 'LF-2024-03', dim: 6000, qty: 40, status: 'active' },
    { id: 'B002', sku: 'PER-50X30', lote: 'LF-2024-03', dim: 6000, qty: 25, status: 'active' },
    { id: 'B003', sku: 'PER-20X20', lote: 'LF-2024-02', dim: 3000, qty: 60, status: 'active' },
    { id: 'B004', sku: 'TUBO-60X2', lote: 'LF-2024-04', dim: 6000, qty: 15, status: 'low'    },
    { id: 'B005', sku: 'CAN-25X25', lote: 'LF-2024-01', dim: 6000, qty: 8,  status: 'low'    },
    { id: 'B006', sku: 'PER-40X40', lote: 'LF-2024-04', dim: 6000, qty: 20, status: 'active' },
  ],

  ordens: [
    { id: 'OP-001', sku: 'PER-40X40', dim: 1200, qty: 8,  entrega: '2026-04-15', cliente: 'Metalfab Ltda',     status: 'pending', lote: null },
    { id: 'OP-002', sku: 'PER-50X30', dim: 850,  qty: 12, entrega: '2026-04-16', cliente: 'Estrutura Tech',    status: 'pending', lote: null },
    { id: 'OP-003', sku: 'PER-20X20', dim: 500,  qty: 20, entrega: '2026-04-14', cliente: 'Construção Rápida', status: 'pending', lote: null },
    { id: 'OP-004', sku: 'TUBO-60X2', dim: 2400, qty: 5,  entrega: '2026-04-18', cliente: 'Hidro Sul',         status: 'pending', lote: null },
    { id: 'OP-005', sku: 'CAN-25X25', dim: 750,  qty: 30, entrega: '2026-04-17', cliente: 'Serralheria ABC',   status: 'pending', lote: null },
    { id: 'OP-006', sku: 'PER-40X40', dim: 900,  qty: 15, entrega: '2026-04-12', cliente: 'Metalfab Ltda',     status: 'batch',   lote: 'LT-001' },
    { id: 'OP-007', sku: 'PER-50X30', dim: 1500, qty: 6,  entrega: '2026-04-13', cliente: 'Aço Vivo',          status: 'batch',   lote: 'LT-001' },
    { id: 'OP-008', sku: 'PER-20X20', dim: 720,  qty: 10, entrega: '2026-04-11', cliente: 'Estrutura Tech',    status: 'batch',   lote: 'LT-002' },
  ],

  lotes: [
    { id: 'LT-001', ordens: ['OP-006','OP-007'], status: 'pending',    criacao: '2026-04-08', skus: ['PER-40X40','PER-50X30'] },
    { id: 'LT-002', ordens: ['OP-008'],           status: 'approved',   criacao: '2026-04-07', skus: ['PER-20X20'] },
    { id: 'LT-003', ordens: [],                   status: 'inprogress', criacao: '2026-04-06', skus: ['TUBO-60X2'] },
    { id: 'LT-004', ordens: [],                   status: 'done',       criacao: '2026-04-05', skus: ['CAN-25X25'] },
  ],

  // Planos de corte para o Kanban
  planos: [
    { id: 'PC-001', lote: 'LT-002', sku: 'PER-20X20', barras: 3, aproveitamento: 94.2, criacao: '2026-04-07', status: 'pending',    notes: '10 peças × 720mm' },
    { id: 'PC-002', lote: 'LT-003', sku: 'TUBO-60X2', barras: 4, aproveitamento: 87.5, criacao: '2026-04-06', status: 'inprogress', notes: '5 peças × 2400mm'  },
    { id: 'PC-003', lote: 'LT-004', sku: 'CAN-25X25', barras: 6, aproveitamento: 91.0, criacao: '2026-04-05', status: 'done',       notes: '30 peças × 750mm'  },
    { id: 'PC-004', lote: 'LT-X01', sku: 'PER-40X40', barras: 2, aproveitamento: 96.7, criacao: '2026-04-03', status: 'done',       notes: '8 peças × 900mm'   },
    { id: 'PC-005', lote: 'LT-X02', sku: 'PER-50X30', barras: 5, aproveitamento: 89.3, criacao: '2026-04-01', status: 'done',       notes: '12 peças × 850mm'  },
  ],

  // Sobras – grid posicional: col A-H (0-7), row 1-11 (0-10)
  sobras: [
    { id: 'SC-001', sku: 'PER-40X40', medida: 2400, criacao: '2026-04-07', col: 0, row: 0 }, // A1
    { id: 'SC-002', sku: 'PER-50X30', medida: 1850, criacao: '2026-04-06', col: 1, row: 0 }, // B1
    { id: 'SC-003', sku: 'PER-20X20', medida: 800,  criacao: '2026-04-05', col: 2, row: 0 }, // C1
    { id: 'SC-004', sku: 'TUBO-60X2', medida: 3100, criacao: '2026-04-04', col: 3, row: 0 }, // D1
    { id: 'SC-005', sku: 'CAN-25X25', medida: 650,  criacao: '2026-04-03', col: 0, row: 1 }, // A2
    { id: 'SC-006', sku: 'PER-40X40', medida: 1100, criacao: '2026-04-02', col: 1, row: 1 }, // B2
    { id: 'SC-007', sku: 'PER-50X30', medida: 2200, criacao: '2026-04-01', col: 2, row: 1 }, // C2
    { id: 'SC-008', sku: 'PER-20X20', medida: 450,  criacao: '2026-03-31', col: 3, row: 1 }, // D2
    { id: 'SC-009', sku: 'TUBO-60X2', medida: 900,  criacao: '2026-03-30', col: 4, row: 0 }, // E1
    { id: 'SC-010', sku: 'PER-40X40', medida: 1750, criacao: '2026-03-29', col: 5, row: 0 }, // F1
    { id: 'SC-011', sku: 'CAN-25X25', medida: 1200, criacao: '2026-03-28', col: 4, row: 1 }, // E2
    { id: 'SC-012', sku: 'PER-50X30', medida: 3300, criacao: '2026-03-27', col: 6, row: 0 }, // G1
  ],

  historico: [
    { id: 'HC-001', sku: 'PER-40X40', medida: 1900, consumido: '2026-04-07', lote: 'LT-004', motivo: 'Usado em otimização' },
    { id: 'HC-002', sku: 'PER-50X30', medida: 700,  consumido: '2026-04-06', lote: 'LT-003', motivo: 'Usado em otimização' },
    { id: 'HC-003', sku: 'PER-20X20', medida: 250,  consumido: '2026-04-05', lote: 'LT-002', motivo: 'Descartado – muito pequeno' },
  ],

  // KPI Mensal para gráfico
  kpiMensal: [
    { mes: 'Out', aproveitamento: 88.2 },
    { mes: 'Nov', aproveitamento: 91.4 },
    { mes: 'Dez', aproveitamento: 86.7 },
    { mes: 'Jan', aproveitamento: 93.1 },
    { mes: 'Fev', aproveitamento: 89.8 },
    { mes: 'Mar', aproveitamento: 94.6 },
    { mes: 'Abr', aproveitamento: 92.3 },
  ],

  ultimosLotes: [
    { id: 'LT-004', sku: 'CAN-25X25', barras: 6, sobras: 2, aproveitamento: '91.0%', data: '2026-04-05' },
    { id: 'LT-003', sku: 'TUBO-60X2', barras: 4, sobras: 1, aproveitamento: '87.5%', data: '2026-04-06' },
    { id: 'LT-002', sku: 'PER-20X20', barras: 3, sobras: 0, aproveitamento: '94.2%', data: '2026-04-07' },
    { id: 'LT-X02', sku: 'PER-50X30', barras: 5, sobras: 3, aproveitamento: '89.3%', data: '2026-04-01' },
    { id: 'LT-X01', sku: 'PER-40X40', barras: 2, sobras: 1, aproveitamento: '96.7%', data: '2026-04-03' },
  ],
};

// ─── APP STATE ────────────────────────────────────────────────────────────────

const appState = {
  currentRoute: 'dashboard',
  ordens: JSON.parse(JSON.stringify(MOCK.ordens)),
  lotes:  JSON.parse(JSON.stringify(MOCK.lotes)),
  planos: JSON.parse(JSON.stringify(MOCK.planos)),
  barras: JSON.parse(JSON.stringify(MOCK.barras)),
  sobras: JSON.parse(JSON.stringify(MOCK.sobras)),
  historico: JSON.parse(JSON.stringify(MOCK.historico)),
  skus: JSON.parse(JSON.stringify(MOCK.skus)),
  nextLoteId: 5,
  nextSobraId: 13,
  nextPlanoId: 6,
};

// ─── SKU COLOR MAP ────────────────────────────────────────────────────────────

const SKU_COLORS = {
  'PER-40X40': { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'PER-50X30': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  'PER-20X20': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'TUBO-60X2': { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' },
  'CAN-25X25': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};
function skuColor(sku) {
  return SKU_COLORS[sku] || { bg: '#f0f2f7', text: '#5a6580', border: '#d0d7e8' };
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────

const ROUTES = {
  dashboard:     () => renderDashboard(),
  ordens:        () => renderOrdens(),
  otimizador:    () => renderOtimizador(),
  planos:        () => renderPlanos(),
  barras:        () => renderBarras(),
  sobras:        () => renderSobras(),
  skus:          () => renderSkus(),
  configuracoes: () => renderConfiguracoes(),
};

const BREADCRUMBS = {
  dashboard:     ['Produção',  'Dashboard'],
  ordens:        ['Produção',  'Ordens de Produção'],
  otimizador:    ['Produção',  'Otimizador'],
  planos:        ['Produção',  'Planos de Corte'],
  barras:        ['Estoque',   'Barras'],
  sobras:        ['Estoque',   'Sobras'],
  skus:          ['Estoque',   'Catálogo SKUs'],
  configuracoes: ['Sistema',   'Configurações'],
};

function navigate(route) {
  appState.currentRoute = route;

  // Highlight active nav item
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${route}`);
  if (activeNav) activeNav.classList.add('active');

  // Update breadcrumb
  const bc = BREADCRUMBS[route] || ['', route];
  document.getElementById('breadcrumb').innerHTML = `
    <span>${bc[0]}</span>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    <span class="breadcrumb-current">${bc[1]}</span>
  `;

  // Render
  const contentArea = document.getElementById('contentArea');
  if (ROUTES[route]) {
    ROUTES[route]();
  } else {
    contentArea.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🚧</div><div class="empty-state-title">Em breve</div></div>`;
  }

  // Update badges
  updateBadges();
}

function updateBadges() {
  const pending = appState.ordens.filter(o => o.status === 'pending').length;
  const badgeOrdens = document.getElementById('badge-ordens');
  if (badgeOrdens) badgeOrdens.textContent = pending;

  const sobrasCount = appState.sobras.length;
  const badgeSobras = document.getElementById('badge-sobras');
  if (badgeSobras) badgeSobras.textContent = sobrasCount;
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

function openModal(title, bodyHtml, footerHtml = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// ─── TOAST ───────────────────────────────────────────────────────────────────

function showToast(msg, type = 'success') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || '•'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtMm(mm) {
  if (mm >= 1000) return `${(mm/1000).toFixed(2).replace('.',',')} m`;
  return `${mm} mm`;
}

function getSkuDim(skuCode) {
  const s = appState.skus.find(x => x.code === skuCode);
  return s ? s.dim : 6000;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Nav click
  document.querySelectorAll('.nav-item[data-route]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.route);
    });
  });

  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Topbar date
  const now = new Date();
  document.getElementById('topbarDate').textContent = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  // Initial route
  navigate('dashboard');
});
