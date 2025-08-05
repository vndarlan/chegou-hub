# Multi-stage build para otimizar o tamanho da imagem
FROM node:18-alpine AS frontend-build

# Configurar diretório de trabalho para frontend
WORKDIR /app/frontend

# Copiar package.json e package-lock.json
COPY frontend/package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código do frontend
COPY frontend/ ./

# Configurar variáveis de ambiente para build de produção
ENV CI=false
ENV DISABLE_ESLINT_PLUGIN=true
ENV GENERATE_SOURCEMAP=false

# Build do frontend
RUN npm run build

# Stage 2: Imagem Python para o backend
FROM python:3.11-slim

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Configurar diretório de trabalho
WORKDIR /app

# Copiar requirements primeiro (para aproveitar o cache)
COPY backend/requirements.txt ./

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn==21.2.0

# Copiar código do backend
COPY backend/ ./

# Copiar build do frontend para diretório de static files
COPY --from=frontend-build /app/frontend/build ./staticfiles/frontend/

# Criar diretórios necessários
RUN mkdir -p staticfiles/media logs

# Coletar arquivos estáticos
RUN python manage.py collectstatic --noinput

# Configurar variáveis de ambiente
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings

# Expor porta
EXPOSE $PORT

# Comando para iniciar
CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --log-level info --timeout 120 --workers 2"]