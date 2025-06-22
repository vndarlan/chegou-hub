# 🤖 Guia: Como Trabalhar com IA na Nova Estrutura

## 🆕 **Criar Nova Página**

### Arquivos para enviar:
```
📁 Para IA: "Crie uma nova funcionalidade X"
├── 📁 Exemplo de estrutura (envie uma funcionalidade existente):
│   ├── backend/features/agenda/ (pasta inteira)
│   └── frontend/src/features/agenda/ (pasta inteira)
└── 📝 Prompt: "Baseado nesta estrutura, crie uma nova funcionalidade Y com as características: [descrever]"
```

### Exemplo de prompt:
```
🤖 "Baseado na estrutura da funcionalidade Agenda, crie uma nova funcionalidade chamada 'Tarefas' que:
- Backend: Model para Task com título, descrição, status, deadline
- Frontend: Página com lista, formulário de criação, filtros por status
- Inclua todos os arquivos: models.py, views.py, serializers.py, admin.py, urls.py, TaskPage.js"

[Enviar pasta backend/features/agenda/ completa]
[Enviar pasta frontend/src/features/agenda/ completa]
```

---

## ✏️ **Editar Página Existente**

### Arquivos para enviar:
```
📁 Para IA: "Melhore a funcionalidade X"
├── backend/features/[nome_funcionalidade]/ (pasta inteira)
└── frontend/src/features/[nome_funcionalidade]/ (pasta inteira)
```

### Exemplo - Melhorar Agenda:
```
📁 Enviar para IA:
├── backend/features/agenda/
│   ├── models.py
│   ├── views.py  
│   ├── serializers.py
│   ├── admin.py
│   └── urls.py
└── frontend/src/features/agenda/
    └── AgendaPage.js

🤖 Prompt: "Melhore esta funcionalidade adicionando:
- Notificações de eventos próximos
- Filtro por mês/semana
- Export para PDF
- Interface mais responsiva"
```

### Exemplo - Melhorar Mapa:
```
📁 Enviar para IA:
├── backend/features/mapa/ (todos os arquivos)
└── frontend/src/features/mapa/
    └── MapaPage.js

🤖 Prompt: "Adicione à funcionalidade Mapa:
- Filtros por continente
- Informações de população por país
- Animações nos marcadores
- Modal com detalhes do país"
```

---

## 📋 **Templates de Prompts**

### 🆕 **Nova Funcionalidade:**
```
"Baseado na estrutura de [funcionalidade_existente], crie uma nova funcionalidade '[nome]' que:

Backend:
- Model: [descrever campos]
- API: [descrever endpoints]
- Admin: [funcionalidades admin]

Frontend:
- Interface: [descrever layout]
- Funcionalidades: [listar features]
- Componentes: [tipo de componentes]

[Enviar pasta de exemplo completa]"
```

### ✏️ **Melhorar Existente:**
```
"Melhore esta funcionalidade [nome] adicionando:
- [Feature 1]
- [Feature 2] 
- [Feature 3]
- Correções de bugs: [se houver]

[Enviar pasta da funcionalidade completa]"
```

### 🐛 **Corrigir Bug:**
```
"Tem um bug nesta funcionalidade:
Problema: [descrever problema]
Erro: [colar erro se houver]
Comportamento esperado: [descrever]

[Enviar pasta da funcionalidade completa]"
```

---

## ⚡ **Dicas Importantes**

### ✅ **Sempre Envie:**
- **Pasta backend completa** da funcionalidade
- **Pasta frontend completa** da funcionalidade  
- **Prompt claro** com o que quer

### ❌ **Nunca Envie:**
- Arquivos de outras funcionalidades
- config/, core/ (a menos que seja problema de autenticação)
- package.json, settings.py (a menos que seja problema de configuração)

### 🎯 **Resultado:**
- IA entende perfeitamente o contexto
- Respostas precisas e aplicáveis
- Código organizado na mesma estrutura
- Fácil de aplicar as mudanças

---

## 📁 **Checklist Rápido**

**Para Nova Página:**
- [ ] Escolher funcionalidade existente como exemplo
- [ ] Enviar pasta backend/features/[exemplo]/
- [ ] Enviar pasta frontend/src/features/[exemplo]/
- [ ] Prompt explicando nova funcionalidade

**Para Editar Página:**
- [ ] Enviar pasta backend/features/[nome]/  
- [ ] Enviar pasta frontend/src/features/[nome]/
- [ ] Prompt explicando melhorias desejadas

**Resultado:** IA retorna arquivos prontos para colar nas pastas! 🚀

---

## 🔧 **Casos Especiais - Quando Enviar Outros Arquivos**

### 🔐 **Problemas de Login/Autenticação**
```
📁 Enviar para IA:
├── backend/core/ (pasta inteira)
├── backend/config/settings.py
├── backend/config/urls.py
└── frontend/src/shared/pages/LoginPage.js

🤖 Prompt: "Erro no login: [descrever problema]"
```

### 🌐 **Problemas de CORS/API**
```
📁 Enviar para IA:
├── backend/config/settings.py
├── backend/core/middleware.py
├── backend/core/views_debug.py
└── frontend/src/shared/components/CSRFManager.js

🤖 Prompt: "Erro de CORS: [colar erro]"
```

### 🎨 **Problemas de Tema/Navbar**
```
📁 Enviar para IA:
├── frontend/src/App.js
├── frontend/src/shared/components/NavbarNested/ (pasta inteira)
└── frontend/src/shared/pages/WorkspacePage.js

🤖 Prompt: "Problema no tema/navegação: [descrever]"
```

### 🗄️ **Problemas de Database/Models**
```
📁 Enviar para IA:
├── backend/config/settings.py
├── backend/features/[funcionalidade]/models.py (específica)
└── Logs de erro do migrate

🤖 Prompt: "Erro de migração: [colar erro]"
```

### 📦 **Problemas de Deploy/Configuração**
```
📁 Enviar para IA:
├── backend/requirements.txt
├── backend/railway.toml
├── backend/runtime.txt
├── frontend/package.json
└── Logs do Railway

🤖 Prompt: "Erro de deploy: [colar logs]"
```

### 🔄 **Problemas de Roteamento**
```
📁 Enviar para IA:
├── backend/config/urls.py
├── backend/features/[funcionalidade]/urls.py
└── frontend/src/shared/pages/WorkspacePage.js

🤖 Prompt: "Erro 404/roteamento: [descrever]"
```

---

## 📋 **Checklist de Troubleshooting**

**1. Identifique o tipo de erro:**
- 🔐 Login/Auth → Core + Config
- 🌐 API/CORS → Config + Middleware  
- 🎨 UI/Tema → App + Shared
- 🗄️ Database → Models + Settings
- 📦 Deploy → Config files + Logs
- 🔄 Rotas → URLs + Workspace

**2. Envie apenas arquivos relevantes:**
- ❌ Não envie funcionalidades não relacionadas
- ✅ Foque no sistema afetado

**3. Inclua logs/erros:**
- Console do navegador
- Logs do servidor
- Mensagens de erro específicas

**Resultado:** IA resolve problemas sistêmicos rapidamente! 🚀