# 📋 Changelog - Chegou Hub

Todas as mudanças deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [v1.1.0] - 27/08/2025

### ✨ Novidades

#### 🚨 PÁGINAS E FUNCIONALIDADES TOTALMENTE NOVAS
- **[🔒 Detector IP - NOVA PÁGINA]** Sistema anti-fraude avançado para proteção contra acessos maliciosos e detecção de IPs suspeitos - **FUNCIONALIDADE INÉDITA DE SEGURANÇA**
- **[📊 Log de Erros - NOVA PÁGINA]** Página dedicada para monitoramento e análise de erros do sistema em tempo real - **PRIMEIRA IMPLEMENTAÇÃO DE MONITORAMENTO**
- **[🚀 Nova Arquitetura de Deploy]** Ambiente de teste Railway dedicado com deploy separado do ambiente de produção - **MUDANÇA REVOLUCIONÁRIA NO WORKFLOW**

### 🔧 Melhorias
- **[Projetos IA]** Novo status "Em Construção" com ícone martelo azul
- **[Projetos IA]** Campo "Documentação de Apoio" agora suporta múltiplos links separados por linha
- **[Projetos IA]** Seletor de moeda (BRL/USD) para custos de APIs e ferramentas
- **[Projetos IA]** Tipos de projeto simplificados para 4 categorias principais (Automação, ChatBot, Agente, Outros)
- **[Projetos IA]** Campo "Nível de Autonomia" reorganizado para aba Detalhes
- **[Projetos IA]** Dashboard com contadores em tempo real de todos os status
- **[Projetos IA]** Layout do campo de busca melhorado e alinhado
- **[Projetos IA]** Interface de ações da tabela reformulada para melhor usabilidade
- **[Projetos IA]** Remoção da seção "Breakdown de Horas" do dashboard
- **[Sistema]** Centralização de funcionalidades - página Relatórios de Projetos IA removida
- **[Performance]** Otimizações críticas de timeout e performance para lidar com grandes volumes de dados
- **[Interface]** Múltiplas melhorias de UX e layout responsivo
- **[🚀 Deploy]** Novo workflow de deploy com ambiente de teste isolado (URL + banco próprios)
- **[🔒 Segurança]** Maior controle de qualidade com validação prévia antes do deploy oficial
- **[📊 Desenvolvimento]** Redução significativa de riscos em produção com testes seguros

### 🐛 Correções
- **[Projetos IA]** Corrigido erro 500 ao salvar projetos com múltiplos links de documentação
- **[Projetos IA]** Corrigida visualização adequada de múltiplos links de documentação de apoio
- **[Projetos IA]** Corrigida exibição e salvamento de dados financeiros
- **[Projetos IA]** Corrigido problema de campos faltantes em abas Detalhes/Financeiro
- **[Processamento]** Corrigido bug crítico na detecção de pedidos duplicados
- **[Sistema]** Corrigidos múltiplos erros 500 e problemas de autenticação
- **[Sistema]** Corrigidos problemas críticos de CORS e CSRF em produção
- **[Performance]** Corrigidos timeouts em operações com grande volume de dados
- **[Interface]** Corrigidos erros de hidratação HTML e problemas de React DOM

### ⚠️ Importante
- **🚨 PÁGINA COMPLETAMENTE NOVA**: **Detector IP** - Primeira página dedicada exclusivamente à proteção anti-fraude do sistema (NÃO EXISTIA ANTES)
- **🔒 SEGURANÇA CRÍTICA**: Sistema Detector IP implementado como proteção essencial contra fraudes e acessos maliciosos
- **🚀 MUDANÇA NO WORKFLOW**: Nova arquitetura de deploy implementada:
  - **Antes**: Deploy direto para produção (todos tinham acesso)
  - **Agora**: Deploy para ambiente de teste → Validação → Deploy oficial
  - **Benefício**: Testes seguros com URL separada e banco próprio antes da produção
- **Remoção**: Página "Relatórios de Projetos IA" foi removida - funcionalidades centralizadas na página principal
- **Migração**: Projetos existentes mantêm compatibilidade com novos tipos e status
- **Performance**: Sistema otimizado para lidar com milhares de registros sem timeout

## [v1.0.0] - 14/08/2025

### ✨ Novidades
- **[Interface]** Migração completa de Material UI para shadcn/ui
- **[Interface]** Modo escuro implementado (antes só tinha modo claro)
- **[Sistema]** Reestruturação completa do código para maior clareza e alinhamento
- **[Admin]** Sistema administrativo para monitoramento completo do site
- **[Autenticação]** Sistema de login e barra de navegação implementados
- **[Agenda]** Página corporativa com acesso a todas as agendas da empresa
- **[EFETIVIDADE/ECOMHUB]** Página de métricas de efetividade integrada com API oficial do fornecedor
- **[Dashboard IA]** Página para visualizar projetos do time de IA
- **[Relatórios IA]** Página dedicada aos relatórios dos projetos de IA
- **[Engajamento]** Página de compra sincronizada com SMMRAJA via API
- **[Mapa]** Visualização geográfica de todos os países de atuação
- **[Feedback]** Sistema completo para reportar bugs e sugestões de melhorias
- **[Novelties]** Dashboard para monitorar agentes automáticos do fornecedor Dropi

### 🔧 Melhorias
- Interface completamente renovada com shadcn/ui e Tailwind CSS
- Código reestruturado para melhor manutenibilidade
- Sistema de componentes modernos e responsivos
- Arquitetura de features organizada e escalável

### ⚠️ Importante
- Esta é a primeira versão oficial do Chegou Hub renovado
- Múltiplas features ainda em desenvolvimento ativo
- Sistema preparado para expansão e novas integrações