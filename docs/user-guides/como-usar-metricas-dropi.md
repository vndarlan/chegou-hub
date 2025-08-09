# Como usar Análise de Pedidos Dropi

## Para que serve
A página de Análise de Pedidos Dropi permite extrair, analisar e gerenciar dados de pedidos do sistema Dropi de múltiplos países (México, Chile e Colômbia). Você pode filtrar pedidos por período, visualizar estatísticas de entrega organizadas por produtos e status, e salvar análises para consulta posterior.

## Como acessar
1. Faça login no Chegou Hub
2. No menu lateral esquerdo, clique na seção "Métricas"
3. Clique em "📱 DROPI"
4. A página vai abrir mostrando o seletor de países e formulário de extração

## Funcionalidades principais

### Selecionar país e período
**Para que serve:** Definir fonte dos dados e intervalo de análise
**Como usar:**
1. **Selecione o país** no canto superior direito:
   - 🇲🇽 **México** - Análise de pedidos Dropi México  
   - 🇨🇱 **Chile** - Análise de pedidos Dropi Chile
   - 🇨🇴 **Colômbia** - Análise de pedidos Dropi Colômbia
2. **Defina o período usando o novo Calendar:**
   - **Data de Início:** Clique no botão do calendário e selecione a data
   - **Data de Fim:** Clique no botão do calendário e selecione a data
   - ✅ **Nova Interface:** Calendário visual com navegação por mês/ano
   - 🔄 **Validação:** Sistema impede selecionar data fim antes da data início
3. **Clique em "Processar"** para extrair os dados
4. O sistema conectará na API do Dropi e buscará todos os pedidos do período
5. Aguarde o carregamento - pode demorar alguns segundos dependendo da quantidade

### Como usar o novo Calendar (shadcn/ui)
**Mudança importante:** Substituímos os campos de data nativos por um calendário visual moderno
**Como usar:**
1. **Clique no botão com ícone de calendário** (mostra "Selecionar data" se vazio)
2. **Navegue pelo calendário:**
   - Use as setas para navegar entre meses
   - Clique no mês/ano para navegar mais rapidamente
   - Clique na data desejada para selecionar
3. **Calendario fecha automaticamente** após seleção
4. **Data aparece formatada** no botão (ex: "15/01/2025")
5. **Validações automáticas:** Não permite datas futuras ou anteriores a 2020

### Visualizar estatísticas dos pedidos
**Para que serve:** Acompanhar performance de vendas e entregas
**Como usar:**
1. Após extrair os dados, aparecerão cards com estatísticas:
   - **📦 Pedidos:** Quantidade total de pedidos encontrados
   - **✅ Entregues:** Pedidos com status "Entregado" + "Entregado à Transportadora"  
   - **💰 Valor Total:** Soma de todos os pedidos em R$
   - **📊 Taxa Entrega:** Percentual de efetividade das entregas (colorido por performance)
2. Use essas métricas para avaliar performance do período

### Analisar tabela de Produtos x Status (NOVA FUNCIONALIDADE)
**Para que serve:** Ver quantos pedidos de cada produto estão em cada status
**Como usar:**
1. **Nova estrutura da tabela:**
   - **🖼️ Imagem:** Foto do produto (quando disponível)
   - **📦 Produto:** Nome do produto
   - **Colunas de Status:** Uma coluna para cada status encontrado (ex: "Entregue", "Em Trânsito", etc.)
   - **🔢 Total:** Total de pedidos do produto
   - **✅ Entregues:** Quantidade de pedidos entregues do produto
   - **📈 Efetividade:** Percentual de entregas por produto (colorido por performance)

2. **Como navegar na tabela (SCROLL OTIMIZADO):**
   - ✅ **Melhoria importante:** Scroll horizontal funciona apenas dentro da tabela
   - **Desktop:** Role o mouse horizontalmente sobre a tabela para ver mais colunas
   - **Mobile/Tablet:** Deslize horizontalmente dentro da área da tabela
   - **Dica visual:** Barra de scroll aparece no final da tabela
   - 💡 **Página nunca rola horizontalmente** - experiência muito mais limpa

3. **Ordenação de dados:**
   - **Clique nos cabeçalhos** das colunas para ordenar
   - **Setas indicam direção:** ↑ Crescente, ↓ Decrescente
   - **Ordenação padrão:** Por total de pedidos (maior primeiro)

4. **Cores da Efetividade:**
   - 🟢 **Verde (≥60%):** Excelente performance
   - 🟠 **Laranja (50-59%):** Performance boa  
   - 🟡 **Amarelo (40-49%):** Performance regular
   - 🔴 **Vermelho (<40%):** Precisa melhorar

### Responsividade da interface
**Para que serve:** Garantir boa experiência em qualquer dispositivo
**Como usar:**
1. **📱 Mobile (celular):**
   - Interface se adapta automaticamente
   - Calendar ocupa tela inteira para melhor seleção
   - Tabela com scroll horizontal suave
   - Botões ficam empilhados verticalmente

2. **📱 Tablet:**
   - Layout otimizado para toque
   - Calendar em tamanho médio
   - Tabela com área de scroll definida
   - Cards de estatísticas em grade 2x2

3. **💻 Desktop:**
   - Layout completo em linha
   - Calendar compacto em popover
   - Tabela com todos os recursos visíveis
   - Cards de estatísticas em linha única

### Salvar análise para consulta posterior
**Para que serve:** Guardar dados extraídos para acessar depois sem precisar reprocessar
**Como usar:**
1. Após extrair dados, clique no botão "Salvar" (ícone download) na área da tabela
2. Modal abrirá com campo para nome da análise
3. **Nome automático:** Sistema sugere nome baseado no país e período selecionado
4. **Personalize se quiser:** Ex: "México Janeiro 2025 - Análise Trimestral"
5. Clique em "Salvar"
6. A análise ficará disponível na aba "Salvas"
7. **Identificação:** Análises Dropi são marcadas com badge "Dropi"

### Navegar entre abas Gerar e Salvas
**Para que serve:** Alternar entre criar novas análises e revisar análises antigas
**Como usar:**
1. **Aba "Gerar":** Interface principal com formulários e resultados
2. **Aba "Salvas":** Lista de todas as análises salvas anteriormente
3. **Filtro por país:** Análises são filtradas conforme país selecionado no topo
4. **Navegação rápida:** Clique nas abas para alternar instantaneamente

### Carregar análise salva
**Para que serve:** Reabrir dados de uma análise anterior
**Como usar:**
1. Vá para aba "Salvas"
2. **Filtro automático:** Só mostra análises do país selecionado
3. Encontre a análise desejada
4. Clique no botão "Carregar" (ícone de olho)
5. **Volta automaticamente** para aba "Gerar" com os dados carregados
6. Tabela de produtos x status será preenchida
7. Estatísticas serão recalculadas automaticamente

### Deletar análise salva
**Para que serve:** Remover análises antigas ou desnecessárias
**Como usar:**
1. Na análise que quer deletar, clique no botão vermelho (ícone lixeira)
2. **Confirmação de segurança:** Confirme a exclusão na janela que aparecer
3. A análise será removida permanentemente da base de dados
4. **Atenção:** Esta ação não pode ser desfeita
5. Lista será atualizada automaticamente após exclusão

## Casos práticos

### Exemplo 1: Comparar performance entre países
**Situação:** Quer ver qual país do Dropi tem melhor taxa de entrega em janeiro
1. **México:**
   - Selecione "México" no seletor de país
   - Use o Calendar para selecionar período: 01/01/2025 a 31/01/2025
   - Clique "Processar" e aguarde carregar
   - Anote a "Taxa Entrega" nos cards de estatísticas
   - Salve como "México - Janeiro 2025"

2. **Chile:**
   - Mude para "Chile" no seletor
   - Mesmo período (datas ficam salvas)
   - Processe e anote taxa de entrega  
   - Salve como "Chile - Janeiro 2025"

3. **Colômbia:**
   - Mude para "Colômbia"
   - Repita o processo
   - Compare as três taxas para decidir estratégias

### Exemplo 2: Identificar produtos problemáticos
**Situação:** Alguns produtos têm muitos cancelamentos, precisa identificar quais
1. Extraia dados do mês passado para México
2. **Na nova tabela de Produtos x Status:**
   - Procure coluna "Cancelado" (se existir)
   - **Use scroll horizontal** para ver todas as colunas de status
   - Identifique produtos com números altos de cancelamento
   - **Olhe a coluna Efetividade:** produtos vermelhos (<40%) precisam atenção
3. **Ordene por coluna "Cancelado":** clique no cabeçalho para ver maiores números
4. Foque nos top 5 produtos com mais problemas
5. Salve análise para acompanhamento futuro

### Exemplo 3: Análise móvel durante reunião
**Situação:** Em reunião, precisa acessar dados rapidamente pelo celular
1. **Mobile responsivo:** Abra a página no celular
2. **Calendar em tela cheia:** Selecione período facilmente com toque
3. **Cards empilhados:** Veja estatísticas uma embaixo da outra
4. **Scroll horizontal na tabela:** Deslize horizontalmente para ver todos os status
5. **Navegação rápida:** Use abas "Gerar" e "Salvas" para alternar

### Exemplo 4: Recuperar dados antigos por país
**Situação:** Precisa dos dados de outubro do Chile que já havia extraído
1. **Selecione "Chile"** no seletor de país (canto superior direito)
2. Vá na aba "Salvas"
3. **Filtro automático:** Só mostra análises do Chile
4. Procure por "Chile - Outubro 2024"
5. Clique em "Carregar"
6. **Volta automaticamente** para aba "Gerar" com dados carregados
7. **Tabela produtos x status** será preenchida com dados históricos

### Exemplo 5: Monitoramento semanal usando novo Calendar
**Situação:** Toda segunda-feira, você analisa a performance da semana anterior
1. **Rotina com Calendar otimizado:**
   - Abra a página na segunda-feira
   - **Data Início:** Clique no calendário, navegue para segunda da semana passada
   - **Data Fim:** Clique no calendário, selecione domingo da semana passada
   - **Validação automática:** Sistema garante que data fim não é antes do início
2. **Processe dados** e veja cards de performance
3. **Análise rápida da tabela:** Use scroll horizontal para ver todos os status
4. **Salve com nome padrão:** Sistema sugere nome baseado em datas
5. **Compare com semana anterior:** Carregue análise salva da semana passada

## Problemas comuns

### Calendar não abre ou não responde
**Sintoma:** Clica no botão do calendário mas nada acontece
**Solução:**
1. **Aguarde alguns segundos** - componente pode estar carregando
2. **Tente clicar na área do botão** (não apenas no ícone)
3. **Recarregue a página** se persistir
4. **Verifique se não há popup bloqueado** no navegador
5. **Mobile:** Toque com firmeza na área do botão

### Data não seleciona no Calendar
**Sintoma:** Clica na data mas ela não é selecionada
**Solução:**
1. **Verifique se data não está desabilitada:**
   - Datas futuras são bloqueadas
   - Datas anteriores a 2020 são bloqueadas
   - Data fim não pode ser anterior à data início
2. **Tente datas válidas** dentro do intervalo permitido
3. **Mobile:** Use toque (não arraste) na data

### Tabela não rola horizontalmente
**Sintoma:** Não consegue ver todas as colunas de status
**Solução:**
1. **Desktop:** Role o mouse **dentro da área da tabela** (não na página)
2. **Mobile/Tablet:** Deslize horizontalmente **na área da tabela**
3. **Procure a barra de scroll** no final da tabela
4. **Use as setas do teclado** quando tabela estiver em foco
5. **Redimensione janela** se necessário para ver área de scroll

### Scroll da página inteira acontece (problema antigo)
**Sintoma:** Página toda rola horizontalmente em vez de só a tabela
**Solução:**
1. ✅ **CORRIGIDO:** Este problema foi resolvido na nova interface
2. **Se ainda acontecer:** Recarregue a página para garantir nova versão
3. **Limpe cache** do navegador se necessário
4. **Mobile:** Certifique-se de deslizar dentro da área da tabela

### Imagens dos produtos não carregam
**Sintoma:** Aparecem ícones genéricos em vez de fotos dos produtos
**Solução:**
1. **Normal:** Nem todos os produtos têm imagens cadastradas no Dropi
2. **Aguarde carregamento** - imagens podem demorar para carregar
3. **Verifique conexão** com internet
4. **Ícone genérico é esperado** para produtos sem foto

### Cores da efetividade estão erradas
**Sintoma:** Produtos com boa performance aparecem em vermelho
**Solução:**
1. **Verifique cálculo:** Efetividade = (Entregues / Total) x 100
2. **Status considerados "entregues":** ENTREGADO + ENTREGADO A TRANSPORTADORA
3. **Cores corretas:**
   - Verde: ≥60% - Excelente
   - Laranja: 50-59% - Bom
   - Amarelo: 40-49% - Regular  
   - Vermelho: <40% - Precisa melhorar

### Análises não filtram por país selecionado
**Sintoma:** Na aba "Salvas", aparecem análises de todos os países
**Solução:**
1. **Selecione país primeiro:** Use seletor no canto superior direito
2. **Vá para aba "Salvas"** - filtro será aplicado automaticamente
3. **Filtro é por nome:** Sistema busca nome do país no título da análise
4. **Análises antigas:** Podem não ter país no nome, aparecerão sempre

### Erro ao processar dados de países específicos
**Sintoma:** México funciona mas Chile/Colômbia dão erro
**Solução:**
1. **APIs diferentes:** Cada país pode ter configurações específicas
2. **Verifique se país está selecionado** antes de processar
3. **Tente períodos menores** primeiro para testar
4. **Entre em contato** se persistir - pode precisar configuração adicional

## Interpretação dos status

### Status principais (comuns a todos os países)
- **ENTREGADO** 🟢 - Pedido entregue com sucesso ao cliente
- **ENTREGADO A TRANSPORTADORA** 🟢 - Enviado, considerado "entregue" para métricas
- **CANCELADO** 🔴 - Pedido cancelado por algum motivo
- **PENDIENTE** ⚪ - Aguardando processamento inicial

### Status de trânsito e preparação
- **GUIA_GENERADA** 🔵 - Etiqueta criada, pedido processado
- **PREPARADO PARA TRANSPORTADORA** 🟠 - Pronto para envio
- **EN CAMINO** 🔵 - Em caminho para destino
- **EN TRANSITO** 🔵 - Em trânsito
- **LISTO PARA ENTREGA** 🟠 - Pronto para entrega final

### Status de problemas
- **INTENTO DE ENTREGA** 🟡 - Tentativa de entrega (pode ter problemas)
- **NOVEDAD** 🟡 - Problema identificado
- **NOVEDAD SOLUCIONADA** 🟢 - Problema resolvido
- **PARA DEVOLUCIÓN** 🔴 - Será devolvido

### Status regionais específicos
- **BODEGA DESTINO** 🔵 - Na bodega de destino
- **EN BODEGA DROPI** 🟠 - No depósito Dropi
- **VERIFICACION EN LAS INSTALACIONES** 🟡 - Em verificação
- **RECOLECCION ATENDIDA** 🟢 - Coleta realizada com sucesso

### Como interpretar a efetividade
**Fórmula:** (ENTREGADO + ENTREGADO A TRANSPORTADORA) / Total de Pedidos × 100

**Benchmarks por país:**
- **México:** Efetividade típica 65-75%
- **Chile:** Efetividade típica 60-70% 
- **Colômbia:** Efetividade típica 55-65%

**Interpretação das cores:**
- 🟢 **Verde (≥60%):** Performance excelente
- 🟠 **Laranja (50-59%):** Performance boa, dentro da média
- 🟡 **Amarelo (40-49%):** Performance regular, pode melhorar
- 🔴 **Vermelho (<40%):** Performance ruim, investigar urgente

## Dicas importantes

### Melhorias na nova interface
- ✅ **Calendar visual:** Mais fácil selecionar períodos, navegue por mês/ano
- ✅ **Scroll otimizado:** Tabela rola horizontalmente sem afetar página
- ✅ **Produtos com imagens:** Identificação visual mais rápida
- ✅ **Múltiplos países:** Compare performance entre México, Chile e Colômbia
- ✅ **Responsivo:** Funciona bem em mobile, tablet e desktop

### Boas práticas de uso
- **Extraia dados regulares:** Mantenha análises semanais ou mensais
- **Compare países:** Use mesmo período para análise comparativa
- **Monitore produtos específicos:** Identifique quais produtos performam melhor
- **Use scroll horizontal:** Explore todas as colunas de status na tabela
- **Nomes descritivos:** Inclua país e período no nome das análises
- **Backup regular:** Salve análises importantes para histórico

### Otimizações de performance
- **Períodos menores:** Para dados mais rápidos, use períodos de 1-2 semanas
- **Análise por país:** Processe um país por vez para melhor performance
- **Horários ideais:** Extraia dados durante horários de baixo tráfego
- **Mobile otimizado:** Use responsividade para análises rápidas em qualquer lugar

### Monitoramento estratégico
- **KPI principal:** Taxa de entrega (efetividade) por país
- **Produtos problemáticos:** Identifique itens com alta taxa de cancelamento
- **Tendências mensais:** Compare performance entre diferentes meses
- **Benchmarking:** Use dados históricos para estabelecer metas realistas