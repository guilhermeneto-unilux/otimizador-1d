/* ===== CONFIGURAÇÕES – UNILUX 1D ===== */

function renderConfiguracoes() {
  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header" style="margin-bottom:28px;">
      <div>
        <div class="pg-eyebrow">Sistema</div>
        <h1 class="pg-title">Configurações</h1>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; max-width:900px;">

      <!-- Algoritmo -->
      <div class="card" style="padding:22px;">
        <div style="font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-400); margin-bottom:16px;">Algoritmo</div>
        <div class="form-group">
          <label class="form-label">Estratégia de Corte</label>
          <select class="form-control">
            <option>First Fit Decreasing (FFD)</option>
            <option>Best Fit Decreasing (BFD)</option>
          </select>
          <div class="form-hint">FFD garante o melhor aproveitamento geral.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Sobra Mínima Aproveitável (mm)</label>
          <input class="form-control" type="number" value="50">
          <div class="form-hint">Abaixo desse valor, a sobra é descartada.</div>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
            <input type="checkbox" checked> <span style="font-size:13px; font-weight:500; color:var(--text-700);">Priorizar Retalhos</span>
          </label>
          <div class="form-hint" style="margin-top:4px;">Usa sobras antes de barras virgens.</div>
        </div>
      </div>

      <!-- Sistema -->
      <div class="card" style="padding:22px;">
        <div style="font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-400); margin-bottom:16px;">Sistema</div>
        <div class="form-group">
          <label class="form-label">Ambiente</label>
          <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
            <span class="status-badge badge-pending">Local</span>
            <span style="font-size:12px; color:var(--text-400);">LocalStorage · file://</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Armazenamento</label>
          <div style="font-size:13px; color:var(--text-700); margin-top:4px;">
            ${Math.round(JSON.stringify(appState).length / 1024 * 10) / 10} KB em uso
          </div>
        </div>
        <div class="divider"></div>
        <div>
          <div style="font-size:12px; font-weight:600; color:var(--text-400); margin-bottom:8px;">PRÓXIMOS PASSOS</div>
          <div style="font-size:13px; color:var(--text-700); line-height:1.7;">
            1. Criar projecto no <strong>Supabase</strong><br>
            2. Adicionar credenciais em <code>db.js</code><br>
            3. Subir repositório para o <strong>GitHub</strong><br>
            4. Deploy via <strong>GitHub Pages</strong> ou Vercel
          </div>
        </div>
      </div>

      <!-- Info card -->
      <div style="grid-column:1/-1; background:#eff6ff; border:1px solid #bfdbfe; border-radius:var(--radius); padding:18px 22px;">
        <div style="font-size:13px; font-weight:700; color:#1e40af; margin-bottom:6px;">💡 Como funciona o Otimizador 1D</div>
        <div style="font-size:13px; color:#1e3a8a; line-height:1.7;">
          O algoritmo <strong>First Fit Decreasing (FFD)</strong> ordena as peças do maior para o menor comprimento e tenta encaixar cada peça em uma barra já aberta. Se não couber, abre uma nova barra — priorizando sempre retalhos disponíveis. Após o cálculo, você visualiza o <em>mapa de corte</em> de cada barra e pode aprovar o plano para dar baixa no estoque.
        </div>
      </div>

    </div>
  `;
}
