# 🛠️ Stack Tecnológico - Chegou Hub

## Visão Geral

O Chegou Hub é uma aplicação web full-stack moderna que utiliza tecnologias de ponta para entregar uma experiência robusta e escalável. O sistema foi projetado com foco em automação, IA e gestão empresarial.

## Frontend - Interface do Usuário

### React 19.1 - Framework Principal
- **Propósito**: Interface moderna e reativa para usuários finais
- **Por que escolhemos**: Ecossistema maduro, performance otimizada, ampla comunidade
- **Características**: Componentes funcionais, hooks nativos, React Router DOM

### Design System & UI
- **shadcn/ui**: Biblioteca de componentes reutilizáveis e acessíveis
- **Tailwind CSS**: Sistema de estilização utility-first para design consistente
- **Lucide React**: Ícones modernos e otimizados para React
- **Recharts**: Gráficos e visualizações de dados interativas

### Gerenciamento de Estado
- **React Context API**: Gerenciamento de estado global nativo
- **Hooks customizados**: Lógica reutilizável (useCSRF, useToast)
- **Axios**: Cliente HTTP com interceptadores automáticos para CSRF

## Backend - Servidor e API

### Django 5.2 - Framework Web
- **Propósito**: API REST robusta e sistema de autenticação empresarial
- **Por que escolhemos**: Segurança nativa, admin automático, ORM poderoso
- **Django REST Framework**: Serialização automática e endpoints padronizados

### Banco de Dados
- **PostgreSQL (Produção)**: Banco relacional escalável com JSON support
- **SQLite (Desenvolvimento)**: Banco local para desenvolvimento rápido
- **Migrações automáticas**: Django migrations para versionamento do schema

### Processamento Assíncrono
- **Django-RQ**: Sistema de filas para tarefas pesadas em background
- **Redis**: Message broker e cache para workers assíncronos
- **Selenium Grid**: Web scraping automatizado para métricas externas

## Inteligência Artificial & APIs

### Fornecedores de IA
- **OpenAI**: Modelos de linguagem para automações e chatbots
- **Anthropic Claude**: Assistente IA interno para suporte aos usuários
- **Monitoramento de custos**: Tracking automático de gastos com APIs de IA

### Integrações Empresariais
- **Google Calendar API**: Sincronização de calendários corporativos
- **APIs Proprietárias**: 
  - PRIMECOD 
  - ECOMHUB 
  - DROPI 
## Infraestrutura & Deploy

### Railway - Plataforma de Deploy
- **Deploy automático**: Push to deploy via Git
- **Multi-stage builds**: Frontend compilado servido pelo backend
- **Monitoramento**: Health checks e logs centralizados
- **Domínio personalizado**: chegouhub.com.br com SSL automático

### Arquivos & Mídia
- **WhiteNoise**: Servidor de arquivos estáticos integrado ao Django
- **Upload de imagens**: Sistema de feedback com suporte a screenshots
- **Compressão**: Otimização automática de assets em produção

## Segurança & Autenticação

### Autenticação Corporativa
- **Sistema Django nativo**: Sessions com cookies seguros
- **Proteção CSRF**: Tokens automáticos em todas as requisições
- **CORS configurado**: Origens específicas liberadas para frontend

### Dados Sensíveis
- **Variáveis de ambiente**: Todas as chaves API externalizadas
- **Grupos de permissão**: Controle de acesso por departamento
- **Logs de auditoria**: Rastreamento de ações sensíveis

## Monitoramento & Observabilidade

### Sistema de Logs
- **Logs estruturados**: Por feature e nível de severidade
- **Rotação automática**: Arquivos organizados por data
- **Debug em produção**: Logs detalhados sem expor dados sensíveis

### Métricas de Performance
- **Tempo de resposta**: Monitoramento de APIs externas
- **Rate limiting**: Controle de uso por usuário
- **Cache inteligente**: Otimização de consultas frequentes

## Arquitetura de Features

### Organização Modular
- **Feature-based**: Cada funcionalidade como Django app separada
- **Componentes React**: Organizados por feature no frontend
- **API endpoints**: Padronizados com versionamento

## Bibliotecas & Dependências Críticas

### Frontend Essenciais
```
React 19.1 + React Router DOM 6
shadcn/ui + Tailwind CSS
Axios + Recharts + Lucide React
```

### Backend Core
```
Django 5.2 + Django REST Framework
PostgreSQL + Redis + Django-RQ
Selenium + Requests + APScheduler
```

### APIs Externas
```
OpenAI Python SDK
Anthropic Claude SDK
Google Calendar API
Selenium WebDriver
```

## Escolhas Arquiteturais

### Por que Django + React?
- **Separação clara**: API/Frontend desacoplados
- **Flexibilidade**: Deploy independente se necessário  
- **Produtividade**: Ambos frameworks maduros e bem documentados
- **Segurança**: Django tem segurança robusta out-of-the-box

### Por que Railway?
- **Simplicidade**: Deploy automático sem configuração complexa
- **Escalabilidade**: Auto-scaling baseado em demanda
- **Integração**: PostgreSQL e Redis provisionados automaticamente
- **Monitoramento**: Métricas e logs integrados

### Por que Monorepo?
- **Sincronização**: Frontend e backend sempre compatíveis
- **Produtividade**: Um só clone, deploys coordenados
- **Manutenção**: Versionamento unificado, documentação centralizada

---

**Este stack foi cuidadosamente selecionado para entregar máxima produtividade, segurança empresarial e escalabilidade para o crescimento do Chegou Hub.**