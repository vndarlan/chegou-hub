# 🚀 Chegou Hub - Plataforma de Gestão Empresarial com IA

## 📋 Sobre o Projeto

O Chegou Hub é uma plataforma full-stack moderna que centraliza automações de IA, métricas empresariais e ferramentas de produtividade. Desenvolvido com Django + React, integra múltiplas APIs e oferece dashboards inteligentes para tomada de decisões.

## 🛠️ Stack Tecnológico

```
Frontend:  React 19.1 + shadcn/ui + Tailwind CSS
Backend:   Django 5.2 + Django REST Framework + PostgreSQL
Deploy:    Railway (auto-deploy via Git)
IA APIs:   OpenAI GPT-4 + Anthropic Claude
Cache:     Django cache framework
```

## 📚 Documentação

### 🎯 **Documentação Contextual** (Nova Estrutura)
A documentação foi completamente reestruturada para fornecer **contexto estratégico** ideal para briefings de IA:

- **[📚 Guia da Documentação](docs/README.md)** - Como usar a nova documentação
- **[🛠️ Stack Tecnológico](docs/stack-tecnologico.md)** - Tecnologias, bibliotecas e decisões arquiteturais
- **[⚙️ Configurações de Ambiente](docs/configuracoes-ambiente.md)** - Variáveis, segurança e Railway
- **[🚀 Railway & Produção](docs/railway-producao.md)** - Deploy, infraestrutura e monitoramento
- **[📊 Features Principais](docs/features-principais.md)** - Visão estratégica das funcionalidades
- **[🔗 Integrações Externas](docs/integracoes-externas.md)** - APIs, web scraping e serviços
- **[📈 Monitoramento & Logs](docs/monitoramento-logs.md)** - Observabilidade e troubleshooting

### 📖 **Guias do Usuário**
- **[📁 User Guides](docs/user-guides/)** - Tutoriais passo a passo para usuários finais

## 🤖 Features Principais

### **Inteligência Artificial**
- **Dashboard IA**: Gestão de ROI de projetos de automação (25+ projetos ativos)
- **OpenAI Analytics**: Monitoramento de custos e uso de APIs de IA
- **Chatbot Claude**: Assistente interno com conhecimento da documentação

### **Métricas & Análises**
- **PRIMECOD**: Integração direta via API para métricas de tráfego
- **ECOMHUB**: Web scraping automatizado via Selenium Grid
- **DROPI MX**: Sistema de tokens para métricas de dropshipping
- **Mapa Geográfico**: Visualização de cobertura e performance por região

### **Operacional**
- **Sistema de Feedback**: Canal direto usuário-desenvolvedor com screenshots
- **Agenda Corporativa**: Sincronização bidirecional com Google Calendar
- **Background Jobs**: Processamento assíncrono via Django-RQ
- **Monitoramento**: Logs estruturados e métricas em tempo real

## ⚡ Quick Start

### Desenvolvimento Local
```bash
# Backend
cd backend
python manage.py runserver

# Frontend
cd frontend
npm start

# Workers (opcional)
cd backend
python manage.py rqworker
```

### Deploy Automático
```bash
# Push para main dispara deploy automático no Railway
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

## 🔧 Configurações Essenciais

### Variáveis de Ambiente (Produção)
```bash
# Django Core
DJANGO_SECRET_KEY=sua-chave-super-secreta
DEBUG=False

# APIs de IA (obrigatórias)
OPENAI_API_KEY=sk-proj-sua-chave-openai
ANTHROPIC_API_KEY=sk-ant-api03-sua-chave-claude

# Integrações Empresariais
PRIMECOD_API_TOKEN=token-primecod
ECOMHUB_API_TOKEN=token-ecomhub
DROPI_API_TOKEN=token-dropi-mx
```

### Railway (Auto-configurado)
```bash
DATABASE_URL=postgresql://... (auto-gerado)
REDIS_URL=redis://... (auto-gerado)
RAILWAY_ENVIRONMENT_NAME=production
```

## 📊 Arquitetura

### Monorepo Full-Stack
```
📁 chegou-hub/
├── 🔧 backend/          # Django REST API + Background Jobs
├── 🎨 frontend/         # React SPA com shadcn/ui
├── 📚 docs/             # Documentação contextual
└── 🚀 Dockerfile        # Multi-stage build (Node.js + Python)
```

### Deploy Pipeline
```
Git Push → Railway Build → Multi-stage Docker → 
Frontend Build (Node.js) → Backend + Static Files → 
Database Migration → Health Check → Live
```

## 🌐 Integrações

### APIs Externas
- **OpenAI GPT-4**: Automações e análises inteligentes
- **Anthropic Claude**: Chatbot interno e suporte
- **Google Calendar**: Sincronização de agenda corporativa
- **PRIMECOD/ECOMHUB/DROPI**: Métricas empresariais via API + scraping

### Selenium Grid Architecture
```
Chegou Hub → Selenium Grid (Railway) → Target Websites → Data Extraction
```

## 🎯 Como Briefar IA para Este Projeto

### Contexto Rápido
> "Sistema Django+React no Railway com dashboard IA para ROI de projetos, integra OpenAI/PRIMECOD/ECOMHUB, usa PostgreSQL+Redis, background jobs Django-RQ, chatbot Claude interno, web scraping via Selenium Grid."

### Para Desenvolvimento
Leia primeiro: [Stack Tecnológico](docs/stack-tecnologico.md) + [Features Principais](docs/features-principais.md)

### Para Modificações
Consulte: [Documentação Contextual Completa](docs/README.md)

## 📈 Status do Projeto

- ✅ **Produção**: Ativo no Railway
- ✅ **Features**: 8 funcionalidades principais operacionais
- ✅ **Integrações**: 6+ APIs externas integradas
- ✅ **Monitoramento**: Logs estruturados + métricas Railway
- ✅ **Documentação**: 100% contextual para IA

## 🔗 Links Importantes

- **Produção**: https://chegouhub.com.br
- **Documentação**: [docs/README.md](docs/README.md)
- **Stack Completo**: [docs/stack-tecnologico.md](docs/stack-tecnologico.md)
- **Deploy Info**: [docs/railway-producao.md](docs/railway-producao.md)

---

# Auxilios para o meu dia a dia

## Comandos para ativar Pensamento Profundo
"Think more" - Extended reasoning
"Think a lot"- Comprehensive reasoning
"Think longer" - Extended time reasoning
"Ultrathink" - Maximum reasoning capability

## Documentações do Claude Code
- https://github.com/coleam00/context-engineering-intro/tree/main/claude-code-full-guide
- https://docs.anthropic.com/en/docs/claude-code/devcontainer
- https://www.anthropic.com/engineering/claude-code-best-practices
- https://www.aitmpl.com/

---

**🤖 Sistema otimizado para automação, IA e análises empresariais data-driven**