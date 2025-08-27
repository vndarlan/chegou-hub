# Chegou Hub - Plataforma de Gestão Empresarial

**Versão Atual: v1.1.0** | [📋 Changelog](CHANGELOG.md)

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