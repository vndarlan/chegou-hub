FROM python:3.11-slim

WORKDIR /app

# Copiar requirements primeiro (para aproveitar o cache)
COPY requirements.txt .

# Instalar dependências
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn==21.2.0

# Copiar o código
COPY . .

# Definir variável para indicar que é ambiente Railway (para collectstatic funcionar)
ENV RAILWAY_ENVIRONMENT_NAME=production

# Coletar arquivos estáticos
RUN python manage.py collectstatic --noinput

# Definir variáveis de ambiente
ENV PYTHONUNBUFFERED=1

# Comando para iniciar
CMD ["sh", "-c", "gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --log-level debug --timeout 120"]