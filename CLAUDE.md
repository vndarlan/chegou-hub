# CLAUDE.md

Este arquivo fornece orientações para o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Idioma
Claude deve sempre se comunicar em português brasileiro (PT-BR) ao trabalhar neste projeto.

## **CHAMADAS DIRETAS DE AGENTES**

**OBRIGATÓRIO usar o agente quando mencionado:**
- `"backend, ..."` → Backend Agent
- `"frontend, ..."` → Frontend Agent  
- `"deploy, ..."` → Deploy Agent
- `"review, ..."` → Review Agent
- `"security, ..."` → Security Agent
- `"tech docs, ..."` → Tech Docs Agent
- `"user guide, ..."` → User Guide Agent

## **WORKFLOWS AUTOMÁTICOS**
**IMPORTANTE**: Obrigatório análisar se deve passar por um workflow automático, se precisar passar, avise ao usuário por qual vai seguir.

### Nova Feature Completa
1. Backend Agent → 2. Security Agent (se sensível) → 3. Frontend Agent → 4. Review Agent → 5. Tech Docs Agent → 6. User Guide Agent → 7. Deploy Agent

### Melhoria Frontend
1. Frontend Agent → 2. Review Agent → 3. User Guide Agent (se UI mudou) → 4. Deploy Agent

### Melhoria Backend  
1. Backend Agent → 2. Security Agent (se sensível) → 3. Review Agent → 4. Tech Docs Agent → 5. Deploy Agent

### Bug Fix
1. [Agent responsável] → 2. Review Agent → 3. Deploy Agent

### Documentação
Tech Docs Agent + User Guide Agent (paralelo)

## **EQUIPE DE AGENTES DISPONÍVEIS**
1. 🎯 **Coordinator** - Líder técnico que orquestra toda a equipe
2. 🔧 **Backend** - Master da pasta backend/ (Django + APIs)
3. 🎨 **Frontend** - Master da pasta frontend/ (React + shadcn/ui)
4. 🚀 **Deploy** - Git commits + deploy automático Railway
5. 🔍 **Review** - Quality assurance e code review
6. 🛡️ **Security** - Especialista em segurança. Use para avaliações de vulnerabilidade, auditorias de segurança, problemas de autenticação, proteção CSRF, configuração CORS, práticas seguras de deploy ou quando o Coordinator delegar trabalho focado em segurança
7. 📖 **Tech Docs** - Documentação técnica (PT-BR)
8. 📋 **User Guide** - Guias de uso para usuários (PT-BR)

## **Comandos Básicos**
```bash
# Backend
cd backend && python manage.py runserver
cd backend && python manage.py migrate

# Frontend  
cd frontend && npm start
cd frontend && npm run build
```

## **Projeto: Django 5.2 + React 19.1**
- **Backend**: Django REST + PostgreSQL + Redis
- **Frontend**: React + shadcn/ui + Tailwind
- **Features**: `backend/features/[nome]/` e `frontend/src/features/[nome]/`