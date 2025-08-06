# CLAUDE.md

Este arquivo fornece orientações para o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Idioma
**IMPORTANTE**: Claude deve sempre se comunicar em português brasileiro (PT-BR) ao trabalhar neste projeto.

## Comandos de Desenvolvimento

### Backend (Django + Django REST Framework)
- **Iniciar servidor de desenvolvimento**: `cd backend && python manage.py runserver`
- **Executar migrações**: `cd backend && python manage.py migrate`
- **Criar migrações**: `cd backend && python manage.py makemigrations`
- **Criar superusuário**: `cd backend && python manage.py createsuperuser`
- **Coletar arquivos estáticos**: `cd backend && python manage.py collectstatic`
- **Verificar conexão com banco**: `cd backend && python manage.py check_db`
- **Iniciar worker RQ**: `cd backend && python manage.py rqworker`
- **Status do RQ**: `cd backend && python manage.py rq_status`
- **Limpar jobs RQ**: `cd backend && python manage.py clear_rq_jobs`
- **Shell**: `cd backend && python manage.py shell`

### Frontend (React com shadcn/ui)
- **Iniciar servidor de desenvolvimento**: `cd frontend && npm start`
- **Build para produção**: `cd frontend && npm run build`
- **Executar testes**: `cd frontend && npm test`
- **Instalar dependências**: `cd frontend && npm install`

## Visão Geral da Arquitetura

### Estrutura do Projeto
Esta é uma aplicação web full-stack com API Django REST no backend e frontend React, organizada como monorepo com arquitetura baseada em features.

### Arquitetura Backend (Django)
- **Framework**: Django 5.2 com Django REST Framework
- **Banco de Dados**: PostgreSQL (produção) / SQLite (desenvolvimento)
- **Fila de Tarefas**: Django-RQ com Redis para processamento em background
- **Autenticação**: Autenticação baseada em sessão Django com proteção CSRF
- **Deploy**: Railway com Gunicorn + WhiteNoise

#### Organização Baseada em Features
Cada feature é uma app Django separada em `backend/features/`:
- `agenda/` - Calendário da empresa e eventos
- `mapa/` - Mapeamento de cobertura geográfica
- `engajamento/` - Métricas de engajamento dos funcionários
- `ia/` - Dashboard de projetos e automações de IA
- `novelties/` - Notícias e atualizações da empresa
- `processamento/` - Utilitários de processamento de dados
- `metricas_primecod/` - Integração de métricas PRIMECOD
- `metricas_ecomhub/` - Integração de métricas ECOMHUB  
- `metricas_dropi/` - Integração de métricas DROPI MX

#### Estrutura Padrão de Feature
Cada feature segue o mesmo padrão:
```
features/[nome_feature]/
├── models.py          # Modelos do banco de dados
├── views.py           # Endpoints da API
├── serializers.py     # Serializers DRF
├── urls.py            # Roteamento de URLs
├── admin.py           # Configuração do Django admin
├── apps.py            # Configuração da app
└── migrations/        # Migrações do banco
```

### Arquitetura Frontend (React)
- **Framework**: React 19.1 com React Router DOM
- **Bibliotecas UI**: Componentes shadcn/ui com Tailwind CSS
- **Estilização**: Tailwind CSS com PostCSS
- **Gerenciamento de Estado**: React hooks e Context API
- **Cliente HTTP**: Axios com gerenciamento de token CSRF

#### Organização de Componentes
- `components/ui/` - Componentes base shadcn/ui
- `components/` - Componentes compartilhados da aplicação
- `features/[nome_feature]/` - Componentes de página específicos por feature
- `pages/` - Páginas principais da aplicação (Login, Workspace)

### Design do Banco de Dados
- **Core**: Usa o modelo User integrado do Django para autenticação
- **Features**: Cada feature define seus próprios models conforme necessário
- **Migrações**: Gerenciadas por feature com sistema de migração do Django

### Design da API
- **URL Base**: `/api/`
- **Autenticação**: Baseada em sessão com proteção CSRF
- **Endpoints**: Design RESTful com ViewSets e APIViews do DRF
- **CORS**: Configurado para domínios de produção

### Processamento em Background
- **Sistema de Fila**: Django-RQ para processamento de tarefas assíncronas
- **Redis**: Necessário para backend de fila em produção
- **Gerenciamento de Workers**: Comandos de gerenciamento customizados para controle de workers
- **Logging**: Configuração de logging dedicada para RQ

### Segurança e CORS
- **Proteção CSRF**: Habilitada com origens confiáveis para domínios de produção
- **CORS**: Configurado para origens permitidas específicas
- **Segurança de Sessão**: Cookies seguros em produção
- **Variáveis de Ambiente**: Configuração sensível externalizada

### Fluxo de Desenvolvimento
1. Mudanças no backend requerem execução de migrações se models forem modificados
2. Frontend usa hot reload durante desenvolvimento
3. Teste de conexão com banco disponível via comando de gerenciamento customizado
4. Tarefas em background podem ser monitoradas via comandos de gerenciamento RQ

### Integrações Externas
- **OpenAI**: Integração de funcionalidades de IA
- **Servidores Selenium**: Web scraping para coleta de métricas
- **APIs Externas**: Integrações PRIMECOD, ECOMHUB e DROPI
- **PostgreSQL**: Banco de dados principal para produção
- **Redis**: Backend de fila de tarefas

## Comandos dos Agentes

## 🎯 **REGRA OBRIGATÓRIA: Chamadas Diretas de Agentes**

**Quando o usuário mencionar explicitamente um agente, o sistema DEVE obrigatoriamente usar esse agente:**

- `"coordinator, ..."` → **OBRIGATÓRIO** usar Coordinator
- `"frontend, ..."` → **OBRIGATÓRIO** usar Frontend  
- `"backend, ..."` → **OBRIGATÓRIO** usar Backend
- `"deploy, ..."` → **OBRIGATÓRIO** usar Deploy
- `"review, ..."` → **OBRIGATÓRIO** usar Review
- `"security, ..."` → **OBRIGATÓRIO** usar Security
- `"tech docs, ..."` → **OBRIGATÓRIO** usar Tech Docs
- `"user guide, ..."` → **OBRIGATÓRIO** usar User Guide

**⚠️ NUNCA ignore uma chamada direta. Se o usuário pediu um agente específico, use esse agente.**

### Chamadas Automáticas (Recomendado)
Fale naturalmente que o Coordinator Agent distribui as tarefas:
- `"Quero criar uma página de Vendas"`
- `"Preciso melhorar a página de Engajamento"`
- `"Tem um bug na API de Agenda"`
- `"Adicione filtros na página de Métricas"`

### Chamadas Diretas
Para tarefas específicas:
- `"Backend, adicione campo 'prioridade' no model Agenda"`
- `"Frontend, melhore design da página IA"`
- `"Security, audite segurança da feature de pagamentos"`
- `"Deploy, faça deploy agora"`
- `"Review, analise as mudanças recentes"`

### Documentação de Páginas Existentes
- `"Tech Docs e User Guide, documentem todas as páginas existentes"`
- `"/documentar engajamento"`
- `"Criem guias para todas as features atuais"`
- `"Quero documentação da página de IA que já existe"`

### Equipe de Agentes Disponível
1. 🎯 **Coordinator** - Líder técnico que orquestra toda a equipe
2. 🔧 **Backend** - Master da pasta backend/ (Django + APIs)
3. 🎨 **Frontend** - Master da pasta frontend/ (React + shadcn/ui)
4. 🚀 **Deploy** - Git commits + deploy automático Railway
5. 🔍 **Review** - Quality assurance e code review
6. 🛡️ **Security** - Especialista em segurança. Use para avaliações de vulnerabilidade, auditorias de segurança, problemas de autenticação, proteção CSRF, configuração CORS, práticas seguras de deploy ou quando o Coordinator delegar trabalho focado em segurança
7. 📖 **Tech Docs** - Documentação técnica (PT-BR)
8. 📋 **User Guide** - Guias de uso para usuários (PT-BR)