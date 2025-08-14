# Como usar Análise de Pedidos Dropi

## Para que serve
Extrair e analisar dados de pedidos do Dropi de 3 países (México, Chile e Colômbia), visualizar estatísticas de entrega e acompanhar performance por produto.

## Como acessar
1. Faça login no sistema
2. Clique em "Métricas" no menu
3. Clique em "📱 DROPI"
4. A página abre com seletor de países e configuração de período

## Funcionalidades principais

### Selecionar país e período
**Como usar:**
1. **Selecione o país** no canto superior direito:
   - México
   - Chile
   - Colômbia
   - Todos os Países (processa os 3 países juntos)
2. **Defina o período:**
   - Data Início: Use o campo de data
   - Data Fim: Use o campo de data
   - Sistema valida se data fim é posterior à início
3. **Clique em "Processar"** para extrair os dados
4. Aguarde o carregamento dos pedidos da API




### Visualizar estatísticas dos pedidos
**Como usar:**
1. Após processar, aparecem 4 cards com estatísticas:
   - **Pedidos:** Total de pedidos
   - **Entregues:** Pedidos entregues com sucesso
   - **Valor Total:** Soma em R$ de todos os pedidos
   - **Taxa Entrega:** Percentual de efetividade (colorido por performance)

### Analisar tabela de Produtos x Status
**Como usar:**
1. **Estrutura da tabela:**
   - **País:** Sigla do país (MX/CL/CO ou TODOS)
   - **Imagem:** Foto do produto (quando disponível)
   - **Produto:** Nome do produto
   - **Colunas de Status:** Uma coluna para cada status (ex: "Entregue", "Em Caminho", etc.)
   - **Total:** Total de pedidos do produto
   - **Entregues:** Quantidade entregue
   - **Efetividade:** Percentual de sucesso (colorido por performance)

2. **Como navegar na tabela:**
   - **Desktop:** Use scroll horizontal sobre a tabela
   - **Mobile:** Deslize horizontalmente dentro da tabela
   - **Primeiras 3 colunas fixas:** País, Imagem e Produto sempre visíveis

3. **Ordenação:**
   - Clique nos cabeçalhos para ordenar
   - Setas indicam direção da ordenação


### Salvar análise
**Como usar:**
1. Após processar dados, clique em "Salvar" na tabela
2. Digite um nome para a análise
3. Clique em "Salvar"
4. Análise fica disponível na aba "Salvas"

### Navegar entre abas
**Como usar:**
1. **Aba "Gerar":** Processar novos dados e ver resultados
2. **Aba "Salvas":** Ver análises já processadas anteriormente
3. Análises são filtradas pelo país selecionado

### Carregar análise salva
**Como usar:**
1. Vá na aba "Salvas"
2. Encontre a análise desejada
3. Clique em "Carregar"
4. Volta para aba "Gerar" com dados carregados

### Deletar análise
**Como usar:**
1. Clique no ícone da lixeira na análise
2. Confirme a exclusão
3. Análise será removida permanentemente

## Casos práticos

### Exemplo 1: Comparar performance entre países
1. Selecione "México", defina período e processe
2. Anote a "Taxa Entrega" e salve como "México - Janeiro 2025"
3. Repita para Chile e Colômbia
4. Compare as taxas para tomar decisões

### Exemplo 2: Identificar produtos problemáticos
1. Processe dados do mês anterior
2. Na tabela, procure produtos com efetividade baixa (vermelho)
3. Use scroll horizontal para ver status específicos como "Cancelado"
4. Ordene por efetividade para ver os piores primeiro

## Problemas comuns

### Período não seleciona
**Problema:** Campos de data não funcionam ou data fim é anterior ao início
**Solução:**
- Verifique se data de início é anterior à data de fim
- Use datas entre 2020 e hoje
- Recarregue a página se necessário

### Tabela não rola horizontalmente
**Problema:** Não consegue ver todas as colunas de status
**Solução:**
- Desktop: Role o mouse dentro da área da tabela
- Mobile: Deslize horizontalmente na tabela
- Primeiras 3 colunas sempre ficam visíveis

### Dados não carregam
**Problema:** Clica em processar mas nada acontece
**Solução:**
- Verifique se país e período estão selecionados
- Aguarde - pode demorar para períodos longos
- Tente períodos menores primeiro

## Como interpretar os resultados

### Status principais
- **ENTREGADO** 🟢 - Pedido entregue com sucesso
- **ENTREGADO A TRANSPORTADORA** 🟢 - Enviado (conta como entregue)
- **CANCELADO** 🔴 - Pedido cancelado
- **EN CAMINO** 🔵 - Em trânsito
- **PENDIENTE** ⚪ - Aguardando processamento

### Cálculo da efetividade
**Fórmula:** (Entregues / Total de Pedidos) × 100

**Cores da performance:**
- 🟢 Verde (≥60%): Excelente
- 🟠 Laranja (50-59%): Boa
- 🟡 Amarelo (40-49%): Regular
- 🔴 Vermelho (<40%): Precisa melhorar

## Dicas importantes

- **Períodos recomendados:** 1-30 dias para melhor performance
- **Compare países:** Use mesmo período para análise comparativa
- **Nomes descritivos:** Inclua país e período ao salvar análises
- **Scroll horizontal:** Use para ver todas as colunas de status na tabela
- **Focus nos vermelhos:** Produtos com efetividade <40% precisam atenção
- **Opção "Todos":** Processa México, Chile e Colômbia juntos