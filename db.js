/* ===================================================
   STATE & DB LAYER (Supabase Relacional + Sync)
   =================================================== */

const SUPABASE_URL = 'https://yqnntrsdbqwtlfgmcmqq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxbm50cnNkYnF3dGxmZ21jbXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzc5NTQsImV4cCI6MjA5MTMxMzk1NH0.Mh2t0MWxo490KPHQG9VS1wg8-Yp_rDLsydXfmpwLB14';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Memória local para fluidez instantânea da interface (Write-through cache)
const appState = {
  currentRoute: 'dashboard',
  ordens: [], lotes: [], planos: [], barras: [], sobras: [], historico: [], skus: [],
  users: [], audit: [],
  nextLoteId: 1, nextSobraId: 1, nextPlanoId: 1,
  configs: { trim_mm: 0, scrap_penalty_pct: 0 },
  currentUser: null
};

const DB = {
  async init(initialData) {
    if (supabaseClient) {
      console.log('☁️ Sincronizando tabelas do Supabase...');
      try {
        // Fetch all tables in parallel to build the memory state
        const [skusReq, sobrasReq, ordensReq, lotesReq, histReq, cfgReq, usersReq, planosReq] = await Promise.all([
          supabaseClient.from('unilux_skus').select('*'),
          supabaseClient.from('unilux_sobras').select('*'),
          supabaseClient.from('unilux_ordens').select('*'),
          supabaseClient.from('unilux_lotes').select('*'),
          supabaseClient.from('unilux_historico').select('*'),
          supabaseClient.from('unilux_configs').select('data').eq('id', 1).single(),
          supabaseClient.from('unilux_users').select('*'),
          supabaseClient.from('unilux_planos').select('*')
        ]);

        if (skusReq.error) {
          console.warn('⚠️ Tabelas não encontradas no Supabase!');
          this._fallbackLocal(initialData);
          return;
        }

        appState.skus   = skusReq.data || [];
        appState.skus.forEach(s => { 
          if (!s.dims) s.dims = []; 
          s.min_sobra = 1000; // Default global
          if (s.desc && s.desc.startsWith('{"_desc"')) {
            try {
              const parsed = JSON.parse(s.desc);
              s.desc = parsed._desc;
              s.min_sobra = parsed.min !== undefined ? parsed.min : 1000;
            } catch(e) {}
          }
        });
        appState.sobras = sobrasReq.data || [];
        appState.ordens = ordensReq.data || [];
        
        // Decode metadata safely
        appState.ordens.forEach(o => {
          if (o.cliente && o.cliente.startsWith('{"_nome"')) {
            try {
              const parsed = JSON.parse(o.cliente);
              o.cliente = parsed._nome;
              o._meta = parsed.meta;
            } catch(e) {}
          }
        });
        
        appState.lotes  = (lotesReq.data || []).filter(l => l.ordens && l.ordens.length > 0);
        appState.historico = histReq.data || [];
        appState.users = usersReq.data || [];
        appState.planos = planosReq.data || [];
        if (cfgReq.data && cfgReq.data.data) appState.configs = cfgReq.data.data;

        // Atualiza os geradores de ID baseado no tamanho dos dados
        appState.nextLoteId = appState.lotes.length + 1;
        appState.nextSobraId = appState.sobras.length + 1;

        console.log('✅ Sistema sincronizado com a nuvem estruturada!');
        this._updateStatusUI('Database Ativo');

      } catch (err) {
        console.error('Supabase error:', err);
        this._fallbackLocal(initialData);
      }
    } else {
      this._fallbackLocal(initialData);
    }
  },

  _fallbackLocal(initialData) {
    console.warn('Usando dados em memória (Fallback).');
    Object.assign(appState, initialData);
    this._updateStatusUI('Offline Fallback');
  },

  _updateStatusUI(statusTxt) {
    setTimeout(() => {
      const footer = document.querySelector('.sidebar-footer');
      if (footer) {
        const cColor = statusTxt.includes('Ativo') ? '#22c55e' : '#fca5a5';
        footer.innerHTML = `<span class="dot" style="background:${cColor}"></span>${statusTxt} · Supabase<br><span style="margin-left:12px;">MaxRects BSSF</span>`;
      }
    }, 500);
  },

  /* 
    SAVE METHODS 
    Os métodos abaixo fazem "Fire and Forget": atualizam o cloud assincronamente.
    A memória já foi modificada pela view para mostrar feedback imediato. 
  */

  save() {
    // Mantido apenas para compatibilidade legada em fluxos de deleção genérica
    // Idealmente não deve mais ser usado; use os métodos específicos abaixo.
    console.log('Alerta: DB.save() acionado (Legacy). As tabelas requerem saves atômicos.');
  },

  async saveSku(s) {
    if (!supabaseClient) return;
    const dbObj = { ...s };
    if (dbObj.min_sobra !== undefined) {
      dbObj.desc = JSON.stringify({ _desc: dbObj.desc, min: dbObj.min_sobra });
      delete dbObj.min_sobra;
    }
    const { error } = await supabaseClient.from('unilux_skus').upsert(dbObj);
    if (error) {
      console.error('Erro SKUs:', error);
      throw error;
    }
  },

  async saveOrdem(o) {
    if (!supabaseClient) return;
    const dbObj = { ...o };
    if (dbObj._meta) {
      dbObj.cliente = JSON.stringify({ _nome: dbObj.cliente, meta: dbObj._meta });
      delete dbObj._meta;
    }
    const { error } = await supabaseClient.from('unilux_ordens').upsert(dbObj);
    if (error) {
      console.error('Erro Ordens:', error);
      throw error;
    }
  },

  async saveConfig(c) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('unilux_configs').upsert({ id: 1, data: c });
    if (error) {
      console.error('Erro Configs:', error);
      throw error;
    }
  },

  async saveSobra(s) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('unilux_sobras').upsert(s);
    if (error) {
      console.error('Erro Sobras:', error);
      throw error;
    }
  },

  async saveLote(l) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('unilux_lotes').upsert(l);
    if (error) {
      console.error('Erro Lote:', error);
      throw error;
    }
  },

  async saveHistorico(h) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('unilux_historico').insert(h);
    if (error) console.error('Erro Histórico:', error);
  },

  async saveUser(u) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('unilux_users').upsert(u);
    if (error) {
      console.error('Erro Users:', error);
      throw error;
    }
  },

  async savePlano(p) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('unilux_planos').upsert(p);
    if (error) {
      console.error('Erro Planos:', error);
      throw error;
    }
  },

  // Delete methods
  async deleteSku(id) {
    if (!supabaseClient) return;
    await supabaseClient.from('unilux_skus').delete().eq('id', id);
  },

  async deleteOrdem(id) {
    if (!supabaseClient) return;
    await supabaseClient.from('unilux_ordens').delete().eq('id', id);
  },

  async deleteSobra(id) {
    if (!supabaseClient) return;
    await supabaseClient.from('unilux_sobras').delete().eq('id', id);
  },

  async deleteUser(id) {
    if (!supabaseClient) return;
    await supabaseClient.from('unilux_users').delete().eq('id', id);
  },
  async deleteLote(id) {
    if (!supabaseClient) return;
    await supabaseClient.from('unilux_lotes').delete().eq('id', id);
  },

  async log(action, target_table, details = '') {
    if (!supabaseClient || !appState.currentUser) return;
    try {
      const { error } = await supabaseClient.from('unilux_audit').insert({
        user_id: appState.currentUser.id,
        user_name: appState.currentUser.name,
        action,
        target_table,
        details
      });
      if (error) console.error('Erro Log:', error);
    } catch (e) {
      console.error('Audit Log failed:', e);
    }
  },

  async fetchAudit() {
    if (!supabaseClient) return [];
    try {
      const { data, error } = await supabaseClient.from('unilux_audit').select('*').order('timestamp', { ascending: false }).limit(100);
      if (error) { console.error('Erro Audit:', error); return []; }
      return data || [];
    } catch (e) {
      console.error('Fetch Audit failed:', e);
      return [];
    }
  }
};
