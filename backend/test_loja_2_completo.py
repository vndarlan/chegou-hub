# backend/test_loja_2_completo.py
"""Testar loja 2 com diferentes ordenações para ver todos os pedidos"""

import requests
from datetime import datetime

TOKEN = "52cd74c3-b3cc-47a0-b23d-7c2fd00e517d"
SECRET = "secret_1f4b53ced9de4ea7ac09d729b815300f"

print("=" * 80)
print("TESTE COMPLETO - LOJA 2 (TODAS AS ORDENACOES)")
print("=" * 80)

def buscar_com_ordenacao(order_by_param):
    """Busca pedidos com uma ordenação específica"""
    all_orders = []
    skip = 0
    page_count = 0

    while True:
        page_count += 1

        params = {'token': TOKEN, 'skip': skip}
        if order_by_param:
            params['orderBy'] = order_by_param

        response = requests.get(
            "https://api.ecomhub.app/apps/orders",
            params=params,
            headers={'Secret': SECRET, 'Content-Type': 'application/json'},
            timeout=15
        )

        if response.status_code != 200:
            if skip == 0:
                return None, f"Erro {response.status_code}"
            break

        orders = response.json()

        if not orders or len(orders) == 0:
            break

        all_orders.extend(orders)

        skip += 500

        if skip >= 50000:  # Limite de segurança
            break

    return all_orders, None

# Teste 1: orderBy='date'
print("\n[TESTE 1] orderBy='date'")
print("-" * 80)
orders_date, error = buscar_com_ordenacao('date')
if error:
    print(f"  Erro: {error}")
else:
    print(f"  Total: {len(orders_date)} pedidos")
    if orders_date:
        datas = [o.get('date', '')[:10] for o in orders_date if o.get('date')]
        datas_unicas = sorted(set(datas))
        print(f"  Primeira data: {datas_unicas[0] if datas_unicas else 'N/A'}")
        print(f"  Ultima data: {datas_unicas[-1] if datas_unicas else 'N/A'}")

# Teste 2: orderBy='updatedAt'
print("\n[TESTE 2] orderBy='updatedAt'")
print("-" * 80)
orders_updated, error = buscar_com_ordenacao('updatedAt')
if error:
    print(f"  Erro: {error}")
else:
    print(f"  Total: {len(orders_updated)} pedidos")
    if orders_updated:
        # Ver se pegou pedidos diferentes
        ids_date = set(o.get('id') for o in orders_date) if orders_date else set()
        ids_updated = set(o.get('id') for o in orders_updated)
        novos = ids_updated - ids_date
        if novos:
            print(f"  [IMPORTANTE] Encontrou {len(novos)} pedidos NOVOS que nao vieram com orderBy='date'!")
        else:
            print(f"  Mesmo conjunto de pedidos que orderBy='date'")

# Teste 3: Sem orderBy (ordem natural)
print("\n[TESTE 3] Sem orderBy (ordem natural da API)")
print("-" * 80)
orders_natural, error = buscar_com_ordenacao(None)
if error:
    print(f"  Erro: {error}")
else:
    print(f"  Total: {len(orders_natural)} pedidos")
    if orders_natural:
        ids_date = set(o.get('id') for o in orders_date) if orders_date else set()
        ids_natural = set(o.get('id') for o in orders_natural)
        novos = ids_natural - ids_date
        if novos:
            print(f"  [IMPORTANTE] Encontrou {len(novos)} pedidos NOVOS!")
        else:
            print(f"  Mesmo conjunto de pedidos")

# Resumo
print("\n" + "=" * 80)
print("RESUMO FINAL:")
print("=" * 80)

totais = {
    "orderBy='date'": len(orders_date) if orders_date else 0,
    "orderBy='updatedAt'": len(orders_updated) if orders_updated else 0,
    "Sem orderBy": len(orders_natural) if orders_natural else 0
}

max_total = max(totais.values())
print(f"\n  Total maximo encontrado: {max_total} pedidos")

for metodo, total in totais.items():
    marca = " <- MELHOR" if total == max_total else ""
    print(f"  {metodo}: {total} pedidos{marca}")

# Unir todos os IDs únicos
all_ids = set()
if orders_date:
    all_ids.update(o.get('id') for o in orders_date)
if orders_updated:
    all_ids.update(o.get('id') for o in orders_updated)
if orders_natural:
    all_ids.update(o.get('id') for o in orders_natural)

print(f"\n  IDs unicos (total absoluto): {len(all_ids)} pedidos")

if len(all_ids) > max_total:
    print(f"\n  [ATENCAO] Existem {len(all_ids) - max_total} pedidos que so aparecem em algumas ordenacoes!")
    print(f"            Precisamos buscar com TODAS as ordenacoes para pegar tudo!")

print("\n" + "=" * 80)
