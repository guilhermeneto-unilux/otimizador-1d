/* ===== CONTROLE DE ACESSO / PERFIS ===== */

const ACCESS_ROLES = {
  admin: {
    label: 'Administrador',
    description: 'Acesso total ao sistema.',
    permissions: ['*']
  },
  pcp: {
    label: 'PCP',
    description: 'Produção, otimização, planos e sobras. Compras apenas consulta.',
    permissions: [
      'dashboard:view',
      'orders:view',
      'orders:write',
      'optimizer:view',
      'optimizer:run',
      'plans:view',
      'plans:write',
      'scraps:view',
      'scraps:write',
      'compras:view',
      'skus:view',
      'skus:manage',
      'manual:view'
    ]
  },
  compras: {
    label: 'Compras',
    description: 'Movimenta a aba de compras, entradas, custos e parâmetros de compra.',
    permissions: [
      'dashboard:view',
      'compras:view',
      'compras:entry',
      'compras:config',
      'skus:view',
      'skus:manage',
      'manual:view'
    ]
  },
  compras_pcp: {
    label: 'Compras + PCP',
    description: 'Acesso completo às áreas de Compras e PCP: ordens, otimização, planos, sobras, entradas e parâmetros.',
    permissions: [
      'dashboard:view',
      'orders:view',
      'orders:write',
      'optimizer:view',
      'optimizer:run',
      'plans:view',
      'plans:write',
      'scraps:view',
      'scraps:write',
      'compras:view',
      'compras:entry',
      'compras:config',
      'skus:view',
      'skus:manage',
      'manual:view'
    ]
  },
  consulta: {
    label: 'Consulta',
    description: 'Acesso de leitura às principais telas operacionais.',
    permissions: [
      'dashboard:view',
      'orders:view',
      'plans:view',
      'scraps:view',
      'compras:view',
      'skus:view',
      'manual:view'
    ]
  }
};

const ACCESS_ROLE_ALIASES = {
  operador: 'pcp'
};

const ACCESS_ROUTE_PERMISSIONS = {
  dashboard: 'dashboard:view',
  ordens: 'orders:view',
  otimizador: 'optimizer:view',
  planos: 'plans:view',
  compras: 'compras:view',
  sobras: 'scraps:view',
  skus: 'skus:view',
  configuracoes: 'config:manage',
  usuarios: 'users:manage',
  auditoria: 'audit:view',
  manual: 'manual:view'
};

const ACCESS_DENIED_MESSAGE = 'Seu perfil não tem permissão para esta ação.';

function normalizeUserRole(role) {
  const raw = String(role || '').trim().toLowerCase();
  const normalized = ACCESS_ROLE_ALIASES[raw] || raw;
  return ACCESS_ROLES[normalized] ? normalized : 'consulta';
}

function currentUserRole() {
  return normalizeUserRole(appState.currentUser?.role);
}

function roleLabel(role) {
  return ACCESS_ROLES[normalizeUserRole(role)]?.label || 'Consulta';
}

function roleDescription(role) {
  return ACCESS_ROLES[normalizeUserRole(role)]?.description || '';
}

function roleOptions() {
  return Object.entries(ACCESS_ROLES).map(([value, cfg]) => ({
    value,
    label: cfg.label,
    description: cfg.description
  }));
}

function isAdmin() {
  return currentUserRole() === 'admin';
}

function userCan(permission, user = appState.currentUser) {
  if (!permission) return true;
  if (!user) return false;
  const role = normalizeUserRole(user?.role);
  const permissions = ACCESS_ROLES[role]?.permissions || [];
  return permissions.includes('*') || permissions.includes(permission);
}

function userCanRoute(route, user = appState.currentUser) {
  return userCan(ACCESS_ROUTE_PERMISSIONS[route], user);
}

function requirePermission(permission, message = ACCESS_DENIED_MESSAGE) {
  if (userCan(permission)) return true;
  if (typeof showToast === 'function') showToast(message, 'error');
  return false;
}

function requireRouteAccess(route) {
  return requirePermission(ACCESS_ROUTE_PERMISSIONS[route], 'Acesso negado para este perfil.');
}

function renderReadOnlyHint(text = 'Seu perfil tem acesso de consulta nesta tela.') {
  return `
    <div class="access-hint">
      <span>Somente consulta</span>
      ${text}
    </div>
  `;
}

function applyAccessUI() {
  const role = currentUserRole();
  document.body.classList.toggle('is-admin', role === 'admin');
  document.body.dataset.role = role;

  document.querySelectorAll('.nav-item[data-route]').forEach(el => {
    const route = el.dataset.route;
    el.hidden = !userCanRoute(route);
  });
}
