function renderManual() {
  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">Ajuda & Suporte</div>
        <h1 class="pg-title">Manual de Operação Unilux 1D</h1>
      </div>
    </div>

    <div style="max-width: 1060px; padding-bottom: 64px;">

      <div class="card" style="padding:24px; margin-bottom:24px; border-left:4px solid var(--blue);">
        <h2 style="font-size:20px; margin:0 0 10px; font-weight:800;">Como o sistema funciona</h2>
        <p style="font-size:14px; line-height:1.7; color:var(--text-600); margin:0;">
          O Unilux 1D organiza o corte de perfis em uma sequência simples: primeiro os perfis/SKUs e estoques são cadastrados,
          depois as ordens de produção entram no sistema, as ordens são agrupadas em lotes, o otimizador calcula o melhor mapa
          de corte, o plano é aprovado e por fim a produção usa o arquivo exportado. Durante esse processo, o sistema também
          controla sobras reaproveitáveis no WMS e registra ações importantes para auditoria.
        </p>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:32px;">
        ${_manualFlowCard('1', 'Cadastre SKUs', 'Informe perfil, medidas de barra, estoque virgem e sobra mínima.')}
        ${_manualFlowCard('2', 'Importe OPs', 'Inclua ordens manualmente ou por planilha, sempre usando SKUs existentes.')}
        ${_manualFlowCard('3', 'Crie o lote', 'Selecione as OPs pendentes que devem ser cortadas juntas.')}
        ${_manualFlowCard('4', 'Otimize', 'Escolha o lote e calcule o plano de corte com uso de retalhos e barras virgens.')}
        ${_manualFlowCard('5', 'Aprove e exporte', 'Finalize o plano, exporte Excel e envie o mapa para produção.')}
        ${_manualFlowCard('6', 'Controle sobras', 'Consulte, enderece, reutilize ou exclua retalhos no WMS.')}
      </div>

      ${_manualSection('1. Preparação inicial', `
        <ol style="font-size:14px; color:var(--text-700); line-height:1.8; margin:0; padding-left:20px;">
          <li>Acesse <strong>Catálogo SKUs</strong> antes de importar ordens. O otimizador só consegue trabalhar com OPs cujo SKU já existe no catálogo.</li>
          <li>Clique em <strong>Novo Perfil & Estoque</strong> para cadastrar um perfil novo.</li>
          <li>Preencha o <strong>Código SKU</strong>, a <strong>Descrição Comercial</strong> e, se necessário, o <strong>Nome Resumido</strong> usado na exportação.</li>
          <li>Informe a <strong>Sobra Mínima para Guarda</strong>. Qualquer pedaço abaixo desse valor tende a ser tratado como refugo; acima dele pode virar retalho reaproveitável.</li>
          <li>Cadastre até três comprimentos de barra virgem para o SKU, com a quantidade disponível em estoque para cada medida.</li>
          <li>Salve o perfil. Para alterar estoque ou medidas depois, use <strong>Editar Estoque</strong> na linha do SKU.</li>
        </ol>
        <div style="margin-top:14px; font-size:13px; background:#f8fafc; border:1px solid var(--border); border-radius:8px; padding:12px; color:var(--text-600);">
          <strong>Importante:</strong> na tela, as medidas aparecem em metros, mas o sistema grava internamente em milímetros. Exemplo: digite <strong>6.000</strong> para uma barra de 6 metros e <strong>1.200</strong> para uma peça de 1,2 metro.
        </div>
      `)}

      ${_manualSection('2. Importação e criação de ordens', `
        <ol style="font-size:14px; color:var(--text-700); line-height:1.8; margin:0; padding-left:20px;">
          <li>Acesse <strong>Ordens de Produção</strong>.</li>
          <li>Use <strong>+ Nova Ordem</strong> quando quiser cadastrar uma OP manualmente.</li>
          <li>Use <strong>Importar Planilha</strong> para carregar várias ordens de uma vez por Excel, XLS ou CSV.</li>
          <li>Após importar, confira se cada OP entrou com <strong>SKU</strong>, <strong>dimensão de corte</strong>, <strong>quantidade</strong>, <strong>cliente</strong> e <strong>data de entrega</strong>.</li>
          <li>Use a busca para localizar OP por número, cliente, pedido, SKU ou data.</li>
          <li>Se uma ordem ainda não foi colocada em lote, ela aparece como <strong>Pendente</strong> e pode ser excluída ou selecionada para lote.</li>
        </ol>
      `)}

      <div class="card" style="padding:0; overflow:hidden; margin-bottom:24px;">
        <div style="padding:16px 24px; background:#f8fafc; border-bottom:1px solid var(--border); font-weight:700;">
          Colunas esperadas na planilha de entrada
        </div>
        <div style="padding:24px;">
          <p style="font-size:14px; color:var(--text-600); margin:0 0 16px;">
            O arquivo de importação deve conter os dados nas colunas abaixo. O SKU informado precisa existir no catálogo.
          </p>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:12px; font-size:13px;">
             ${_manualDataBox('Coluna B', 'ID da OP / número da ordem')}
             ${_manualDataBox('Coluna C', 'Quantidade de peças')}
             ${_manualDataBox('Coluna E', 'Nome do cliente')}
             ${_manualDataBox('Coluna F', 'Código do SKU')}
             ${_manualDataBox('Coluna I', 'Data de entrega')}
             ${_manualDataBox('Coluna K', 'Dimensão do corte')}
          </div>
        </div>
      </div>

      ${_manualSection('3. Criação de lotes', `
        <ol style="font-size:14px; color:var(--text-700); line-height:1.8; margin:0; padding-left:20px;">
          <li>Na aba <strong>Ordens de Produção</strong>, mantenha a guia <strong>Pendentes</strong> aberta.</li>
          <li>Marque as OPs que devem ser planejadas juntas.</li>
          <li>Clique em <strong>Criar Lote</strong>.</li>
          <li>Digite um nome ou número para o lote. Use um padrão fácil de rastrear, por exemplo <strong>LOTE-2026-001</strong> ou o identificador usado pela produção.</li>
          <li>Depois de criado, o lote fica disponível no <strong>Otimizador</strong> e as OPs mudam para o status <strong>Em Lote</strong>.</li>
          <li>Se o lote foi criado errado, abra <strong>Planos de Corte</strong> ou a guia <strong>Em Lote</strong> para reverter as ordens para pendente.</li>
        </ol>
      `)}

      ${_manualSection('4. Otimização do corte', `
        <ol style="font-size:14px; color:var(--text-700); line-height:1.8; margin:0; padding-left:20px;">
          <li>Acesse <strong>Otimizador</strong>.</li>
          <li>No campo <strong>Lote Selecionado</strong>, escolha o lote que será calculado.</li>
          <li>Clique em <strong>Calcular e Comparar</strong>. O sistema executará uma busca global e também calculará <strong>Forçar utilização das sobras</strong>.</li>
          <li>A busca roda em segundo plano e pode levar alguns segundos. A tela informa o SKU atual, os estados avaliados e o tempo decorrido.</li>
          <li><strong>Ótimo comprovado</strong> significa que todas as combinações relevantes foram avaliadas. Se o limite de segurança de 30 segundos for atingido, o sistema identifica o resultado como <strong>Melhor encontrado no limite</strong>.</li>
          <li>Compare ocupação de corte, barras inteiras, retalhos usados e desperdício. Use <strong>Ver mapa e avaliar</strong> para alternar entre os dois resultados.</li>
          <li>No melhor planejamento global, o sistema avalia as combinações e prioriza abrir o menor comprimento total de material, depois a menor quantidade de barras ou retalhos e a menor perda definitiva.</li>
          <li>O otimizador prioriza retalhos cadastrados no WMS quando eles são compatíveis com o SKU e a medida necessária.</li>
          <li>Quando não há retalho adequado, o sistema usa barras virgens cadastradas no SKU e escolhe a alternativa que reduz desperdício.</li>
          <li>Confira visualmente o mapa: peças em barra virgem, peças em retalho reutilizado, sobras geradas, refugo e refile aparecem com cores diferentes.</li>
          <li>Depois de escolher a alternativa, clique em <strong>Aprovar esta alternativa</strong> para o plano aparecer em <strong>Planos de Corte</strong>.</li>
        </ol>
        <div style="margin-top:14px; font-size:13px; background:#fff7ed; border:1px solid #fdba74; border-radius:8px; padding:12px; color:#9a3412;">
          <strong>Atenção:</strong> se uma OP do lote foi excluída depois da criação do lote, o otimizador pode indicar lote inválido. Nesse caso, exclua ou recrie o lote com as ordens corretas.
        </div>
      `)}

      ${_manualSection('5. Planos de corte e exportação', `
        <ol style="font-size:14px; color:var(--text-700); line-height:1.8; margin:0; padding-left:20px;">
          <li>Acesse <strong>Planos de Corte</strong> para ver planos finalizados e lotes ainda aguardando otimização.</li>
          <li>Em <strong>Planos Finalizados</strong>, confira o ID do plano, lote de origem, aproveitamento, número de barras e data de finalização.</li>
          <li>Clique em <strong>Ver Mapa</strong> para revisar o plano salvo.</li>
          <li>Clique em <strong>Exportar Excel</strong> para gerar o arquivo que será enviado para a produção.</li>
          <li>Se um plano foi aprovado por engano, use <strong>Reverter para Lote</strong>. Isso desfaz a aprovação e devolve o lote para nova análise.</li>
          <li>Em <strong>Lotes em Aguardo</strong>, use <strong>Otimizar Agora</strong> para abrir diretamente um lote pendente no otimizador.</li>
        </ol>
      `)}

      <div class="card" style="padding:0; overflow:hidden; margin-bottom:24px;">
        <div style="padding:16px 24px; background:#f8fafc; border-bottom:1px solid var(--border); font-weight:700;">
          Principais colunas da exportação do plano
        </div>
        <div style="padding:24px;">
          <p style="font-size:14px; color:var(--text-600); margin:0 0 16px;">
            A planilha exportada usa um layout industrial com várias colunas. As mais importantes para conferência são:
          </p>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:12px; font-size:13px;">
             ${_manualDataBox('PARTNUM', 'Sequência da linha de corte dentro do SKU')}
             ${_manualDataBox('SOUNUM', 'Número da barra dentro do SKU')}
             ${_manualDataBox('SOULEN', 'Comprimento da barra original')}
             ${_manualDataBox('PARTLEN', 'Medida exata do corte')}
             ${_manualDataBox('PLANID', 'Identificador do plano por SKU')}
             ${_manualDataBox('MATID / MATDES', 'Código e descrição do SKU')}
             ${_manualDataBox('PARTORDNUM', 'Número da OP relacionada ao corte')}
             ${_manualDataBox('SETTTRIM', 'Informações de refile/esquadrejamento')}
          </div>
        </div>
      </div>

      ${_manualSection('6. Sobras, retalhos e WMS', `
        <ol style="font-size:14px; color:var(--text-700); line-height:1.8; margin:0; padding-left:20px;">
          <li>Acesse <strong>Sobras</strong> para visualizar o WMS dividido por quadrantes coloridos.</li>
          <li>Cada quadrante mostra ocupação atual e capacidade disponível.</li>
          <li>Clique em um quadrante para abrir a matriz de posições. As posições ocupadas mostram SKU e medida do retalho.</li>
          <li>Use a busca <strong>Localizar Retalho</strong> para procurar por SKU ou descrição.</li>
          <li>Clique em uma posição ocupada para ver detalhes do retalho.</li>
          <li>Use <strong>Novo Retalho Manual</strong> quando uma sobra física precisar ser cadastrada sem ter vindo de um plano aprovado.</li>
          <li>Use <strong>Imprimir QR Codes</strong> para gerar identificações das posições do WMS.</li>
          <li>Quando um retalho é consumido ou não existe mais fisicamente, exclua-o para manter o estoque confiável.</li>
        </ol>
      `)}

      ${_manualSection('7. Dashboard e acompanhamento', `
        <ol style="font-size:14px; color:var(--text-700); line-height:1.8; margin:0; padding-left:20px;">
          <li>Use o <strong>Dashboard</strong> para acompanhar o desempenho dos planos já gerados.</li>
          <li>Ajuste o período pelos campos de data e filtre por SKU quando quiser analisar um perfil específico.</li>
          <li>Confira os indicadores de ordens pendentes, planos planejados, barras virgens em estoque e sobras disponíveis.</li>
          <li>Acompanhe o aproveitamento mensal para identificar queda de eficiência.</li>
          <li>Veja os piores SKUs para entender quais perfis mais precisam de ajuste de barra, lote ou sobra mínima.</li>
          <li>Use a recomendação de <strong>Tamanho ideal para guardar sobra por SKU</strong> como apoio para revisar o cadastro de sobra mínima.</li>
        </ol>
      `)}

      ${_manualSection('8. Configurações, usuários e auditoria', `
        <ol style="font-size:14px; color:var(--text-700); line-height:1.8; margin:0; padding-left:20px;">
          <li><strong>Configurações</strong>, <strong>Usuários</strong> e <strong>Auditoria</strong> são áreas administrativas.</li>
          <li>Em <strong>Configurações</strong>, ajuste o refile inicial e a taxa média de desperdício esperada em sobras.</li>
          <li>O <strong>Refile Inicial</strong> representa o descarte das pontas antes do corte em barras virgens ou retalhos.</li>
          <li>A <strong>Taxa Média de Desperdício de Sobras</strong> influencia a forma como o otimizador pondera sobras futuras.</li>
          <li>Em <strong>Usuários</strong>, o administrador cria, edita e remove acessos.</li>
          <li>Em <strong>Auditoria</strong>, consulte registros de ações importantes, como cadastros, exclusões e alterações.</li>
        </ol>
      `)}

      <div class="card" style="padding:0; overflow:hidden; margin-bottom:24px;">
        <div style="padding:16px 24px; background:#f8fafc; border-bottom:1px solid var(--border); font-weight:700;">
          Dúvidas e problemas comuns
        </div>
        <div style="padding:24px;">
          ${_manualFaq('A OP não aparece para criar lote.', 'Verifique se ela está na guia Pendentes. OPs em lote ou concluídas não entram novamente em outro lote sem reversão.')}
          ${_manualFaq('O SKU da planilha não importa corretamente.', 'Confirme se o código da planilha é igual ao código cadastrado em Catálogo SKUs, sem espaços extras ou diferença de escrita.')}
          ${_manualFaq('O otimizador não encontra barra para cortar.', 'Confira se o SKU possui pelo menos um comprimento de barra cadastrado com quantidade válida em estoque.')}
          ${_manualFaq('A sobra esperada virou refugo.', 'Confira a Sobra Mínima do SKU. Se o pedaço restante for menor que esse limite, ele não é guardado como retalho.')}
          ${_manualFaq('O lote aparece como inválido.', 'Provavelmente alguma OP do lote foi removida após a criação. Recrie o lote usando apenas ordens existentes.')}
          ${_manualFaq('O estoque físico não bate com o sistema.', 'Revise SKUs, retalhos manuais, sobras consumidas e planos revertidos. O WMS precisa refletir o que existe fisicamente.')}
        </div>
      </div>

      <div class="card" style="padding:24px; background:#f0fdf4; border:1px solid #bbf7d0;">
        <h3 style="font-size:16px; margin:0 0 10px; color:#166534;">Rotina recomendada</h3>
        <ol style="font-size:14px; color:#166534; line-height:1.8; margin:0; padding-left:20px;">
          <li>No início do dia, confira estoque virgem e sobras disponíveis.</li>
          <li>Importe ou cadastre as OPs novas.</li>
          <li>Crie lotes por prioridade, entrega, cliente ou perfil, conforme a regra da produção.</li>
          <li>Otimize cada lote e revise visualmente o mapa antes de aprovar.</li>
          <li>Exporte o plano para produção.</li>
          <li>Ao final, atualize sobras físicas e retire do sistema retalhos consumidos ou descartados.</li>
        </ol>
      </div>

    </div>
  `;
}

function _manualFlowCard(num, title, text) {
  return `
    <div class="card" style="padding:18px;">
      <div style="width:30px; height:30px; background:var(--blue); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; margin-bottom:12px;">${num}</div>
      <h3 style="font-size:15px; margin:0 0 8px; font-weight:800;">${title}</h3>
      <p style="font-size:13px; line-height:1.55; color:var(--text-500); margin:0;">${text}</p>
    </div>
  `;
}

function _manualSection(title, body) {
  return `
    <div class="card" style="padding:24px; margin-bottom:24px;">
      <h2 style="font-size:18px; margin:0 0 16px; font-weight:800;">${title}</h2>
      ${body}
    </div>
  `;
}

function _manualDataBox(label, text) {
  return `
    <div style="padding:10px 12px; background:#f1f5f9; border-radius:6px; border:1px solid #e2e8f0;">
      <strong>${label}:</strong> ${text}
    </div>
  `;
}

function _manualFaq(question, answer) {
  return `
    <div style="padding:14px 0; border-bottom:1px solid var(--border);">
      <div style="font-size:14px; font-weight:800; color:var(--text-900); margin-bottom:4px;">${question}</div>
      <div style="font-size:13px; line-height:1.6; color:var(--text-600);">${answer}</div>
    </div>
  `;
}
