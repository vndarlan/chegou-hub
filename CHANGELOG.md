# 📋 Changelog - Chegou Hub

Todas as mudanças deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [v1.10.0] - 28/11/2025

### ✨ Novidades

- **[📦 Catálogo PrimeCOD]** Nova página para gerenciar produtos do fornecedor PrimeCOD
- **[⚙️ Configuração PrimeCOD]** Página dedicada para configurar integração com API

### 🐛 Correções

- **[Interface]** Dropdown de perfil/configurações agora é totalmente responsivo e não fica fora da tela
- **[📦 ECOMHUB - Pedidos]** Corrigida e renomeada coluna "Custo(s)" para "Preço Item(s)" - agora exibe corretamente `ordersItems[].price` refletindo o dado real da API
- **[📦 ECOMHUB - Pedidos]** Ajustado botão "Referência de Colunas" com os caminhos corretos da estrutura de dados da API ECOMHUB

## [v1.9.1] - 21/11/2025

### 🐛 Correções

- **[📦 ECOMHUB - Pedidos]** Corrigido scroll horizontal da tabela com implementação definitiva usando CSS Grid e `minWidth: 0` - a tabela agora permanece dentro dos limites da tela e permite rolagem horizontal correta quando necessário
- **[🏢 Sistema de Organizações]** Corrigidas migrations críticas para garantir criação correta das tabelas de organizações em produção
- **[Interface]** Corrigido comportamento do dropdown que estava modificando indevidamente as propriedades do body/html

### 🔧 Melhorias

- **[📦 ECOMHUB - Pedidos]** Adicionado `overflow-x-hidden` na página principal para prevenir scroll horizontal indesejado no layout geral

## [v1.9.0] - 19/11/2025

### ✨ Novidades

- **[🏢 Sistema de Organizações]** Agora cada usuário pode participar de várias organizações ao mesmo tempo, alternando facilmente entre elas. Cada organização tem seus próprios dados separados, controles de acesso personalizados e sistema de aprovação administrativa

- **[📧 Sistema de Convites]** Convide membros para sua organização por email, com controles de acesso já configurados para novos usuários ou usuários já cadastrados na plataforma

- **[📦 ECOMHUB - Pedidos]** Nova página completa para visualizar pedidos com 27 colunas de informações, busca por país, escolha de quais colunas mostrar, exportação para Google Sheets e carregamento automático dos dados

- **[👤 Página de Perfil]** Nova página de Perfil substituindo Configurações para gerenciar sua conta e preferências

- **[🧭 Navegação Reformulada]** Menu lateral redesenhado com melhor organização, tutoriais em destaque e URLs mais simples

### 🔧 Melhorias

- **[ECOMHUB - Análise de Efetividade]** Visual modernizado, seletor de datas renovado e tabela totalmente responsiva
- **[Shopify - Controle de Estoque]** Agora aceita valores negativos no estoque
- **[Segurança]** Sistema de proteção aprimorado contra acessos não autorizados
- **[Interface]** Novos componentes visuais e ícones ajustados

## [v1.8.0] - 31/10/2025

### ✨ Novidades

#### 🚨 ESTRUTURA DE PÁGINAS COMPLETAMENTE NOVA

- **[📊 ECOMHUB - NOVA ESTRUTURA COMPLETA]** Sistema de gerenciamento ECOMHUB totalmente reformulado com integração direta à API oficial e 3 páginas especializadas:

  **Páginas criadas:**
  - **📈 Efetividade V2** - Nova versão do sistema de análise de efetividade com API oficial ECOMHUB
  - **📦 Status** - Rastreamento e monitoramento de status de pedidos em tempo real
  - **⚙️ Configuração** - Gerenciamento de lojas e configurações de integração ECOMHUB

## [v1.7.1] - 23/10/2025

### 🐛 Correções

- **[📊 N1 Itália]** Corrigida persistência de agrupamentos de kits - agrupamentos criados manualmente agora são salvos e restaurados corretamente ao carregar análises
- **[📊 N1 Itália]** Reorganizada ordem das colunas de métricas - coluna "Efetividade" movida para primeira posição para facilitar visualização do dado mais importante

### 🔧 Melhorias

- **[📊 Efetividade/EcomHub]** Adicionado sistema de redimensionamento dinâmico da coluna Produto com botões +/- no cabeçalho, ajuste de largura de 120px a 400px, e persistência da preferência do usuário no localStorage
- **[📊 Efetividade/EcomHub]** Otimizada largura da coluna "País" para 60px, tornando a visualização mais compacta e eficiente

### 🗑️ Remoções

- **[📊 Efetividade/EcomHub]** Removida coluna "Imagem" da tabela para melhor aproveitamento do espaço horizontal

## [v1.7.0] - 21/10/2025

### ✨ Novidades

#### 🚨 ESTRUTURA DE PÁGINAS COMPLETAMENTE NOVA

- **[🤖 NicoChat - NOVA ESTRUTURA COMPLETA]** Sistema de gerenciamento do NicoChat totalmente reformulado como subsite independente com navegação lateral própria e 5 páginas especializadas:

  **Páginas criadas:**
  - **📊 Métricas** - Dashboard completo com monitoramento em tempo real de:
    - Métricas de Email (enviados, abertos, clicados, convertidos)
    - Confirmações de Entrega
    - Interações com IA
    - Problemas Operacionais
    - Feedback de Devoluções
    - Status de Usuários do Bot (abertos, concluídos)
    - Campos Customizados e Configurações

  - **🏗️ Estrutura** - Gerenciamento da arquitetura do bot:
    - Visualização de Subfluxos
    - Sistema de Tags (todas as tags do workspace com estatísticas)
    - **Webhooks Inbound** (novo): visualização de webhooks configurados com nome, status ativo/inativo, URL copiável e estatísticas de ativação

  - **🛡️ Qualidade da Conta** - Monitoramento de saúde do WhatsApp:
    - **Status de Canais WhatsApp** (novo): monitoramento de conexão em tempo real com lógica condicional por tipo de workspace (QR Code vs Cloud API)
    - Templates do WhatsApp
    - Números WhatsApp Business cadastrados

  - **🚨 Log de Erros** - Central de monitoramento de problemas

  - **⚙️ Workspaces** - Gerenciamento de workspaces com:
    - Sistema de workspaces com controle de limites
    - Seletor visual com ícones por tipo
    - Validação de workspaces inválidos

## [v1.6.0] - 17/10/2025

### 🔧 Melhorias

- **[🔒 Detector IP]** Sistema de IPs em Observação para monitoramento de casos suspeitos
- **[🔒 Detector IP]** Salvamento automático de dados completos dos clientes com histórico persistente
- **[🔒 Detector IP]** Visualização detalhada de pedidos nas seções Resolvido e Observação
- **[🔒 Detector IP]** Botão para mover IPs diretamente entre Observação e Resolvido

## [v1.5.3] - 17/10/2025

### 🐛 Correções

- **[📦 Processamento Shopify]** Corrigido erro ao processar produtos sem SKU no detector de duplicatas

## [v1.5.2] - 08/10/2025

### 🐛 Correções

- **[📦 Estoque]** Corrigido problema de visibilidade de produtos compartilhados entre usuários
- **[📦 Estoque]** Corrigido erro que impedia recebimento de pedidos do Shopify

## [v1.5.1] - 08/10/2025

### 🐛 Correções

- **[📦 Estoque]** Corrigido erro ao criar produtos compartilhados
- **[📦 Estoque]** Corrigido erro ao carregar lista de produtos unificados
- **[Sistema]** Corrigidos problemas de autenticação entre domínios

### 🗑️ Remoções

- **[📦 Estoque]** Sistema de alertas automáticos removido (informação já visível na tabela de produtos)

### 🔧 Melhorias

- **[📦 Estoque]** Página mais rápida e limpa após otimizações
- **[Performance]** Sistema de estoque otimizado

## [v1.5.0] - 06/10/2025

### ✨ Novidades

#### 🚨 PÁGINA COMPLETAMENTE NOVA
- **[📚 Tutoriais - NOVA PÁGINA]** Sistema completo de tutoriais em vídeo acessível publicamente, com categorias organizadas, player YouTube integrado e navegação lateral colapsável.

## [v1.4.1] - 30/09/2025

### 🐛 Correções

- **[📊 Métricas N1 Itália]** Corrigido compartilhamento de análises entre usuários. Anteriormente, análises eram filtradas por usuário, impedindo visibilidade entre a equipe. Agora todas as análises são compartilhadas globalmente, com badge azul identificando o criador de cada análise, facilitando colaboração e acompanhamento em equipe.

## [v1.4.0] - 29/09/2025

### ✨ Novidades

#### 🚨 PÁGINA COMPLETAMENTE NOVA
- **[📦 Controle de Estoque - NOVA PÁGINA]** Sistema completo de gestão de inventário com integração direta à API Shopify, permitindo sincronização automática de produtos, controle de quantidades em tempo real e rastreamento completo das movimentações de estoque entre a loja online e o sistema interno.

## [v1.3.0] - 19/09/2025

### ✨ Novidades

#### 🚨 PÁGINA COMPLETAMENTE NOVA
- **[📊 N1 Efetividade - NOVA PÁGINA]** Sistema completo de análise de dados de efetividade do mercado italiano com processamento inteligente de arquivos Excel. Inclui upload otimizado de dados, visualização em dois modos (Otimizada e Total), detecção automática de kits por número do pedido, agrupamento inteligente de produtos, e métricas coloridas por performance de status (Delivered, Return, etc.).

## [v1.2.0] - 09/09/2025

### ✨ Novidades

#### 🚨 PÁGINA COMPLETAMENTE NOVA
- **[📦 Controle de Estoque - NOVA PÁGINA]** Sistema completo de gestão de inventário com integração direta à API Shopify, permitindo sincronização automática de produtos, controle de quantidades em tempo real e rastreamento completo das movimentações de estoque entre a loja online e o sistema interno.

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