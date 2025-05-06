FROM python:3.11-slim

WORKDIR /app

# Instalar dependências em um ambiente virtual
COPY requirements.txt .
RUN python -m venv /opt/venv && \
    . /opt/venv/bin/activate && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Ativar o ambiente virtual em todos os comandos
ENV PATH="/opt/venv/bin:$PATH"

# Copiar código
COPY . .

# Fase de release (sem verificação de BD)
RUN python manage.py collectstatic --noinput

# Comando para iniciar
CMD ["sh", "-c", "python manage.py migrate && uvicorn config.asgi:application --host 0.0.0.0 --port $PORT"]