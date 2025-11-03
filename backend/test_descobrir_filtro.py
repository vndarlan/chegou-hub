# backend/test_descobrir_filtro.py
"""Investigar por que a API retorna apenas 24 de 40 pedidos"""

import requests
from datetime import datetime
from collections import Counter

TOKEN = "52cd74c3-b3cc-47a0-b23d-7c2fd00e517d"
SECRET = "secret_1f4b53ced9de4ea7ac09d729b815300f"

print("=" * 80)
print("INVESTIGACAO - POR QUE SO 24 DE 40 PEDIDOS?")
print("=" * 80)
print("Segundo ECOMHUB: 40 pedidos")
print("Segundo API: 24 pedidos")
print("Faltam: 16 pedidos")
print("=" * 80)

def buscar_pedidos(params_extras=None):
    """Busca pedidos com parâmetros extras opcionais"""
    params = {
        'token': TOKEN,
        'orderBy': 'date',
        'skip': 0
    }
    if params_extras:
        params.update(params_extras)

    all_orders = []
    skip = 0

    while skip < 5000:  # Máximo 10 páginas
        params['skip'] = skip

        response = requests.get(
            "https://api.ecomhub.app/apps/orders",
            params=params,
            headers={'Secret': SECRET, 'Content-Type': 'application/json'},
            timeout=15
        )

        if response.status_code != 200:
            break

        orders = response.json()
        if not orders:
            break

        all_orders.extend(orders)
        skip += 500

    return all_orders

# Teste 1: Padrão (atual)
print("\n[TESTE 1] Busca padrão (atual)")
print("-" * 80)
orders_padrao = buscar_pedidos()
print(f"Total: {len(orders_padrao)} pedidos")

if orders_padrao:
    # Analisar status
    status_count = Counter(o.get('status') for o in orders_padrao)
    print(f"\nStatus encontrados:")
    for status, count in status_count.most_common():
        print(f"  {status}: {count}")

# Teste 2: Tentar incluir todos os status
print("\n[TESTE 2] Tentando com parametro 'includeAll=true'")
print("-" * 80)
orders_all = buscar_pedidos({'includeAll': 'true'})
print(f"Total: {len(orders_all)} pedidos")
if len(orders_all) > len(orders_padrao):
    print(f"  [SUCESSO] Encontrou {len(orders_all) - len(orders_padrao)} pedidos extras!")

# Teste 3: Sem orderBy
print("\n[TESTE 3] Sem orderBy")
print("-" * 80)
orders_no_order = buscar_pedidos({'orderBy': None})
print(f"Total: {len(orders_no_order)} pedidos")

# Teste 4: Com limit maior
print("\n[TESTE 4] Com parametro 'limit=1000'")
print("-" * 80)
orders_limit = buscar_pedidos({'limit': 1000})
print(f"Total: {len(orders_limit)} pedidos")

# Teste 5: Ver primeira página em detalhe
print("\n[TESTE 5] Analisando primeira pagina em detalhe")
print("-" * 80)
response = requests.get(
    "https://api.ecomhub.app/apps/orders",
    params={'token': TOKEN, 'orderBy': 'date', 'skip': 0},
    headers={'Secret': SECRET, 'Content-Type': 'application/json'},
    timeout=15
)

if response.status_code == 200:
    orders = response.json()
    print(f"Total na primeira pagina: {len(orders)}")

    if orders:
        # Ver campos disponíveis
        primeiro = orders[0]
        print(f"\nCampos do primeiro pedido:")
        for key in sorted(primeiro.keys()):
            valor = primeiro[key]
            if isinstance(valor, str) and len(valor) > 50:
                valor = valor[:50] + "..."
            print(f"  {key}: {valor}")

# Teste 6: Buscar orderBy updatedAt DESC
print("\n[TESTE 6] orderBy='updatedAt' (pode ter mais recentes)")
print("-" * 80)
orders_updated = buscar_pedidos({'orderBy': 'updatedAt'})
print(f"Total: {len(orders_updated)} pedidos")

# Comparar IDs
ids_padrao = set(o.get('id') for o in orders_padrao)
ids_updated = set(o.get('id') for o in orders_updated)
novos = ids_updated - ids_padrao
if novos:
    print(f"  [IMPORTANTE] {len(novos)} pedidos diferentes!")

# Teste 7: Verificar se retorna mais de 500 na primeira página
print("\n[TESTE 7] Verificar se API pode retornar > 500 por página")
print("-" * 80)
response = requests.get(
    "https://api.ecomhub.app/apps/orders",
    params={'token': TOKEN, 'skip': 0},  # Sem orderBy
    headers={'Secret': SECRET, 'Content-Type': 'application/json'},
    timeout=15
)
if response.status_code == 200:
    orders = response.json()
    print(f"Sem orderBy, primeira pagina: {len(orders)} pedidos")

print("\n" + "=" * 80)
print("RESUMO:")
print("=" * 80)

todos_ids = set()
todos_ids.update(o.get('id') for o in orders_padrao)
todos_ids.update(o.get('id') for o in orders_all)
todos_ids.update(o.get('id') for o in orders_no_order)
todos_ids.update(o.get('id') for o in orders_limit)
todos_ids.update(o.get('id') for o in orders_updated)

print(f"\nIDs unicos encontrados em TODOS os testes: {len(todos_ids)}")
print(f"Esperado (ECOMHUB): 40 pedidos")
print(f"Faltam: {40 - len(todos_ids)} pedidos")

if len(todos_ids) < 40:
    print(f"\n[PROBLEMA] Mesmo testando varios metodos, nao conseguimos os 40 pedidos!")
    print(f"           A API pode ter restricoes ou filtros que nao conhecemos.")
elif len(todos_ids) == 40:
    print(f"\n[SUCESSO] Encontramos os 40 pedidos! Veja qual teste funcionou acima.")

print("=" * 80)
