# backend/config/settings.py
"""
Django settings for config project.
"""

from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url
# from urllib.parse import urlparse # Não parece ser usado diretamente após as mudanças

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Carregar variáveis de ambiente do .env (principalmente para desenvolvimento local) ---
load_dotenv(os.path.join(BASE_DIR, '.env'))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'insecure-key-for-development-only-if-not-set')

# SECURITY WARNING: don't run with debug turned on in production!
# A variável de ambiente DEBUG do Railway será 'True' ou 'False' como string.
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'


# --- Configuração ALLOWED_HOSTS ---
# Lendo de variável de ambiente e adicionando padrões
allowed_hosts_env = os.getenv('ALLOWED_HOSTS')
if allowed_hosts_env:
    # Assume que a variável de ambiente é uma string separada por vírgulas
    # e a converte para uma lista Python.
    # Adiciona também os hosts padrão e '*' para garantir.
    ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(',')] + [
        'railway.app', '.railway.app', 'localhost', '127.0.0.1', '*'
    ]
else:
    # Fallback se a variável de ambiente não estiver definida
    ALLOWED_HOSTS = [
        'chegou-hubb-production.up.railway.app', # Seu backend
        'chegouhub.up.railway.app',             # Seu frontend
        'railway.app',
        '.railway.app',
        'localhost',
        '127.0.0.1',
        '*', # Mantenha '*' por enquanto para diagnóstico, mas restrinja em produção final.
    ]
# Remover duplicatas caso haja sobreposição
ALLOWED_HOSTS = list(set(ALLOWED_HOSTS))


# --- Chave da API OpenAI ---
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic', # Para servir arquivos estáticos com eficiência
    'django.contrib.staticfiles',
    'corsheaders',                  # Para lidar com CORS
    'rest_framework',
    'core.apps.CoreConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',      # DEVE ser um dos primeiros
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # Para servir arquivos estáticos
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
        'DIRS': [], # Se você tiver templates no nível do projeto, adicione o diretório aqui
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
# ASGI_APPLICATION = 'config.asgi.application' # Comentado pois você mencionou preferir WSGI

# --- DIAGNÓSTICO DO AMBIENTE (mantido para utilidade) ---
print("=== DIAGNÓSTICO DE AMBIENTE (settings.py) ===")
print(f"SECRET_KEY: {'Definida' if SECRET_KEY else 'NÃO DEFINIDA (USANDO FALLBACK INSEGURO)'}")
print(f"DEBUG: {DEBUG} (Tipo: {type(DEBUG)})")
print(f"ALLOWED_HOSTS (final): {ALLOWED_HOSTS}")
print(f"DATABASE_URL (env): {'Definido' if os.getenv('DATABASE_URL') else 'NÃO DEFINIDO'}")
print(f"OPENAI_API_KEY (env): {'Definido' if OPENAI_API_KEY else 'NÃO DEFINIDO'}")
print("=== FIM DIAGNÓSTICO DE AMBIENTE ===")

# --- Configuração do Banco de Dados ---
DATABASE_URL = os.getenv('DATABASE_URL')
DATABASES = {}

if DATABASE_URL:
    print("Usando DATABASE_URL para conexão com PostgreSQL.")
    DATABASES['default'] = dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,       # Tempo de vida da conexão em segundos
        conn_health_checks=True, # Habilita verificação de saúde da conexão
        ssl_require=os.getenv('DB_SSL_REQUIRE', 'False').lower() == 'true' # Para Railway, geralmente não precisa de SSL explícito na URL
    )
else:
    print("AVISO: DATABASE_URL não definida. Usando SQLite como fallback.")
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }

# Log da configuração final do banco (sem expor senha)
db_info_final = DATABASES['default'].copy()
if 'PASSWORD' in db_info_final and db_info_final['PASSWORD']:
    db_info_final['PASSWORD'] = '********'
print(f"Configuração final do banco de dados: {db_info_final}")


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo' # Ou a timezone correta para você
USE_I18N = True
USE_TZ = True # Recomendado usar Time Zones

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles' # Diretório onde o collectstatic irá copiar os arquivos para o WhiteNoise
STATICFILES_DIRS = [
    # BASE_DIR / 'static', # Se você tiver uma pasta 'static' no nível do projeto com arquivos estáticos
]

# Storage para Whitenoise (recomendado para servir estáticos em produção)
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Configurações CORS Revisadas ---
CORS_ALLOW_CREDENTIALS = True  # Essencial para autenticação baseada em cookies/sessão cross-origin

# Lista explícita de origens permitidas.
# Garanta que a URL do seu frontend implantado esteja aqui.
CORS_ALLOWED_ORIGINS = [
    "https://chegouhub.up.railway.app",          # Seu frontend
    "https://chegou-hubb-production.up.railway.app", # Seu backend (útil se o admin ou outras partes do backend fizerem chamadas API para si mesmas)
    # Adicione origens de desenvolvimento local se precisar testar o frontend local contra o backend de produção
    # "http://localhost:3000",
    # "http://127.0.0.1:3000",
]
print(f"CORS_ALLOWED_ORIGINS: {CORS_ALLOWED_ORIGINS}")

# Comentado para forçar o uso de CORS_ALLOWED_ORIGINS e diagnosticar.
# Se com a lista explícita acima funcionar, você pode decidir se quer reabilitar isso.
# Lembre-se que com CORS_ALLOW_CREDENTIALS = True, o Allow-Origin não pode ser '*' efetivamente.
# O django-cors-headers lida com isso refletindo a origem da requisição se ela estiver na lista permitida.
# CORS_ALLOW_ALL_ORIGINS = True

# Cabeçalhos que o frontend pode acessar na resposta
CORS_EXPOSE_HEADERS = ["Content-Type", "X-CSRFToken"]

# Métodos HTTP permitidos
CORS_ALLOW_METHODS = [
    "DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT",
]

# Cabeçalhos HTTP permitidos na requisição
CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization", "content-type", "dnt", "origin",
    "user-agent", "x-csrftoken", "x-requested-with",
    # Adicione outros cabeçalhos customizados que seu frontend possa enviar
]

# --- Configuração CSRF Revisada ---
# Lista de origens confiáveis para requisições POST que alteram estado.
# Deve incluir o domínio onde seu frontend está hospedado se ele fizer POSTs.
CSRF_TRUSTED_ORIGINS = [
    "https://chegouhub.up.railway.app",          # Seu frontend
    "https://chegou-hubb-production.up.railway.app", # Seu backend (para o admin e outras POSTs diretas)
]
print(f"CSRF_TRUSTED_ORIGINS: {CSRF_TRUSTED_ORIGINS}")

# Para cookies CSRF e de Sessão ao usar HTTPS e potencialmente diferentes subdomínios (frontend/backend)
# `None` permite que o navegador envie o cookie com requisições cross-site
# (necessário se o frontend e backend estão em domínios diferentes mas você quer credenciais).
# 'Lax' é o padrão e mais restritivo, pode não funcionar se o frontend e backend são domínios diferentes.
CSRF_COOKIE_SAMESITE = None  # Alterado para None para máxima compatibilidade com withCredentials
SESSION_COOKIE_SAMESITE = None # Alterado para None

CSRF_COOKIE_SECURE = True      # Cookie CSRF apenas sobre HTTPS
SESSION_COOKIE_SECURE = True   # Cookie de Sessão apenas sobre HTTPS

# Importante: Não defina CSRF_COOKIE_DOMAIN com a string "None" de uma variável de ambiente.
# Deve ser o valor Python None, ou um domínio específico (ex: ".railway.app").
# Se a variável de ambiente CSRF_COOKIE_DOMAIN for "None" (string), isso causará problemas.
# Definindo explicitamente como Python None aqui para garantir.
CSRF_COOKIE_DOMAIN = None
print(f"CSRF_COOKIE_DOMAIN (final): {CSRF_COOKIE_DOMAIN} (Tipo: {type(CSRF_COOKIE_DOMAIN)})")

CSRF_COOKIE_HTTPONLY = False   # Default é False. Se True, JS não pode acessar o token CSRF
                               # diretamente do cookie (Axios o pega do header ou de um campo de formulário).
                               # Manter False é geralmente OK para SPA com Axios.

# --- Configuração REST Framework ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication', # Para login via sessão/cookies
        # 'rest_framework.authentication.TokenAuthentication', # Se você usar tokens API
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated', # Acesso padrão apenas para usuários autenticados
    ],
    # 'DEFAULT_RENDERER_CLASSES': ( # Se precisar de renderizadores específicos
    #     'rest_framework.renderers.JSONRenderer',
    # ),
    # 'DEFAULT_PARSER_CLASSES': ( # Se precisar de parsers específicos
    #     'rest_framework.parsers.JSONParser',
    # )
}

# Aumentar timeout da sessão (opcional)
SESSION_COOKIE_AGE = 86400 * 7  # 1 semana em segundos
SESSION_EXPIRE_AT_BROWSER_CLOSE = False # Sessão persiste mesmo se o navegador fechar (até SESSION_COOKIE_AGE)