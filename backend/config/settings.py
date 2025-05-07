# backend/config/settings.py
"""
Django settings for config project.
"""

from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Carregar variáveis de ambiente do .env (APENAS PARA DESENVOLVIMENTO LOCAL) ---
# Em produção (Railway), as variáveis de ambiente devem ser definidas no painel do Railway.
IS_RAILWAY_DEPLOYMENT = os.getenv('RAILWAY_ENVIRONMENT_NAME') is not None # Railway define esta variável

if not IS_RAILWAY_DEPLOYMENT:
    print("Ambiente local detectado, carregando .env")
    load_dotenv(os.path.join(BASE_DIR, '.env'))
else:
    print("Ambiente Railway detectado, NÃO carregando .env")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'local-dev-insecure-fallback-key')

# --- DEBUG ---
# No Railway, a variável de ambiente DEBUG deve ser a string "False"
# No .env local, pode ser "True"
DEBUG_ENV_VAR = os.getenv('DEBUG', 'True' if not IS_RAILWAY_DEPLOYMENT else 'False') # Default para True local, False Railway
DEBUG = DEBUG_ENV_VAR.lower() == 'true'

# --- ALLOWED_HOSTS ---
# No Railway, defina a variável de ambiente ALLOWED_HOSTS como:
# "chegouhub.up.railway.app,chegou-hubb-production.up.railway.app"
ALLOWED_HOSTS_ENV = os.getenv('ALLOWED_HOSTS')
if ALLOWED_HOSTS_ENV:
    ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_ENV.split(',')]
else:
    if DEBUG: # Local dev fallback
        ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']
    else: # Produção sem ALLOWED_HOSTS definido é um erro de configuração
        print("ERRO CRÍTICO: ALLOWED_HOSTS não definida no ambiente de produção!")
        ALLOWED_HOSTS = [] # Forçará um erro se não corrigido

# --- Chave da API OpenAI ---
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Application definition
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
    'core.apps.CoreConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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
if DATABASE_URL_FROM_ENV:
    print(f"Conectando ao banco de dados via URL (host e nome omitidos por segurança no log)...")
    DATABASES['default'] = dj_database_url.parse(
        DATABASE_URL_FROM_ENV,
        conn_max_age=600,
        conn_health_checks=True,
        ssl_require=os.getenv('DB_SSL_REQUIRE', 'False').lower() == 'true'
    )
else:
    print("AVISO: DATABASE_URL não definida. Usando SQLite como fallback.")
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }

# Password validation (mantido como antes)
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization (mantido como antes)
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# Static files (mantido como antes)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Configurações CORS ---
CORS_ALLOW_CREDENTIALS = True
# No Railway, defina CORS_ALLOWED_ORIGINS="https://chegouhub.up.railway.app"
CORS_ALLOWED_ORIGINS_ENV = os.getenv('CORS_ALLOWED_ORIGINS')
if CORS_ALLOWED_ORIGINS_ENV:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS_ENV.split(',')]
else:
    if DEBUG: # Local dev fallback
        CORS_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
    else: # Produção sem CORS_ALLOWED_ORIGINS é um erro
        print("ERRO CRÍTICO: CORS_ALLOWED_ORIGINS não definida no ambiente de produção!")
        CORS_ALLOWED_ORIGINS = []
print(f"CORS_ALLOWED_ORIGINS: {CORS_ALLOWED_ORIGINS} (lido de: '{CORS_ALLOWED_ORIGINS_ENV}')")

CORS_EXPOSE_HEADERS = ["Content-Type", "X-CSRFToken"]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]
CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization", "content-type", "dnt", "origin",
    "user-agent", "x-csrftoken", "x-requested-with",
]

# --- Configuração CSRF ---
# No Railway, defina CSRF_TRUSTED_ORIGINS="https://chegouhub.up.railway.app,https://chegou-hubb-production.up.railway.app"
CSRF_TRUSTED_ORIGINS_ENV = os.getenv('CSRF_TRUSTED_ORIGINS')
if CSRF_TRUSTED_ORIGINS_ENV:
    CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in CSRF_TRUSTED_ORIGINS_ENV.split(',')]
else:
    if DEBUG: # Local dev fallback
        CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
    else: # Produção sem CSRF_TRUSTED_ORIGINS é um erro
        print("ERRO CRÍTICO: CSRF_TRUSTED_ORIGINS não definida no ambiente de produção!")
        CSRF_TRUSTED_ORIGINS = []
print(f"CSRF_TRUSTED_ORIGINS: {CSRF_TRUSTED_ORIGINS} (lido de: '{CSRF_TRUSTED_ORIGINS_ENV}')")

# Teste com 'Lax' primeiro. Se o login do frontend ainda falhar por CSRF/Sessão, mude para None.
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'

CSRF_COOKIE_HTTPONLY = False # Crucial para Axios enviar o X-CSRFToken header
CSRF_COOKIE_SECURE = not DEBUG  # True em produção, False em desenvolvimento local
SESSION_COOKIE_SECURE = not DEBUG # True em produção, False em desenvolvimento local

# --- Configuração REST Framework ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ]
}

# Aumentar timeout da sessão
SESSION_COOKIE_AGE = 86400 * 7
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

print(f"--- Django Settings Loaded ---")