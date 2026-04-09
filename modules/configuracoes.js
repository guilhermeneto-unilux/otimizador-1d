/* ===== MODULE: CONFIGURAÇÕES ===== */

function renderConfiguracoes() {
  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Configurações</h1>
        <p class="page-subtitle">Ajustes globais do sistema</p>
      </div>
    </div>

    <!-- INFO BANNER -->
    <div class="card mb-24" style="background:linear-gradient(135deg,var(--accent-bg),var(--purple-bg));border-color:var(--accent-light);margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="font-size:36px;">🚧</div>
        <div>
          <div style="font-size:16px;font-weight:700;color:var(--accent-dark);">Módulo em Desenvolvimento</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
            As configurações abaixo estão previstas para implementação futura. Clique para explorar o que está planejado.
          </div>
        </div>
      </div>
    </div>

    <div class="config-grid">
      ${[
        { icon:'👤', title:'Usuários e Permissões',    desc:'Cadastro de usuários, papéis e controle de acesso ao sistema.', tag:'Em breve', bg:'var(--accent-bg)' },
        { icon:'📐', title:'Dimensões do Grid',         desc:'Configurar o número de colunas e linhas do grid de sobras (padrão: 8×11).', tag:'Em breve', bg:'var(--blue-bg)' },
        { icon:'⚙️', title:'Parâmetros do Otimizador', desc:'Perda mínima padrão, estratégia preferida e tolerâncias de corte.', tag:'Em breve', bg:'var(--purple-bg)' },
        { icon:'📧', title:'Notificações',              desc:'Configurar alertas de estoque baixo, vencimento de ordens e e-mail.', tag:'Em breve', bg:'var(--yellow-bg)' },
        { icon:'🏭', title:'Unidades de Medida',        desc:'Alternar entre milímetros, centímetros e metros no sistema.', tag:'Em breve', bg:'var(--green-bg)' },
        { icon:'🗄️', title:'Backup e Exportação',      desc:'Exportar dados completos do sistema, histórico e configurações.', tag:'Em breve', bg:'var(--orange-bg)' },
        { icon:'🔗', title:'Integrações / API',         desc:'Conectar ao sistema ERP, importar ordens automaticamente via API.', tag:'Planejado', bg:'var(--cyan-bg)' },
        { icon:'🎨', title:'Aparência',                 desc:'Modo claro/escuro, cores primárias e preferências de exibição.', tag:'Planejado', bg:'var(--red-bg)' },
      ].map(c => `
        <div class="config-card" onclick="showToast('${c.title} – Em breve!','info')">
          <div class="config-card-icon" style="background:${c.bg}">${c.icon}</div>
          <div class="config-card-title">${c.title}</div>
          <div class="config-card-desc">${c.desc}</div>
          <div class="config-badge">${c.tag}</div>
        </div>
      `).join('')}
    </div>

    <!-- VERSÃO E INFO -->
    <div class="card" style="margin-top:24px;">
      <div class="card-header"><span class="card-title-lg">ℹ️ Informações do Sistema</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">
        ${[
          ['Versão', 'v1.0.0 – Beta'],
          ['Módulo', 'Otimização 1D'],
          ['Algoritmo', 'FFD + Best Fit'],
          ['Last Build', '09/04/2026'],
        ].map(([l,v]) => `
          <div style="background:var(--surface-2);border-radius:var(--radius-sm);border:1px solid var(--border);padding:12px 14px;">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">${l}</div>
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);">${v}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
