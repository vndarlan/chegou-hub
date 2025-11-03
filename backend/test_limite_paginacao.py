# backend/test_limite_paginacao.py
"""Script para testar o novo limite de paginação com período grande"""

import requests
from datetime import datetime, date, timedelta

TOKEN = "2f1ca7fc-7246-4d1b-8a4e-14583c782bfc"
SECRET = "secret_31086cf8d27a4a8cacfffe948e8afb60"

# Período grande: últimos 4 meses
DATA_FIM = date.today()
DATA_INICIO = DATA_FIM - timedelta(days=120)  # ~4 meses

print("=" * 80)
print("TESTE DE LIMITE DE PAGINACAO - PERIODO GRANDE")
print("=" * 80)
print(f"Periodo: {DATA_INICIO} a {DATA_FIM} (~4 meses)")
print(f"Token: {TOKEN}")
print("=" * 80)

try:
    print("\n[*] Buscando TODOS os pedidos com paginacao...")
    print(f"    Novo limite: 200 paginas x 500 = 100.000 pedidos max\n")

    all_orders = []
    skip = 0
    page_size = 500
    max_pages = 200  # Novo limite
    page_count = 0

    while True:
        page_count += 1
        print(f"[Pagina {page_count:3d}] (skip={skip:6d})...", end=" ")

        response = requests.get(
            "https://api.ecomhub.app/apps/orders",
            params={'token': TOKEN, 'orderBy': 'date', 'skip': skip},
            headers={'Secret': SECRET, 'Content-Type': 'application/json'},
            timeout=15
        )

        if response.status_code != 200:
            print(f"[ERRO] status {response.status_code}")
            if skip == 0:
                raise Exception(f"Falha na primeira pagina: {response.status_code}")
            break

        orders = response.json()

        if not orders or len(orders) == 0:
            print("[OK] Pagina vazia - fim natural da paginacao")
            break

        all_orders.extend(orders)
        print(f"[OK] {len(orders):3d} pedidos (total: {len(all_orders):6d})")

        if len(orders) < page_size:
            print(f"             [INFO] Ultima pagina (retornou < {page_size})")
            break

        skip += page_size

        if skip >= (max_pages * page_size):
            print(f"\n[AVISO] Atingido limite de {max_pages} paginas!")
            break

    # Filtrar por período
    orders_in_period = []
    for order in all_orders:
        try:
            order_date = datetime.fromisoformat(
                order.get('date', '').replace('Z', '+00:00')
            ).date()
            if DATA_INICIO <= order_date <= DATA_FIM:
                orders_in_period.append(order)
        except:
            continue

    print("\n" + "=" * 80)
    print("RESULTADOS:")
    print("=" * 80)
    print(f"  Total de pedidos coletados (todos): {len(all_orders):,}")
    print(f"  Pedidos no periodo ({DATA_INICIO} a {DATA_FIM}): {len(orders_in_period):,}")
    print(f"  Paginas processadas: {page_count}")
    print(f"  Limite de paginas: {max_pages}")
    print(f"  Capacidade maxima: {max_pages * page_size:,} pedidos")

    # Verificar se atingiu o limite
    atingiu_limite = (skip >= max_pages * page_size)

    print("\n" + "=" * 80)
    print("ANALISE:")
    print("=" * 80)

    if atingiu_limite:
        print(f"  [AVISO] Atingiu o limite de {max_pages} paginas!")
        print(f"          Pode haver mais pedidos nao buscados.")
        print(f"          Considere aumentar max_pages ainda mais.")
    else:
        print(f"  [OK] Nao atingiu o limite - buscou todos os pedidos disponiveis")
        print(f"       Utilizou {page_count} de {max_pages} paginas ({page_count/max_pages*100:.1f}%)")

    # Estatísticas de uso
    pedidos_por_dia = len(orders_in_period) / max((DATA_FIM - DATA_INICIO).days, 1)
    print(f"\n  Media: ~{pedidos_por_dia:.1f} pedidos/dia no periodo")

    if len(orders_in_period) > 0:
        percentual_periodo = (len(orders_in_period) / len(all_orders)) * 100
        print(f"  {percentual_periodo:.1f}% dos pedidos totais estao no periodo especificado")

    print("\n" + "=" * 80)

    if not atingiu_limite and len(orders_in_period) > 0:
        print("\n[SUCESSO] Novo limite de 200 paginas e suficiente!")
        print(f"          Conseguiu buscar {len(orders_in_period):,} pedidos em ~4 meses")
    elif atingiu_limite:
        print("\n[ATENCAO] Mesmo com 200 paginas, atingiu o limite!")
        print(f"          Esta loja tem volume muito alto (>{max_pages * page_size:,} pedidos)")
    else:
        print("\n[INFO] Teste concluido - verifique os resultados acima")

    print("=" * 80)

except Exception as e:
    print(f"\n[ERRO] {str(e)}")
    import traceback
    traceback.print_exc()
