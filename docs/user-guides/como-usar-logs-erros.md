# Como usar Logs IA

## Para que serve
A página de Monitoramento de Erros é uma central de acompanhamento de falhas críticas dos sistemas de inteligência artificial da empresa, especialmente o Nicochat e N8N. Permite visualizar, filtrar, analisar e resolver problemas técnicos em tempo real.

## Como acessar
1. Faça login no Chegou Hub  
2. No menu lateral esquerdo, clique na seção "IA & Automações"
3. Clique em "🔍 Logs" 
4. A página "Monitoramento de Erros" vai abrir mostrando estatísticas e a central de logs

## Funcionalidades principais

### Visualizar estatísticas de erros
**Para que serve:** Ter uma visão geral da saúde do sistema IA
**Como usar:**
1. **3 cards no canto superior direito** mostram métricas principais:
   - **Total:** Quantidade total de erros (cor vermelha)
   - **Pendentes:** Erros que ainda precisam de atenção (cor laranja)
   - **Críticos:** Erros graves (cor vermelha)
2. **Botão "Atualizar"** permite recarregar as estatísticas
3. Use essas métricas para avaliar estabilidade geral do sistema

### Analisar erros por ferramenta
**Para que serve:** Identificar qual sistema tem mais problemas
**Como usar:**
1. **Seção "Erros por Ferramenta"** aparece abaixo dos cards principais
2. Mostra breakdown por sistema:
   - **🤖 Nicochat:** Erros do chatbot (ícone de robô)
   - **⚙️ N8N:** Erros do sistema de automação (ícone de engrenagem)
3. Para cada ferramenta mostra um **badge vermelho** com quantidade de erros
4. Use para identificar qual ferramenta precisa mais atenção

### Filtrar logs de erro
**Para que serve:** Encontrar erros específicos ou por critérios
**Como usar:**
1. **Ferramenta:** Menu suspenso para escolher "Todas", "Nicochat" ou "N8N"
2. **Gravidade:** 
   - "Todos os erros" (padrão)
   - "Apenas Error" (problemas comuns)
   - "Apenas Critical" (problemas graves)
3. **País:** Menu suspenso com opções como Colômbia, Chile, México, Polônia, etc.
4. **Status:** Escolha "Todos", "Pendentes" ou "Resolvidos"
5. **Período:** "Última hora", "Últimas 6h", "Últimas 24h", "Últimos 7 dias" ou "Últimos 30 dias"
6. **Buscar:** Campo de texto para procurar palavras na mensagem de erro
7. Os filtros se aplicam automaticamente quando você faz uma seleção

### Examinar detalhes dos erros
**Para que serve:** Entender exatamente o que aconteceu
**Como usar:**
1. **Na tabela de erros**, clique no ícone de olho (👁️) para ver detalhes
2. **Modal de detalhes mostra:**
   - **Ferramenta e gravidade** com badges coloridas
   - **País** (se for erro do Nicochat)
   - **🚨 Mensagem de Erro:** Descrição completa do problema
   - **💬 ID da Conversa:** (se aplicável) 
   - **🔧 Detalhes Técnicos:** JSON com informações técnicas
   - **🕒 Data/hora** e **🌐 IP de origem**
3. Use essas informações para diagnosticar problemas

### Marcar erros como resolvidos
**Para que serve:** Controlar quais problemas já foram tratados
**Como usar:**
1. **Na tabela**, clique no ícone de check (✅) ou X (❌)
2. **Para resolver um erro:**
   - Digite observações sobre como foi resolvido
   - Clique em "Marcar Resolvido"
3. **Para reabrir um erro resolvido:**
   - Clique no X no erro resolvido
   - Confirme a reabertura
4. **Status na tabela:**
   - ✅ Verde: "Resolvido" 
   - ⏳ Cinza: "Pendente"

### Navegar pela paginação
**Para que serve:** Ver todos os erros quando há muitos registros
**Como usar:**
1. **Abaixo da tabela** aparecem os controles de paginação
2. **Navegue usando:**
   - Botões "Anterior" e "Próximo" (setas)
   - Números das páginas (1, 2, 3, 4, 5)
3. **Informações mostradas:** "Página X de Y (Z erros no total)"
4. **10 erros por página** - o sistema divide automaticamente
5. A página atual fica destacada em azul

### Atualizar dados em tempo real
**Para que serve:** Ver erros mais recentes
**Como usar:**
1. **Botão "Atualizar"** no canto superior direito
2. Clique para recarregar dados mais recentes
3. **Auto-atualização:** Dados carregam automaticamente ao mudar filtros

## Casos práticos

### Exemplo 1: Investigar problemas do Nicochat
**Situação:** Usuários reclamando que chatbot não responde
1. Acesse página de Logs IA
2. No filtro "Ferramenta", selecione "Nicochat"
3. No filtro "País", escolha país com problemas
4. No período, selecione "Últimas 24h"
5. Analise quantidade de erros críticos
6. Clique em erros específicos para ver detalhes
7. Procure padrões nas mensagens de erro
8. Marque como resolvido após correção

### Exemplo 2: Monitoramento diário de sistemas
**Situação:** Verificação de rotina da saúde dos sistemas
1. Abra página de Logs IA pela manhã
2. Verifique cards de estatísticas no topo
3. Se "Total de Erros (7d)" estiver alto, investigue
4. Veja seção "Erros por Ferramenta"
5. Identifique qual sistema precisa atenção
6. Filtre por "Não Resolvidos" para ver pendências
7. Trate erros críticos primeiro

### Exemplo 3: Análise de tendências
**Situação:** Quer saber se sistemas estão melhorando
1. Filtre por período de "30 dias"
2. Anote quantidade total de erros
3. Mude para "7 dias" e compare
4. Se número diminuiu, sistemas estão melhorando  
5. Se aumentou, pode haver problema novo
6. Use buscar por palavras-chave para encontrar padrões

### Exemplo 4: Resolução de incidente crítico
**Situação:** Sistema N8N parou de funcionar
1. Filtre por "N8N" na ferramenta
2. Filtre por "Critical" na gravidade
3. Veja erros mais recentes
4. Examine detalhes técnicos dos erros
5. Após corrigir problema, marque erros como resolvidos
6. Adicione observações sobre a solução

## Problemas comuns

### Muitos erros críticos aparecem
**Sintoma:** Dashboard mostra muitos erros vermelhos
**Solução:**
1. **Não entre em pânico** - sistema ainda pode estar funcionando
2. **Examine detalhes** - podem ser erros temporários
3. **Verifique padrões** - se são do mesmo tipo, problema específico
4. **Contate equipe técnica** se persistir por horas

### Logs não carregam ou ficam em branco
**Sintoma:** Tabela vazia ou spinner infinito
**Solução:**
1. **Verifique conexão** com internet
2. **Recarregue página** (F5)
3. **Limpe filtros** - podem estar muito restritivos
4. **Tente período maior** - pode não ter erros no período selecionado

### Não consegue marcar erro como resolvido
**Sintoma:** Botão não funciona ou não salva
**Solução:**
1. **Adicione observações** - campo pode ser obrigatório
2. **Verifique permissões** - pode não ter autorização
3. **Recarregue página** e tente novamente
4. **Verifique conexão** - precisa comunicar com servidor

### Filtros não funcionam corretamente
**Sintoma:** Filtro aplicado mas dados não mudam
**Solução:**
1. **Aguarde alguns segundos** - filtro pode estar processando
2. **Limpe filtros** e aplique novamente
3. **Recarregue página** se não responder
4. **Combinação de filtros** pode não ter resultados

### Detalhes técnicos difíceis de entender
**Sintoma:** JSON e códigos de erro complexos
**Solução:**
1. **Foque na mensagem principal** - geralmente é mais clara
2. **Copie detalhes** e encaminhe para equipe técnica
3. **Procure padrões** - mensagens similares podem indicar causa comum
4. **Use campo de observações** para documentar achados

## Interpretação dos status de erro

### Níveis de gravidade
- **🟠 ERROR:** Problemas comuns que não param sistema
- **🔴 CRITICAL:** Falhas graves que afetam funcionamento

### Status de resolução  
- **⏳ Pendente:** Erro ainda não foi investigado/resolvido
- **✅ Resolvido:** Problema foi tratado e documentado

### Indicadores por país (Nicochat)
- **🇨🇴 Colômbia, 🇨🇱 Chile, 🇲🇽 México:** Países Latino-americanos
- **🇵🇱 Polônia, 🇷🇴 Romênia, 🇪🇸 Espanha, 🇮🇹 Itália:** Países Europeus

### Ferramentas monitoradas
- **🤖 Nicochat:** Sistema de chatbot inteligente
- **⚙️ N8N:** Plataforma de automação de processos

## Melhores práticas

### Monitoramento proativo
- **Verifique diariamente** estatísticas de erro
- **Resolva críticos imediatamente** - podem afetar usuários
- **Documente soluções** nas observações para consulta futura
- **Identifique padrões** - erros recorrentes indicam problema sistêmico

### Gestão de incidentes
- **Priorize por gravidade** - críticos primeiro
- **Agrupe erros similares** - podem ter mesma causa raiz
- **Mantenha histórico** - não delete, marque como resolvido
- **Comunique com equipe** sobre problemas persistentes

### Análise de dados
- **Compare períodos** para identificar tendências
- **Use filtros combinados** para análises específicas
- **Acompanhe por país** no Nicochat para problemas regionais
- **Monitore após mudanças** no sistema

## Dicas importantes

- **Página focada em erros** - só mostra problemas, não sucessos
- **Atualize regularmente** - novos erros aparecem constantemente  
- **Não ignore críticos** - podem indicar falhas graves
- **Documente tudo** - observações ajudam equipe e você no futuro
- **Use períodos apropriados** - 24h para monitoramento diário, 7d para tendências
- **Filtros são poderosos** - combine múltiplos para análises específicas
- **Detalhes técnicos são importantes** - mesmo não entendendo, ajudam especialistas
- **Mantenha calma** - erros são normais em sistemas complexos, importante é monitorar e resolver