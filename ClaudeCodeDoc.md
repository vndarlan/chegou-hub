# Claude Code - Macetes para contrução no Chegou Hub

## 🧠 Comandos para Pensamento Profundo
- `"Think more"` - Raciocínio estendido
- `"Think a lot"` - Raciocínio abrangente  
- `"Think longer"` - Raciocínio temporal estendido
- `"Ultrathink"` - Capacidade máxima de raciocínio

## ⌨️ Atalhos do Chat
- `\ + Enter` - Quebra de linha sem enviar o prompt
- `@ + arquivo` - Mencionar arquivo no chat (ex: @package.json)
- `Arrastar imagem + Shift + Soltar` - Mencionar imagem no chat
- `/models` - Mudar o modelo de IA do chat
- `/agent` - Criar um novo agent
- `/clear` - Apagar conversa
- `/compact` - Criar resumo com o histórico do chat para a IA não se perder em conversas muito longas.
- `/` - Mostra todos os comando disponíveis. 

## 🤖 Agentes Especializados
- **Backend Agent** - Django, APIs, migrações, modelos
- **Frontend Agent** - React, shadcn/ui, Tailwind CSS
- **Security Agent** - Auditoria e proteção do sistema
- **Deploy Agent** - Git commits e Railway deploy automático
- **Review Agent** - Code review obrigatório antes de deploy
- **Tech Docs Agent** - Documentação contextual estratégica
- **User Guide Agent** - Guias de uso para usuários finais
- **Changelog Agent** - Versionamento semântico e releases

## 📞 Como Chamar Agentes
```
backend, criar API para métricas
frontend, ajustar componente de login
review, validar código antes do deploy
deploy, fazer commit e push
security, auditar autenticação
changelog, criar release oficial
```

## 🔄 Workflows Automáticos

**Nova Feature Completa:**
Backend → Security (se sensível) → Frontend → Review → Tech Docs → User Guide → Deploy

**Bug Fix:**
[Agent responsável] → Review → Deploy

**Release Oficial:**
Changelog → Deploy (versão oficial)

## ⚙️ Comandos Básicos
```bash
# Backend
cd backend && python manage.py runserver
cd backend && python manage.py migrate

# Frontend  
cd frontend && npm start
cd frontend && npm run build

# Deploy
git add . && git commit -m "feat: nova funcionalidade"
git push origin main
```

## 🛠️ Stack do Projeto
- **Backend**: Django 5.2 + PostgreSQL + Redis
- **Frontend**: React 19.1 + shadcn/ui + Tailwind
- **Deploy**: Railway com versionamento automático
- **Estrutura**: `backend/features/[nome]/` e `frontend/src/features/[nome]/`

## 🎯 Padrões Importantes
```
# Git Commits
feat: nova funcionalidade
fix: correção de bug

# Components (PascalCase)
PrimecodPage.js

# API Endpoints (snake_case)
/metricas/primecod/buscar-orders/
```

## 📝 Regras de Ouro
- **Sempre use agentes especializados**
- **Review é obrigatório antes de deploy**
- **Documente tudo (tech docs + user guides)**
- **Testes são importantes (npm run lint)**
- **Deploy inteligente com versionamento**