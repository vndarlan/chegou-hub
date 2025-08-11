# Como usar Sistema de Feedback

## Para que serve
O Sistema de Feedback permite reportar problemas, sugerir melhorias e enviar comentários sobre qualquer página do Chegou Hub. É uma ferramenta de comunicação direta com a equipe de desenvolvimento para melhorar continuamente o sistema.

## Como acessar
1. **Em qualquer página do sistema**, procure o ícone de ponto de interrogação (❔) no canto superior direito
2. Clique no botão de feedback (ícone HelpCircle)
3. Uma janela modal será aberta para envio do feedback
4. Disponível em todas as páginas após fazer login

## Funcionalidades principais

### Enviar feedback básico
**Para que serve:** Reportar problemas ou sugestões simples
**Como usar:**
1. Clique no botão de feedback (❔) em qualquer página
2. Modal "Enviar Feedback" será aberto
3. Preencha os campos obrigatórios:
   - **Título:** Descreva brevemente o problema/sugestão
   - **Categoria:** Selecione tipo (Bug/Erro, Sugestão de melhoria, Outro)
   - **Descrição:** Detalhe o problema ou sugestão
4. Clique "Enviar Feedback"
5. Aguarde confirmação de envio bem-sucedido

### Definir prioridade
**Para que serve:** Indicar urgência do problema reportado
**Como usar:**
1. No modal de feedback, use o campo "Prioridade"
2. Opções disponíveis:
   - **Baixa:** Problemas menores, melhorias futuras
   - **Média:** Problemas moderados (padrão)
   - **Alta:** Problemas urgentes que afetam trabalho
3. Sistema define automaticamente como "Média" se não especificar

### Anexar imagem ao feedback
**Para que serve:** Mostrar visualmente o problema ou sugestão
**Como usar:**
1. Na seção "Anexar Imagem (opcional)"
2. **Primeira vez:** Clique na área pontilhada "Clique para selecionar"
3. **Navegador de arquivos:** Escolha imagem do computador
4. **Formatos aceitos:** PNG, JPG, JPEG
5. **Tamanho máximo:** 5MB por imagem
6. **Preview:** Imagem aparecerá na tela para confirmar
7. **Remover:** Clique no X vermelho para retirar imagem

### Escolher categoria adequada
**Para que serve:** Classificar feedback para encaminhamento correto
**Como usar:**
- **Bug/Erro:** 🐛
  - Sistema não funciona como esperado
  - Mensagens de erro
  - Páginas que não carregam
  - Botões que não respondem
- **Sugestão de melhoria:** 💡
  - Ideias para novas funcionalidades
  - Melhorias na interface
  - Otimizações de performance
  - Mudanças de design
- **Outro:** 📝
  - Dúvidas sobre funcionalidades
  - Comentários gerais
  - Elogios ou agradecimentos

### Acompanhar status do feedback
**Para que serve:** Saber se feedback foi processado
**Como funciona:**
1. **Envio:** Feedback é salvo automaticamente com sua identificação
2. **URL da página:** Sistema captura automaticamente a página onde estava
3. **Status interno:** Admin pode marcar como "Pendente", "Em análise", "Resolvido"
4. **Sem interface de acompanhamento:** Atualmente não há painel para ver status
5. **Comunicação:** Equipe pode entrar em contato se necessário

## Casos práticos

### Exemplo 1: Reportar bug crítico
**Situação:** Botão "Salvar" na página de Projetos IA não funciona
1. Vá para página onde está o problema
2. Clique no botão de feedback (❔)
3. Preencha:
   - **Título:** "Botão Salvar não funciona na página Projetos IA"
   - **Categoria:** "Bug/Erro"
   - **Prioridade:** "Alta" (afeta trabalho)
   - **Descrição:** "Quando clico em 'Salvar' após editar projeto, nada acontece. Sem mensagem de erro. Testei no Chrome e Firefox."
4. **Anexe screenshot:** Capture tela mostrando botão
5. Envie feedback
6. Problema será priorizado pela equipe

### Exemplo 2: Sugerir melhoria de interface
**Situação:** Tabela de métricas DROPI seria mais útil com filtro por produto
1. Esteja na página de Métricas DROPI
2. Abra modal de feedback
3. Configure:
   - **Título:** "Sugestão: filtro por produto na tabela DROPI"
   - **Categoria:** "Sugestão de melhoria"
   - **Prioridade:** "Baixa"
   - **Descrição:** "Seria muito útil ter um filtro na tabela para mostrar apenas produtos específicos, especialmente quando há muitos produtos na análise."
4. **Imagem opcional:** Mockup ou screenshot de onde ficaria
5. Envie sugestão

### Exemplo 3: Reportar problema com imagem
**Situação:** Problema visual que precisa ser mostrado
1. Encontrou problema visual (layout quebrado, cores erradas, etc.)
2. Abra feedback na mesma página
3. Configure como "Bug/Erro"
4. **Tire screenshot:**
   - No Windows: Ferramenta de Captura ou Win+Shift+S
   - No Mac: Command+Shift+4
   - Salve como PNG ou JPG
5. **Anexe imagem:** Clique para selecionar arquivo salvo
6. **Descrição:** "Conforme imagem anexa, layout está quebrado no Chrome versão X"
7. Envie com imagem anexa

### Exemplo 4: Dúvida sobre funcionalidade
**Situação:** Não entende como usar uma função específica
1. Na página com dúvida, abra feedback
2. Use categoria "Outro"
3. **Título:** "Dúvida: como usar função X"
4. **Descrição:** "Tentei usar a funcionalidade X mas não entendi como configurar Y. Há algum manual ou tutorial?"
5. Equipe pode responder ou criar documentação

## Problemas comuns

### Modal não abre ao clicar no botão
**Sintoma:** Clica no ícone ❔ mas janela não aparece
**Solução:**
1. **Aguardar:** Pode demorar 1-2 segundos para abrir
2. **Bloqueador de popup:** Desative temporariamente
3. **JavaScript:** Verifique se está habilitado
4. **Recarregar página:** F5 e tente novamente
5. **Navegador:** Teste Chrome, Firefox ou Edge

### Erro ao enviar feedback
**Sintoma:** Clica "Enviar" mas aparece mensagem de erro
**Solução:**
1. **Campos obrigatórios:** Preencha Título, Categoria e Descrição
2. **Imagem muito grande:** Use imagem menor que 5MB
3. **Conexão:** Verifique internet - precisa comunicar com servidor
4. **Login expirado:** Faça logout e login novamente
5. **Tentar novamente:** Aguarde alguns segundos e reenvie

### Imagem não carrega ou erro de upload
**Sintoma:** Seleciona imagem mas não aparece preview ou dá erro
**Solução:**
1. **Formato válido:** Use apenas PNG, JPG ou JPEG
2. **Tamanho:** Imagem deve ter menos de 5MB
3. **Arquivo corrompido:** Tente outra imagem
4. **Navegador:** Teste em navegador diferente
5. **Conectividade:** Verifique conexão com internet

### Não recebe confirmação após envio
**Sintoma:** Envia feedback mas não sabe se foi entregue
**Solução:**
1. **Mensagem de sucesso:** Deve aparecer "Feedback enviado com sucesso!"
2. **Modal fecha automaticamente:** Depois de 2 segundos
3. **Se não apareceu confirmação:** Feedback pode não ter sido enviado
4. **Reenviar:** Tente enviar novamente
5. **Documentar:** Anote horário e conteúdo para referência

### Perdeu texto digitado
**Sintoma:** Estava digitando feedback e perdeu conteúdo
**Solução:**
1. **Preventivo:** Digite textos longos em editor externo primeiro
2. **Modal fechou acidentalmente:** Conteúdo é perdido ao fechar
3. **Copiar antes de enviar:** Ctrl+C no texto para backup
4. **Rascunho externo:** Para feedbacks complexos, prepare no Word/Notepad

## Limitações atuais

### Sem acompanhamento de status
- **Limitação:** Não há interface para ver status do seu feedback
- **Workaround:** Equipe pode entrar em contato diretamente
- **Futuro:** Pode ser implementado painel de acompanhamento

### Uma imagem por feedback  
- **Limitação:** Só permite anexar uma imagem
- **Workaround:** Use ferramentas para combinar imagens ou envie feedbacks separados
- **Dica:** Priorize imagem mais importante

### Sem edição após envio
- **Limitação:** Não pode editar feedback depois de enviado
- **Workaround:** Envie novo feedback corrigindo ou complementando
- **Dica:** Revise antes de enviar

### Sem feedback por email
- **Limitação:** Sistema não envia por email automaticamente
- **Funciona:** Apenas via interface web
- **Acesso:** Precisa estar logado no sistema

## Boas práticas

### Seja específico e claro
- **Título descritivo:** "Botão X na página Y não funciona"
- **Descrição detalhada:** Passos para reproduzir problema
- **Contexto:** Navegador, hora, dados específicos
- **Objetivo:** O que você esperava que acontecesse

### Use categorias corretamente
- **Bug:** Algo que deveria funcionar mas não funciona
- **Melhoria:** Ideia para tornar algo melhor
- **Outro:** Dúvidas, elogios, comentários gerais

### Anexe imagens quando relevante
- **Problemas visuais:** Screenshot é essencial
- **Erros de interface:** Mostre o que está errado
- **Sugestões de design:** Mockups ajudam muito
- **Dados incorretos:** Capture tela com informações

### Defina prioridade adequadamente
- **Alta:** Afeta seu trabalho diário, sistema parado
- **Média:** Problema moderado, dá para trabalhar
- **Baixa:** Sugestões, melhorias futuras

## Dicas importantes

- **Use sempre que tiver dúvida ou problema** - equipe aprecia feedback
- **Seja construtivo** - críticas ajudam mais que reclamações
- **Teste antes de reportar** - tente recarregar página ou navegador diferente  
- **Uma questão por feedback** - não misture problemas diferentes
- **Inclua contexto** - navegador, página específica, dados usados
- **Screenshots são valiosos** - especialmente para problemas visuais
- **Seja paciente** - equipe analisa todos os feedbacks recebidos
- **Reporte problemas recorrentes** - ajuda identificar padrões
- **Sugira melhorias baseadas no uso real** - sua experiência é valiosa
- **Agradecimentos também são bem-vindos** - motivam a equipe