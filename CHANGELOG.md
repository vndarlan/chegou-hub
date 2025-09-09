# 📋 Changelog - Chegou Hub

Todas as mudanças deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [v1.2.0] - 09/09/2025

### ✨ Novidades

#### 🚨 PÁGINAS E FUNCIONALIDADES TOTALMENTE NOVAS
- **[📦 Controle de Estoque - NOVA PÁGINA]** Sistema completo de gestão de produtos e estoque com integração Shopify - **FUNCIONALIDADE INÉDITA DE INVENTÁRIO**

#### 📦 Sistema de Gestão de Produtos
- **[Controle de Estoque]** Cadastro completo de produtos com SKU, nome, fornecedor, estoque inicial e mínimo
- **[Controle de Estoque]** Suporte a 7 fornecedores: Dropi, PrimeCod, Ecomhub, N1, N1 Itália, N1 Romênia, N1 Polônia
- **[Controle de Estoque]** Edição de produtos (nome, fornecedor, estoque mínimo) com interface intuitiva
- **[Controle de Estoque]** Exclusão de produtos com confirmação de segurança

#### 📊 Sistema de Movimentação de Estoque
- **[Controle de Estoque]** Sistema completo de ajustes de entrada e saída de estoque
- **[Controle de Estoque]** Motivos configuráveis para movimentações (Venda, Compra, Ajuste, Devolução, etc.)
- **[Controle de Estoque]** Observações opcionais para controle detalhado de cada movimentação
- **[Controle de Estoque]** Histórico completo de movimentações por produto com data e responsável
- **[Controle de Estoque]** Cálculo automático de estoque posterior em cada movimentação

#### 🚨 Sistema de Alertas Inteligente
- **[Controle de Estoque]** Alertas automáticos para produtos sem estoque (estoque ≤ 0)
- **[Controle de Estoque]** Alertas automáticos para produtos com estoque baixo (estoque ≤ mínimo configurado)
- **[Controle de Estoque]** Resolução automática de alertas quando estoque é corrigido acima do mínimo
- **[Controle de Estoque]** Interface colapsável com contadores em tempo real de alertas ativos

#### 🔗 Integração com Shopify (Webhooks)
- **[Controle de Estoque]** Webhook para criação de pedidos com redução automática de estoque
- **[Controle de Estoque]** Webhook para cancelamento de pedidos com restauração automática de estoque
- **[Controle de Estoque]** Sistema de reversão inteligente que desfaz ajustes automáticos de vendas canceladas
- **[Controle de Estoque]** URL de webhook configurável: `https://chegou-hubb-production.up.railway.app/estoque/webhook/shopify/`
- **[Controle de Estoque]** Modal com instruções detalhadas de configuração no Shopify

#### 🎨 Interface e Experiência do Usuário
- **[Controle de Estoque]** Interface responsiva com seleção de loja no header
- **[Controle de Estoque]** Busca inteligente por SKU, nome ou fornecedor
- **[Controle de Estoque]** Tabela responsiva com indicadores visuais de status de estoque
- **[Controle de Estoque]** Badges coloridos diferenciados por fornecedor
- **[Controle de Estoque]** Modal de instruções integrado para configuração de webhooks
- **[Controle de Estoque]** Status visuais: produtos sem estoque (vermelho), estoque baixo (amarelo), normal (verde)

#### ⚡ Sistema em Tempo Real
- **[Controle de Estoque]** Notificações WebSocket para atualizações automáticas de estoque
- **[Controle de Estoque]** Destaque visual de produtos recém-atualizados
- **[Controle de Estoque]** Sincronização automática entre múltiplos usuários conectados
- **[Controle de Estoque]** Sistema de reconnect automático com circuit breaker para falhas de conexão
- **[Controle de Estoque]** Controle inteligente de reconexão para evitar spam de tentativas

### 🔧 Melhorias
- **[Sistema]** Implementação de circuit breaker para maior estabilidade das conexões WebSocket
- **[Performance]** Otimizações de consulta no banco de dados para listagem de produtos
- **[Interface]** Melhorias na responsividade e adaptação para diferentes tamanhos de tela
- **[UX]** Simplificação da interface de ajustes com motivos mais intuitivos
- **[Segurança]** Validações aprimoradas nos endpoints de webhook do Shopify

### 🐛 Correções
- **[Controle de Estoque]** Corrigido erro 400 ao editar produtos com fornecedores N1
- **[Controle de Estoque]** Corrigido problema de campos obrigatórios em ajustes de estoque
- **[Controle de Estoque]** Corrigida sincronização de WebSocket que ficava inativa
- **[Controle de Estoque]** Corrigidos problemas de UX na interface de ajustes
- **[Controle de Estoque]** Corrigida detecção e resolução automática de alertas de estoque
- **[Sistema]** Corrigidos logs de debug temporários nos serializers e views
- **[Banco de Dados]** Aumentado max_length do campo fornecedor para compatibilidade com fornecedores N1

### ⚠️ Importante
- **🚨 PÁGINA COMPLETAMENTE NOVA**: **Controle de Estoque** - Primeira página dedicada exclusivamente à gestão de inventário e produtos (NÃO EXISTIA ANTES)
- **📦 GESTÃO AVANÇADA**: Sistema completo de produtos, movimentações, alertas e integração com Shopify
- **🔗 INTEGRAÇÃO CRÍTICA**: Webhooks Shopify implementados para sincronização automática de estoque
- **⚡ TEMPO REAL**: Sistema WebSocket para atualizações instantâneas entre usuários
- **🚨 ALERTAS INTELIGENTES**: Monitoramento automático de estoque baixo e produtos em falta
- **🏪 MULTI-FORNECEDOR**: Suporte completo a 7 fornecedores diferentes com tratamento especializado
- **📊 RASTREABILIDADE**: Histórico completo de todas as movimentações de estoque
- **Versões de desenvolvimento**: v1.2.0-dev.7 até v1.2.0-dev.49 (43 iterações de desenvolvimento)

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