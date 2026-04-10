function renderManual() {
  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">Ajuda & Suporte</div>
        <h1 class="pg-title">Manual do Operador</h1>
      </div>
    </div>

    <div style="max-width: 800px; line-height: 1.6; color: var(--text-700);">
      
      <div class="card" style="padding: 32px; margin-bottom: 24px;">
        <h2 style="color: var(--text-900); margin-bottom: 16px;">1. Cadastro de SKUs (Perfis)</h2>
        <p>No <strong>Catálogo SKUs</strong>, você cadastra os perfis de alumínio. Diferente de outros sistemas, aqui você pode cadastrar até <strong>3 tamanhos de barra</strong> diferentes para o mesmo perfil.</p>
        <ul style="margin: 16px 0 0 24px;">
          <li>Mantenha o saldo de barras sempre atualizado para o otimizador funcionar.</li>
          <li>A cor do SKU é gerada automaticamente para facilitar a visualização no mapa de corte.</li>
        </ul>
      </div>

      <div class="card" style="padding: 32px; margin-bottom: 24px;">
        <h2 style="color: var(--text-900); margin-bottom: 16px;">2. Otimização e "Refugo Zero"</h2>
        <p>O cérebro do sistema busca a maior economia possível seguindo estas regras:</p>
        <ol style="margin: 16px 0 0 24px;">
          <li>Primeiro, ele tenta usar os <strong>Retalhos</strong> (sobras) estocados no WMS.</li>
          <li>Se precisar de barras novas, ele calcula qual das suas 3 medidas gera o <strong>menor refugo</strong> (perda total).</li>
          <li>Se for obrigado a gerar uma sobra, ele usará a <strong>MAIOR barra</strong> disponível para que o pedaço que volte ao estoque seja útil no futuro.</li>
        </ol>
      </div>

      <div class="card" style="padding: 32px; margin-bottom: 24px;">
        <h2 style="color: var(--text-900); margin-bottom: 16px;">3. Gestão de Sobras (WMS)</h2>
        <p>O mapa de sobras é dividido em 9 cores. Cada cor representa uma área física da sua prateleira.</p>
        <ul style="margin: 16px 0 0 24px;">
          <li>Clique nos <strong>"+"</strong> para cadastrar um retalho manualmente.</li>
          <li>O sistema endereça automaticamente as sobras geradas pelo otimizador quando você finaliza um plano.</li>
        </ul>
      </div>

      <div class="card" style="padding: 32px; border-left: 4px solid var(--orange);">
        <h2 style="color: var(--text-900); margin-bottom: 16px;">💡 Dica de Ouro</h2>
        <p>Sempre configure o <strong>Esquadrejamento (Refile)</strong> nas Configurações. Isso garante que o sistema já reserve aqueles milímetros perdidos na limpeza da ponta da barra, evitando peças curtas na produção.</p>
      </div>

    </div>
  `;
}
