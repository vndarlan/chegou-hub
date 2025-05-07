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

# --- Carregar variáveis de ambiente do .env (principalmente para desenvolvimento local) ---
load_dotenv(os.path.join(BASE_DIR, '.env'))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'insecure-fallback-key-for-dev-if-not-set-in-env')

# SECURITY WARNING: don't run with debug turned on in production!
# A variável de ambiente DEBUG do Railway será 'True' ou 'False' como string.
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# --- Configuração ALLOWED_HOSTS ---
# Lendo de variável de ambiente e adicionando padrões
# No Railway, defina a variável de ambiente ALLOWED_HOSTS como:
# "chegouhub.up.railway.app,chegou-hubb-production.up.railway.app"
# (sem aspas extras, apenas os domínios separados por vírgula)
allowed_hosts_env = os.getenv('ALLOWED_HOSTS')
if allowed_hosts_env:
    ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(',')]
else:
    # Fallback se a variável de ambiente não estiver definida (para desenvolvimento local ou emergência)
    ALLOWED_HOSTS = ['localhost', '127.0.0.1']
    if not DEBUG: # Em produção sem a variável, é um problema de configuração.
        print("ALERTA DE SEGURANÇA: ALLOWED_HOSTS não configurada via variável de ambiente em ambiente de não-DEBUG!")
        ALLOWED_HOSTS.append('*') # Apenas como medida temporária extrema se tudo mais falhar

# Se estiver em DEBUG, permita mais flexibilidade
if DEBUG:
    ALLOWED_HOSTS.extend(['localhost', '127.0.0.1', '*']) # '*' é geralmente ok para debug local
    ALLOWED_HOSTS = list(set(ALLOWED_HOSTS)) # Remove duplicatas

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
    'corsheaders.middleware.CorsMiddleware', # Deve ser um dos primeiros
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware', # Essencial para CSRF
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

# --- Diagnósticos (Opcional, mas útil) ---
print(f"--- Django Settings Initializing ---")
print(f"DEBUG: {DEBUG}")
print(f"ALLOWED_HOSTS: {ALLOWED_HOSTS}")

# --- Configuração do Banco de Dados ---
DATABASE_URL_FROM_ENV = os.getenv('DATABASE_URL')
# Para desenvolvimento local, você pode querer usar a DATABASE_PUBLIC_URL se DATABASE_URL for a interna.
# No Railway, a DATABASE_URL fornecida já deve ser a correta (interna).
if DEBUG and os.getenv('USE_PUBLIC_DB_URL_LOCALLY', 'False').lower() == 'true':
    # Esta lógica é para DESENVOLVIMENTO LOCAL se você quiser forçar o uso da URL pública
    # Defina USE_PUBLIC_DB_URL_LOCALLY=True no seu .env local.
    public_db_url = os.getenv('DATABASE_PUBLIC_URL')
    if public_db_url:
        print("DEBUG LOCAL: Usando DATABASE_PUBLIC_URL para conexão.")
        DATABASE_URL_FROM_ENV = public_db_url

DATABASES = {}
if DATABASE_URL_FROM_ENV:
    print(f"Conectando ao banco de dados via URL: {DATABASE_URL_FROM_ENV.split('@')[0]}@...") # Log sem credenciais
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

# Static files (CSS, JavaScript, Images)
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
# No Railway, defina a variável de ambiente CORS_ALLOWED_ORIGINS como:
# "https://chegouhub.up.railway.app"
# (Se precisar de múltiplas, separe por vírgula. Mas para este caso, apenas o frontend.)
cors_allowed_origins_env = os.getenv('CORS_ALLOWED_ORIGINS')
if cors_allowed_origins_env:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_allowed_origins_env.split(',')]
else:
    CORS_ALLOWED_ORIGINS = [] # Deixe vazio se não definido no env; em DEBUG, pode ser adicionado abaixo.
    if not DEBUG:
        print("ALERTA: CORS_ALLOWED_ORIGINS não configurada via variável de ambiente em ambiente de não-DEBUG!")

if DEBUG: # Em desenvolvimento, adicione origens comuns
    CORS_ALLOWED_ORIGINS.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://chegouhub.up.railway.app", # Para testar o frontend de produção localmente
    ])
    CORS_ALLOWED_ORIGINS = list(set(CORS_ALLOWED_ORIGINS)) # Remove duplicatas

# Se, após tudo, ainda houver problemas de CORS *e* você tiver certeza que o Django está gerando os cabeçalhos,
# e eles estão se perdendo no proxy do Railway, esta linha abaixo pode ser um teste extremo.
# Mas o ideal é que a lista explícita funcione.
# CORS_ALLOW_ALL_ORIGINS = True # Use com cautela e apenas para diagnóstico extremo.

print(f"CORS_ALLOWED_ORIGINS: {CORS_ALLOWED_ORIGINS}")

CORS_EXPOSE_HEADERS = ["Content-Type", "X-CSRFToken"]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]
CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization", "content-type", "dnt", "origin",
    "user-agent", "x-csrftoken", "x-requested-with",
]

# --- Configuração CSRF ---
# No Railway, defina a variável de ambiente CSRF_TRUSTED_ORIGINS como:
# "https://chegouhub.up.railway.app"
# (Se precisar de múltiplas, separe por vírgula.)
csrf_trusted_origins_env = os.getenv('CSRF_TRUSTED_ORIGINS')
if csrf_trusted_origins_env:
    CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in csrf_trusted_origins_env.split(',')]
else:
    CSRF_TRUSTED_ORIGINS = []
    if not DEBUG:
        print("ALERTA: CSRF_TRUSTED_ORIGINS não configurada via variável de ambiente em ambiente de não-DEBUG!")

if DEBUG: # Em desenvolvimento, adicione origens comuns
    CSRF_TRUSTED_ORIGINS.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://chegouhub.up.railway.app",
    ])
    CSRF_TRUSTED_ORIGINS = list(set(CSRF_TRUSTED_ORIGINS)) # Remove duplicatas
print(f"CSRF_TRUSTED_ORIGINS: {CSRF_TRUSTED_ORIGINS}")

CSRF_COOKIE_SAMESITE = 'Lax' # Padrão do Django, mais seguro. Mude para None se tiver problemas com iframes ou POSTs de domínios diferentes.
SESSION_COOKIE_SAMESITE = 'Lax'# Padrão do Django. Mude para None se tiver problemas com iframes ou POSTs de domínios diferentes.

# Para que o Axios (JS) possa ler o cookie CSRF, HttpOnly DEVE ser False.
# No entanto, o Axios é projetado para obter o token CSRF e enviá-lo em um header.
# A configuração padrão do Django para CSRF_COOKIE_HTTPONLY é False.
CSRF_COOKIE_HTTPONLY = False # Django default is False. Explicitly set.

CSRF_COOKIE_SECURE = not DEBUG  # True em produção (quando DEBUG=False), False em desenvolvimento
SESSION_COOKIE_SECURE = not DEBUG # True em produção, False em desenvolvimento

# CSRF_COOKIE_DOMAIN = None # Padrão, geralmente o melhor.
# SESSION_COOKIE_DOMAIN = None # Padrão, geralmente o melhor.

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