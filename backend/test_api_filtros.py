# backend/test_api_filtros.py
"""Testar se a API ECOMHUB aceita filtros de data"""

import requests
from datetime import datetime, date, timedelta

TOKEN = "2f1ca7fc-7246-4d1b-8a4e-14583c782bfc"
SECRET = "secret_31086cf8d27a4a8cacfffe948e8afb60"

print("=" * 80)
print("TESTANDO FILTROS DE DATA NA API ECOMHUB")
print("=" * 80)

# Teste 1: Sem filtros (padrão atual)
print("\n[TESTE 1] Sem filtros de data (comportamento atual)")
print("-" * 80)

response = requests.get(
    "https://api.ecomhub.app/apps/orders",
    params={
        'token': TOKEN,
        'orderBy': 'date',
        'skip': 0
    },
    headers={'Secret': SECRET, 'Content-Type': 'application/json'},
    timeout=15
)

if response.status_code == 200:
    orders = response.json()
    if orders:
        first_date = orders[0].get('date', '')[:10]
        last_date = orders[-1].get('date', '')[:10]
        print(f"  Retornou: {len(orders)} pedidos")
        print(f"  Primeiro pedido: {first_date}")
        print(f"  Ultimo pedido: {last_date}")
        print(f"  Ordenacao: {'DESC (mais recente primeiro)' if first_date > last_date else 'ASC (mais antigo primeiro)'}")

# Teste 2: Com filtro dateFrom
print("\n[TESTE 2] Tentando usar filtro 'dateFrom'")
print("-" * 80)

data_inicio = (date.today() - timedelta(days=120)).isoformat()

response = requests.get(
    "https://api.ecomhub.app/apps/orders",
    params={
        'token': TOKEN,
        'orderBy': 'date',
        'dateFrom': data_inicio,
        'skip': 0
    },
    headers={'Secret': SECRET, 'Content-Type': 'application/json'},
    timeout=15
)

print(f"  Parametros: dateFrom={data_inicio}")
print(f"  Status: {response.status_code}")
if response.status_code == 200:
    orders = response.json()
    print(f"  Retornou: {len(orders)} pedidos")
else:
    print(f"  Erro: {response.text[:200]}")

# Teste 3: Com filtro startDate
print("\n[TESTE 3] Tentando usar filtro 'startDate'")
print("-" * 80)

response = requests.get(
    "https://api.ecomhub.app/apps/orders",
    params={
        'token': TOKEN,
        'orderBy': 'date',
        'startDate': data_inicio,
        'skip': 0
    },
    headers={'Secret': SECRET, 'Content-Type': 'application/json'},
    timeout=15
)

print(f"  Parametros: startDate={data_inicio}")
print(f"  Status: {response.status_code}")
if response.status_code == 200:
    orders = response.json()
    print(f"  Retornou: {len(orders)} pedidos")
else:
    print(f"  Erro: {response.text[:200]}")

# Teste 4: Sem orderBy (ordem natural da API)
print("\n[TESTE 4] Sem orderBy (ordem natural)")
print("-" * 80)

response = requests.get(
    "https://api.ecomhub.app/apps/orders",
    params={
        'token': TOKEN,
        'skip': 0
    },
    headers={'Secret': SECRET, 'Content-Type': 'application/json'},
    timeout=15
)

if response.status_code == 200:
    orders = response.json()
    if orders:
        first_date = orders[0].get('date', '')[:10]
        last_date = orders[-1].get('date', '')[:10]
        print(f"  Retornou: {len(orders)} pedidos")
        print(f"  Primeiro pedido: {first_date}")
        print(f"  Ultimo pedido: {last_date}")

# Teste 5: Buscar página 10 sem filtros (pedidos antigos?)
print("\n[TESTE 5] Pagina 10 (skip=5000) - pedidos muito antigos")
print("-" * 80)

response = requests.get(
    "https://api.ecomhub.app/apps/orders",
    params={
        'token': TOKEN,
        'orderBy': 'date',
        'skip': 5000
    },
    headers={'Secret': SECRET, 'Content-Type': 'application/json'},
    timeout=15
)

if response.status_code == 200:
    orders = response.json()
    print(f"  Retornou: {len(orders)} pedidos")
    if orders:
        first_date = orders[0].get('date', '')[:10]
        last_date = orders[-1].get('date', '')[:10]
        print(f"  Primeiro pedido: {first_date}")
        print(f"  Ultimo pedido: {last_date}")
else:
    print(f"  Status: {response.status_code}")

print("\n" + "=" * 80)
print("CONCLUSAO:")
print("=" * 80)
print("Verifique os resultados acima para entender:")
print("  1. Como a API ordena os pedidos")
print("  2. Se aceita filtros de data")
print("  3. Se existem pedidos antigos alem dos 1.093 encontrados")
print("=" * 80)
