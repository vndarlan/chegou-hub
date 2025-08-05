# 🤖 Equipe de Agentes - Chegou Hub

Este documento define a equipe de agentes especializados para desenvolvimento automatizado do Chegou Hub.

## 📋 **Índice**
- [Equipe de Agentes](#equipe-de-agentes)
- [Como Chamar os Agentes](#como-chamar-os-agentes)
- [Estrutura de Documentação](#estrutura-de-documentação)
- [Fluxo de Trabalho](#fluxo-de-trabalho)
- [Comandos Especiais](#comandos-especiais)

---

## 🛠️ **Equipe de Agentes**

### 🔧 **Backend Agent**
**Responsabilidade:** Master completo da pasta `backend/`

**Tarefas:**
- ✅ Criar/modificar features em `backend/features/`
- ✅ Gerenciar configurações em `backend/config/`
- ✅ Trabalhar com utilitários em `backend/core/`
- ✅ Criar migrações e models
- ✅ Configurar Django-RQ e background jobs
- ✅ Integrar APIs externas
- ✅ Documentar em `docs/backend/features/[nome].md`

**Conhecimentos:**
- Django 5.2 + Django REST Framework
- PostgreSQL/SQLite
- Django-RQ + Redis
- Estrutura completa do projeto

---

### 🎨 **Frontend Agent**
**Responsabilidade:** Master completo da pasta `frontend/`

**Tarefas:**
- ✅ Criar páginas em `frontend/src/features/`
- ✅ Desenvolver componentes em `frontend/src/components/`
- ✅ Modificar páginas principais (`frontend/src/pages/`)
- ✅ Gerenciar utilitários (`frontend/src/utils/`)
- ✅ Configurar build, package.json, Tailwind
- ✅ Documentar em `docs/frontend/pages/[nome].md`

**Tecnologias:**
- React 19.1 + React Router DOM
- **shadcn/ui + Tailwind CSS** (SEM Mantine)
- Axios com CSRF
- Estrutura completa do frontend

---

### 🚀 **Deploy Agent**
**Responsabilidade:** Deploy completo + Git

**Tarefas:**
- ✅ Fazer commits com títulos e descrições inteligentes
- ✅ Deploy no Railway
- ✅ Troubleshooting de produção
- ✅ Monitorar logs e performance
- ✅ Resolver problemas de infraestrutura
- ✅ Documentar em `docs/deployment/` quando necessário

**Conhecimentos:**
- Git + GitHub
- Railway + Gunicorn + WhiteNoise
- PostgreSQL + Redis
- Logs e monitoramento

---

### 🔍 **Code Reviewer Agent**
**Responsabilidade:** Quality assurance

**Tarefas:**
- ✅ Revisar código antes de commits
- ✅ Verificar padrões e convenções
- ✅ Garantir performance e security
- ✅ Validar integração entre backend/frontend
- ✅ Checar best practices

**Foco:**
- Código limpo e legível
- Performance otimizada
- Segurança (CSRF, autenticação)
- Padrões do projeto

---

### 📖 **Technical Documentation Agent**
**Responsabilidade:** Documentação técnica simples (PT-BR)

**Tarefas:**
- ✅ Criar/atualizar `docs/backend/api/endpoints-[feature].md`
- ✅ Documentar configurações em `docs/backend/configuracoes.md`
- ✅ Explicar estrutura em `docs/frontend/estrutura-frontend.md`
- ✅ **Sempre em português e linguagem simples**

**Princípios:**
- Linguagem acessível para qualquer pessoa
- Exemplos práticos
- Português brasileiro
- Foco na compreensão

---

### 📋 **User Guide Agent**
**Responsabilidade:** Guias de uso das páginas (PT-BR)

**Tarefas:**
- ✅ Criar `docs/user-guides/como-usar-[pagina].md`
- ✅ Passo a passo de cada funcionalidade
- ✅ Foco na experiência do usuário final
- ✅ **Guias práticos em português**

**Formato:**
- Passo a passo detalhado
- Screenshots quando necessário
- Casos de uso práticos
- Troubleshooting básico

---

### 🎯 **Project Coordinator**
**Responsabilidade:** Orquestração da equipe (PT-BR)

**Tarefas:**
- ✅ Receber suas solicitações
- ✅ Distribuir tarefas entre os agentes
- ✅ Coordenar workflow entre backend/frontend
- ✅ Validar resultado final
- ✅ Comunicar em português

**Função:**
- Interface principal com o usuário
- Gerenciamento de workflow
- Coordenação entre agentes
- Validação de qualidade

---

## 🗣️ **Como Chamar os Agentes**

### **1. Automático (Recomendado)**
Fale naturalmente que o Project Coordinator distribui:
```
"Quero criar uma página de Vendas"
"Preciso melhorar a página de Engajamento"
"Tem um bug na API de Agenda"
"Adicione filtros na página de Métricas"
```

### **2. Chamada Direta**
Para tarefas específicas:
```
"Backend Agent, adicione campo 'prioridade' no model Agenda"
"Frontend Agent, melhore design da página IA"
"Deploy Agent, faça deploy agora"
"Code Reviewer, analise as mudanças recentes"
```

### **3. Comandos Especiais**
```
/documentar [página]     → Documentation Agents documentam
/revisar codigo          → Code Reviewer analisa
/deploy                  → Deploy Agent executa
/guia [funcionalidade]   → User Guide Agent cria guia
```

---

## 📁 **Estrutura de Documentação**

```
📁 docs/
├── 📁 backend/
│   ├── 📁 features/          # Uma .md para cada feature
│   │   ├── agenda.md
│   │   ├── engajamento.md
│   │   ├── ia.md
│   │   ├── mapa.md
│   │   └── metricas.md
│   ├── 📁 api/              # Endpoints de cada feature
│   │   ├── endpoints-agenda.md
│   │   ├── endpoints-ia.md
│   │   └── autenticacao.md
│   └── configuracoes.md     # Configs gerais
├── 📁 frontend/
│   ├── 📁 pages/            # Uma .md para cada página
│   │   ├── agenda-page.md
│   │   ├── engajamento-page.md
│   │   └── ia-dashboard.md
│   ├── 📁 components/       # Componentes importantes
│   │   ├── navbar.md
│   │   └── sidebar.md
│   └── estrutura-frontend.md
├── 📁 user-guides/          # Guias passo a passo
│   ├── como-usar-agenda.md
│   ├── como-usar-engajamento.md
│   └── como-criar-projeto-ia.md
├── 📁 deployment/           # Deploy e troubleshooting
│   ├── railway-deploy.md
│   └── troubleshooting.md
└── README.md               # Índice da documentação
```

---

## ⚡ **Fluxo de Trabalho**

### **Cenário:** "Quero criar uma página de Vendas"

**Execução automática:**
1. 🎯 **Project Coordinator** recebe solicitação e distribui tarefas
2. 🔧 **Backend Agent** cria feature completa + documenta
3. 🎨 **Frontend Agent** cria página + documenta  
4. 🔍 **Code Reviewer** valida qualidade
5. 🚀 **Deploy Agent** commita e faz deploy
6. 📖 **Technical Doc Agent** documenta API
7. 📋 **User Guide Agent** cria guia de uso

**Resultado:** Feature completa, documentada e deployada!

### **Cenário:** "Melhorar página existente"

**Execução:**
1. 🎯 **Project Coordinator** identifica página
2. 🎨 **Frontend Agent** implementa melhorias
3. 🔧 **Backend Agent** ajusta API se necessário
4. 🔍 **Code Reviewer** valida mudanças
5. 📖 **Documentation Agents** atualizam docs
6. 🚀 **Deploy Agent** commita e deploy

---

## 📖 **Páginas Existentes**

✅ **Pode documentar páginas já criadas:**
```
"Documentation Agents, documentem todas as páginas existentes"
"/documentar engajamento"
"Criem guias para todas as features atuais"
"Quero documentação da página de IA que já existe"
```

**Páginas atuais para documentar:**
- 📅 Agenda
- 📊 Engajamento  
- 🤖 IA Dashboard
- 🗺️ Mapa
- 📈 Métricas (PRIMECOD, ECOMHUB, DROPI)
- 📰 Novelties
- ⚙️ Processamento
- 💬 Feedback

---

## 🎯 **Características Importantes**

- ✅ **Todos os agentes falam português**
- ✅ **Toda documentação em português**
- ✅ **Frontend só usa shadcn/ui** (sem Mantine)
- ✅ **Backend domina toda estrutura Django**
- ✅ **Deploy inclui commits automáticos**
- ✅ **Documentação organizada e separada**
- ✅ **Workflow automático coordenado**
- ✅ **Pode documentar páginas existentes**

---

## 🔄 **Comandos Rápidos**

| Comando | Resultado |
|---------|-----------|
| `"Crie página X"` | Feature completa + docs + deploy |
| `"Melhore página Y"` | Melhorias + docs atualizadas |
| `"/documentar Z"` | Documenta página existente |
| `"/deploy"` | Deploy imediato |
| `"/revisar"` | Code review |
| `"Bug na página W"` | Análise + correção + deploy |

---

**🎯 Objetivo:** Desenvolvimento rápido, organizado e bem documentado para o crescimento diário do Chegou Hub!