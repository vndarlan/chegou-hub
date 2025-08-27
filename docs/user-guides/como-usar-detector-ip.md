# Como Usar o Detector de IP

## Para que serve

O Detector de IP é uma ferramenta avançada de segurança e análise anti-fraude que identifica pedidos feitos por clientes diferentes a partir do mesmo endereço IP na sua loja Shopify. Com busca histórica completa e sistema de gerenciamento de casos investigados, esta funcionalidade é essencial para:

- **Detectar possíveis fraudes** - Múltiplas compras suspeitas do mesmo local
- **Identificar padrões de comportamento** - Clientes comprando repetidamente 
- **Análise geográfica** - Concentração de vendas por região/localização
- **Auditoria e compliance** - Rastreabilidade para investigações
- **Prevenção de abuso** - Identificar tentativas de burlar promoções

## Como acessar

1. Faça login no Chegou Hub
2. No menu lateral esquerdo, clique em "Suporte"
3. Clique em "⚙️ Processamento"
4. Na página de processamento, localize e clique em "🛡️ Detector de IP"
5. A ferramenta carregará mostrando as opções de análise e seletor de loja

## Funcionalidades principais

### Selecionar loja para análise
**Para que serve:** Escolher qual loja Shopify será analisada
**Como usar:**
1. No topo da página, clique no seletor de loja (ícone de prédio)
2. Escolha a loja desejada da lista
3. A loja selecionada ficará ativa para todas as análises

### Configurar filtros de busca
**Para que serve:** Definir período para a análise de IPs
**Como usar:**
1. Use o seletor "Período" na barra de filtros:
   - **Opções:** 7, 15, 30, 60 ou 90 dias (padrão: 30 dias)
2. O sistema automaticamente busca IPs com múltiplos clientes
3. Clique em "Buscar IPs" para executar a análise

### Analisar resultados encontrados
**Para que serve:** Revisar IPs que tiveram múltiplos pedidos no período
**Como usar:**
1. Após a busca, uma tabela mostrará os resultados
2. Para cada IP você verá:
   - **IP mascarado** (XXX.XXX.xxx.xxx para proteção)
   - **Número de pedidos** feitos deste IP
   - **Quantidade de clientes únicos**
   - **Valor total** das vendas
   - **Período** (primeira e última compra)
3. Use os dados para identificar padrões suspeitos

### Ver detalhes específicos de um IP
**Para que serve:** Investigar todos os pedidos de um IP específico
**Como usar:**
1. Na tabela de resultados, clique em "Ver Detalhes" no IP desejado
2. Uma janela modal abrirá com informações detalhadas:
   - Resumo geral (pedidos, clientes, total de vendas)
   - Lista completa de todos os pedidos
   - Dados dos clientes de cada pedido
   - Informações de entrega quando disponíveis
3. Use para investigação detalhada de casos suspeitos

### Marcar IP como resolvido
**Para que serve:** Marcar IPs já investigados para não aparecerem mais nas buscas
**Como usar:**
1. Na tabela de resultados, clique no botão verde "Resolvido" ao lado do IP investigado
2. O IP será removido da lista atual e marcado como resolvido
3. IPs resolvidos ficam salvos e não aparecem em futuras buscas
4. Use para organizar o trabalho e evitar investigar o mesmo IP novamente

### Gerenciar IPs resolvidos
**Para que serve:** Visualizar e gerenciar IPs já marcados como resolvidos
**Como usar:**
1. Abaixo da tabela principal, você verá uma seção "IPs Resolvidos"
2. Clique em "Mostrar" para expandir a lista
3. Visualize todos os IPs marcados como resolvidos com suas datas
4. Clique no "X" ao lado de qualquer IP para removê-lo da lista de resolvidos
5. IPs removidos voltarão a aparecer nas próximas buscas

### Consultar histórico de análises
**Para que serve:** Ver análises anteriores realizadas no sistema
**Como usar:**
1. Clique no ícone de histórico (relógio) no topo da página
2. Visualize todas as análises já executadas
3. Filtre por loja, data ou status
4. Use para acompanhar padrões ao longo do tempo

## Interface explicada

### Tela principal
- **Cabeçalho:** Título "Detector de IP" com seletor de loja e botões de configuração
- **Card de busca:** Controles para configurar período e critérios
- **Tabela de resultados:** Lista de IPs encontrados com métricas
- **Botões de ação:** "Buscar IPs" e "Ver Detalhes" para cada resultado

### Filtros disponíveis
- **Período de análise:** 7 a 90 dias (padrão: 30 dias)
- **Seletor de loja:** Todas as lojas Shopify configuradas
- **Critério automático:** Busca apenas IPs com clientes diferentes

### Tabela de resultados
- **IP:** Endereço IP completo (não mais mascarado)
- **Pedidos:** Quantidade total de pedidos deste IP
- **Status:** Status dos pedidos (ativos, cancelados)
- **Clientes:** Número de clientes únicos
- **Período:** Intervalo entre primeira e última compra com duração em dias
- **Ações:** Botões "Resolvido" (verde) e "Ver Detalhes"

### Modal de detalhes
- **Cartões de resumo:** Visão geral dos números principais
- **Lista de pedidos:** Todos os pedidos com informações detalhadas
- **Dados do cliente:** Nome, email, telefone de cada compra
- **Informações de entrega:** Endereço quando disponível

## Interpretação dos dados

### O que significa cada coluna
- **IP:** Endereço IP completo usado pelos clientes
- **Pedidos:** Total de compras feitas deste endereço IP
- **Status:** Mostra quantos pedidos estão ativos ou cancelados
- **Clientes:** Quantos clientes diferentes compraram deste IP
- **Período:** Data da primeira e última compra + duração em dias

### Como ler os resultados
- **1 cliente, múltiplos pedidos:** Cliente frequente ou possível fraude
- **Múltiplos clientes, mesmo IP:** Família/escritório ou IP compartilhado
- **Valores altos:** Concentração de vendas que merece atenção
- **Período curto:** Compras em sequência podem ser suspeitas

### Sinais de alerta
🚨 **Alta suspeição:**
- Muitos pedidos (>5) do mesmo IP em poucos dias
- Clientes diferentes com nomes muito similares
- Valores altos em período muito curto
- Endereços de entrega muito próximos

⚠️ **Moderada suspeição:**
- 3-4 pedidos de clientes diferentes no mesmo IP
- Compras em horários incomuns
- Produtos similares em compras repetidas

✅ **Provavelmente normal:**
- 2-3 pedidos espaçados no tempo
- Mesmo cliente comprando novamente
- IP de empresa/escritório com múltiplos funcionários

## Casos de uso práticos

### Caso 1: Detecção de fraude
**Situação:** Suspeita de cliente usando dados falsos para múltiplas compras
1. Configure período de 7-15 dias
2. Use mínimo de 3-4 pedidos
3. Execute busca
4. Identifique IPs com muitos pedidos/poucos clientes
5. Clique em "Ver Detalhes" dos casos suspeitos
6. Analise dados dos clientes (nomes similares, emails parecidos)
7. Verifique endereços de entrega próximos
8. Documente evidências para ação

### Caso 2: Análise de família/amigos
**Situação:** Cliente reclama que não consegue usar cupom por "já ter sido usado"
1. Configure período de 30 dias
2. Use mínimo de 2 pedidos
3. Execute busca
4. Procure pelo valor ou período da compra do cliente
5. Veja se há múltiplas compras do mesmo IP
6. Analise se são clientes relacionados (mesmo sobrenome, endereços próximos)
7. Explique ao cliente sobre política de cupons

### Caso 3: Investigação de padrões
**Situação:** Quero entender concentração geográfica de clientes
1. Configure período de 60-90 dias
2. Use mínimo de 2 pedidos
3. Execute busca
4. Analise resultados por total de vendas
5. Identifique IPs com mais vendas
6. Veja detalhes de endereços de entrega
7. Use dados para estratégias regionais

### Caso 4: Auditoria de promoção
**Situação:** Promoção limitava 1 compra por cliente, mas houve abuso
1. Configure período da promoção específica
2. Use mínimo de 2 pedidos  
3. Execute busca focada no período
4. Identifique IPs com múltiplas compras
5. Verifique se clientes são diferentes mas suspeitos
6. Documente casos para cancelamento/estorno

### Caso 5: Organização do trabalho em equipe
**Situação:** Equipe precisa dividir investigação de IPs suspeitos
1. Execute busca normal de IPs
2. Cada pessoa da equipe investiga alguns IPs da lista
3. Após investigar, clique em "Resolvido" nos IPs analisados
4. IPs resolvidos somem da lista principal
5. Outros membros da equipe veem apenas IPs não investigados
6. Use seção "IPs Resolvidos" para ver histórico do trabalho
7. Se descobrir algo novo sobre IP resolvido, remova da lista para reinvestigar

## Limitações e considerações

### IPs dinâmicos
**O que são:** Muitos provedores mudam IP dos clientes automaticamente
**Impacto:** Cliente legítimo pode aparecer com IPs diferentes
**Solução:** Usar também outros critérios (email, telefone, endereço)

### VPNs e proxies
**O que são:** Ferramentas que mascaram o IP real do usuário
**Impacto:** Clientes diferentes podem aparecer com mesmo IP
**Solução:** Analisar dados dos clientes além do IP

### IPs compartilhados
**O que são:** Empresas, escolas, redes públicas com mesmo IP
**Impacato:** Clientes legítimos diferentes terão mesmo IP
**Solução:** Verificar endereços de entrega e dados pessoais

### Falsos positivos
**O que são:** Situações normais que parecem suspeitas
**Exemplos:** 
- Família comprando com endereços próximos
- Empresa fazendo compras para funcionários
- Clientes comprando presentes
**Solução:** Sempre analisar contexto completo antes de agir

### Limitações técnicas
- **Dados dependem do Shopify registrar o IP corretamente**
- **Análise limitada a 90 dias por questões de performance**
- **Não detecta fraudes entre IPs diferentes**
- **Funciona apenas com pedidos que têm "IP address" nos note_attributes**

## Melhorias recentes

### Novidades na ferramenta
- ✅ **IPs não são mais mascarados** - Você vê o endereço IP completo para melhor análise
- ✅ **Sistema de IPs resolvidos** - Marque casos investigados para organizar o trabalho
- ✅ **Status detalhado dos pedidos** - Veja quantos pedidos estão ativos vs cancelados
- ✅ **Busca histórica otimizada** - Algoritmo em 2 etapas garante dados completos
- ✅ **Interface melhorada** - Botões mais claros e informações organizadas
- ✅ **Detecção aprimorada** - Foca apenas em IPs com clientes realmente diferentes

## Dicas e boas práticas

### Filtros recomendados
- **Para detecção de fraude:** 7-15 dias (comportamento suspeito recente)
- **Para análise comportamental:** 30-60 dias (padrões estabelecidos)  
- **Para auditoria de promoções:** Período específico da campanha
- **Para análise geral:** 30 dias (equilíbrio entre dados e performance)

### Como investigar suspeitas
1. **Comece com dados gerais** - Use tabela principal para identificar padrões
2. **Foque nos mais suspeitos** - Priorize IPs com mais pedidos/menos clientes
3. **Analise detalhes completos** - Use modal de detalhes para investigar
4. **Compare informações** - Verifique nomes, emails, telefones, endereços
5. **Documente evidências** - Anote descobertas para futuras referências
6. **Cruze com outros dados** - Use outras ferramentas do sistema

### Quando escalar casos
🔴 **Escalar imediatamente:**
- Evidências claras de fraude (dados falsos óbvios)
- Valores muito altos envolvidos
- Múltiplas tentativas de contorno do sistema
- Atividade suspeita generalizada

🟡 **Escalar se persistir:**
- Padrões anômalos recorrentes
- Clientes com histórico de problemas
- Situações que geram dúvidas técnicas

### Monitoramento regular
- **Execute análise semanal** para detectar padrões rapidamente
- **Configure alertas** para situações específicas da sua loja
- **Mantenha histórico** das análises para comparação
- **Compartilhe insights** com equipe de marketing/vendas

### Gerenciamento de IPs resolvidos
- **Marque IPs investigados** como resolvidos para organizar o trabalho
- **Use a lista de resolvidos** para referência de casos já tratados  
- **Remova da lista** apenas se o IP precisar ser investigado novamente
- **Mantenha controle** dos IPs já analisados pela equipe

### Documentação recomendada
- **Anote casos suspeitos** encontrados e ações tomadas
- **Registre falsos positivos** para evitar futuros alarmes
- **Compartilhe padrões** com outras pessoas da equipe
- **Mantenha log de investigações** para referência futura