# Como usar Projetos IA

## Para que serve

O Projetos IA permite criar, gerenciar e acompanhar projetos de inteligência artificial da empresa. Com ele você pode cadastrar novos projetos, acompanhar custos, definir prioridades e visualizar métricas de desempenho dos projetos de IA.

## Como acessar

1. Faça login no Chegou Hub
2. No menu lateral esquerdo, clique em "IA & Automações"
3. Clique em "🤖 Projetos"
4. A página mostrará o dashboard com contadores e lista de projetos em tabela

## Dashboard principal

### Contadores no cabeçalho
A página mostra contadores em tempo real:
- **Total:** Número total de projetos no sistema
- **Ativos:** Projetos em funcionamento normal (ícone verde)
- **Em Construção:** Projetos sendo desenvolvidos (ícone martelo azul) 
- **Manutenção:** Projetos temporariamente parados (ícone chave amarelo)
- **Arquivados:** Projetos finalizados ou cancelados (ícone arquivo cinza)

### Visualização em tabela
**Para que serve:** Ver todos os projetos de forma organizada
**Como usar:**
1. A página principal mostra uma tabela com todos os projetos
2. Cada linha da tabela exibe:
   - **Nome do projeto** e responsáveis
   - **Status:** Ativo, Em Construção, Manutenção ou Arquivado
   - **Tipo:** Automação, ChatBot, Agente ou Outros
   - **Versão atual** e dias desde última atualização
   - **Botões de ação** para diferentes operações
3. Dados financeiros aparecem apenas se você tiver permissão

## Funcionalidades principais

### Criar novo projeto
**Para que serve:** Cadastrar um novo projeto de IA no sistema
**Como usar:**
1. Clique no botão "Novo Projeto" no canto superior direito
2. O formulário abre com 3 abas: **Básico**, **Detalhes** e **Financeiro**

#### Aba Básico (obrigatória)
1. **Nome do Projeto:** Título descritivo (ex: "Chatbot de Atendimento")
2. **Descrição:** O que o projeto faz em detalhes
3. **Tipo de Projeto:** Escolha entre 4 opções:
   - **Automação:** Para processos automatizados
   - **ChatBot:** Para sistemas de conversa
   - **Agente:** Para assistentes inteligentes
   - **Outros:** Para projetos que não se encaixam nas categorias acima
4. **Departamentos:** Selecione um ou mais departamentos que o projeto atende:
   - Diretoria, Gestão, Operacional, IA & Automações, Suporte, Tráfego Pago
5. **Criadores/Responsáveis:** Selecione as pessoas responsáveis pelo projeto

#### Aba Detalhes
1. **Prioridade:** Alta, Média ou Baixa
2. **Complexidade:** Alta, Média ou Baixa  
3. **Link do Projeto:** URL de acesso (se houver)
4. **Nível de Autonomia:** 
   - Totalmente Autônomo
   - Requer Supervisão
   - Processo Manual
5. **Frequência de Uso:** Diário, Semanal, Mensal, Trimestral ou Eventual

#### Seção Documentação (na aba Detalhes)
1. **Link da Documentação Técnica:** URL única para documentação principal
2. **Documentação de Apoio:** Múltiplos links para documentos auxiliares
   - Clique "+ Adicionar Link" para incluir mais URLs
   - Use o "X" para remover links desnecessários
3. **Lições Aprendidas:** Texto livre sobre o que funcionou e desafios
4. **Próximos Passos:** Melhorias e funcionalidades planejadas
5. **Data de Próxima Revisão:** Quando reavaliar o projeto (opcional)

#### Aba Financeiro (opcional)
1. **Custo APIs/Mês:** Gastos mensais com ChatGPT, Claude, etc.
   - Selecione moeda: R$ (Real) ou US$ (Dólar)
2. **Ferramentas/Infraestrutura:** Lista de ferramentas com custos
   - Digite nome da ferramenta e valor mensal
   - Clique "+ Adicionar Ferramenta" para mais itens
   - Selecione moeda para todas as ferramentas

3. **Salvar:** Clique "Criar Projeto" para finalizar
4. O projeto aparecerá na tabela principal

### Editar projeto existente
**Para que serve:** Modificar informações de um projeto já criado
**Como usar:**
1. Na tabela, localize o projeto que deseja editar
2. Clique no botão verde com ícone de lápis (Edit)
3. O formulário abre com os dados atuais preenchidos
4. Modifique as informações nas abas Básico, Detalhes ou Financeiro
5. Clique em "Salvar" para confirmar as alterações
6. As mudanças aparecerão imediatamente na tabela

### Visualizar detalhes do projeto
**Para que serve:** Ver informações completas de um projeto
**Como usar:**
1. Na tabela, clique no botão azul com ícone de olho (Eye)
2. Abre um modal com 3 abas:
   - **Informações:** Descrição, status, departamentos, criadores
   - **Financeiro:** Custos de APIs e ferramentas (se tiver permissão)
   - **Histórico:** Datas de criação, versões e alterações
3. Clique fora do modal ou no "X" para fechar

### Gerenciar status dos projetos
**Para que serve:** Controlar o ciclo de vida dos projetos
**Como usar:**
1. Na tabela, cada projeto mostra botões coloridos para mudar status:
   - **Botão verde (Activity):** Ativar projeto
   - **Botão azul (Hammer):** Marcar como "Em Construção"
   - **Botão amarelo (Wrench):** Colocar em "Manutenção"
   - **Botão vermelho (Archive):** Arquivar projeto
2. Apenas os botões relevantes aparecem (não mostra o status atual)
3. Clique no botão desejado para alterar o status imediatamente
4. Os contadores no cabeçalho são atualizados automaticamente

#### Significado dos status:
- **Ativo:** Projeto funcionando normalmente
- **Em Construção:** Projeto sendo desenvolvido
- **Manutenção:** Projeto temporariamente parado para correções
- **Arquivado:** Projeto finalizado ou cancelado

### Filtrar e buscar projetos
**Para que serve:** Encontrar projetos específicos rapidamente
**Como usar:**
1. **Barra de busca:** Digite nome do projeto na caixa com ícone de lupa
2. **Filtros avançados:** Use os dropdowns na área cinza:
   - **Status:** Ativo, Em Construção, Manutenção, Arquivado
   - **Tipo:** Automação, ChatBot, Agente, Outros
   - **Departamento:** Diretoria, Gestão, Operacional, etc.
   - **Prioridade:** Alta, Média, Baixa
   - **Complexidade:** Alta, Média, Baixa
3. **Múltipla seleção:** Pode selecionar vários itens em cada filtro
4. **Aplicação automática:** Filtros são aplicados conforme você seleciona
5. **Busca com delay:** Digite na busca e aguarde meio segundo para filtrar

### Criar nova versão do projeto
**Para que serve:** Registrar atualizações e mudanças importantes
**Como usar:**
1. Na tabela, clique no botão roxo com ícone de bifurcação (GitBranch)
2. Abre modal mostrando a versão atual (ex: v1.0.0)
3. Digite a **Nova Versão** (ex: 1.1.0, 2.0.0)
4. Descreva o **Motivo da Mudança** (novas funcionalidades, correções)
5. Clique "Criar Versão"
6. A nova versão aparece na coluna "Versão" da tabela

### Duplicar projeto
**Para que serve:** Criar uma cópia de projeto existente
**Como usar:**
1. Na tabela, clique no botão laranja com ícone de cópia (Copy)
2. Um novo projeto é criado automaticamente com:
   - Todos os dados copiados do original
   - Nome alterado para "Cópia de [nome original]"
   - Status definido como "Ativo"
3. Edite o projeto duplicado para ajustar conforme necessário
4. Útil para criar projetos similares rapidamente

## Casos práticos

### Exemplo 1: Criar projeto de chatbot completo
**Situação:** Quer criar um chatbot para atendimento ao cliente
1. Clique em "Novo Projeto" no canto superior direito
2. **Aba Básico:**
   - Nome: "ChatBot Atendimento Cliente"
   - Descrição: "Bot para responder dúvidas frequentes e direcionar clientes"
   - Tipo: Selecione "ChatBot"
   - Departamentos: Marque "Suporte" e "Operacional"
   - Responsáveis: Selecione você e outros membros da equipe
3. **Aba Detalhes:**
   - Prioridade: "Alta"
   - Complexidade: "Média"
   - Nível de Autonomia: "Requer Supervisão"
   - Frequência de Uso: "Diário"
   - Documentação de Apoio: Adicione 2-3 links de referência
4. **Aba Financeiro:**
   - Custo APIs/Mês: R$ 200 (para ChatGPT)
   - Ferramentas: Adicione "Dialogflow: R$ 100" e "Hosting: R$ 50"
5. Clique "Criar Projeto"
6. Projeto aparece na tabela com status "Ativo"

### Exemplo 2: Acompanhar projeto existente
**Situação:** Quer ver detalhes de um projeto já criado
1. Encontre o projeto na tabela
2. Clique no botão azul (olho) para visualizar
3. Na aba **Informações**: veja descrição completa e departamentos
4. Na aba **Financeiro**: confira custos mensais (se tiver permissão)
5. Na aba **Histórico**: veja quando foi criado e por quem
6. Se precisar editar, feche e clique no botão verde (lápis)

### Exemplo 3: Filtrar projetos do departamento de Gestão
**Situação:** Gestor quer ver apenas projetos da sua área
1. Na área cinza de filtros, clique no dropdown "Departamento"
2. Marque apenas "Gestão"
3. A tabela mostra automaticamente só projetos deste departamento
4. Para ver também projetos "Em Construção", clique no filtro "Status"
5. Para buscar por nome específico, digite na caixa de busca
6. Combine múltiplos filtros para refinar a busca

### Exemplo 4: Evoluir projeto com nova versão
**Situação:** Projeto foi atualizado com novas funcionalidades
1. Na tabela, encontre seu projeto (mostra "v1.0.0")
2. Clique no botão roxo (bifurcação) para nova versão
3. Digite "1.1.0" no campo Nova Versão
4. Motivo: "Adicionado integração com WhatsApp e melhorias na precisão"
5. Clique "Criar Versão"
6. Projeto agora mostra "v1.1.0" na coluna Versão
7. Histórico fica registrado na aba Histórico do projeto

### Exemplo 5: Gerenciar status de projeto em desenvolvimento
**Situação:** Projeto saiu de construção e entrou em funcionamento
1. Encontre projeto com status "Em Construção" na tabela
2. Clique no botão verde com ícone Activity (Ativar)
3. Status muda imediatamente para "Ativo"
4. Contador "Ativos" no cabeçalho aumenta
5. Contador "Em Construção" diminui
6. Se depois precisar manutenção, clique botão amarelo (chave)

## Problemas comuns

### Não consegue criar projeto
**Sintoma:** Clica em "Criar Projeto" mas aparece erro ou nada acontece
**Solução:**
1. **Campos obrigatórios:** Verifique se preencheu:
   - Nome do projeto
   - Descrição completa
   - Tipo de projeto selecionado
   - Pelo menos um departamento marcado
2. **Valores válidos:** Use apenas números nos campos de custos
3. **Links válidos:** URLs devem começar com http:// ou https://
4. **Conexão:** Verifique internet e tente novamente

### Aba Financeiro não aparece
**Sintoma:** Modal de detalhes só mostra 2 abas (Informações e Histórico)
**Solução:**
1. **Sem permissão:** Você não tem permissão para ver dados financeiros
2. **Projeto sem dados:** Projeto não possui informações financeiras cadastradas
3. **Contate admin:** Solicite acesso financeiro se necessário para seu trabalho

### Filtros não mostram resultados
**Sintoma:** Seleciona filtros mas tabela fica vazia
**Solução:**
1. **Aguardar busca:** Digite na busca e espere meio segundo
2. **Múltiplas seleções:** Verifique se selecionou itens corretos nos dropdowns
3. **Filtros conflitantes:** Não combine filtros que se excluem mutuamente
4. **Remover filtros:** Desmarque itens para ampliar a busca
5. **Recarregar:** Pressione F5 para atualizar a página

### Não consegue alterar status
**Sintoma:** Clica nos botões coloridos mas status não muda
**Solução:**
1. **Aguardar:** Status pode demorar alguns segundos para atualizar
2. **Permissões:** Pode não ter autorização para alterar status
3. **Projeto bloqueado:** Alguns projetos podem ter restrições
4. **Recarregar:** Atualize a página se os botões não respondem

### Botões de ação não aparecem
**Sintoma:** Linha da tabela não mostra botões coloridos
**Solução:**
1. **Tela pequena:** Em telas menores, botões podem ficar ocultos
2. **Scroll horizontal:** Role para direita na tabela
3. **Permissões:** Pode não ter acesso a certas ações
4. **Zoom:** Diminua o zoom do navegador para ver mais conteúdo

### Nova versão não é criada
**Sintoma:** Preenche dados da versão mas não salva
**Solução:**
1. **Versão única:** Número da versão deve ser diferente da atual
2. **Formato:** Use formato como 1.1.0, 2.0.0, etc.
3. **Motivo obrigatório:** Campo "Motivo da Mudança" é obrigatório
4. **Versão menor:** Não pode criar versão com número menor que atual

### Múltiplos links não salvam
**Sintoma:** Adiciona vários links na documentação mas não ficam
**Solução:**
1. **URLs completas:** Use links completos iniciando com http:// ou https://
2. **Um por linha:** Cada link deve estar em um campo separado
3. **Remover vazios:** Delete campos de link vazios antes de salvar
4. **Limite do sistema:** Pode haver limite na quantidade de links

## Tipos de projeto disponíveis

### Automação
- Projetos que automatizam processos manuais
- Workflows e integrações entre sistemas
- Scripts e robôs para tarefas repetitivas

### ChatBot 
- Assistentes de conversação
- Bots para atendimento ao cliente
- Sistemas de perguntas e respostas

### Agente
- Assistentes inteligentes complexos
- IA que toma decisões autonomamente
- Sistemas que aprendem com interações

### Outros
- Projetos que não se encaixam nas categorias acima
- Análises preditivas, visão computacional
- Projetos experimentais de IA

## Status dos projetos

### Ativo (Verde - ícone Activity)
- Projeto funcionando normalmente
- Em uso pelos usuários finais
- Recebendo manutenção regular

### Em Construção (Azul - ícone Hammer)
- Projeto sendo desenvolvido
- Ainda não está pronto para uso
- Em fase de testes e ajustes

### Manutenção (Amarelo - ícone Wrench)  
- Temporariamente parado para correções
- Sendo reparado ou atualizado
- Voltará ao status ativo após ajustes

### Arquivado (Cinza - ícone Archive)
- Projeto finalizado ou cancelado
- Não está mais em desenvolvimento ativo
- Mantido apenas para histórico

## Níveis de autonomia

### Totalmente Autônomo
- Funciona sem intervenção humana
- Toma decisões de forma independente
- Requer apenas monitoramento

### Requer Supervisão
- Funciona mas precisa de acompanhamento
- Humano valida ou aprova algumas ações
- Semi-automatizado

### Processo Manual
- Ainda depende muito de intervenção humana
- IA apenas auxilia no processo
- Automação limitada

## Dicas importantes

### Para criar projetos eficientes:
- **Use nomes claros** que identifiquem o propósito (ex: "ChatBot Suporte RH")
- **Seja específico na descrição** explicando exatamente o que o projeto faz
- **Escolha o tipo certo** para facilitar categorização e busca
- **Marque todos os departamentos** que realmente usam o projeto
- **Documente links importantes** para facilitar manutenção futura

### Para gerenciar custos:
- **Use seletor de moeda** (R$/US$) adequado para cada ferramenta
- **Mantenha lista de ferramentas atualizada** com valores reais
- **Monitore custos de APIs** que podem variar mensalmente
- **Registre apenas custos diretos** do projeto específico

### Para acompanhar evolução:
- **Crie novas versões** sempre que fizer melhorias importantes
- **Use versionamento semântico** (1.0.0, 1.1.0, 2.0.0)
- **Documente mudanças** de forma clara no motivo da versão
- **Atualize status** conforme o projeto evolui no ciclo de vida

### Para organizar a visualização:
- **Use filtros múltiplos** para encontrar projetos específicos
- **Combine busca com filtros** para resultados mais precisos
- **Aproveite os contadores** no cabeçalho para visão geral rápida
- **Mantenha projetos arquivados** para não poluir a lista ativa