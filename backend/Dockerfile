FROM python:3.11-slim

WORKDIR /app

# Copiar requirements primeiro para aproveitar o cache do Docker
COPY requirements.txt .
RUN python -m venv /opt/venv && \
    . /opt/venv/bin/activate && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Ativar o ambiente virtual
ENV PATH="/opt/venv/bin:$PATH"

# Copiar o restante do código
COPY . .

# Usar DATABASE_PUBLIC_URL durante o build
# Isso permite que collectstatic funcione durante o build
ENV DATABASE_URL="postgresql://postgres:ziTGycOXVoxTYqujREFdnbHdgSqcDyem@ballast.proxy.rlwy.net:22832/railway"
ENV DJANGO_SECRET_KEY="ASo5Dx_ubvDB7A5crgKwMA8OvhzG3BIT5n8kunztITNxT7hG4f8xaojquK6gyeHjTEU"
ENV DEBUG="True"

# Executar collectstatic com a URL pública
RUN python manage.py collectstatic --noinput

# Limpar a variável - em runtime, o Railway usará a URL interna
ENV DATABASE_URL=""

# Comando para iniciar (deixar Railway definir DATABASE_URL)
CMD ["sh", "-c", "python manage.py migrate && uvicorn config.asgi:application --host 0.0.0.0 --port $PORT"]