# backend/test_status_parameter.py
"""Testar se API tem parâmetro de status para incluir todos os pedidos"""

import requests

TOKEN = "52cd74c3-b3cc-47a0-b23d-7c2fd00e517d"
SECRET = "secret_1f4b53ced9de4ea7ac09d729b815300f"

print("=" * 80)
print("TESTE DE PARAMETRO DE STATUS")
print("=" * 80)
print("Hipotese: API filtra por status automaticamente")
print("Status visiveis: delivered (13) + returned (11) = 24")
print("Status faltando: processing, shipped, etc = 16 pedidos")
print("=" * 80)

# Lista de possíveis status baseados na doc
possible_statuses = [
    'processing',
    'preparing_for_shipping',
    'ready_to_ship',
    'shipped',
    'with_courier',
    'out_for_delivery',
    'delivered',
    'returning',
    'returned',
    'cancelled',
    'issue'
]

print("\n[TESTE 1] Tentando buscar por cada status individualmente")
print("-" * 80)

total_por_status = {}

for status in possible_statuses:
    response = requests.get(
        "https://api.ecomhub.app/apps/orders",
        params={
            'token': TOKEN,
            'status': status
        },
        headers={'Secret': SECRET, 'Content-Type': 'application/json'},
        timeout=15
    )

    if response.status_code == 200:
        orders = response.json()
        total_por_status[status] = len(orders)
        if len(orders) > 0:
            print(f"  {status}: {len(orders)} pedidos")
    else:
        print(f"  {status}: Erro {response.status_code}")

# Teste 2: Sem filtro de status
print("\n[TESTE 2] Parametro 'status=all' ou 'status=*'")
print("-" * 80)

for value in ['all', '*', '', 'ALL']:
    response = requests.get(
        "https://api.ecomhub.app/apps/orders",
        params={
            'token': TOKEN,
            'status': value
        },
        headers={'Secret': SECRET, 'Content-Type': 'application/json'},
        timeout=15
    )

    if response.status_code == 200:
        orders = response.json()
        print(f"  status='{value}': {len(orders)} pedidos")

# Teste 3: Ver documentação de resposta da API
print("\n[TESTE 3] Buscar endpoint /apps/orders/statuses ou similar")
print("-" * 80)

for endpoint in ['statuses', 'status', 'all']:
    response = requests.get(
        f"https://api.ecomhub.app/apps/orders/{endpoint}",
        params={'token': TOKEN},
        headers={'Secret': SECRET, 'Content-Type': 'application/json'},
        timeout=15
    )

    if response.status_code == 200:
        print(f"  /apps/orders/{endpoint}: {response.status_code} - {response.text[:100]}")
    elif response.status_code != 404:
        print(f"  /apps/orders/{endpoint}: {response.status_code}")

print("\n" + "=" * 80)
print("RESULTADO:")
print("=" * 80)

total_encontrado = sum(total_por_status.values())
print(f"\nTotal de pedidos por status: {total_encontrado}")

if total_encontrado > 24:
    print(f"[SUCESSO] Encontramos {total_encontrado} pedidos buscando por status!")
    print(f"          Eram {total_encontrado - 24} pedidos escondidos")
    print(f"\nDistribuicao:")
    for status, count in sorted(total_por_status.items(), key=lambda x: x[1], reverse=True):
        if count > 0:
            print(f"  {status}: {count}")
elif total_encontrado == 0:
    print(f"[FALHA] Parametro 'status' nao e suportado pela API")
else:
    print(f"[INFO] Total: {total_encontrado} pedidos")

print("=" * 80)
