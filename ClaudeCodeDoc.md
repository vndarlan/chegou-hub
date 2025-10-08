# Claude Code - Macetes para contrução no Chegou Hub

## 🧠 Comandos para Pensamento Profundo
1. think (~5.000 tokens, 5-10s)
2. think hard (~10.000 tokens, 10-20s)
3. think harder (~50.000 tokens, 30-60s)
4. ultrathink (~128.000-500.000 tokens, 1-3min)

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

## 📝 Regras de Ouro
- **Sempre use agentes especializados**
- **Review é obrigatório antes de deploy**
- **Documente tudo (tech docs + user guides)**