FROM python:3.11-slim

WORKDIR /app

# Instalar dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Fase de release (sem o check_db problemático)
RUN python manage.py collectstatic --noinput

# Comando para iniciar
CMD ["sh", "-c", "python manage.py migrate && uvicorn config.asgi:application --host 0.0.0.0 --port $PORT"]