# Como usar Efetividade ECOMHUB

## Para que serve

A página de Efetividade ECOMHUB analisa a performance de produtos por status de entrega em diferentes países da Europa. Processa dados do ECOMHUB via automação Selenium e calcula métricas de efetividade para otimizar operações.

## Como acessar

1. Faça login no Chegou Hub
2. No menu lateral esquerdo, clique em "Métricas"  
3. Clique em "🛒 ECOMHUB"
4. A página carregará com seletor de países e formulário de configuração

## Funcionalidades principais

### Selecionar país
**Para que serve:** Escolher qual mercado analisar ou todos combinados
**Como usar:**
1. No header da página, use o dropdown "País"
2. Países disponíveis:
   - Todos os Países (dados combinados)
   - Espanha
   - Croácia  
   - Grécia
   - Itália
   - Romênia
   - República Checa
   - Polônia
3. Seleção altera tanto dados gerados quanto análises salvas exibidas

### Processar dados (aba Gerar)
**Para que serve:** Executar automação que coleta dados do ECOMHUB via Selenium
**Como usar:**
1. Clique na aba "Gerar"
2. Configure o período:
   - Use os campos "Data Início" e "Data Fim"
   - Ou use o calendário popup (se disponível)
3. Clique no botão "Processar"
4. Aguarde processamento (mostra progresso)
5. Resultados aparecem em cards de estatísticas e tabela

### Ver estatísticas resumidas
**Para que serve:** Visualizar KPIs principais dos dados processados
**Como usar:**
1. Após processamento, visualize 4 cards:
   - **Produtos:** Quantidade total de produtos analisados
   - **Entregues:** Total de pedidos entregues com sucesso
   - **Totais:** Soma de todos os pedidos (todos status)
   - **Efetividade:** Percentual médio de efetividade
2. Cores indicam performance (verde = boa, vermelho = ruim)

### Analisar tabela de resultados
**Para que serve:** Ver dados detalhados produto por produto
**Como usar:**
1. **Visualização Otimizada** (padrão):
   - Dados agrupados em categorias lógicas
   - Colunas: Produto, Totais, Entregues, Finalizados, Em Trânsito, Problemas, Devolução, Cancelados
   - Percentuais calculados automaticamente
   - Cores nas métricas de efetividade
2. **Visualização Total:**
   - Todos status individuais da API ECOMHUB
   - Dados não agrupados, mais granulares
3. **Funcionalidades:**
   - Clique nos cabeçalhos para ordenar
   - Tabela fixa coluna "Produto" para navegação
   - Imagens dos produtos (quando disponíveis)

### Salvar análise
**Para que serve:** Armazenar resultados para consulta posterior
**Como usar:**
1. Após processar dados, clique em "Salvar"
2. Digite um nome descritivo (ex: "Itália Janeiro 2025")
3. Clique "Salvar"
4. Análise fica disponível na aba "Salvas"

### Gerenciar análises salvas (aba Salvas)
**Para que serve:** Visualizar, carregar ou excluir análises anteriores
**Como usar:**
1. Clique na aba "Salvas"
2. Análises são filtradas pelo país selecionado
3. Para cada análise:
   - **Carregar:** Botão "Carregar" volta para aba Gerar com os dados
   - **Excluir:** Botão vermelho com ícone lixeira
4. Botão "Atualizar" recarrega lista de análises

## Casos práticos

### Exemplo 1: Análise de performance mensal por país
**Situação:** Avaliar efetividade de produtos na Itália em janeiro
1. Selecione "Itália" no dropdown de países
2. Configure período: 01/01/2025 a 31/01/2025
3. Clique "Processar" e aguarde coleta dos dados
4. Analise cards de estatísticas:
   - Quantos produtos foram analisados
   - Taxa de efetividade média do país
   - Volume de entregas vs total de pedidos
5. Na tabela, ordene por "Efetividade Total" para identificar produtos com melhor performance
6. Salve como "Itália Janeiro 2025"

### Exemplo 2: Comparação entre todos os países
**Situação:** Identificar qual mercado tem melhor efetividade
1. Selecione "Todos os Países" no dropdown
2. Configure período de 1 semana recente
3. Processe dados (combina todos os 7 países)
4. Na tabela, veja produtos que aparecem em múltiplos países
5. Compare efetividade do mesmo produto entre diferentes mercados
6. Identifique países com melhores resultados para expansão

### Exemplo 3: Identificação de produtos problemáticos
**Situação:** Encontrar produtos com alta taxa de devolução
1. Selecione país específico ou "Todos"
2. Processe dados do último mês
3. Na tabela, ordene por coluna "% Devolvidos" (decrescente)
4. Foque em produtos com percentual alto de devolução
5. Analise também coluna "Problemas" para identificar padrões
6. Use dados para ajustar logística ou fornecedores

### Exemplo 4: Monitoramento semanal de operações
**Situação:** Acompanhamento rotineiro da operação
1. Configure análise semanal recorrente
2. Use "Todos os Países" para visão geral
3. Compare com semana anterior (use análises salvas)
4. Identifique produtos "Em Trânsito" em excesso
5. Monitore produtos com queda na "Efetividade Parcial"
6. Tome ações corretivas baseadas nos dados

## Problemas comuns

### Processamento falha ou trava
**Sintoma:** Botão "Processar" não funciona ou fica carregando indefinidamente
**Solução:**
1. **Campos obrigatórios:** Verifique se data início, data fim e país estão selecionados
2. **Período válido:** Data início deve ser anterior à data fim
3. **ECOMHUB offline:** Plataforma ECOMHUB pode estar em manutenção
4. **Selenium:** Automação pode ter falhado, tente novamente em alguns minutos
5. **Timeout:** Períodos muito longos podem exceder tempo limite

### Dados não aparecem após processamento
**Sintoma:** Processamento completa mas não exibe resultados
**Solução:**
1. **Período sem dados:** Confirme se há pedidos no período selecionado
2. **País específico:** Alguns países podem não ter dados para o período
3. **Aguardar:** Sistema pode estar finalizando processamento
4. **Recarregar:** Atualize a página e tente novamente

### Tabela não carrega ou aparece cortada
**Sintoma:** Tabela de resultados não exibe corretamente
**Solução:**
1. **Zoom:** Ajuste zoom do navegador para 100%
2. **Resolução:** Use tela com resolução mínima 1200px
3. **Scroll horizontal:** Deslize horizontalmente na tabela
4. **Visualização:** Troque entre "Otimizada" e "Total"
5. **Dados grandes:** Períodos longos geram muitos dados, use períodos menores

### Análises salvas não aparecem
**Sintoma:** Aba "Salvas" está vazia ou não carrega
**Solução:**
1. **País selecionado:** Análises são filtradas por país, mude seleção
2. **Primeiro uso:** Se nunca salvou análises, lista estará vazia
3. **Botão Atualizar:** Clique em "Atualizar" na aba Salvas
4. **Permissões:** Pode não ter acesso às análises salvas por outros usuários

### Imagens dos produtos não carregam
**Sintoma:** Ícones 📦 no lugar das imagens dos produtos
**Solução:**
1. **URLs inválidas:** Algumas imagens do ECOMHUB podem estar offline
2. **Conexão lenta:** Aguarde carregar ou recarregue página
3. **Comportamento normal:** Sistema substitui imagens com erro por ícone padrão

### Modal "Instruções" não abre
**Sintoma:** Botão "Instruções" não funciona
**Solução:**
1. **JavaScript:** Verifique se JavaScript está habilitado
2. **Popup blocker:** Desabilite bloqueador temporariamente
3. **Navegador:** Use navegador atualizado (Chrome, Firefox, Safari)
4. **Cache:** Limpe cache do navegador

## Interpretação das métricas

### Cards de estatísticas
- **Produtos:** Quantidade total de produtos únicos analisados no período
- **Entregues:** Soma de todos os pedidos com status "delivered" 
- **Totais:** Soma de todos os pedidos independente do status
- **Efetividade:** (Entregues ÷ Totais) × 100 - percentual médio de sucesso

### Colunas da tabela (Visualização Otimizada)
- **Totais:** Soma de todos os pedidos (todos os status)
- **Finalizados:** "delivered" + "issue" + "returning" + "returned" + "cancelled"
- **Em Trânsito:** "out_for_delivery" + "preparing_for_shipping" + "ready_to_ship" + "with_courier"
- **Problemas:** Apenas pedidos com status "issue"
- **Devolução:** "returning" + "returned" + "issue"
- **Cancelados:** Apenas pedidos com status "cancelled"

### Percentuais calculados
- **% A Caminho:** (Em Trânsito ÷ Totais) × 100
- **% Devolvidos:** (Devolução ÷ Totais) × 100  
- **Efetividade Parcial:** (Entregues ÷ Finalizados) × 100
- **Efetividade Total:** (Entregues ÷ Totais) × 100

### Cores das métricas de efetividade
- **Verde escuro:** ≥ 60% (Excelente performance)
- **Verde claro:** ≥ 50% (Boa performance)
- **Amarelo:** ≥ 40% (Performance regular)
- **Vermelho:** < 40% (Performance ruim, requer atenção)

### Status individuais do ECOMHUB
- **delivered:** Pedido entregue com sucesso
- **out_for_delivery:** Saiu para entrega
- **preparing_for_shipping:** Preparando envio
- **ready_to_ship:** Pronto para envio
- **with_courier:** Com transportadora
- **issue:** Problema na entrega
- **returning:** Retornando ao remetente
- **returned:** Retornado
- **cancelled:** Cancelado

## Países incluídos na opção "Todos"

### Cobertura completa
- **Espanha** (ID: 164)
- **Croácia** (ID: 41)
- **Grécia** (ID: 66)
- **Itália** (ID: 82)
- **Romênia** (ID: 142)
- **República Checa** (ID: 44)
- **Polônia** (ID: 139)

## Dicas importantes

- **Use "Todos os Países"** para análise comparativa entre mercados
- **Monitore "% Devolvidos"** para identificar problemas logísticos
- **Foque na "Efetividade Total"** como métrica principal de sucesso
- **Analise produtos "Em Trânsito"** para prever entregas futuras
- **Salve análises regularmente** para acompanhar evolução temporal
- **Use períodos consistentes** para comparações válidas
- **Atenção às cores da efetividade** para decisões rápidas
- **Combine dados de múltiplos países** para estratégias regionais
- **Monitore produtos com "Problemas"** para ações corretivas
- **Use ordenação por colunas** para identificar padrões rapidamente