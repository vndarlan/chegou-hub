# 📌 Boas Práticas de Atualização e Versionamento

  ## 🔄 Ciclo de Deploy do Chegou Hub

  ### Fase 1: DESENVOLVIMENTO E TESTES
  1. **Agentes criam/ajustam** funcionalidade (Backend/Frontend Agents)
  2. **Deploy automático** com versão de desenvolvimento (ex: v1.2.0-dev.1)
  3. **Teste em produção** pelo proprietário
  4. **Iteração se necessário:**
     - ❌ Problema encontrado → Retorna ao passo 1
     - ✅ Funcionamento validado → Avança para Fase 2

  ### Fase 2: DOCUMENTAÇÃO E RELEASE OFICIAL
  1. **Feature validada** e funcionando em produção
  2. **Changelog Agent** consolida mudanças
  3. **Deploy do changelog** com versão oficial (ex: v1.2.0)
  4. **Versão marcada** como release oficial

  ## ⚡ Regras de Ouro

  ### ✅ SEMPRE
  - Testar em produção antes de documentar
  - Manter changelog apenas com versões validadas
  - Separar deploys de código dos deploys de documentação
  - Usar versionamento semântico (MAJOR.MINOR.PATCH)

  ### ❌ NUNCA
  - Documentar features não validadas no changelog
  - Misturar correções de código com atualização de changelog
  - Pular fase de testes antes da documentação oficial
  - Alterar changelog de versões já publicadas

  ## 🎯 Exemplo de Fluxo Real

  v1.2.0-dev.1 → Deploy inicial (nova página de dashboard)
  v1.2.0-dev.2 → Deploy correção (ajuste no gráfico)
  v1.2.0-dev.3 → Deploy final (correção de responsividade)
  ✅ VALIDAÇÃO COMPLETA
  v1.2.0 → Deploy oficial (apenas CHANGELOG.md atualizado)

  ## 🤖 Changelog Agent - Especialista em Releases

  ### Proposta
  Um agente dedicado exclusivamente para gerenciar o ciclo de documentação de releases oficiais.

  ### Responsabilidades
  - **Analisar** todos os commits e mudanças desde a última versão oficial
  - **Categorizar** alterações (Novidades, Melhorias, Correções, Importante)
  - **Gerar** entrada no CHANGELOG.md seguindo formato padrão
  - **Incrementar** versão seguindo semântica (MAJOR.MINOR.PATCH)
  - **Deploy** isolado apenas do arquivo de changelog
  - **Marcar** versão como release oficial no histórico do projeto

  ### Workflow com Changelog Agent

  Deploy Agent: "Deploy v1.2.0-dev.1 realizado"
  ↓
  [Testes e ajustes]
  ↓
  Deploy Agent: "Deploy v1.2.0-dev.5 realizado"
  ↓
  Proprietário: "Validado! Changelog, crie release oficial"
  ↓
  Changelog Agent:
  1. Analisa mudanças desde v1.1.0
  2. Gera entrada formatada no CHANGELOG.md
  3. Cria tag v1.2.0 oficial
  4. Deploy do changelog
  5. Confirma: "Release v1.2.0 documentada e publicada"

  ### Benefícios
  - **Consistência**: Formato padronizado em todas as releases
  - **Clareza**: Separação entre desenvolvimento e produção
  - **Rastreabilidade**: Histórico claro de versões oficiais
  - **Simplicidade**: Um comando para consolidar tudo
  - **Confiabilidade**: Apenas versões testadas são documentadas

  ## 📊 Versionamento

  ### Estrutura: MAJOR.MINOR.PATCH

  - **MAJOR** (1.0.0): Mudanças grandes, redesign completo
  - **MINOR** (1.1.0): Novas funcionalidades
  - **PATCH** (1.1.1): Correções e pequenas melhorias

  ### Versões de Desenvolvimento
  - Formato: `vX.Y.Z-dev.N`
  - Exemplo: `v1.2.0-dev.1`, `v1.2.0-dev.2`
  - Nunca entram no changelog oficial

  ### Versões Oficiais
  - Formato: `vX.Y.Z`
  - Exemplo: `v1.2.0`
  - Sempre documentadas no changelog
  - Sempre após validação completa

  ## 🚀 Implementação

  Para ativar este workflow, configure:
  1. Deploy Agent para usar sufixo `-dev.N` em deploys de teste
  2. Changelog Agent com acesso ao histórico de commits
  3. Processo de validação antes de releases oficiais