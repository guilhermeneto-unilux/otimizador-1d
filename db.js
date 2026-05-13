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
  configs: { trim_m: 0, scrap_penalty_pct: 0 },
  currentUser: null
};

const DB = {
  async init(initialData) {
    if (supabaseClient) {
      console.log('☁️ Sincronizando tabelas do Supabase...');
      try {
        // Fetch all tables in parallel to build the memory state
        const [skusReq, sobrasReq, ordensReq, lotesReq, histReq, cfgReq, usersReq, cfgPlanosReq] = await Promise.all([
          supabaseClient.from('unilux_skus').select('*'),
          supabaseClient.from('unilux_sobras').select('*'),
          supabaseClient.from('unilux_ordens').select('*'),
          supabaseClient.from('unilux_lotes').select('*'),
          supabaseClient.from('unilux_historico').select('*'),
          supabaseClient.from('unilux_configs').select('data').eq('id', 1).single(),
          supabaseClient.from('unilux_users').select('*'),
          supabaseClient.from('unilux_configs').select('data').eq('id', 2).single()
        ]);

        if (skusReq.error) {
          console.warn('⚠️ Tabelas não encontradas no Supabase!');
          this._fallbackLocal(initialData);
          return;
        }

        appState.skus   = skusReq.data || [];
        appState.skus.forEach(s => { 
          if (!s.dims) s.dims = []; 
          // Se min_sobra estiver nulo no banco, default 1.0
          if (s.min_sobra === undefined || s.min_sobra === null) s.min_sobra = 1.0;
          
          // Compatibilidade Legada: se a descrição ainda estiver em formato JSON (antigo)
          if (s.desc && s.desc.startsWith('{"_desc"')) {
            try {
              const parsed = JSON.parse(s.desc);
              s.desc = parsed._desc;
              // Só sobrescreve se a nova coluna estiver vazia ou se o JSON for mais recente (heurística simples)
              if ((s.min_sobra === 1000 || s.min_sobra === 1.0) && parsed.min !== undefined) s.min_sobra = parsed.min;
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
        
        appState.lotes = (lotesReq.data || []).filter(l => l.ordens && l.ordens.length > 0 && l.status === 'pending');
        appState.historico = histReq.data || [];
        appState.users = usersReq.data || [];
        // Plans are stored in unilux_configs row id=2 as a JSON blob
        const rawPlanos = cfgPlanosReq.data?.data?.planos || [];
        appState.planos = rawPlanos.map(p => {
          if (typeof p.mapa === 'string') { try { p.mapa = JSON.parse(p.mapa); } catch(e) {} }
          if (typeof p.skuPlanIds === 'string') { try { p.skuPlanIds = JSON.parse(p.skuPlanIds); } catch(e) {} }
          return p;
        });
        if (cfgReq.data && cfgReq.data.data) appState.configs = cfgReq.data.data;
        
        // Ensure counters exist in configs
        if (!appState.configs) appState.configs = {};
        if (!appState.configs.nextLoteId)  appState.configs.nextLoteId = 1;
        if (!appState.configs.nextSobraId) appState.configs.nextSobraId = 1;
        if (!appState.configs.nextOrdemId) appState.configs.nextOrdemId = 1;
        if (!appState.configs.nextImportOpId) appState.configs.nextImportOpId = 1;
        if (!appState.configs.nextPlanId)  appState.configs.nextPlanId = 1;

        // Sync local counters with config counters to avoid reset on refresh
        appState.nextLoteId = appState.configs.nextLoteId;
        appState.nextSobraId = appState.configs.nextSobraId;
        appState.nextOrdemId = appState.configs.nextOrdemId;
        appState.nextImportOpId = appState.configs.nextImportOpId;
        appState.nextPlanoId = appState.configs.nextPlanId;

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
    console.log('[DB] Salvando SKU:', s.code);
    const dbObj = { 
      id: s.id, 
      code: s.code, 
      desc: s.desc, 
      dims: s.dims, 
      min_sobra: s.min_sobra,
      short_desc: s.short_desc || '',
      folder: s.folder || ''
    };
    const { error } = await supabaseClient.from('unilux_skus').upsert(dbObj);
    if (error) {
      console.error('[DB] Erro ao salvar SKU no Supabase:', error);
      throw error;
    }
    console.log('[DB] SKU salvo com sucesso!');
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

  async savePlanosAll() {
    if (!supabaseClient) return;
    // Plans are stored as a JSON blob in unilux_configs row id=2 (no separate table needed)
    const { error } = await supabaseClient.from('unilux_configs').upsert({ id: 2, data: { planos: appState.planos } });
    if (error) {
      console.error('Erro ao salvar planos:', error);
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
  async getLote(id) {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient.from('unilux_lotes').select('*').eq('id', id).single();
    if (error) { console.error('Erro ao buscar lote:', error); return null; }
    return data;
  },
  async deleteHistoricoByLote(loteId) {
    if (!supabaseClient) return;
    await supabaseClient.from('unilux_historico').delete().eq('lote_id', loteId);
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
