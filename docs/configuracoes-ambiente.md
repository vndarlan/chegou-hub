# ⚙️ Configurações de Ambiente - Chegou Hub

## Visão Geral

O Chegou Hub utiliza um sistema robusto de configurações que se adapta automaticamente entre desenvolvimento local e produção. Todas as configurações sensíveis são externalizadas via variáveis de ambiente para máxima segurança.

## Detecção Automática de Ambiente

### Como funciona
O sistema detecta automaticamente se está rodando no Railway através da variável `RAILWAY_ENVIRONMENT_NAME`:

- **Desenvolvimento Local**: Carrega arquivo `.env` local
- **Produção Railway**: Usa variáveis de ambiente do Railway
- **Configurações automáticas**: CORS, banco de dados, debug mode

## Variáveis de Ambiente Críticas

### 🔐 Segurança & Django Core

#### `DJANGO_SECRET_KEY` (OBRIGATÓRIA)
- **Propósito**: Chave criptográfica para cookies, tokens e hashing
- **Desenvolvimento**: Usa fallback inseguro automático
- **Produção**: **DEVE** ser definida com valor forte (50+ caracteres)
- **Exemplo**: `django-insecure-sua-chave-super-secreta-aqui`

#### `DEBUG` (Recomendada)
- **Propósito**: Controla modo debug do Django
- **Padrão**: `True` (desenvolvimento) / `False` (produção)
- **Valores**: `True` ou `False`

#### `ALLOWED_HOSTS` (Produção)
- **Propósito**: Domínios autorizados para servir a aplicação
- **Auto-configurado**: Railway domains, chegouhub.com.br
- **Formato**: Separado por vírgulas
- **Exemplo**: `chegouhub.com.br,www.chegouhub.com.br`

### 💾 Banco de Dados

#### `DATABASE_URL` (Auto-gerada no Railway)
- **Propósito**: String de conexão PostgreSQL completa
- **Formato**: `postgresql://user:password@host:port/database`
- **Local**: Opcional (usa SQLite se não definida)
- **Railway**: Provisionada automaticamente

#### `USE_PUBLIC_DB_URL_LOCALLY` (Desenvolvimento)
- **Propósito**: Permite usar banco de produção localmente
- **Valores**: `True` ou `False`
- **Uso**: Debugging com dados reais

### 🤖 APIs de Inteligência Artificial

#### `OPENAI_API_KEY` (Funcionalidades IA)
- **Propósito**: Acesso às APIs GPT-4 e outros modelos OpenAI
- **Formato**: `sk-...` (API key padrão)
- **Usado em**: Dashboard IA, automações, analytics
- **Custo**: Monitorado automaticamente pelo sistema

#### `OPENAI_ADMIN_API_KEY` (Monitoring)
- **Propósito**: API key com permissões admin para monitorar custos
- **Formato**: `sk-...` (deve ter permissões de organização)
- **Usado em**: OpenAI Analytics, relatórios financeiros
- **Importante**: Deve ser diferente da key regular

#### `ANTHROPIC_API_KEY` (Chatbot)
- **Propósito**: Acesso ao Claude para chatbot interno
- **Formato**: `sk-ant-api03-...`
- **Usado em**: Sistema de suporte, assistente IA
- **Modelo**: claude-3-5-sonnet-20241022

### 🔗 Integrações Externas

#### `DROPI_API_TOKEN` (Métricas Dropi)
- **Propósito**: Token de autenticação para API Dropi MX
- **Usado em**: Coleta de métricas de dropshipping
- **Renovação**: Conforme política da Dropi

#### `ECOMHUB_API_TOKEN` (Métricas EcomHub)
- **Propósito**: Token para métricas de e-commerce
- **Usado em**: Dashboard de performance de vendas
- **Integração**: Selenium Grid para web scraping

#### `PRIMECOD_API_TOKEN` (Métricas PrimeCod)
- **Propósito**: Token para métricas de performance
- **Usado em**: Análises de tráfego e conversão
- **Frequência**: Coletas diárias automatizadas

### ⚡ Cache e Performance

#### `REDIS_URL` (Auto-gerada no Railway)
- **Propósito**: String de conexão Redis para cache e filas
- **Formato**: `redis://host:port/db`
- **Usado em**: Django-RQ (tarefas assíncronas), cache
- **Local**: `redis://localhost:6379/0` (padrão)

### 📧 Notificações (Opcionais)

#### Configurações de Email
```
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=seu-email@empresa.com
EMAIL_HOST_PASSWORD=senha-de-app
EMAIL_PORT=587
```
- **Propósito**: Notificações automáticas de erros críticos
- **Usado em**: Alerts do sistema, relatórios

## Configurações de Segurança

### CORS (Cross-Origin Resource Sharing)
**Origens permitidas automaticamente:**
- `https://chegouhub.com.br` (produção)
- `https://www.chegouhub.com.br` (produção)
- `http://localhost:3000` (desenvolvimento)
- `http://127.0.0.1:3000` (desenvolvimento)

### CSRF (Cross-Site Request Forgery)
**Configurações automáticas:**
- `CSRF_COOKIE_HTTPONLY = False` (permite acesso via JavaScript)
- `SESSION_COOKIE_AGE = 7 dias` (sessões persistentes)
- Tokens automáticos em todas as requisições

### Cookies de Sessão
- **SameSite**: `Lax` (balanço entre segurança e usabilidade)
- **Secure**: `True` em produção (apenas HTTPS)
- **Duração**: 7 dias (sem expirar ao fechar browser)

## Configurações por Ambiente

### 🏠 Desenvolvimento Local (.env)
```env
DEBUG=True
DJANGO_SECRET_KEY=development-key-here
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
REDIS_URL=redis://localhost:6379/0

# Opcionais para testes com dados reais
DATABASE_URL=postgresql://...
USE_PUBLIC_DB_URL_LOCALLY=True
```

### 🚀 Produção Railway (auto-gerenciado)
```env
DEBUG=False
DJANGO_SECRET_KEY=production-strong-secret
DATABASE_URL=postgresql://... (auto-gerado)
REDIS_URL=redis://... (auto-gerado)
RAILWAY_ENVIRONMENT_NAME=production

# APIs obrigatórias
OPENAI_API_KEY=sk-...
OPENAI_ADMIN_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Integrações
DROPI_API_TOKEN=token-dropi
ECOMHUB_API_TOKEN=token-ecomhub
PRIMECOD_API_TOKEN=token-primecod
```

## Sistema de Logs

### Configurações Automáticas
- **Diretório**: `backend/logs/` (criado automaticamente)
- **Rotação**: Por data e tamanho
- **Níveis**: DEBUG, INFO, WARNING, ERROR, CRITICAL

### Arquivos de Log Principais
```
logs/
├── rq.log          # Workers assíncronos
├── feedback.log    # Sistema de feedback
├── ia.log          # Operações de IA
└── django.log      # Logs gerais do Django
```

## Cache e Performance

### Configurações de Cache
- **Backend**: `django.core.cache.backends.locmem.LocMemCache`
- **Máximo**: 1000 entradas por processo
- **TTL padrão**: 300 segundos (5 minutos)

### Otimizações Automáticas
- **WhiteNoise**: Compressão de arquivos estáticos
- **Gunicorn**: 2 workers em produção
- **Connection pooling**: PostgreSQL com `conn_max_age=600`

## Monitoramento de Configurações

### Health Check Endpoint
- **URL**: `/health/`
- **Verifica**: Banco de dados, Redis, APIs críticas
- **Usado por**: Railway health checks

### Comandos de Verificação
```bash
# Verificar todas as configurações
python manage.py check

# Testar conexão com banco
python manage.py migrate --dry-run

# Status das filas Redis
python manage.py rq_status

# Coletar arquivos estáticos
python manage.py collectstatic --dry-run
```

## Troubleshooting Comum

### ❌ "SECRET_KEY não configurada"
- **Solução**: Definir `DJANGO_SECRET_KEY` nas variáveis de ambiente
- **Comando**: No Railway, adicionar via dashboard

### ❌ "CORS policy error"
- **Causa**: Frontend rodando em porta não liberada
- **Solução**: Verificar se `localhost:3000` está em `CORS_ALLOWED_ORIGINS`

### ❌ "API key inválida"
- **OpenAI**: Verificar se key começa com `sk-` e tem permissões
- **Anthropic**: Verificar se key começa com `sk-ant-api03-`

### ❌ "Redis connection failed"
- **Local**: Instalar e iniciar Redis (`redis-server`)
- **Produção**: Verificar se `REDIS_URL` foi provisionada

## Boas Práticas

### Segurança
✅ **NUNCA** commitar arquivos `.env` no Git  
✅ Usar valores diferentes entre desenvolvimento e produção  
✅ Rotacionar API keys periodicamente  
✅ Monitorar uso e custos das APIs externas  

### Performance
✅ Configurar cache adequadamente por feature  
✅ Usar `DEBUG=False` em produção sempre  
✅ Monitorar logs de erro regularmente  
✅ Manter backups das configurações críticas  

---

**Este sistema de configurações garante que o Chegou Hub rode de forma segura e otimizada em qualquer ambiente, com máxima flexibilidade para desenvolvimento e produção.**