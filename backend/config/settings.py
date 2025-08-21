"""
Django settings for config project.
"""

from pathlib import Path
import os
import re
from dotenv import load_dotenv
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Carregar variáveis de ambiente do .env (APENAS PARA DESENVOLVIMENTO LOCAL) ---
IS_RAILWAY_DEPLOYMENT = os.getenv('RAILWAY_ENVIRONMENT_NAME') is not None

if not IS_RAILWAY_DEPLOYMENT:
    print("Ambiente local detectado, carregando .env")
    load_dotenv(os.path.join(BASE_DIR, '.env'))
else:
    print("Ambiente Railway detectado, NÃO carregando .env")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'local-dev-insecure-fallback-key')

# --- DEBUG ---
DEBUG_ENV_VAR = os.getenv('DEBUG', 'True' if not IS_RAILWAY_DEPLOYMENT else 'False')
DEBUG = DEBUG_ENV_VAR.lower() == 'true'

# --- ALLOWED_HOSTS ---
ALLOWED_HOSTS_ENV = os.getenv('ALLOWED_HOSTS')
ALLOWED_HOSTS = []
if ALLOWED_HOSTS_ENV:
    ALLOWED_HOSTS.extend([host.strip() for host in ALLOWED_HOSTS_ENV.split(',')])

RAILWAY_PUBLIC_BACKEND_DOMAIN = os.getenv('RAILWAY_PUBLIC_DOMAIN')
if RAILWAY_PUBLIC_BACKEND_DOMAIN:
    ALLOWED_HOSTS.append(RAILWAY_PUBLIC_BACKEND_DOMAIN)
    parts = RAILWAY_PUBLIC_BACKEND_DOMAIN.split('.')
    if len(parts) > 2:
         ALLOWED_HOSTS.append('.'.join(parts[-(len(parts)//2):]))
         ALLOWED_HOSTS.append(f".{'.'.join(parts[-(len(parts)//2):])}")

ALLOWED_HOSTS.append('.railway.app')
ALLOWED_HOSTS.extend([
    'chegouhub.com.br',
    'www.chegouhub.com.br',
])

if DEBUG:
    ALLOWED_HOSTS.extend(['localhost', '127.0.0.1', '*'])
elif not ALLOWED_HOSTS_ENV:
    print("ERRO CRÍTICO: ALLOWED_HOSTS (env var) não definida no ambiente de produção!")
    ALLOWED_HOSTS = []

ALLOWED_HOSTS = list(set(ALLOWED_HOSTS))
if not ALLOWED_HOSTS and not DEBUG:
    print("ALERTA DE SEGURANÇA: ALLOWED_HOSTS está vazia em produção. Adicionando '*' como último recurso.")
    ALLOWED_HOSTS.append('*')

# Application definition ⭐ ATUALIZADO COM SEPARAÇÃO DE MÉTRICAS ⭐
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    
    # Core (apenas autenticação)
    'core.apps.CoreConfig',
    
    # Features (funcionalidades específicas)
    'features.agenda',
    'features.mapa',
    'features.engajamento',
    'features.ia',
    'features.novelties',
    'features.processamento',
    'features.api_monitoring.apps.ApiMonitoringConfig',
    
    # Métricas Separadas
    'features.metricas_primecod',
    'features.metricas_ecomhub',
    'features.metricas_dropi',
    
    # Sistema de Feedback
    'features.feedback.apps.FeedbackConfig',
    
    # Chatbot IA
    'features.chatbot_ia.apps.ChatbotIaConfig',
    
    # Cloudinary para storage de imagens
    'cloudinary_storage',
    'cloudinary',
]

# Adicionar django_rq apenas se Redis estiver disponível (será definido mais abaixo)
# Esta verificação será feita depois da configuração do REDIS_AVAILABLE

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # Desabilitar CSRF completamente no ambiente de teste
    'django.middleware.csrf.CsrfViewMiddleware' if not (DEBUG and os.getenv('DISABLE_CSRF', 'False').lower() == 'true') else 'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Middleware de segurança para detecção de IP - TEMPORARIAMENTE DESABILITADO
    # 'features.processamento.middleware.ip_security_middleware.IPDetectorSecurityMiddleware',
    # 'features.processamento.middleware.ip_security_middleware.SecurityAuditMiddleware',
]

# Remover middleware CSRF duplicado se DISABLE_CSRF estiver ativo
if DEBUG and os.getenv('DISABLE_CSRF', 'False').lower() == 'true':
    MIDDLEWARE = [m for m in MIDDLEWARE if 'CsrfViewMiddleware' not in m]
    print("🚨 CSRF TOTALMENTE DESABILITADO - APENAS PARA TESTE!")

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'staticfiles'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# --- Diagnósticos ---
print(f"--- Django Settings Values ---")
print(f"IS_RAILWAY_DEPLOYMENT: {IS_RAILWAY_DEPLOYMENT}")
print(f"DEBUG: {DEBUG} (lido de: '{DEBUG_ENV_VAR}')")
print(f"ALLOWED_HOSTS: {ALLOWED_HOSTS} (lido de: '{ALLOWED_HOSTS_ENV}')")

# --- Configuração do Banco de Dados ---
DATABASE_URL_FROM_ENV = os.getenv('DATABASE_URL')
if DEBUG and not IS_RAILWAY_DEPLOYMENT and os.getenv('USE_PUBLIC_DB_URL_LOCALLY', 'False').lower() == 'true':
    public_db_url = os.getenv('DATABASE_PUBLIC_URL')
    if public_db_url:
        print("DEBUG LOCAL: Usando DATABASE_PUBLIC_URL para conexão.")
        DATABASE_URL_FROM_ENV = public_db_url

DATABASES = {}
if DATABASE_URL_FROM_ENV and DATABASE_URL_FROM_ENV.strip():
    try:
        print(f"Conectando ao banco de dados via URL (host e nome omitidos por segurança no log)...")
        DATABASES['default'] = dj_database_url.parse(
            DATABASE_URL_FROM_ENV,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=os.getenv('DB_SSL_REQUIRE', 'False').lower() == 'true'
        )
    except Exception as e:
        print(f"ERRO ao configurar DATABASE_URL: {e}. Usando SQLite como fallback.")
        DATABASES['default'] = {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
else:
    print("AVISO: DATABASE_URL não definida. Usando SQLite como fallback.")
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }

# === CONFIGURAÇÃO DE CACHE REDIS ===
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'retry_on_timeout': True,
                'retry_on_error': [ConnectionError, TimeoutError],
                'health_check_interval': 30,
            },
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'chegou_hub',
        'VERSION': 1,
        'TIMEOUT': 3600,  # 1 hora por padrão
    },
    # Cache específico para sessões (opcional)
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL.replace('/0', '/1'),  # DB 1 para sessões
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'chegou_hub_session',
        'TIMEOUT': 86400,  # 24 horas para sessões
    }
}

# Usar LocMem cache sempre que não estivermos no Railway com Redis configurado
REDIS_AVAILABLE = False
if IS_RAILWAY_DEPLOYMENT:
    # No Railway, verificar se Redis está disponível
    try:
        from django_redis import get_redis_connection
        get_redis_connection("default").ping()
        print(f"OK: Cache Redis conectado: {REDIS_URL}")
        REDIS_AVAILABLE = True
    except Exception as e:
        print(f"WARNING: Redis nao disponivel no Railway, usando LocMem cache: {str(e)}")
        REDIS_AVAILABLE = False
else:
    print("Desenvolvimento local: Usando LocMem cache")

if not REDIS_AVAILABLE:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
            'OPTIONS': {
                'MAX_ENTRIES': 1000,
            }
        }
    }

# Adicionar django_rq aos INSTALLED_APPS apenas se Redis estiver disponível
if REDIS_AVAILABLE:
    INSTALLED_APPS.append('django_rq')
    print("django_rq adicionado aos INSTALLED_APPS")
else:
    print("django_rq NÃO adicionado: Redis não disponível")

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (uploads)  
MEDIA_URL = '/media/'

# Configuração de media files para Railway
if not DEBUG:
    # Em produção, salvar media files dentro de staticfiles
    MEDIA_ROOT = BASE_DIR / 'staticfiles' / 'media'
else:
    # Em desenvolvimento local
    MEDIA_ROOT = BASE_DIR / 'media'

# Configurações de upload
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Configurar WhiteNoise para servir media files em produção
if not DEBUG:
    WHITENOISE_USE_FINDERS = True
    # Adicionar diretório media ao WhiteNoise
    WHITENOISE_ROOT = STATIC_ROOT
    WHITENOISE_AUTOREFRESH = True

# ======================== CONFIGURAÇÃO CLOUDINARY ========================
import cloudinary
import cloudinary.uploader
import cloudinary.api

# Configurações do Cloudinary
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME', ''),
    'API_KEY': os.getenv('CLOUDINARY_API_KEY', ''),
    'API_SECRET': os.getenv('CLOUDINARY_API_SECRET', ''),
    'SECURE': True,  # Sempre usar HTTPS
    'INVALIDATE': True,  # Invalidar cache após upload
}

# Configurar cloudinary
cloudinary.config(
    cloud_name=CLOUDINARY_STORAGE['CLOUD_NAME'],
    api_key=CLOUDINARY_STORAGE['API_KEY'],
    api_secret=CLOUDINARY_STORAGE['API_SECRET'],
    secure=True
)

# Verificar se as credenciais do Cloudinary estão configuradas
CLOUDINARY_CONFIGURED = all([
    CLOUDINARY_STORAGE['CLOUD_NAME'],
    CLOUDINARY_STORAGE['API_KEY'],
    CLOUDINARY_STORAGE['API_SECRET']
])

print(f"Cloudinary configurado: {CLOUDINARY_CONFIGURED}")
if not CLOUDINARY_CONFIGURED and not DEBUG:
    print("AVISO: Cloudinary nao esta configurado. Imagens serao perdidas apos deploy!")

# Atualizar STORAGES para usar Cloudinary quando configurado
if CLOUDINARY_CONFIGURED:
    STORAGES["default"] = {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    }
    print("Usando Cloudinary para storage de media files")
else:
    print("Usando FileSystemStorage (desenvolvimento local)")

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Configurações CORS ---
CORS_ALLOWED_ORIGINS = [
    "https://chegouhub.com.br",
    "https://www.chegouhub.com.br",
    "https://chegouhub.up.railway.app",
    "https://chegou-hubb-production.up.railway.app",
]

# Adicionar origens do ambiente variável para CORS
CORS_ALLOWED_ORIGINS_ENV = os.getenv('CORS_ALLOWED_ORIGINS')
if CORS_ALLOWED_ORIGINS_ENV:
    CORS_ALLOWED_ORIGINS.extend([origin.strip() for origin in CORS_ALLOWED_ORIGINS_ENV.split(',')])

# Adicionar origens locais para desenvolvimento
if DEBUG:
    CORS_ALLOWED_ORIGINS.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ])
    
    # Adicionar automaticamente URLs do Railway para CORS em ambiente de teste
    railway_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN')
    if railway_domain:
        CORS_ALLOWED_ORIGINS.extend([
            f"https://{railway_domain}",
            f"http://{railway_domain}"
        ])

CORS_ALLOW_CREDENTIALS = True
print(f"CORS_ALLOWED_ORIGINS: {CORS_ALLOWED_ORIGINS}")
print(f"CORS_ALLOWED_ORIGINS_ENV lida: '{CORS_ALLOWED_ORIGINS_ENV}'")

CORS_EXPOSE_HEADERS = ["Content-Type", "X-CSRFToken"]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]
CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization", "content-type", "dnt", "origin",
    "user-agent", "x-csrftoken", "x-requested-with",
]

# --- Configuração CSRF ---
CSRF_TRUSTED_ORIGINS = [
    "https://chegouhub.com.br",
    "https://www.chegouhub.com.br",
    "https://chegouhub.up.railway.app",
    "https://chegou-hubb-production.up.railway.app"
]

# Adicionar origens do ambiente variável
CSRF_TRUSTED_ORIGINS_ENV = os.getenv('CSRF_TRUSTED_ORIGINS')
if CSRF_TRUSTED_ORIGINS_ENV:
    CSRF_TRUSTED_ORIGINS.extend([origin.strip() for origin in CSRF_TRUSTED_ORIGINS_ENV.split(',')])

# Adicionar origens locais para desenvolvimento
if DEBUG:
    CSRF_TRUSTED_ORIGINS.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ])
    
    # Adicionar automaticamente URLs de teste do Railway
    railway_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN')
    if railway_domain:
        CSRF_TRUSTED_ORIGINS.extend([
            f"https://{railway_domain}",
            f"http://{railway_domain}"
        ])

print(f"CSRF_TRUSTED_ORIGINS: {CSRF_TRUSTED_ORIGINS}")

SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
CSRF_COOKIE_SAMESITE = os.getenv('CSRF_COOKIE_SAMESITE', 'Lax')
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False').lower() == 'true'

CSRF_COOKIE_HTTPONLY = False

# --- Configuração REST Framework ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ]
}

# Aumentar timeout da sessão
SESSION_COOKIE_AGE = 86400 * 7
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

print(f"--- Django Settings Loaded ---")

# ======================== AUTO-CRIAÇÃO DE SUPERUSUÁRIO PARA TESTE ========================
def create_test_superuser():
    """Cria automaticamente um superusuário para ambiente de teste"""
    if DEBUG and IS_RAILWAY_DEPLOYMENT:
        try:
            from django.contrib.auth import get_user_model
            from django.core.management import execute_from_command_line
            import sys
            
            User = get_user_model()
            
            # Só cria se não existir nenhum superusuário
            if not User.objects.filter(is_superuser=True).exists():
                User.objects.create_superuser(
                    username='admin',
                    email='admin@teste.com', 
                    password='123456'
                )
                print("✅ SUPERUSUÁRIO CRIADO AUTOMATICAMENTE:")
                print("   Username: admin")
                print("   Password: 123456")
                print("   Email: admin@teste.com")
            else:
                print("ℹ️  Superusuário já existe no banco de teste")
                
        except Exception as e:
            print(f"⚠️  Erro ao criar superusuário automático: {e}")

# Executar após as configurações do Django estarem prontas
import django
from django.conf import settings
if settings.configured:
    django.setup()
    create_test_superuser()


# ======================== CONFIGURAÇÃO DJANGO-RQ ========================
import os

# Configuração Redis para Django-RQ
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# Configurar RQ apenas se Redis estiver disponível
if REDIS_AVAILABLE:
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
        # Para produção (Railway, Heroku, etc)
        import redis

        REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

        RQ_QUEUES = {
            'default': {
                'CONNECTION': redis.from_url(REDIS_URL),
                'DEFAULT_TIMEOUT': 3600,
            }
        }

    print(f"RQ configurado com Redis: {REDIS_URL}")
else:
    # Desabilitar RQ quando Redis não estiver disponível
    RQ_QUEUES = {}
    print("RQ desabilitado: Redis não disponível")

# Criar diretório de logs se não existir
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# Configurações de logging para RQ e Feedback
if 'LOGGING' not in locals():
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
            'features.metricas_ecomhub': {
                'handlers': ['file_rq', 'console'],
                'level': 'DEBUG',
                'propagate': False,
            },
            'features.feedback': {
                'handlers': ['file_feedback', 'console'],
                'level': 'DEBUG',
                'propagate': False,
            },
        },
    }
else:
    # Se LOGGING já existe, adicionar configurações RQ
    LOGGING['formatters']['rq'] = {
        'format': '[RQ] {levelname} {asctime} - {message}',
        'style': '{',
    }
    LOGGING['handlers']['file_rq'] = {
        'level': 'INFO',
        'class': 'logging.FileHandler',
        'filename': LOG_DIR / 'rq.log',
        'formatter': 'rq',
    }
    LOGGING['loggers']['rq.worker'] = {
        'handlers': ['file_rq', 'console'],
        'level': 'INFO',
        'propagate': False,
    }
    LOGGING['loggers']['features.metricas_ecomhub'] = {
        'handlers': ['file_rq', 'console'],
        'level': 'DEBUG',
        'propagate': False,
    }

print(f"RQ configurado com Redis: {REDIS_URL}")

# ======================== CONFIGURAÇÃO SERVIDOR SELENIUM ECOMHUB ========================
ECOMHUB_SELENIUM_SERVER = os.getenv('ECOMHUB_SELENIUM_SERVER', 'https://ecomhub-selenium-production.up.railway.app')
print(f"Servidor Selenium EcomHub configurado: {ECOMHUB_SELENIUM_SERVER}")

# ======================== CONFIGURAÇÃO SERVIDOR EXTRATOR DROPI ========================
DROPI_EXTRACTOR_SERVER = os.getenv('DROPI_EXTRACTOR_SERVER', 'http://localhost:8002')
print(f"Servidor Extrator Dropi configurado: {DROPI_EXTRACTOR_SERVER}")

# ======================== CONFIGURAÇÃO SERVIDOR EXTRATOR DROPI ========================
DROPI_EXTRACTOR_SERVER = os.getenv('DROPI_EXTRACTOR_SERVER', 'http://localhost:8002')
print(f"Servidor Extrator Dropi configurado: {DROPI_EXTRACTOR_SERVER}")

# Token Service URL
DROPI_TOKEN_SERVICE_URL = os.getenv('DROPI_TOKEN_SERVICE_URL', 'http://localhost:8002')

# ======================== CONFIGURAÇÃO API PRIMECOD ========================
PRIMECOD_API_TOKEN = os.getenv('PRIMECOD_API_TOKEN', '')
print(f"PrimeCOD API configurado: {'Sim' if PRIMECOD_API_TOKEN else 'Não'}")

# Cache para tokens (já configurado acima com Redis)