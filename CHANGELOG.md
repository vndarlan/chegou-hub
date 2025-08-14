# 📋 Changelog - Chegou Hub

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [v1.0.0] - 14/08/2025

### ✨ Novidades
- **[Sistema]** Lançamento oficial do Chegou Hub
- **[Dashboard IA]** Gestão de ROI de 25+ projetos de automação
- **[Novelties]** Dashboard com métricas de execução Chile/México
- **[Processamento]** Detecção automática de pedidos duplicados Shopify
- **[OpenAI Analytics]** Monitoramento de custos de APIs de IA
- **[Chatbot Claude]** Assistente interno com conhecimento da documentação
- **[PRIMECOD]** Integração via API para métricas de tráfego
- **[ECOMHUB]** Web scraping automatizado via Selenium Grid
- **[DROPI MX]** Sistema de tokens para métricas de dropshipping
- **[Mapa Geográfico]** Visualização de cobertura e performance por região
- **[Sistema Feedback]** Canal direto usuário-desenvolvedor com screenshots
- **[Agenda Corporativa]** Sincronização bidirecional com Google Calendar

### 🔧 Melhorias
- Sistema de cache Redis para performance otimizada
- Background jobs via Django-RQ para processamento assíncrono
- Deploy automático no Railway via Git push
- Logs estruturados para troubleshooting eficiente
- Interface responsiva com shadcn/ui e Tailwind CSS

### ⚠️ Importante
- Requer configuração de variáveis de ambiente (OpenAI, Anthropic, etc)
- PostgreSQL e Redis são provisionados automaticamente no Railway
- Sistema otimizado para automação e análises empresariais data-driven

---

## Como interpretar as versões

- **MAJOR** (1.0.0): Mudanças grandes, redesign completo do sistema
- **MINOR** (1.1.0): Novas funcionalidades adicionadas
- **PATCH** (1.0.1): Correções de bugs e pequenas melhorias

## Versionamento de Desenvolvimento

Versões de desenvolvimento usam o sufixo `-dev.N`:
- v1.0.1-dev.1: Primeiro deploy de teste
- v1.0.1-dev.2: Correções aplicadas
- v1.0.1: Versão oficial validada

**Nota**: Apenas versões oficiais validadas aparecem neste changelog.