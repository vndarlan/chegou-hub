FROM python:3.11-slim

WORKDIR /app

# Copiar requirements primeiro (para aproveitar o cache)
COPY requirements.txt .

# Instalar dependências
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn==21.2.0

# Copiar o código
COPY . .

# Coletar arquivos estáticos
RUN python manage.py collectstatic --noinput

# Configurar variáveis de ambiente para CORS
ENV CORS_ORIGIN_ALLOW_ALL=True
ENV CORS_ALLOW_CREDENTIALS=True

# Comando para iniciar com CORS habilitado diretamente no comando
CMD ["sh", "-c", "gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --log-level debug --timeout 120 --preload"]