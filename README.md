# Chegou Hub - Plataforma de Gestão Empresarial

**Versão Atual: v1.0.0** | [📋 Changelog](CHANGELOG.md) | [📌 Boas Práticas](docs/boaspraticas.md)

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

## 📊 Arquitetura

### Monorepo Full-Stack
```
📁 chegou-hub/
├── 🔧 backend/          # Django REST API + Background Jobs
├── 🎨 frontend/         # React SPA com shadcn/ui
├── 📚 docs/             # Documentação contextual
├── 🚀 Dockerfile        # Multi-stage build (Node.js + Python)
├── ⚙️ railway.toml      # Configuração Railway (deploy + healthcheck)
├── 🚫 .gitignore        # Arquivos ignorados pelo Git
├── 🐳 .dockerignore     # Arquivos ignorados no build Docker
└── 📋 CHANGELOG.md      # Histórico de versões
```

## 🎯 Como Briefar IA para Este Projeto

### Contexto Rápido
> "Sistema Django+React no Railway com dashboard IA para ROI de projetos, integra OpenAI/PRIMECOD/ECOMHUB, usa PostgreSQL+Redis, background jobs Django-RQ, chatbot Claude interno, web scraping via Selenium Grid."

### Para Desenvolvimento
Leia primeiro: [Stack Tecnológico](docs/stack-tecnologico.md) + [Features Principais](docs/features-principais.md)

### Para Modificações
Consulte: [Documentação Contextual Completa](docs/README.md)

## 🔗 Links Importantes

- **Produção**: https://chegouhub.com.br
- **Documentação**: [docs/README.md](docs/README.md)
- **Stack Completo**: [docs/stack-tecnologico.md](docs/stack-tecnologico.md)
- **Deploy Info**: [docs/railway-producao.md](docs/railway-producao.md)

---

**🤖 Sistema otimizado para automação, IA e análises empresariais data-driven**