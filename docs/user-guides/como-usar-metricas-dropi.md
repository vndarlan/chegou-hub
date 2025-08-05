# Como usar Métricas DROPI MX

## Para que serve
A página de Métricas DROPI MX permite extrair, analisar e gerenciar dados de pedidos do sistema Dropi México. Você pode filtrar pedidos por período, visualizar estatísticas de entrega, analisar fornecedores e clientes, e salvar análises para consulta posterior.

## Como acessar
1. Faça login no Chegou Hub
2. No menu lateral esquerdo, clique na seção "Métricas"
3. Clique em "📱 DROPI MX"
4. A página vai abrir mostrando o formulário de extração e análises salvas

## Funcionalidades principais

### Extrair pedidos do Dropi
**Para que serve:** Buscar dados de pedidos diretamente da API do Dropi México
**Como usar:**
1. **Defina o período:** Selecione data de início e data fim
2. **User ID Dropi:** Campo vem preenchido com "9789" (padrão), mas pode alterar se necessário
3. **Clique em "Extrair Pedidos"**
4. O sistema conectará na API do Dropi e buscará todos os pedidos do período
5. Aguarde o carregamento - pode demorar alguns segundos dependendo da quantidade

### Visualizar estatísticas dos pedidos
**Para que serve:** Acompanhar performance de vendas e entregas
**Como usar:**
1. Após extrair os dados, aparecerão cards com estatísticas:
   - **Total Pedidos:** Quantidade total encontrada
   - **Valor Total:** Soma de todos os pedidos em R$
   - **Entregues:** Pedidos com status "Entregado a Transportadora"
   - **Taxa Entrega:** Percentual de efetividade das entregas
2. Use essas métricas para avaliar performance do período

### Filtrar dados da tabela
**Para que serve:** Refinar visualização dos pedidos por critérios específicos
**Como usar:**
1. **Filtro por Status:** Digite parte do status (ex: "ENTREGADO", "CANCELADO")
2. **Filtro por Fornecedor:** Digite nome ou parte do nome do fornecedor
3. **Filtro por Nome Cliente:** Busque por nome do cliente
4. Os filtros aplicam automaticamente conforme você digita
5. Contadores mostram quantos pedidos estão sendo exibidos

### Analisar pedidos na tabela
**Para que serve:** Examinar detalhes de cada pedido individualmente
**Como usar:**
1. A tabela mostra informações essenciais:
   - **ID:** Número único do pedido no Dropi
   - **Cliente:** Nome completo e email (quando disponível)
   - **Fornecedor:** Nome da empresa fornecedora
   - **Status:** Status atual com cores indicativas
   - **Valor:** Valor do pedido em R$
   - **Telefone:** Contato do cliente
   - **Cidade:** Endereço de entrega
2. Status são coloridos para facilitar identificação:
   - 🟢 Verde: Entregue
   - 🟠 Laranja: Em preparação
   - 🔴 Vermelho: Cancelado
   - 🟡 Amarelo: Tentativa de entrega

### Salvar análise para consulta posterior
**Para que serve:** Guardar dados extraídos para acessar depois sem precisar reprocessar
**Como usar:**
1. Após extrair dados, clique em "Salvar Análise"
2. Digite um nome descritivo (ex: "Dropi MX Janeiro 2025")
3. Clique em "Salvar"
4. A análise ficará disponível na seção "Análises Salvas"
5. Nome da análise será automaticamente prefixado com "[DROPI-MÉXICO]"

### Carregar análise salva
**Para que serve:** Reabrir dados de uma análise anterior
**Como usar:**
1. Na seção "Análises Salvas", encontre a análise desejada
2. Clique no botão "Carregar" (ícone de olho)
3. Os dados aparecerão na tabela principal
4. Filtros e estatísticas serão atualizados automaticamente
5. Você pode aplicar novos filtros nos dados carregados

### Deletar análise salva
**Para que serve:** Remover análises antigas ou desnecessárias
**Como usar:**
1. Na análise que quer deletar, clique no botão vermelho (ícone lixeira)
2. Confirme a exclusão na janela que aparecer
3. A análise será removida permanentemente
4. **Atenção:** Esta ação não pode ser desfeita

## Casos práticos

### Exemplo 1: Análise mensal de vendas
**Situação:** Você quer analisar todas as vendas de dezembro de 2024
1. Defina data início: 01/12/2024
2. Defina data fim: 31/12/2024
3. Mantenha User ID: 9789
4. Clique em "Extrair Pedidos"
5. Aguarde carregar (pode ser muitos pedidos)
6. Analise as estatísticas nos cards
7. Salve como "Dropi MX - Dezembro 2024"

### Exemplo 2: Investigar problemas de entrega
**Situação:** Muitas reclamações de pedidos não entregues na última semana
1. Extraia dados dos últimos 7 dias
2. No filtro de status, digite "CANCELADO"
3. Analise quantos pedidos foram cancelados
4. Mude filtro para "INTENTO" para ver tentativas de entrega
5. Identifique fornecedores com mais problemas
6. Use dados para tomar ações corretivas

### Exemplo 3: Análise de fornecedores
**Situação:** Quer saber qual fornecedor vende mais
1. Extraia dados de um período maior (ex: último mês)
2. Use filtro de fornecedor para buscar cada empresa
3. Anote quantos pedidos cada um tem
4. Compare valores totais por fornecedor
5. Identifique melhores parceiros

### Exemplo 4: Recuperar dados antigos
**Situação:** Precisa dos dados de vendas de outubro que já havia extraído
1. Vá na seção "Análises Salvas"
2. Procure por "Dropi MX - Outubro 2024"
3. Clique em "Carregar"
4. Dados aparecerão na tabela principal
5. Aplique filtros conforme necessário

## Problemas comuns

### Erro "Token válido não encontrado"
**Sintoma:** Mensagem de erro ao tentar extrair pedidos
**Solução:**
1. **Aguarde alguns minutos** - sistema pode estar renovando token automaticamente
2. **Tente novamente** após 5-10 minutos
3. **Entre em contato** com suporte se persistir - problema técnico com API

### Extração demora muito tempo
**Sintoma:** Processo fica "carregando" por muito tempo
**Solução:**
1. **Seja paciente** - muitos pedidos demoram para processar
2. **Não feche a página** durante extração
3. **Reduza período** se for muito extenso (ex: ao invés de 6 meses, tente 1 mês)
4. **Recarregue página** se travar por mais de 10 minutos

### Dados não aparecem na tabela
**Sintoma:** Extração parece concluir mas tabela fica vazia
**Solução:**
1. **Verifique período** - pode não ter pedidos nessas datas
2. **Confirme User ID** - pode estar incorreto
3. **Limpe filtros** - podem estar ocultando resultados
4. **Tente período menor** para testar

### Não consegue salvar análise
**Sintoma:** Botão salvar não funciona ou dá erro
**Solução:**
1. **Digite nome único** - não pode repetir nome de análise existente
2. **Use nome descritivo** - evite caracteres especiais
3. **Verifique se extraiu dados** - precisa ter dados para salvar
4. **Recarregue página** se botão não responder

### Análise salva não carrega
**Sintoma:** Clica em carregar mas dados não aparecem
**Solução:**
1. **Aguarde carregamento** - dados grandes demoram
2. **Verifique conexão** com internet
3. **Recarregue página** e tente novamente
4. **Análise pode estar corrompida** - delete e refaça se necessário

## Interpretação dos status

### Status de entrega
- **GUIA_GENERADA** 🔵 - Pedido processado, etiqueta criada
- **PREPARADO PARA TRANSPORTADORA** 🟠 - Pronto para envio
- **ENTREGADO A TRANSPORTADORA** 🟢 - Enviado, em trânsito
- **INTENTO DE ENTREGA** 🟡 - Tentativa de entrega (pode ter problemas)
- **CANCELADO** 🔴 - Pedido cancelado
- **PENDIENTE** ⚪ - Aguardando processamento

### Interpretação das métricas
- **Taxa de Entrega acima de 80%** - Performance boa
- **Taxa de Entrega entre 60-80%** - Performance regular, pode melhorar
- **Taxa de Entrega abaixo de 60%** - Performance ruim, investigar problemas
- **Valor médio por pedido** - Divida valor total pelo total de pedidos
- **Pedidos por fornecedor** - Use filtros para analisar individualmente

## Dicas importantes

- **Extraia dados regulamente** - mantenha análises atualizadas mensalmente
- **Use nomes descritivos** para análises salvas incluindo período e propósito
- **Filtros combinados** - use múltiplos filtros para análises mais específicas
- **Monitore taxa de entrega** - indicador chave de performance
- **Identifique padrões** - compare diferentes períodos para ver tendências
- **Backup de dados** - salve análises importantes periodicamente
- **Períodos menores** - para extração mais rápida, use períodos de 1-2 semanas
- **Horário de extração** - evite horários de pico para melhor performance
- **Análise por fornecedor** - identifique parceiros mais confiáveis
- **Acompanhe cancelamentos** - alta taxa pode indicar problemas operacionais