# backend/test_3_meses_completo.py
"""Teste completo de 3 meses para descobrir total real de pedidos"""

import requests
from datetime import datetime, date, timedelta
from collections import Counter

TOKEN = "52cd74c3-b3cc-47a0-b23d-7c2fd00e517d"
SECRET = "secret_1f4b53ced9de4ea7ac09d729b815300f"

# Período de 3 meses
DATA_FIM = date.today()
DATA_INICIO = DATA_FIM - timedelta(days=90)

print("=" * 80)
print("TESTE COMPLETO - 3 MESES")
print("=" * 80)
print(f"Loja: Token {TOKEN[:20]}...")
print(f"Periodo: {DATA_INICIO} a {DATA_FIM} (~3 meses)")
print("=" * 80)

def buscar_todos_pedidos():
    """Busca TODOS os pedidos disponíveis na API"""
    all_orders = []
    skip = 0
    page_size = 500
    page_count = 0

    while skip < 50000:  # Máx 100 páginas
        page_count += 1
        print(f"\r[Pagina {page_count:3d}] skip={skip:6d}...", end="", flush=True)

        response = requests.get(
            "https://api.ecomhub.app/apps/orders",
            params={
                'token': TOKEN,
                'orderBy': 'date',
                'skip': skip
            },
            headers={
                'Secret': SECRET,
                'Content-Type': 'application/json'
            },
            timeout=15
        )

        if response.status_code != 200:
            print(f" [ERRO {response.status_code}]")
            break

        orders = response.json()

        if not orders or len(orders) == 0:
            print(f" [VAZIO - FIM]")
            break

        all_orders.extend(orders)
        print(f" [{len(orders):3d}] Total: {len(all_orders):,}", end="")

        skip += page_size

    print()  # Nova linha
    return all_orders

# Buscar todos
print("\n[1/3] Buscando TODOS os pedidos da API...")
print("-" * 80)
todos_pedidos = buscar_todos_pedidos()

print("\n" + "=" * 80)
print(f"TOTAL DE PEDIDOS NA API: {len(todos_pedidos):,}")
print("=" * 80)

# Filtrar por período de 3 meses
print("\n[2/3] Filtrando por periodo (3 meses)...")
print("-" * 80)

pedidos_3_meses = []
for order in todos_pedidos:
    try:
        order_date = datetime.fromisoformat(
            order.get('date', '').replace('Z', '+00:00')
        ).date()

        if DATA_INICIO <= order_date <= DATA_FIM:
            pedidos_3_meses.append(order)
    except:
        continue

print(f"Pedidos em 3 meses ({DATA_INICIO} a {DATA_FIM}): {len(pedidos_3_meses):,}")

# Filtrar por Romênia
pedidos_romania = [p for p in pedidos_3_meses if p.get('shippingCountry_id') == 142]
print(f"Pedidos da Romania (ID 142): {len(pedidos_romania):,}")

# Análise detalhada
print("\n[3/3] Analise detalhada...")
print("=" * 80)

# Datas
if todos_pedidos:
    datas = []
    for p in todos_pedidos:
        try:
            d = datetime.fromisoformat(p.get('date', '').replace('Z', '+00:00')).date()
            datas.append(d)
        except:
            continue

    if datas:
        datas.sort()
        print(f"Data mais antiga: {datas[0]}")
        print(f"Data mais recente: {datas[-1]}")
        periodo_total = (datas[-1] - datas[0]).days
        print(f"Periodo total: {periodo_total} dias (~{periodo_total/30:.1f} meses)")

# Status dos pedidos de 3 meses
if pedidos_3_meses:
    print(f"\nStatus dos pedidos (3 meses, todos paises):")
    status_count = Counter(p.get('status') for p in pedidos_3_meses)
    for status, count in sorted(status_count.items(), key=lambda x: x[1], reverse=True):
        print(f"  {status}: {count}")

# Status da Romênia
if pedidos_romania:
    print(f"\nStatus dos pedidos (3 meses, Romania):")
    status_count_ro = Counter(p.get('status') for p in pedidos_romania)
    for status, count in sorted(status_count_ro.items(), key=lambda x: x[1], reverse=True):
        print(f"  {status}: {count}")

print("\n" + "=" * 80)
print("COMPARACAO COM ESPERADO:")
print("=" * 80)
print(f"  Esperado (ECOMHUB manual): 40 pedidos")
print(f"  Encontrado (API, Romania, 3m): {len(pedidos_romania)} pedidos")

if len(pedidos_romania) < 40:
    print(f"\n  [FALTAM] {40 - len(pedidos_romania)} pedidos")
    print(f"  Possivel causa: API nao expoe todos os pedidos ou periodo diferente")
elif len(pedidos_romania) >= 40:
    print(f"\n  [OK] API retornou >= 40 pedidos!")

print("=" * 80)
