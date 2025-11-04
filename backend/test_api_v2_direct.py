# backend/test_api_v2_direct.py
"""Testar API V2 diretamente sem Django setup"""

import requests
from datetime import date, timedelta
from collections import Counter

TOKEN = "52cd74c3-b3cc-47a0-b23d-7c2fd00e517d"
SECRET = "secret_1f4b53ced9de4ea7ac09d729b815300f"

# Período de 3 meses
DATA_FIM = date.today()
DATA_INICIO = DATA_FIM - timedelta(days=90)

print("=" * 80)
print("TESTE - API V2 (IMPLEMENTACAO DO SISTEMA)")
print("=" * 80)
print(f"Periodo: {DATA_INICIO} a {DATA_FIM} (3 meses)")
print(f"Pais: Romania (ID 142)")
print("=" * 80)

def fetch_orders_ecomhub_v2(token, secret, data_inicio, data_fim, country_id=None):
    """Replica a função fetch_orders_from_ecomhub_api do sistema"""
    all_orders = []
    skip = 0
    page_size = 500
    max_pages = 200
    page_count = 0

    print(f"\n[*] Buscando pedidos (implementacao V2)...")

    while page_count < max_pages:
        page_count += 1
        print(f"[Pag {page_count:3d}] skip={skip:6d}...", end=" ", flush=True)

        response = requests.get(
            "https://api.ecomhub.app/apps/orders",
            params={
                'token': token,
                'orderBy': 'date',
                'skip': skip
            },
            headers={
                'Secret': secret,
                'Content-Type': 'application/json'
            },
            timeout=15
        )

        if response.status_code != 200:
            print(f"[ERRO {response.status_code}]")
            break

        orders = response.json()

        if not orders or len(orders) == 0:
            print(f"[VAZIO]")
            break

        all_orders.extend(orders)
        print(f"[OK] {len(orders):3d} | Total: {len(all_orders):,}")

        skip += page_size

    print(f"\n  Total bruto: {len(all_orders)} pedidos")

    # Filtrar por país
    if country_id:
        all_orders = [o for o in all_orders if o.get('shippingCountry_id') == country_id]
        print(f"  Filtrado por pais {country_id}: {len(all_orders)} pedidos")

    return all_orders

# Buscar pedidos
pedidos = fetch_orders_ecomhub_v2(TOKEN, SECRET, DATA_INICIO, DATA_FIM, country_id=142)

print("\n" + "=" * 80)
print("RESULTADO:")
print("=" * 80)
print(f"  Total de pedidos (Romania): {len(pedidos)}")

if pedidos:
    # Status
    status_count = Counter(p.get('status') for p in pedidos)
    print(f"\n  Status:")
    for status, count in sorted(status_count.items(), key=lambda x: x[1], reverse=True):
        print(f"    {status}: {count}")

    # Datas
    from datetime import datetime
    datas = []
    for p in pedidos:
        try:
            d = datetime.fromisoformat(p.get('date', '').replace('Z', '+00:00')).date()
            datas.append(d)
        except:
            continue

    if datas:
        datas.sort()
        print(f"\n  Data mais antiga: {datas[0]}")
        print(f"  Data mais recente: {datas[-1]}")

print("\n" + "=" * 80)
print("COMPARACAO:")
print("=" * 80)
print(f"  Esperado (ECOMHUB manual): 40 pedidos")
print(f"  Encontrado (API V2): {len(pedidos)} pedidos")
print(f"  Diferenca: {40 - len(pedidos)} pedidos faltando")
print("=" * 80)
