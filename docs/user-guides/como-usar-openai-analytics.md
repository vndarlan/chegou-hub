# Como usar OpenAI Analytics

## Para que serve

A página OpenAI Analytics é um centro de controle completo para monitorar gastos, uso e eficiência das APIs da OpenAI utilizadas pela empresa. Com ela você pode acompanhar custos em tempo real, analisar padrões de uso por modelo de IA, sincronizar dados diretamente da OpenAI, e exportar relatórios detalhados para controle financeiro.

## Como acessar

1. Faça login no Chegou Hub
2. No menu lateral esquerdo, clique na seção "IA & Automações"  
3. Clique em "📊 OpenAI Analytics"
4. A página vai abrir mostrando dashboard completo de monitoramento

## Funcionalidades principais

### Ver visão geral de gastos
**Para que serve:** Acompanhar métricas principais de uso da OpenAI
**Como usar:**
1. **Cards no topo** mostram resumo do período selecionado:
   - **💰 Gasto Total:** Valor em dólares gastos com APIs
   - **📊 Total Requests:** Quantidade de chamadas para API
   - **⚡ Total Tokens:** Tokens processados (entrada + saída)
   - **🤖 Modelo Top:** Modelo de IA mais utilizado
2. **Valores atualizados automaticamente** conforme filtros aplicados
3. Use para acompanhar evolução dos gastos

### Filtrar dados por período
**Para que serve:** Analisar gastos em períodos específicos
**Como usar:**
1. **Seletor de período** no canto superior direito
2. **Opções disponíveis:**
   - "Últimos 7 dias" (padrão)
   - "Últimos 14 dias" 
   - "Últimos 30 dias" (máximo permitido)
3. **Dados são atualizados** automaticamente após seleção
4. Use períodos menores para análises detalhadas

### Filtrar por API Keys específicas
**Para que serve:** Analisar uso de chaves de API específicas
**Como usar:**
1. **Seletor "API Keys"** ao lado do período
2. **Por padrão** mostra "Todas as API Keys"
3. **Selecione uma chave** específica para análise individual
4. **Dados filtrados** mostram apenas uso da chave selecionada
5. Útil para análise por departamento ou projeto

### Validar configuração da API Key
**Para que serve:** Verificar se API key está configurada corretamente
**Como usar:**
1. **Botão "Validar Key"** no canto superior direito
2. **Clique para verificar:**
   - Se API key é válida
   - Se tem permissões de administrador
   - Qual organização está conectada
3. **Status mostrado:**
   - ✅ **Verde "Admin":** API key válida com permissões
   - ⚠️ **Amarelo "Sem Admin":** Válida mas sem permissões admin
   - ❌ **Vermelho "Inválida":** API key com problema
4. **Só funciona sincronização** com status verde

### Sincronizar dados com OpenAI
**Para que serve:** Buscar dados atualizados diretamente da OpenAI
**Como usar:**
1. **Botão "Sincronizar"** no canto superior direito
2. **Antes de sincronizar:** Sistema valida automaticamente API key
3. **Durante sincronização:**
   - Botão muda para "Sincronizando..."
   - Aguarde processo completar
4. **Limitações:**
   - Máximo 30 dias por sincronização
   - Requer API key com permissões admin
   - Não busca dados futuros
5. **Após sucesso:** Dados são recarregados automaticamente

### Analisar timeline de gastos
**Para que serve:** Ver evolução diária dos gastos
**Como usar:**
1. **Aba "Timeline de Gastos"** (primeira aba)
2. **Gráfico de linhas** mostra gastos diários
3. **Cada API key** tem cor diferente no gráfico
4. **Passe mouse** sobre pontos para ver valores exatos
5. **Use para identificar:**
   - Picos de uso
   - Tendências de crescimento
   - Comparação entre API keys

### Analisar breakdown por modelo
**Para que serve:** Ver quais modelos de IA custam mais
**Como usar:**
1. **Aba "Breakdown por Modelo"**
2. **Gráfico de barras horizontal** mostra custos por modelo
3. **Ordenado automaticamente** do mais caro para mais barato
4. **Use para:**
   - Identificar modelos mais caros
   - Otimizar escolha de modelos
   - Negociar contratos baseado em uso

### Ver insights avançados
**Para que serve:** Obter análises automáticas dos dados
**Como usar:**
1. **Aba "Insights"**
2. **Cards mostram:**
   - **💰 API Key Mais Cara:** Qual chave gastou mais
   - **📅 Dia de Maior Gasto:** Data com maior custo
   - **📈 Melhor Custo/Benefício:** Modelo mais eficiente
3. **Valores calculados automaticamente** pelo sistema
4. Use para decisões estratégicas sobre uso de IA

### Examinar registros detalhados
**Para que serve:** Ver dados granulares de cada uso
**Como usar:**
1. **Aba "Detalhes"**
2. **Tabela mostra:**
   - Data do uso
   - Nome da API key
   - Modelo utilizado
   - Custo total, de input e output
3. **50 registros mais recentes** do período
4. **Útil para:**
   - Auditoria detalhada
   - Identificar usos específicos
   - Rastrear gastos pontuais

### Exportar dados para análise
**Para que serve:** Baixar dados para análise externa
**Como usar:**
1. **Botão "Exportar"** no canto superior direito
2. **Menu dropdown** com opções:
   - **💰 Custos (CSV):** Planilha com dados de custos
   - **📊 Uso (CSV):** Planilha com dados de usage
   - **📋 Resumo Completo (JSON):** Arquivo técnico completo
3. **Arquivo baixado automaticamente** no seu computador
4. **Nome do arquivo** inclui datas do período selecionado

### Monitorar status de sincronização
**Para que serve:** Acompanhar saúde das sincronizações
**Como usar:**
1. **Card "Status da Sincronização"** na parte inferior
2. **Informações mostradas:**
   - Data/hora da última sincronização
   - Status: ✅ Sucesso ou ❌ Erro  
   - Mensagem de erro (se houver)
3. **Use para identificar** problemas recorrentes
4. **Contate administrador** se status sempre em erro

## Casos práticos

### Exemplo 1: Controle mensal de orçamento
**Situação:** Quer saber se está dentro do orçamento mensal de IA
1. Acesse OpenAI Analytics
2. Selecione período "Últimos 30 dias"
3. Anote valor do card "Gasto Total"
4. Compare com orçamento aprovado
5. Se próximo do limite, analise aba "Breakdown por Modelo"
6. Identifique modelos mais caros para otimizar
7. Use insights para tomar decisões sobre uso

### Exemplo 2: Investigar pico de gastos
**Situação:** Gasto aumentou muito na semana passada
1. Selecione período "Últimos 7 dias"
2. Vá na aba "Timeline de Gastos"
3. Identifique dia com pico no gráfico
4. Vá na aba "Detalhes"
5. Examine registros daquele dia específico
6. Identifique API key ou modelo responsável
7. Investigue cause do aumento (novo projeto, erro, etc.)

### Exemplo 3: Comparar eficiência de modelos
**Situação:** Quer escolher modelo mais econômico
1. Acesse aba "Breakdown por Modelo"
2. Veja modelos ordenados por custo total
3. Vá na aba "Insights" 
4. Verifique card "Melhor Custo/Benefício"
5. Na aba "Detalhes", compare custos por token
6. Teste modelo mais eficiente em projeto piloto
7. Use dados para decisão de migração

### Exemplo 4: Auditoria por departamento
**Situação:** Quer saber quanto cada área gastou
1. No filtro "API Keys", selecione chave do departamento
2. Anote valor do "Gasto Total"
3. Repita processo para cada departamento
4. Exporte dados usando "Custos (CSV)"
5. Crie planilha consolidada com gastos por área
6. Use para cobrança interna ou rateio de custos

### Exemplo 5: Preparar relatório executivo
**Situação:** CEO quer relatório de uso de IA
1. Selecione período "Últimos 30 dias"
2. Anote todas métricas dos cards superiores
3. Vá na aba "Insights" e colete dados principais
4. Exporte "Resumo Completo (JSON)" para backup
5. Crie apresentação com:
   - Gasto total e comparação com mês anterior
   - Modelos mais utilizados
   - Eficiência por API key
   - Recomendações baseadas nos insights

## Problemas comuns

### Erro "API key inválida" ao sincronizar
**Sintoma:** Botão "Validar Key" mostra status vermelho
**Solução:**
1. **Verifique configuração:** API key pode não estar configurada no sistema
2. **Contate administrador:** Peça para verificar variável OPENAI_ADMIN_API_KEY  
3. **API key expirada:** Pode precisar gerar nova na OpenAI
4. **Organização mudou:** API key pode não ter mais acesso à organização
5. **Use apenas para monitoramento** até resolver problema

### Erro "Sem permissões admin"
**Sintoma:** Validação funciona mas sincronização falha
**Solução:**
1. **API key comum:** Atual não tem permissões de administrador
2. **Gere nova API key:** Acesse platform.openai.com/settings/organization/admin-keys
3. **Selecione permissões:** Marque "Admin" ao criar
4. **Substitua no sistema:** Peça administrador para atualizar configuração
5. **Revalide:** Teste novamente após substituição

### Dados não carregam ou ficam em branco
**Sintoma:** Cards mostram $0.00 e gráficos vazios
**Solução:**
1. **Sem dados no período:** Tente período maior (30 dias)
2. **Primeira vez:** Sistema pode não ter dados sincronizados ainda
3. **Execute sincronização:** Use botão "Sincronizar" para buscar dados
4. **Filtros muito específicos:** Remova filtro de API key específica
5. **Problemas de conexão:** Recarregue página (F5)

### Erro "Bad Request" durante sincronização
**Sintoma:** Sincronização falha com erro 400
**Solução:**
1. **Período muito longo:** Use máximo 30 dias
2. **Datas futuras:** Sistema não busca dados do futuro
3. **API OpenAI instável:** Tente novamente em alguns minutos
4. **Aguarde:** Deixe sincronização anterior terminar completamente
5. **Recarregue página:** Se erro persistir, atualize navegador

### Gráficos não aparecem corretamente
**Sintoma:** Timeline ou breakdown mostram erro ou ficam vazios
**Solução:**
1. **Dados insuficientes:** Período pode ter poucos registros
2. **JavaScript desabilitado:** Verifique configurações do navegador
3. **Navegador antigo:** Use Chrome, Firefox ou Edge atualizados
4. **Cache:** Limpe cache do navegador (Ctrl+F5)
5. **Aguarde carregamento:** Gráficos podem demorar alguns segundos

### Exportação não funciona
**Sintoma:** Clica em exportar mas arquivo não baixa
**Solução:**
1. **Pop-up bloqueado:** Navegador pode estar bloqueando download
2. **Pasta Downloads cheia:** Verifique espaço em disco
3. **Extensões:** Desative ad-blockers temporariamente  
4. **Período sem dados:** Não há dados para exportar no período
5. **Tente formato diferente:** CSV se JSON não funcionar

### Status sempre mostra "erro de sincronização"
**Sintoma:** Card de status nunca mostra sucesso
**Solução:**
1. **API key problema:** Resolva primeiro problemas de validação
2. **Permissões OpenAI:** Verifique se API key não foi revogada
3. **Limite de rate:** OpenAI pode ter limite de chamadas atingido
4. **Configuração servidor:** Problema pode ser no backend
5. **Contate suporte técnico:** Se problema persistir por dias

## Interpretação das métricas

### Entendendo os custos
- **Input Cost:** Custo dos tokens de entrada (pergunta)
- **Output Cost:** Custo dos tokens de saída (resposta)
- **Total Cost:** Soma de input + output
- **Custos em dólares:** Sempre em USD, convertidos da API OpenAI

### Modelos mais comuns
- **gpt-4:** Modelo mais avançado, mais caro
- **gpt-3.5-turbo:** Modelo padrão, custo moderado
- **text-embedding:** Para embeddings, muito barato
- **whisper:** Para transcrição de áudio

### Status de API Keys
- ✅ **Verde "Admin":** Funcionando perfeitamente
- ⚠️ **Amarelo "Sem Admin":** Apenas visualização, não sincroniza
- ❌ **Vermelho "Inválida":** Problema na configuração

### Níveis de prioridade para ação
- **🔴 Crítico:** Gasto 50%+ acima da média
- **🟠 Atenção:** Crescimento acelerado detectado  
- **🟢 Normal:** Dentro dos padrões esperados

## Melhores práticas

### Monitoramento regular
- **Verifique semanalmente** gastos e tendências
- **Configure alertas** baseado nos insights
- **Compare mês a mês** para identificar padrões
- **Documente picos** para entender causas

### Otimização de custos
- **Use modelos apropriados** para cada tipo de tarefa
- **Monitore tokens** de entrada e saída
- **Otimize prompts** para reduzir tokens desnecessários
- **Considere fine-tuning** para modelos específicos

### Gestão de API Keys
- **Rotacione regularmente** por segurança
- **Use uma por departamento** para rastreamento
- **Monitore permissões** mensalmente
- **Configure limites** de uso quando possível

### Relatórios e governança
- **Exporte dados mensalmente** para histórico
- **Crie relatórios executivos** com insights principais
- **Estabeleça orçamentos** por área ou projeto
- **Revise modelos utilizados** trimestralmente

## Dicas importantes

- **Sistema focado em custos** - não mostra sucessos, apenas gastos
- **Dados sempre em USD** - converta para BRL se necessário
- **Máximo 30 dias** por sincronização devido a limitações da API
- **Permissões admin obrigatórias** para sincronização funcionar  
- **Timeline mostra tendências** mais importantes que valores absolutos
- **Insights são calculados automaticamente** pelo sistema
- **Exportações incluem datas** no nome do arquivo
- **Status de sincronização** é crucial para confiabilidade dos dados
- **Use filtros combinados** para análises específicas
- **Dados históricos** são preservados mesmo após mudanças de API key