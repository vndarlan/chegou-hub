# backend/config/settings.py
"""
Django settings for config project.
"""

from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url
from urllib.parse import urlparse

# Adicionar import para verificar a versão
try:
    import corsheaders
    print(f"corsheaders versão: {corsheaders.__version__}")
except ImportError:
    print("AVISO: corsheaders não está instalado corretamente!")

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Carregar variáveis de ambiente do .env ---
load_dotenv(os.path.join(BASE_DIR, '.env'))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'insecure-key-for-development-only')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False') == 'True'

# --- Configuração ALLOWED_HOSTS para produção ---
ALLOWED_HOSTS = [
    'chegou-hubb-production.up.railway.app',
    'chegouhub.up.railway.app',
    'railway.app',
    '.railway.app',
    'localhost',
    '127.0.0.1',
    '*',  # Permitir temporariamente todos os hosts
]

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
    'corsheaders',  # Certifique-se de que está aqui
    'rest_framework',
    'core.apps.CoreConfig',
]

# *** CORREÇÃO DE MIDDLEWARE PARA CORS ***
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # DEVE estar primeiro
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Remover o middleware CORS personalizado
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

# Use WSGI em vez de ASGI (mais estável para Railway)
WSGI_APPLICATION = 'config.wsgi.application'
# Comentado: ASGI_APPLICATION = 'config.asgi.application'

# --- DIAGNÓSTICO DO AMBIENTE ---
print("=== DIAGNÓSTICO DE AMBIENTE ===")
print(f"DATABASE_URL: {'Definido' if os.getenv('DATABASE_URL') else 'NÃO DEFINIDO'}")
print(f"DATABASE_PUBLIC_URL: {'Definido' if os.getenv('DATABASE_PUBLIC_URL') else 'NÃO DEFINIDO'}")
print(f"DEBUG: {os.getenv('DEBUG', 'False')}")
print(f"ALLOWED_HOSTS: {ALLOWED_HOSTS}")
print("=== FIM DIAGNÓSTICO DE AMBIENTE ===")

# --- Configuração Otimizada para PostgreSQL no Railway ---
DATABASE_URL = os.getenv('DATABASE_URL')
DATABASE_PUBLIC_URL = os.getenv('DATABASE_PUBLIC_URL')

# Iniciar log do diagnóstico
print("=== DIAGNÓSTICO DE CONEXÃO COM BANCO DE DADOS ===")

# Ignorar testes de DNS no Railway que estão falhando
# e confiar diretamente nas variáveis de ambiente fornecidas
if DATABASE_URL:
    print(f"Usando DATABASE_URL para conexão direta")
    try:
        # Configuração direta com dj-database-url
        DATABASES = {
            'default': dj_database_url.parse(
                DATABASE_URL,
                conn_max_age=600,
                conn_health_checks=True,
                ssl_require=False
            )
        }
        print("✓ Configuração do banco de dados definida com sucesso")
    except Exception as e:
        print(f"✗ ERRO ao configurar banco de dados: {str(e)}")
        # Fallback para SQLite em caso de erro
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
            }
        }
        print("Usando SQLite como fallback")
else:
    print("AVISO: DATABASE_URL não disponível, tentando DATABASE_PUBLIC_URL")
    if DATABASE_PUBLIC_URL:
        try:
            # Tenta usar URL pública como alternativa
            DATABASES = {
                'default': dj_database_url.parse(
                    f"postgres://{DATABASE_PUBLIC_URL}" if not DATABASE_PUBLIC_URL.startswith(('postgres://', 'postgresql://')) else DATABASE_PUBLIC_URL,
                    conn_max_age=600,
                    conn_health_checks=True,
                    ssl_require=False
                )
            }
            print("✓ Configuração do banco de dados com URL pública")
        except Exception as e:
            print(f"✗ ERRO com URL pública: {str(e)}")
            DATABASES = {
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
                }
            }
            print("Usando SQLite como fallback")
    else:
        # Último recurso - SQLite
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
            }
        }
        print("Nenhuma URL de banco de dados encontrada, usando SQLite")

print("=== FIM DO DIAGNÓSTICO DE CONEXÃO ===")

# Log da configuração (sem expor dados sensíveis)
print("=== CONFIGURAÇÃO DO BANCO DE DADOS ===")
db_info = DATABASES['default'].copy()
if 'PASSWORD' in db_info:
    db_info['PASSWORD'] = '********'
print(f"ENGINE: {db_info.get('ENGINE')}")
print(f"NAME: {db_info.get('NAME')}")
print(f"USER: {db_info.get('USER')}")
print(f"HOST: {db_info.get('HOST')}")
print(f"PORT: {db_info.get('PORT')}")
print("=== FIM CONFIGURAÇÃO DO BANCO DE DADOS ===")

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]

# Internationalization
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Storage para Whitenoise
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

STATICFILES_DIRS = [
    BASE_DIR / 'static_files',
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Configurações CORS completas ---
CORS_ALLOW_ALL_ORIGINS = True  # Temporariamente permitir todas as origens para diagnóstico
CORS_ALLOWED_ORIGINS = [
    "https://chegouhub.up.railway.app",
    "https://chegou-hubb-production.up.railway.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ["Content-Type", "X-CSRFToken"]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# --- Configuração CSRF Simplificada ---
CSRF_TRUSTED_ORIGINS = [
    "https://chegouhub.up.railway.app",
    "https://chegou-hubb-production.up.railway.app",
]
CSRF_COOKIE_SAMESITE = None
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SECURE = True  # Para HTTPS
SESSION_COOKIE_SECURE = True  # Para HTTPS
SESSION_COOKIE_SAMESITE = None  # Necessário para CORS com credenciais

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
SESSION_COOKIE_AGE = 86400 * 7  # 1 semana
SESSION_EXPIRE_AT_BROWSER_CLOSE = False