# Como usar Processamento

## Para que serve

A página de Processamento oferece ferramentas para processar e analisar dados de diferentes plataformas. É utilizada principalmente pela equipe de suporte para executar tarefas de processamento, análise de dados e automações específicas.

## Como acessar

1. Faça login no Chegou Hub
2. No menu lateral esquerdo, clique em "Suporte"
3. Clique em "⚙️ Processamento"
4. A página carregará as ferramentas de processamento disponíveis

## Funcionalidades principais

### Processar dados de plataformas
**Para que serve:** Executar análises e processamentos em dados de diferentes sistemas
**Como usar:**
1. Selecione a plataforma ou tipo de processamento desejado
2. Configure os parâmetros necessários
3. Insira dados de entrada (URLs, IDs, etc.)
4. Clique em "Processar" ou "Executar"
5. Aguarde resultado do processamento

### Análise de Shopify
**Para que serve:** Detectar e analisar lojas Shopify
**Como usar:**
1. Vá para seção de análise Shopify
2. Insira URL da loja ou domínio
3. Configure parâmetros de análise
4. Execute a detecção
5. Revise resultados e métricas encontradas

### Configurar parâmetros
**Para que serve:** Ajustar configurações para diferentes tipos de processamento
**Como usar:**
1. Acesse seção de configurações
2. Defina parâmetros específicos:
   - Timeouts
   - Filtros
   - Critérios de análise
   - Formato de saída
3. Salve configurações
4. Use nas próximas execuções

### Monitorar execuções
**Para que serve:** Acompanhar status e progresso dos processamentos
**Como usar:**
1. Acesse seção de monitoramento
2. Veja lista de execuções recentes
3. Observe status de cada processamento:
   - Em andamento
   - Concluído
   - Com erro
4. Clique em execução para ver detalhes

### Exportar resultados
**Para que serve:** Baixar dados processados para análise externa
**Como usar:**
1. Após processamento concluído
2. Clique em "Exportar" ou "Download"
3. Escolha formato (CSV, JSON, Excel)
4. Arquivo será baixado automaticamente
5. Use dados em outras ferramentas

### Ver logs de processamento
**Para que serve:** Diagnosticar problemas e acompanhar detalhes técnicos
**Como usar:**
1. Acesse seção de logs
2. Filtre por data, tipo ou status
3. Visualize mensagens detalhadas
4. Use para identificar erros ou problemas
5. Compartilhe com equipe técnica se necessário

## Casos práticos

### Exemplo 1: Analisar loja Shopify de cliente
**Situação:** Cliente quer saber se site é Shopify e que apps usa
1. Vá para seção "Análise Shopify"
2. Digite URL da loja: "minhaloja.com.br"
3. Clique "Analisar"
4. Aguarde processamento completar
5. Revise resultados:
   - Confirmação se é Shopify
   - Apps instalados
   - Tema utilizado
   - Configurações detectadas

### Exemplo 2: Processar lista de URLs
**Situação:** Tem 50 URLs para analisar em lote
1. Acesse ferramenta de processamento em lote
2. Cole lista de URLs (uma por linha)
3. Configure parâmetros de análise
4. Execute processamento
5. Aguarde conclusão e baixe resultados em CSV

### Exemplo 3: Configurar automação personalizada
**Situação:** Precisa processar dados específicos regularmente
1. Vá para configurações avançadas
2. Defina parâmetros específicos:
   - Filtros personalizados
   - Critérios de detecção
   - Formato de saída
3. Salve configuração com nome descritivo
4. Use configuração em futuras execuções

### Exemplo 4: Investigar erro em processamento
**Situação:** Processamento falhou e precisa investigar
1. Acesse seção de logs
2. Filtre por execuções com erro
3. Encontre processamento problemático
4. Leia mensagens de erro detalhadas
5. Identifique causa e tome ação corretiva

## Problemas comuns

### Processamento trava ou demora muito
**Sintoma:** Fica "processando" por muito tempo sem resultado
**Solução:**
1. **Aguardar:** Processamentos complexos podem demorar
2. **Verificar dados:** URLs muito grandes podem causar timeout
3. **Reduzir escopo:** Processe menos itens por vez
4. **Retentar:** Cancele e tente novamente se necessário

### Erro de timeout ou conexão
**Sintoma:** Aparece erro de tempo limite ou falha de conexão
**Solução:**
1. **Internet:** Verifique estabilidade da conexão
2. **URLs válidas:** Certifique-se que URLs estão acessíveis
3. **Aguardar:** Tente novamente após alguns minutos
4. **Configurações:** Ajuste timeout nas configurações se disponível

### Resultados incompletos ou vazios
**Sintoma:** Processamento completa mas retorna poucos/nenhum dado
**Solução:**
1. **Verificar entrada:** Confirme que dados de entrada estão corretos
2. **Critérios:** Ajuste filtros que podem estar muito restritivos
3. **Permissões:** Site pode bloquear análises automáticas
4. **Tentar manualmente:** Teste URLs individualmente

### Não consegue exportar resultados
**Sintoma:** Botão exportar não funciona ou arquivo vazio
**Solução:**
1. **Aguardar:** Certifique-se que processamento terminou completamente
2. **Dados disponíveis:** Verifique se há resultados para exportar
3. **Navegador:** Tente em navegador diferente
4. **Popup blocker:** Desabilite bloqueador de popup temporariamente

### Configurações não salvam
**Sintoma:** Muda configurações mas elas não persistem
**Solução:**
1. **Salvar explicitamente:** Clique em botão "Salvar" se disponível
2. **Campos obrigatórios:** Preencha todos os campos necessários
3. **Permissões:** Verifique se tem permissão para alterar configurações
4. **Sessão:** Faça logout e login novamente

## Tipos de processamento

### Análise de plataformas
- **Shopify:** Detecção de lojas e apps
- **WordPress:** Identificação de temas e plugins
- **E-commerce geral:** Análise de estrutura
- **Landing pages:** Verificação de elementos

### Processamento de dados
- **Limpeza:** Remoção de duplicatas e inconsistências
- **Validação:** Verificação de URLs e dados
- **Enrichment:** Adição de informações complementares
- **Transformação:** Conversão entre formatos

### Automações
- **Coleta:** Extração automática de dados
- **Monitoramento:** Acompanhamento de mudanças
- **Alertas:** Notificações baseadas em critérios
- **Relatórios:** Geração automática de análises

## Configurações importantes

### Timeouts
- **Curto (5-10s):** Para verificações rápidas
- **Médio (30-60s):** Para análises normais
- **Longo (2-5min):** Para processamentos complexos

### Filtros
- **Por domínio:** Analisar apenas domínios específicos
- **Por tecnologia:** Focar em plataformas específicas
- **Por região:** Limitar análise geográfica
- **Por tamanho:** Filtrar por tamanho do site

### Formatos de saída
- **CSV:** Para análise em Excel/planilhas
- **JSON:** Para integração com outros sistemas
- **PDF:** Para relatórios formais
- **XML:** Para estruturas complexas

## Dicas importantes

- **Teste com poucos itens** antes de processar lotes grandes
- **Use timeouts adequados** para evitar falhas desnecessárias
- **Monitore logs** para identificar problemas rapidamente
- **Salve configurações** úteis para reutilizar
- **Exporte resultados** antes que expirem
- **Documente processos** para outros membros da equipe
- **Verifique permissões** antes de iniciar processamentos grandes
- **Mantenha URLs limpos** (sem espaços ou caracteres especiais)
- **Use filtros** para focar análise no que é relevante
- **Comunique execuções grandes** para equipe técnica