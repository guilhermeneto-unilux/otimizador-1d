function renderManual() {
  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">Ajuda & Suporte</div>
        <h1 class="pg-title">Manual de Operação Unilux 1D</h1>
      </div>
    </div>

    <div style="max-width: 900px; padding-bottom: 60px;">
      
      <!-- PASSO A PASSO -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 40px;">
        
        <div class="card" style="padding:24px;">
          <div style="width:32px; height:32px; background:var(--blue); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; margin-bottom:16px;">1</div>
          <h3 style="margin-bottom:12px;">Importação de Ordens</h3>
          <p style="font-size:14px; color:var(--text-500);">Acesse a aba <strong>Ordens de Produção</strong> e use o botão <strong>Importar Planilha</strong>. O sistema lerá as dimensões e SKUs (perfis) necessários.</p>
          <div style="margin-top:12px; font-size:12px; background:#f0f9ff; padding:8px; border-radius:6px; color:#0369a1; border:1px solid #bae6fd;">
            💡 <strong>Dica:</strong> Se houver duplicatas de OP, o sistema atualizará a ordem existente em vez de criar uma nova.
          </div>
        </div>

        <div class="card" style="padding:24px;">
          <div style="width:32px; height:32px; background:var(--blue); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; margin-bottom:16px;">2</div>
          <h3 style="margin-bottom:12px;">Criação de Lote</h3>
          <p style="font-size:14px; color:var(--text-500);">Selecione as ordens pendentes desejadas e clique em <strong>Criar Lote →</strong>. As ordens sairão da lista de "Pendentes" e ficarão aguardando otimização na aba "Em Lote".</p>
        </div>

        <div class="card" style="padding:24px;">
          <div style="width:32px; height:32px; background:var(--blue); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; margin-bottom:16px;">3</div>
          <h3 style="margin-bottom:12px;">Otimização Inteligente</h3>
          <p style="font-size:14px; color:var(--text-500);">Na aba <strong>Otimizador</strong>, selecione seu lote. O sistema irá calcular a melhor combinação de cortes para reduzir o desperdício (Refugo Zero).</p>
        </div>

        <div class="card" style="padding:24px;">
          <div style="width:32px; height:32px; background:var(--blue); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; margin-bottom:16px;">4</div>
          <h3 style="margin-bottom:12px;">Planos e Exportação</h3>
          <p style="font-size:14px; color:var(--text-500);">Após aprovar, vá em <strong>Planos de Corte</strong>. Aqui você gera os arquivos Excel e PDF para a produção e as etiquetas de identificação.</p>
        </div>

      </div>

      <!-- LÓGICA DE DADOS -->
      <h2 style="margin: 40px 0 20px; font-weight:800;">⚙️ Lógica de Dados</h2>

      <div class="card" style="padding:0; overflow:hidden; margin-bottom:24px;">
        <div style="padding:16px 24px; background:#f8fafc; border-bottom:1px solid var(--border); font-weight:700;">
          Colunas da Planilha de ENTRADA (Importação)
        </div>
        <div style="padding:24px;">
          <p style="font-size:14px; margin-bottom:16px;">O arquivo deve ser um Excel (.xlsx) com os dados iniciando na <strong>Linha 2</strong>. Mapeamento das colunas:</p>
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; font-size:13px;">
             <div style="padding:8px; background:#f1f5f9; border-radius:4px;"><strong>Coluna B:</strong> ID da OP (Número da Ordem)</div>
             <div style="padding:8px; background:#f1f5f9; border-radius:4px;"><strong>Coluna C:</strong> Quantidade de peças</div>
             <div style="padding:8px; background:#f1f5f9; border-radius:4px;"><strong>Coluna F:</strong> Código do SKU (deve existir no catálogo)</div>
             <div style="padding:8px; background:#f1f5f9; border-radius:4px;"><strong>Coluna K:</strong> Dimensão do corte (em Milímetros)</div>
             <div style="padding:8px; background:#f1f5f9; border-radius:4px;"><strong>Coluna E:</strong> Nome do Cliente</div>
             <div style="padding:8px; background:#f1f5f9; border-radius:4px;"><strong>Coluna I:</strong> Data de Entrega</div>
          </div>
        </div>
      </div>

      <div class="card" style="padding:0; overflow:hidden; margin-bottom:24px;">
        <div style="padding:16px 24px; background:#f8fafc; border-bottom:1px solid var(--border); font-weight:700;">
          Colunas da Planilha de SAÍDA (Exportação de Plano)
        </div>
        <div style="padding:24px;">
          <p style="font-size:14px; margin-bottom:16px;">O arquivo gerado para produção segue o layout industrial de 31 colunas:</p>
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; font-size:13px;">
             <div style="padding:8px; background:#f0fdf4; border-radius:4px;"><strong>Coluna A:</strong> Sequência de corte no SKU</div>
             <div style="padding:8px; background:#f0fdf4; border-radius:4px;"><strong>Coluna B:</strong> Número da barra dentro do SKU</div>
             <div style="padding:8px; background:#f0fdf4; border-radius:4px;"><strong>Coluna C:</strong> Comprimento da barra original</div>
             <div style="padding:8px; background:#f0fdf4; border-radius:4px;"><strong>Coluna D:</strong> Medida exata do corte</div>
             <div style="padding:8px; background:#f0fdf4; border-radius:4px;"><strong>Coluna J:</strong> Descrição Curta (Nome Resumido)</div>
             <div style="padding:8px; background:#f0fdf4; border-radius:4px;"><strong>Coluna L:</strong> Código SKU do Perfil</div>
          </div>
        </div>
      </div>

      <!-- REGRAS DE NEGÓCIO -->
      <div class="card" style="padding:32px; border-left:4px solid var(--blue); background:#f0f9ff;">
        <h3 style="margin-bottom:12px;">🧠 Inteligência de Corte</h3>
        <ul style="font-size:14px; color:var(--text-700); line-height:1.7;">
          <li><strong>Prioridade de Sobra:</strong> O sistema sempre tentará consumir primeiro as sobras de alumínio (retalhos) cadastradas no WMS antes de abrir uma barra nova.</li>
          <li><strong>Menor Perda:</strong> Quando precisa de barra nova, o algoritmo testa as 3 medidas cadastradas no SKU e escolhe aquela que gera o menor refugo.</li>
          <li><strong>Geração de Retalhos:</strong> Ao sobrar um pedaço maior que a "Sobra Mínima" definida no SKU, o sistema gera uma etiqueta de sobra e reserva um endereço no WMS automaticamente.</li>
        </ul>
      </div>

    </div>
  `;
}
