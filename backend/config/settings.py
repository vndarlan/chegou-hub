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

# Chave de criptografia para WhatsApp Business API
WHATSAPP_ENCRYPTION_KEY = os.getenv('WHATSAPP_ENCRYPTION_KEY')

# Chave de criptografia para NicoChat API
NICOCHAT_ENCRYPTION_KEY = os.getenv('NICOCHAT_ENCRYPTION_KEY', '7Dfkjjc4Jc27vwl2Zfd1EhvyTo1YG0H5dmlkOZL39kM=')
if not NICOCHAT_ENCRYPTION_KEY:
    print("AVISO CRÍTICO: NICOCHAT_ENCRYPTION_KEY não está configurada!")

# Chave de autenticação para n8n (sincronização automática)
N8N_API_KEY = os.getenv('N8N_API_KEY')
if not N8N_API_KEY and IS_RAILWAY_DEPLOYMENT:
    print("AVISO: N8N_API_KEY não configurada. Sincronização automática n8n não funcionará!")

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

# Application definition - ATUALIZADO COM SEPARACAO DE METRICAS
INSTALLED_APPS = [
    'unfold',  # Unfold Admin - DEVE vir antes de django.contrib.admin
    'unfold.contrib.filters',  # Filtros avançados do Unfold
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    
    # Django Channels para WebSockets
    'channels',
    
    # Core (apenas autenticação)
    'core.apps.CoreConfig',
    
    # Features (funcionalidades específicas)
    'features.agenda',
    'features.mapa',
    'features.engajamento',
    'features.ia',
    'features.novelties',
    'features.processamento',
    'features.estoque.apps.EstoqueConfig',
    'features.api_monitoring.apps.ApiMonitoringConfig',

    # Sincronização em Tempo Real
    'features.sync_realtime.apps.SyncRealtimeConfig',

    # Métricas Separadas
    'features.metricas_primecod',
    'features.metricas_ecomhub',
    'features.metricas_dropi',
    'features.metricas_n1italia.apps.MetricasN1ItaliaConfig',

    # Sistema de Feedback
    'features.feedback.apps.FeedbackConfig',

    # Sistema de Tutoriais
    'features.tutoriais.apps.TutoriaisConfig',
    
    
    # Cloudinary para storage de imagens
    'cloudinary_storage',
    'cloudinary',
]

# Adicionar django_rq apenas se Redis estiver disponível (será definido mais abaixo)
# Esta verificação será feita depois da configuração do REDIS_AVAILABLE

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'features.estoque.middleware.CSRFDebugMiddleware',  # DEBUG: Investigar erro 403 CSRF
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # Desabilitar CSRF completamente no ambiente de teste
    'django.middleware.csrf.CsrfViewMiddleware' if not (DEBUG and os.getenv('DISABLE_CSRF', 'False').lower() == 'true') else 'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # Middleware de organização (adiciona request.organization)
    'core.middleware.organization_middleware.OrganizationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Middleware de error logging para produção
    'core.middleware.error_logging.ErrorLoggingMiddleware',
    # Middleware de ultra logging para debug EcomHub (LOCAL vs PRODUÇÃO)
    'core.middleware.ecomhub_request_logger.EcomhubRequestLoggerMiddleware',
    # Middleware de autenticação n8n (sincronização automática via API Key)
    'core.middleware.n8n_auth.N8NAuthMiddleware',
    # Middleware de segurança para detecção de IP - TEMPORARIAMENTE DESABILITADO
    # 'features.processamento.middleware.ip_security_middleware.IPDetectorSecurityMiddleware',
    # 'features.processamento.middleware.ip_security_middleware.SecurityAuditMiddleware',
]

# Remover middleware CSRF duplicado se DISABLE_CSRF estiver ativo
if DEBUG and os.getenv('DISABLE_CSRF', 'False').lower() == 'true':
    MIDDLEWARE = [m for m in MIDDLEWARE if 'CsrfViewMiddleware' not in m]
    print("CSRF TOTALMENTE DESABILITADO - APENAS PARA TESTE!")

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates', BASE_DIR / 'staticfiles'],
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

# === CONFIGURAÇÃO DJANGO CHANNELS ===
ASGI_APPLICATION = 'config.asgi.application'

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
        
        # Adicionar configurações específicas para PostgreSQL em produção
        if 'postgresql' in DATABASES['default']['ENGINE']:
            DATABASES['default']['OPTIONS'] = {
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
                'charset': 'utf8mb4',
                'autocommit': True,
            }
            # Para PostgreSQL, usar configurações específicas
            if IS_RAILWAY_DEPLOYMENT:
                DATABASES['default']['OPTIONS'] = {
                    'sslmode': 'require',
                    'connect_timeout': 30,
                    'client_encoding': 'UTF8',
                }
        print("Configurações de encoding UTF-8 aplicadas ao banco")
        
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

# Verificar se Redis está disponível
REDIS_AVAILABLE = False

# Em produção (Railway), só tentar Redis se a URL não for localhost
if IS_RAILWAY_DEPLOYMENT:
    # Verificar se temos uma URL de Redis válida para produção
    if REDIS_URL and 'localhost' not in REDIS_URL and '127.0.0.1' not in REDIS_URL:
        try:
            from django_redis import get_redis_connection
            get_redis_connection("default").ping()
            print(f"OK: Cache Redis conectado: {REDIS_URL}")
            REDIS_AVAILABLE = True
        except Exception as e:
            print(f"WARNING: Redis nao disponivel no Railway, usando LocMem cache: {str(e)}")
            REDIS_AVAILABLE = False
    else:
        print(f"Railway: Redis URL invalida ou localhost detectado: {REDIS_URL}")
        REDIS_AVAILABLE = False
else:
    # Em desenvolvimento local, tentar Redis apenas se explicitamente solicitado
    if os.getenv('USE_REDIS_LOCALLY', 'False').lower() == 'true':
        try:
            from django_redis import get_redis_connection
            get_redis_connection("default").ping()
            print(f"OK: Cache Redis local conectado: {REDIS_URL}")
            REDIS_AVAILABLE = True
        except Exception as e:
            print(f"WARNING: Redis local nao disponivel: {str(e)}")
            REDIS_AVAILABLE = False
    else:
        print("Desenvolvimento local: Usando LocMem cache (USE_REDIS_LOCALLY=False)")

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
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

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

# ======================== CONFIGURAÇÃO DE EMAIL ========================
# Configuração de envio de emails para convites e notificações

# Backend de email padrão
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

# Configuração SMTP (Gmail por padrão, mas pode ser alterado)
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'ChegouHub <noreply@chegouhub.com.br>')
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Em desenvolvimento local, usar console backend para ver emails no terminal
if DEBUG and not IS_RAILWAY_DEPLOYMENT:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    print("Email Backend: CONSOLE (desenvolvimento local)")
else:
    print(f"Email Backend: SMTP ({EMAIL_HOST}:{EMAIL_PORT})")
    if EMAIL_HOST_USER:
        print(f"   Email configurado: {EMAIL_HOST_USER}")
    else:
        print("   AVISO: EMAIL_HOST_USER nao configurado")

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
    "https://chegouhubteste.up.railway.app",  # URL FRONTEND RAILWAY
    "https://n8ngc.up.railway.app",  # Assistente N8N
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

# CORS deve sempre permitir credentials, nunca usar wildcard
CORS_ALLOW_CREDENTIALS = True

# Para ambiente Railway, SEMPRE incluir as URLs de teste
# Esta configuração é crítica para o funcionamento cross-domain
if IS_RAILWAY_DEPLOYMENT:
    CORS_ALLOWED_ORIGINS.extend([
        "https://chegouhubteste.up.railway.app",
        "http://chegouhubteste.up.railway.app"
    ])
    print("🚀 URLs Railway adicionadas automaticamente ao CORS!")

print(f"CORS_ALLOWED_ORIGINS: {CORS_ALLOWED_ORIGINS}")
print(f"CORS_ALLOWED_ORIGINS_ENV lida: '{CORS_ALLOWED_ORIGINS_ENV}'")

CORS_EXPOSE_HEADERS = ["Content-Type", "X-CSRFToken"]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]
CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization", "content-type", "dnt", "origin",
    "user-agent", "x-csrftoken", "x-requested-with", "cache-control", "pragma",
    "sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site",  # Headers para widgets
]

# --- Configuração CSRF ---
CSRF_TRUSTED_ORIGINS = [
    "https://chegouhub.com.br",
    "https://www.chegouhub.com.br",
    "https://chegouhub.up.railway.app",
    "https://chegou-hubb-production.up.railway.app",
    "https://chegouhubteste.up.railway.app",  # URL FRONTEND RAILWAY
    "https://n8ngc.up.railway.app"  # Assistente N8N
]

# Adicionar origens do ambiente variável
CSRF_TRUSTED_ORIGINS_ENV = os.getenv('CSRF_TRUSTED_ORIGINS')
if CSRF_TRUSTED_ORIGINS_ENV:
    CSRF_TRUSTED_ORIGINS.extend([origin.strip() for origin in CSRF_TRUSTED_ORIGINS_ENV.split(',')])

# Adicionar URLs Railway para ambiente de produção
if IS_RAILWAY_DEPLOYMENT:
    CSRF_TRUSTED_ORIGINS.extend([
        "https://chegouhubteste.up.railway.app",
        "http://chegouhubteste.up.railway.app"
    ])
    print("🚀 URLs Railway adicionadas automaticamente ao CSRF!")

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

# CONFIGURACOES CRITICAS PARA CROSS-DOMAIN AUTHENTICATION
# Para funcionar entre domínios diferentes (frontend e backend Railway)
SESSION_COOKIE_SAMESITE = 'None'  # OBRIGATÓRIO para cross-domain
SESSION_COOKIE_SECURE = True       # HTTPS obrigatório com SameSite=None
CSRF_COOKIE_SAMESITE = 'None'      # OBRIGATÓRIO para cross-domain
CSRF_COOKIE_SECURE = True          # HTTPS obrigatório com SameSite=None

CSRF_COOKIE_HTTPONLY = False

# Configurações adicionais de CSRF e SESSION para cross-domain
CSRF_COOKIE_AGE = 3600  # 1 hora
SESSION_COOKIE_AGE = 86400  # 24 horas
CSRF_COOKIE_DOMAIN = None  # Não definir domínio específico para cross-domain
SESSION_COOKIE_DOMAIN = None  # Não definir domínio específico para cross-domain

# Configurações adicionais para cross-domain authentication
SESSION_SAVE_EVERY_REQUEST = True  # Renovar sessão a cada request
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # Manter sessão ativa

print(f"CSRF Config CROSS-DOMAIN - Secure: {CSRF_COOKIE_SECURE}, SameSite: {CSRF_COOKIE_SAMESITE}, HTTPOnly: {CSRF_COOKIE_HTTPONLY}")
print(f"Session Config CROSS-DOMAIN - Secure: {SESSION_COOKIE_SECURE}, SameSite: {SESSION_COOKIE_SAMESITE}")
print(f"Cross-domain auth configurado para: chegouhubteste.up.railway.app -> backendchegouhubteste.up.railway.app")

# --- Configuração X-Frame-Options para permitir widgets ---
# Permitir embedding de widgets de terceiros confiáveis como N8N
X_FRAME_OPTIONS = 'SAMEORIGIN' if not DEBUG else 'SAMEORIGIN'
print(f"X-Frame-Options configurado para: {X_FRAME_OPTIONS}")

# --- Configuração REST Framework ---
# Classe customizada para desabilitar CSRF no DRF quando necessário
if DEBUG and os.getenv('DISABLE_CSRF', 'False').lower() == 'true':
    from rest_framework.authentication import SessionAuthentication

    class CsrfExemptSessionAuthentication(SessionAuthentication):
        """SessionAuthentication sem validação CSRF (apenas para DEBUG)"""
        def enforce_csrf(self, request):
            return  # Não fazer nada = não validar CSRF

    DRF_AUTH_CLASSES = ['config.settings.CsrfExemptSessionAuthentication']
    print("⚠️ DRF usando SessionAuthentication SEM validação CSRF")
else:
    DRF_AUTH_CLASSES = ['rest_framework.authentication.SessionAuthentication']

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': DRF_AUTH_CLASSES,
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'estoque_user': '200/hour',
        'estoque_webhook': '60/minute',
        'estoque_api_sensitive': '50/hour',
        'estoque_bulk': '10/hour',
    }
}

# ⚠️ REMOVIDO - configuração duplicada movida para cima com cross-domain settings

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
                # Gerar senha aleatória segura para superusuário de teste
                import secrets
                import string
                alphabet = string.ascii_letters + string.digits + string.punctuation
                random_password = ''.join(secrets.choice(alphabet) for i in range(16))

                User.objects.create_superuser(
                    username='admin',
                    email='admin@teste.com',
                    password=random_password
                )
                print("SUPERUSUARIO CRIADO AUTOMATICAMENTE:")
                print("   Username: admin")
                print(f"   Password: {random_password}")
                print("   Email: admin@teste.com")
                print("   ⚠️  IMPORTANTE: Salve esta senha! Ela não será exibida novamente.")
            else:
                print("INFO: Superusuário já existe no banco de teste")
                
        except Exception as e:
            print(f"AVISO: Erro ao criar superusuário automático: {e}")

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
                'JOB_TIMEOUT': 1800,       # 30 minutos para jobs individuais
                'RESULT_TTL': 3600,        # Manter resultados por 1 hora
                'CONNECTION_KWARGS': {
                    'health_check_interval': 30,
                },
            }
        }
    else:
        # Para produção (Railway, Heroku, etc) - apenas se Redis estiver realmente disponível
        try:
            import redis
            REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
            
            # Testar conexão antes de configurar RQ
            test_redis = redis.from_url(REDIS_URL)
            test_redis.ping()
            
            RQ_QUEUES = {
                'default': {
                    'CONNECTION': test_redis,
                    'DEFAULT_TIMEOUT': 3600,   # 1 hora
                    'JOB_TIMEOUT': 1800,       # 30 minutos para jobs individuais
                    'RESULT_TTL': 3600,        # Manter resultados por 1 hora
                }
            }
            print(f"RQ configurado com Redis: {REDIS_URL}")
        except Exception as e:
            print(f"ERRO ao configurar RQ com Redis: {e}")
            RQ_QUEUES = {}
            # Marcar Redis como não disponível se a conexão falhar
            REDIS_AVAILABLE = False
            if 'django_rq' in INSTALLED_APPS:
                INSTALLED_APPS.remove('django_rq')
                print("django_rq removido dos INSTALLED_APPS devido a erro de conexão Redis")
else:
    # Desabilitar RQ quando Redis não estiver disponível
    RQ_QUEUES = {}
    print("RQ desabilitado: Redis não disponível")

# Criar diretório de logs se não existir
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# Configurações de logging para RQ, Feedback e Error Tracking
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
            'error_detail': {
                'format': '[ERROR] {asctime} {levelname} {name} - {message}',
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
            'file_error': {
                'level': 'ERROR',
                'class': 'logging.FileHandler',
                'filename': LOG_DIR / 'errors.log',
                'formatter': 'error_detail',
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
            'core.middleware.error_logging': {
                'handlers': ['file_error', 'console'],
                'level': 'ERROR',
                'propagate': False,
            },
            'features.ia': {
                'handlers': ['file_error', 'console'],
                'level': 'DEBUG',
                'propagate': False,
            },
            'django.request': {
                'handlers': ['file_error', 'console'],
                'level': 'ERROR',
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

# ===== EcomHub Selenium API =====
# Chave de autenticação para EcomHub Selenium
ECOMHUB_SELENIUM_API_KEY = os.getenv('ECOMHUB_SELENIUM_API_KEY')

# Validação em produção
if not ECOMHUB_SELENIUM_API_KEY and IS_RAILWAY_DEPLOYMENT:
    print("⚠️  AVISO: ECOMHUB_SELENIUM_API_KEY não configurada. Integração EcomHub Selenium não funcionará!")

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

# ======================== CONFIGURAÇÃO DJANGO CHANNELS ========================

# Configurar Channel Layer (usado para WebSockets)
if REDIS_AVAILABLE:
    # Usar Redis para Channel Layer se disponível
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
                'capacity': 1500,  # Máximo de mensagens por canal
                'expiry': 60,      # TTL das mensagens em segundos
                'group_expiry': 86400,  # TTL dos grupos em segundos (24h)
                'symmetric_encryption_keys': [SECRET_KEY[:32]],  # Criptografia para segurança
            },
        },
    }
    print(f"Channel Layer configurado com Redis: {REDIS_URL}")
else:
    # Fallback para InMemoryChannelLayer (apenas desenvolvimento)
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
            'CONFIG': {
                'capacity': 300,  # Limite menor para memória
                'expiry': 60,
            }
        },
    }
    print("Channel Layer configurado com InMemory (desenvolvimento apenas)")

# WebSocket timeout settings
WEBSOCKET_ACCEPT_ALL = False  # Requer autenticação
WEBSOCKET_CLOSE_TIMEOUT = 10  # Timeout para fechar conexões em segundos

# ======================== CONFIGURAÇÃO DJANGO UNFOLD (ADMIN CUSTOMIZADO) ========================

# === CORREÇÃO DEFINITIVA: RuntimeError: populate() isn't reentrant ===
# Problema: Imports de reverse_lazy, gettext_lazy e static no topo do arquivo
# causavam inicialização dupla do Django durante collectstatic.
# Solução: Função helper _lazy_reverse() que faz reverse sem importar Django no topo.
# Resultado: collectstatic funciona sem erros ✅
def _lazy_reverse(viewname):
    """Retorna uma função que faz reverse_lazy de forma lazy, evitando imports prematuros"""
    def _reverse(request=None):
        from django.urls import reverse
        return reverse(viewname)
    return _reverse

UNFOLD = {
    "SITE_TITLE": "Chegou Hub Admin",
    "SITE_HEADER": "Chegou Hub",
    "SITE_URL": "https://www.chegouhub.com.br/",  # URL do site principal
    # "SITE_ICON": lambda request: static("icon.svg"),  # Ícone da aba
    # "SITE_LOGO": lambda request: static("logo.svg"),   # Logo no sidebar
    "SITE_SYMBOL": "🚀",  # Emoji como símbolo temporário

    "SHOW_HISTORY": True,  # Mostrar histórico de alterações
    "SHOW_VIEW_ON_SITE": True,  # Botão "Ver no site"

    # Cores EXATAS do Chegou Hub Frontend (de globals.css)
    # Convertidas CORRETAMENTE de HSL para RGB
    "COLORS": {
        "primary": {
            "50": "255 250 245",
            "100": "255 244 235",
            "200": "254 233 215",
            "300": "254 220 186",
            "400": "253 186 116",
            "500": "249 116 21",     # hsl(25, 95%, 53%) = RGB CORRETO
            "600": "230 107 0",
            "700": "194 85 0",
            "800": "163 71 0",
            "900": "122 53 0",
            "950": "82 36 0",
        },
        # Tema CLARO - globals.css :root
        "font": {
            "subtle": "113 113 122",     # hsl(240, 3.8%, 46.1%)
            "default": "8 8 10",         # hsl(240, 10%, 3.9%)
            "brand": "249 116 21",       # hsl(25, 95%, 53%)
        },
        # Tema ESCURO - globals.css .dark
        "font-dark": {
            "subtle": "161 161 169",     # hsl(240, 5%, 64.9%)
            "default": "249 249 249",    # hsl(0, 0%, 98%)
            "brand": "249 116 21",       # hsl(25, 95%, 53%)
        },
    },

    # Sidebar organizada por categorias (baseada no frontend)
    "SIDEBAR": {
        "show_search": True,  # Busca no sidebar
        "show_all_applications": False,  # Não mostrar todos os apps automaticamente
        "navigation": [
            {
                "title": "Gestão",
                "separator": True,
                "items": [
                    {
                        "title": "Usuários",
                        "icon": "person",
                        "link": _lazy_reverse("admin:auth_user_changelist"),
                    },
                    {
                        "title": "Grupos",
                        "icon": "group",
                        "link": _lazy_reverse("admin:auth_group_changelist"),
                    },
                ],
            },
            {
                "title": "Times",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "IA & Automações",
                        "icon": "smart_toy",
                        "collapsible": True,
                        "items": [
                            {
                                "title": "Projetos IA",
                                "link": _lazy_reverse("admin:ia_projetoia_changelist"),
                            },
                            {
                                "title": "Logs de Erros",
                                "link": _lazy_reverse("admin:ia_logentry_changelist"),
                            },
                            {
                                "title": "WhatsApp Business",
                                "link": _lazy_reverse("admin:ia_whatsappbusinessaccount_changelist"),
                            },
                        ],
                    },
                    {
                        "title": "Suporte",
                        "icon": "support_agent",
                        "collapsible": True,
                        "items": [
                            {
                                "title": "Shopify Config",
                                "link": _lazy_reverse("admin:processamento_shopifyconfig_changelist"),
                            },
                            {
                                "title": "Processamento",
                                "link": _lazy_reverse("admin:processamento_processamentolog_changelist"),
                            },
                        ],
                    },
                    {
                        "title": "Estoque",
                        "icon": "inventory_2",
                        "collapsible": True,
                        "items": [
                            {
                                "title": "Produtos",
                                "link": _lazy_reverse("admin:estoque_produtoestoque_changelist"),
                            },
                            {
                                "title": "Movimentações",
                                "link": _lazy_reverse("admin:estoque_movimentacaoestoque_changelist"),
                            },
                            {
                                "title": "Alertas",
                                "link": _lazy_reverse("admin:estoque_alertaestoque_changelist"),
                            },
                        ],
                    },
                ],
            },
            {
                "title": "Métricas",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "Análises",
                        "icon": "analytics",
                        "collapsible": True,
                        "items": [
                            {
                                "title": "N1 Itália",
                                "link": _lazy_reverse("admin:metricas_n1italia_analisen1italia_changelist"),
                            },
                            {
                                "title": "Dropi",
                                "link": _lazy_reverse("admin:metricas_dropi_analisedropi_changelist"),
                            },
                            {
                                "title": "EcomHub",
                                "link": _lazy_reverse("admin:metricas_ecomhub_analiseecomhub_changelist"),
                            },
                            {
                                "title": "PrimeCOD",
                                "link": _lazy_reverse("admin:metricas_primecod_analiseprimecod_changelist"),
                            },
                        ],
                    },
                    {
                        "title": "Monitoramento API",
                        "icon": "monitor_heart",
                        "collapsible": True,
                        "items": [
                            {
                                "title": "Providers",
                                "link": _lazy_reverse("admin:api_monitoring_apiprovider_changelist"),
                            },
                            {
                                "title": "API Keys",
                                "link": _lazy_reverse("admin:api_monitoring_apikey_changelist"),
                            },
                            {
                                "title": "Usage Records",
                                "link": _lazy_reverse("admin:api_monitoring_usagerecord_changelist"),
                            },
                        ],
                    },
                ],
            },
            {
                "title": "Sistema",
                "separator": True,
                "items": [
                    {
                        "title": "Feedbacks",
                        "icon": "feedback",
                        "link": _lazy_reverse("admin:feedback_feedback_changelist"),
                    },
                ],
            },
        ],
    },

    # Estilos customizados (cores do ChegouHub)
    "STYLES": [
        # lambda request: f"{STATIC_URL}css/unfold_custom.css",  # Desabilitado: arquivo não existe
    ],

    # Scripts customizados
    "SCRIPTS": [],

    # Tabs nos formulários
    "TABS": [],

    # Configurações visuais adicionais
    "EXTENSIONS": {
        "modeltranslation": {
            "flags": {
                "en": "🇬🇧",
                "pt-br": "🇧🇷",
            },
        },
    },

    # Login page
    "LOGIN": {
        "image": lambda request: static("images/login-bg.jpg") if False else None,
        "redirect_after": lambda request: "/admin/",
    },
}

# ======================== FIM CONFIGURAÇÃO UNFOLD ========================