/* ===================================================
   STATE & DB LAYER (Centralizada para evitar erros de carga)
   =================================================== */

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
  ],
  ordens: [
    { id: 'OP-001', sku: 'PER-40X40', dim: 1200, qty: 8,  entrega: '2026-04-15', cliente: 'Metalfab Ltda',     status: 'pending', lote: null },
    { id: 'OP-002', sku: 'PER-50X30', dim: 850,  qty: 12, entrega: '2026-04-16', cliente: 'Estrutura Tech',    status: 'pending', lote: null },
  ],
  lotes: [], planos: [], sobras: [], historico: []
};

const appState = {
  currentRoute: 'dashboard',
  ordens: [], lotes: [], planos: [], barras: [], sobras: [], historico: [], skus: [],
  nextLoteId: 1, nextSobraId: 1, nextPlanoId: 1,
};

const DB = {
  STORAGE_KEY: 'UNILUX_1D_DATA',

  async init(initialData) {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(appState, parsed);
        console.log('📦 Dados UNILUX carregados');
      } catch (e) {
        Object.assign(appState, initialData);
      }
    } else {
      Object.assign(appState, initialData);
      this.save();
    }
  },

  save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(appState));
  },

  // Helper patterns
  async saveOrdem(o) { appState.ordens.push(o); this.save(); },
  async saveLote(l) { appState.lotes.push(l); this.save(); },
  async saveSobra(s) { appState.sobras.push(s); this.save(); },
  async savePlano(p) { appState.planos.push(p); this.save(); },
  async saveSku(s) { appState.skus.push(s); this.save(); }
};
