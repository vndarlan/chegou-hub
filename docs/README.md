# 📚 Documentação - Chegou Hub

Bem-vindo à documentação do Chegou Hub! Esta documentação é mantida automaticamente pelos **Agentes de Documentação**.

## 📋 **Índice Geral**

### 🔧 **Backend**
- [📁 Features](backend/features/) - Documentação de cada funcionalidade
- [📁 API](backend/api/) - Endpoints e integrações
- [⚙️ Configurações](backend/configuracoes.md) - Configurações gerais do Django

### 🎨 **Frontend**
- [📁 Páginas](frontend/pages/) - Documentação de cada página
- [📁 Componentes](frontend/components/) - Componentes importantes
- [🏗️ Estrutura](frontend/estrutura-frontend.md) - Organização do frontend

### 📖 **Guias do Usuário**
- [📁 Como Usar](user-guides/) - Guias passo a passo para cada funcionalidade

### 🚀 **Deploy**
- [📁 Deployment](deployment/) - Deploy no Railway e troubleshooting

---

## 🗂️ **Estrutura da Documentação**

```
📁 docs/
├── 📁 backend/
│   ├── 📁 features/          # Uma .md para cada feature
│   │   ├── agenda.md         # 📅 Sistema de agenda
│   │   ├── engajamento.md    # 📊 Métricas de engajamento
│   │   ├── ia.md             # 🤖 Dashboard de IA
│   │   ├── mapa.md           # 🗺️ Mapa de cobertura
│   │   ├── feedback.md       # 💬 Sistema de feedback
│   │   ├── novelties.md      # 📰 Novidades da empresa
│   │   ├── processamento.md  # ⚙️ Processamento de dados
│   │   ├── metricas-primecod.md    # 📈 Métricas PRIMECOD
│   │   ├── metricas-ecomhub.md     # 📈 Métricas ECOMHUB
│   │   └── metricas-dropi.md       # 📈 Métricas DROPI
│   ├── 📁 api/              # Endpoints detalhados
│   │   ├── autenticacao.md   # 🔐 Sistema de login
│   │   ├── endpoints-agenda.md
│   │   ├── endpoints-ia.md
│   │   └── [outros endpoints]
│   └── configuracoes.md     # ⚙️ Django settings e configs
├── 📁 frontend/
│   ├── 📁 pages/            # Documentação das páginas
│   │   ├── agenda-page.md
│   │   ├── engajamento-page.md
│   │   ├── ia-dashboard.md
│   │   ├── mapa-page.md
│   │   └── [outras páginas]
│   ├── 📁 components/       # Componentes importantes
│   │   ├── navbar.md        # 🧭 Sistema de navegação
│   │   ├── sidebar.md       # 📋 Barra lateral
│   │   └── [outros componentes]
│   └── estrutura-frontend.md # 🏗️ Organização geral
├── 📁 user-guides/          # Guias práticos
│   ├── como-usar-agenda.md
│   ├── como-usar-engajamento.md
│   ├── como-criar-projeto-ia.md
│   ├── como-usar-metricas.md
│   └── [outros guias]
└── 📁 deployment/           # Deploy e infraestrutura
    ├── railway-deploy.md    # 🚀 Deploy no Railway
    └── troubleshooting.md   # 🛠️ Solução de problemas
```

---

## 🤖 **Como a Documentação é Mantida**

Esta documentação é criada e mantida automaticamente pelos **Agentes de Documentação**:

### 📖 **Technical Documentation Agent**
- Cria documentação técnica em linguagem simples
- Atualiza automaticamente quando features são modificadas
- Documenta APIs e configurações

### 📋 **User Guide Agent**
- Cria guias passo a passo para usuários finais
- Foca na experiência prática de uso
- Mantém guias atualizados com mudanças na interface

### ⚡ **Atualização Automática**
Sempre que uma nova feature é criada ou modificada, a documentação é automaticamente:
1. ✅ Criada ou atualizada
2. ✅ Organizada na estrutura correta
3. ✅ Escrita em português claro e simples

---

## 📱 **Páginas Atuais do Sistema**

### 🔧 **Backend Features Disponíveis**
- 📅 **Agenda** - Calendário da empresa e eventos
- 📊 **Engajamento** - Métricas de engajamento dos funcionários
- 🤖 **IA** - Dashboard de projetos e automações de IA
- 🗺️ **Mapa** - Mapeamento de cobertura geográfica
- 💬 **Feedback** - Sistema de feedback dos usuários
- 📰 **Novelties** - Novidades e notícias da empresa
- ⚙️ **Processamento** - Utilitários de processamento de dados
- 📈 **Métricas PRIMECOD** - Integração com métricas PRIMECOD
- 📈 **Métricas ECOMHUB** - Integração com métricas ECOMHUB
- 📈 **Métricas DROPI** - Integração com métricas DROPI MX

### 🎨 **Frontend Pages Disponíveis**
- 🔐 **Login** - Página de autenticação
- 🏠 **Workspace** - Página principal do sistema
- 📅 **Agenda** - Interface do calendário
- 📊 **Engajamento** - Dashboard de engajamento
- 🤖 **IA Dashboard** - Painel de projetos de IA
- 🗺️ **Mapa** - Interface do mapa de cobertura
- 📈 **Métricas** - Dashboards de métricas (PRIMECOD, ECOMHUB, DROPI)
- 📰 **Novelties** - Página de novidades
- ⚙️ **Processamento** - Interface de processamento

---

## 🎯 **Como Solicitar Documentação**

### **Para Nova Feature**
Quando você cria uma nova feature, a documentação é criada automaticamente.

### **Para Feature Existente**
```
"Documentation Agents, documentem a página de Engajamento"
"/documentar agenda"
"Criem guia de uso para a página de IA"
```

### **Para Documentação Completa**
```
"Documentation Agents, documentem todas as páginas existentes"
"Quero documentação completa do sistema atual"
```

---

## 🔍 **Navegação Rápida**

| Tipo de Documentação | Local | Comando |
|----------------------|-------|---------|
| 🔧 **Técnica Backend** | [backend/](backend/) | `/documentar backend [feature]` |
| 🎨 **Técnica Frontend** | [frontend/](frontend/) | `/documentar frontend [page]` |
| 📖 **Guia Usuário** | [user-guides/](user-guides/) | `/guia [funcionalidade]` |
| 🚀 **Deploy** | [deployment/](deployment/) | Automático com Deploy Agent |

---

**🤖 Mantido automaticamente pelos Agentes de Documentação do Chegou Hub**