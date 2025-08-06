# ⚙️ Configurações Backend - Django

## O que faz

Este documento explica todas as configurações principais do Django no arquivo `backend/config/settings.py`, incluindo banco de dados, CORS, CSRF, RQ e deploy.

## Como funciona

O sistema usa um arquivo de configurações centralizado que se adapta automaticamente ao ambiente (desenvolvimento local ou produção Railway).

## Configurações Principais

### Detecção de Ambiente
```python
# Detecta automaticamente se está no Railway
IS_RAILWAY_DEPLOYMENT = os.getenv('RAILWAY_ENVIRONMENT_NAME') is not None

if not IS_RAILWAY_DEPLOYMENT:
    # Desenvolvimento local - carrega .env
    load_dotenv(os.path.join(BASE_DIR, '.env'))
else:
    # Produção Railway - usa variáveis de ambiente
    print("Ambiente Railway detectado")
```

### Configurações de Segurança

#### SECRET_KEY
```python
# Chave secreta obrigatória
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'local-dev-insecure-fallback-key')
```
- **Produção**: Definida na variável `DJANGO_SECRET_KEY`
- **Desenvolvimento**: Usa fallback inseguro (apenas para testes)

#### DEBUG Mode
```python
DEBUG_ENV_VAR = os.getenv('DEBUG', 'True' if not IS_RAILWAY_DEPLOYMENT else 'False')
DEBUG = DEBUG_ENV_VAR.lower() == 'true'
```
- **Produção**: `DEBUG=False` (padrão)
- **Desenvolvimento**: `DEBUG=True` (padrão)

#### ALLOWED_HOSTS
```python
ALLOWED_HOSTS = []
ALLOWED_HOSTS_ENV = os.getenv('ALLOWED_HOSTS')

# Adiciona hosts do Railway automaticamente
if RAILWAY_PUBLIC_BACKEND_DOMAIN:
    ALLOWED_HOSTS.append(RAILWAY_PUBLIC_BACKEND_DOMAIN)

# Hosts de produção fixos
ALLOWED_HOSTS.extend([
    'chegouhub.com.br',
    'www.chegouhub.com.br',
    '.railway.app'
])

# Desenvolvimento local
if DEBUG:
    ALLOWED_HOSTS.extend(['localhost', '127.0.0.1', '*'])
```

## Apps Django Instaladas

### Apps Principais
```python
INSTALLED_APPS = [
    # Django core
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic',  # Arquivos estáticos
    'django.contrib.staticfiles',
    
    # Extensões
    'corsheaders',        # CORS para frontend
    'rest_framework',     # API REST
    'django_rq',          # Fila de tarefas
    
    # Core (funcionalidades base)
    'core.apps.CoreConfig',
]
```

### Features (Funcionalidades)
```python
# Funcionalidades principais
'features.agenda',           # 📅 Sistema de calendários
'features.mapa',             # 🗺️ Mapa de cobertura
'features.engajamento',      # 📊 Métricas de engajamento
'features.ia',               # 🤖 Dashboard de projetos IA
'features.novelties',        # 📰 Novidades da empresa
'features.processamento',    # ⚙️ Processamento de dados

# Métricas separadas
'features.metricas_primecod', # 📈 Integração PRIMECOD
'features.metricas_ecomhub',  # 📈 Integração ECOMHUB
'features.metricas_dropi',    # 📈 Integração DROPI

# Sistemas auxiliares
'features.feedback.apps.FeedbackConfig',    # 💬 Feedback de usuários
'features.chatbot_ia.apps.ChatbotIaConfig', # 🤖 Chatbot inteligente
```

## Configuração do Banco de Dados

### Detecção Automática
```python
DATABASE_URL_FROM_ENV = os.getenv('DATABASE_URL')

# Para desenvolvimento local com banco de produção (opcional)
if DEBUG and os.getenv('USE_PUBLIC_DB_URL_LOCALLY', 'False').lower() == 'true':
    public_db_url = os.getenv('DATABASE_PUBLIC_URL')
    if public_db_url:
        DATABASE_URL_FROM_ENV = public_db_url
```

### Configuração do Banco
```python
if DATABASE_URL_FROM_ENV:
    # PostgreSQL (produção) via URL
    DATABASES['default'] = dj_database_url.parse(
        DATABASE_URL_FROM_ENV,
        conn_max_age=600,           # Conexões persistentes
        conn_health_checks=True,    # Health checks
        ssl_require=os.getenv('DB_SSL_REQUIRE', 'False').lower() == 'true'
    )
else:
    # SQLite (desenvolvimento)
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
```

## Configurações CORS

### Origens Permitidas
```python
CORS_ALLOWED_ORIGINS = [
    "https://chegouhub.com.br",
    "https://www.chegouhub.com.br",
    "https://chegouhub.up.railway.app",
    "https://chegou-hubb-production.up.railway.app",
]

# Desenvolvimento local
if DEBUG:
    CORS_ALLOWED_ORIGINS.extend([
        "http://localhost:3000",    # Frontend React
        "http://127.0.0.1:3000",
        "http://localhost:8000",    # Django dev server
        "http://127.0.0.1:8000",
    ])
```

### Configurações CORS Adicionais
```python
CORS_ALLOW_CREDENTIALS = True  # Permite cookies de sessão
CORS_EXPOSE_HEADERS = ["Content-Type", "X-CSRFToken"]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]
CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization", "content-type", 
    "dnt", "origin", "user-agent", "x-csrftoken", "x-requested-with",
]
```

## Configurações CSRF

### Origens Confiáveis
```python
CSRF_TRUSTED_ORIGINS = [
    "https://chegouhub.com.br",
    "https://www.chegouhub.com.br",
    "https://chegouhub.up.railway.app",
    "https://chegou-hubb-production.up.railway.app"
]

# Desenvolvimento local
if DEBUG:
    CSRF_TRUSTED_ORIGINS.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ])
```

### Configurações de Cookies
```python
SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
CSRF_COOKIE_SAMESITE = os.getenv('CSRF_COOKIE_SAMESITE', 'Lax')
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False').lower() == 'true'

# Permite acesso via JavaScript (necessário para React)
CSRF_COOKIE_HTTPONLY = False

# Sessão de 7 dias
SESSION_COOKIE_AGE = 86400 * 7
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
```

## Configuração Django REST Framework

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ]
}
```

**Por que usar SessionAuthentication?**
- Integração nativa com sistema de autenticação Django
- Cookies seguros gerenciados automaticamente
- Proteção CSRF integrada
- Não requer gerenciamento manual de tokens

## Configuração Django-RQ (Filas)

### Redis para Background Tasks
```python
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# Desenvolvimento local
if not IS_RAILWAY_DEPLOYMENT:
    RQ_QUEUES = {
        'default': {
            'HOST': 'localhost',
            'PORT': 6379,
            'DB': 0,
            'PASSWORD': '',
            'DEFAULT_TIMEOUT': 3600,  # 1 hora
            'CONNECTION_KWARGS': {
                'health_check_interval': 30,
            },
        }
    }
else:
    # Produção (Railway)
    import redis
    RQ_QUEUES = {
        'default': {
            'CONNECTION': redis.from_url(REDIS_URL),
            'DEFAULT_TIMEOUT': 3600,
        }
    }
```

### Sistema de Logs
```python
# Criar diretório de logs
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'rq': {
            'format': '[RQ] {levelname} {asctime} - {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file_rq': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': LOG_DIR / 'rq.log',
            'formatter': 'rq',
        },
        'file_feedback': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': LOG_DIR / 'feedback.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'rq.worker': {
            'handlers': ['file_rq', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'features.feedback': {
            'handlers': ['file_feedback', 'console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
```

## Configurações de Arquivos Estáticos

### WhiteNoise para Deploy
```python
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (uploads)
MEDIA_URL = '/media/'

if not DEBUG:
    # Produção: media files dentro de staticfiles
    MEDIA_ROOT = BASE_DIR / 'staticfiles' / 'media'
else:
    # Desenvolvimento: pasta media separada
    MEDIA_ROOT = BASE_DIR / 'media'

# WhiteNoise para servir arquivos estáticos
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Configurações de upload
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
```

## Configurações de Integrações Externas

### Servidor Selenium para EcomHub
```python
ECOMHUB_SELENIUM_SERVER = os.getenv(
    'ECOMHUB_SELENIUM_SERVER', 
    'https://ecomhub-selenium-production.up.railway.app'
)
```

### Extrator Dropi
```python
DROPI_EXTRACTOR_SERVER = os.getenv('DROPI_EXTRACTOR_SERVER', 'http://localhost:8002')
DROPI_TOKEN_SERVICE_URL = os.getenv('DROPI_TOKEN_SERVICE_URL', 'http://localhost:8002')
```

### Cache
```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
        }
    }
}
```

## Configurações Regionais

```python
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True
```

## Variáveis de Ambiente Importantes

### Desenvolvimento Local (.env)
```env
DEBUG=True
DJANGO_SECRET_KEY=sua-chave-secreta
DATABASE_URL=postgresql://user:pass@localhost/dbname
REDIS_URL=redis://localhost:6379/0
USE_PUBLIC_DB_URL_LOCALLY=True  # Para usar DB de produção
```

### Produção (Railway)
```env
DEBUG=False
DJANGO_SECRET_KEY=chave-secreta-forte
DATABASE_URL=postgresql://... (auto-gerado)
REDIS_URL=redis://... (auto-gerado)
RAILWAY_ENVIRONMENT_NAME=production
ALLOWED_HOSTS=chegouhub.com.br,www.chegouhub.com.br
```

## Problemas Comuns

### CORS Errors
```python
# ❌ Erro: "CORS policy: No 'Access-Control-Allow-Origin'"
# ✅ Solução: Verificar se origem está em CORS_ALLOWED_ORIGINS

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Deve incluir porta exata
]
```

### CSRF Errors
```python
# ❌ Erro: "CSRF token missing or incorrect"
# ✅ Solução: Verificar CSRF_TRUSTED_ORIGINS e CSRF_COOKIE_HTTPONLY

CSRF_TRUSTED_ORIGINS = ["http://localhost:3000"]
CSRF_COOKIE_HTTPONLY = False  # Permite acesso via JavaScript
```

### Database Connection
```python
# ❌ Erro: "Connection refused"
# ✅ Solução: Verificar DATABASE_URL ou usar SQLite local

# Para forçar SQLite em desenvolvimento
if DEBUG:
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
```

### Redis/RQ Issues
```bash
# Verificar se Redis está rodando
redis-cli ping
# Deve retornar: PONG

# Iniciar Redis localmente (Windows)
redis-server

# Ver status da fila
python manage.py rq_status
```

## Comandos Úteis

### Verificação de Configurações
```bash
# Verificar configurações Django
python manage.py check

# Testar conexão com banco
python manage.py check_db

# Ver variáveis de ambiente
python manage.py shell -c "import os; print(os.environ.get('DEBUG'))"

# Coletar arquivos estáticos
python manage.py collectstatic

# Ver status do RQ
python manage.py rq_status
```

---

**Essas configurações garantem que o sistema funcione perfeitamente tanto em desenvolvimento quanto em produção, com segurança robusta e performance otimizada.**