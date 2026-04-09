/* ===================================================
   STATE & DB LAYER (Supabase Cloud + LocalStorage Fallback)
   =================================================== */

const SUPABASE_URL = 'https://yqnntrsdbqwtlfgmcmqq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxbm50cnNkYnF3dGxmZ21jbXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzc5NTQsImV4cCI6MjA5MTMxMzk1NH0.Mh2t0MWxo490KPHQG9VS1wg8-Yp_rDLsydXfmpwLB14';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const appState = {
  currentRoute: 'dashboard',
  ordens: [], lotes: [], planos: [], barras: [], sobras: [], historico: [], skus: [],
  nextLoteId: 1, nextSobraId: 1, nextPlanoId: 1,
};

const DB = {
  STORAGE_KEY: 'UNILUX_1D_DATA',

  async init(initialData) {
    if (supabaseClient) {
      console.log('☁️ Conectando ao Supabase...');
      try {
        const { data, error } = await supabaseClient.from('unilux_state').select('data').eq('id', 1).single();
        if (error) {
          console.warn('⚠️ Supabase table not found or empty (run the SQL query!). Fallback to mock/local...');
          this._loadLocal(initialData);
        } else if (data && data.data) {
          Object.assign(appState, data.data);
          console.log('✅ Dados carregados da NUVEM Unilux!');
          this._updateStatusUI('Online');
        }
      } catch (err) {
        console.error('Supabase error:', err);
        this._loadLocal(initialData);
      }
    } else {
      this._loadLocal(initialData);
    }
  },

  _loadLocal(initialData) {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        Object.assign(appState, JSON.parse(saved));
        console.log('📦 Backup Local carregado.');
        this._updateStatusUI('Local (Cache)');
      } catch (e) {
        Object.assign(appState, initialData);
      }
    } else {
      Object.assign(appState, initialData);
      this.saveLocalOnly();
    }
  },

  _updateStatusUI(statusTxt) {
    setTimeout(() => {
      const footer = document.querySelector('.sidebar-footer');
      if (footer) {
        const cColor = statusTxt === 'Online' ? '#22c55e' : '#f59e0b';
        footer.innerHTML = `<span class="dot" style="background:${cColor}"></span>${statusTxt} · Supabase<br><span style="margin-left:12px;">MaxRects BSSF</span>`;
      }
    }, 500);
  },

  async save() {
    // 1. Snapshot local state
    const snapshot = JSON.parse(JSON.stringify(appState));
    
    // 2. Save to localStorage instantly (optimistic UI)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshot));

    // 3. Save to Supabase (async in background)
    if (supabaseClient) {
      const { error } = await supabaseClient.from('unilux_state').upsert({ id: 1, data: snapshot });
      if (error) console.error('Erro ao salvar na nuvem:', error);
    }
  },

  saveLocalOnly() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(appState));
  },

  // Helper patterns
  async saveOrdem(o) { appState.ordens.push(o); this.save(); },
  async saveLote(l) { appState.lotes.push(l); this.save(); },
  async saveSobra(s) { appState.sobras.push(s); this.save(); },
  async savePlano(p) { appState.planos.push(p); this.save(); },
  async saveSku(s) { appState.skus.push(s); this.save(); }
};
