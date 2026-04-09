function renderConfiguracoes() {
  const c = appState.configs || { trim_mm: 0, scrap_penalty_pct: 0 };
  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">Ajustes do Sistema</div>
        <h1 class="pg-title">Configurações Avançadas</h1>
      </div>
    </div>
    
    <div class="table-card" style="padding:24px; max-width:600px;">
      <h3 style="margin-bottom:16px;">Motor Otimizador (FFD)</h3>
      
      <div class="form-group">
        <label class="form-label">Esquadrejamento / Refile Inicial (mm)</label>
        <input type="number" id="cfgTrim" class="form-control" value="${c.trim_mm}" placeholder="Ex: 40">
        <div class="form-hint">Tamanho descartado das pontas de qualquer barra virgem ou sobra antes do corte.</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Taxa Média de Desperdício de Sobras (%)</label>
        <input type="number" id="cfgScrap" class="form-control" value="${c.scrap_penalty_pct}" placeholder="Ex: 5">
        <div class="form-hint">Margem de perda esperada no futuro ao gerar uma sobra reutilizável. O algoritmo ponderará isso na eficiência.</div>
      </div>
      
      <button class="btn btn-green" onclick="_salvarConfig()">Salvar Configurações</button>
    </div>
  `;
}

function _salvarConfig() {
  const trim = parseInt(document.getElementById('cfgTrim').value) || 0;
  const scrap = parseInt(document.getElementById('cfgScrap').value) || 0;
  appState.configs = { trim_mm: trim, scrap_penalty_pct: scrap };
  DB.saveConfig(appState.configs);
  showToast('Configurações salvas!', 'success');
}
