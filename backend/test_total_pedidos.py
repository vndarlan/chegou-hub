# backend/test_total_pedidos.py
"""Script para buscar o TOTAL REAL de pedidos na loja (sem parar em < 500)"""

import requests
from datetime import datetime

TOKEN = "2f1ca7fc-7246-4d1b-8a4e-14583c782bfc"
SECRET = "secret_31086cf8d27a4a8cacfffe948e8afb60"

print("=" * 80)
print("BUSCANDO TOTAL REAL DE PEDIDOS (SEM PARAR EM < 500)")
print("=" * 80)
print(f"Token: {TOKEN}\n")

try:
    all_orders = []
    skip = 0
    page_size = 500
    page_count = 0

    print("[*] Buscando TODOS os pedidos ate API retornar array vazio...\n")

    while True:
        page_count += 1
        print(f"[Pag {page_count:3d}] skip={skip:6d}...", end=" ", flush=True)

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
            print(f"[ERRO {response.status_code}]")
            if skip == 0:
                raise Exception(f"Erro na primeira pagina: {response.status_code}")
            print(f"\n[INFO] Erro na pagina {page_count}, usando dados coletados ate aqui")
            break

        orders = response.json()

        # IMPORTANTE: So para quando retorna VAZIO, nao quando < 500!
        if not orders or len(orders) == 0:
            print(f"[VAZIO] Fim da paginacao")
            break

        all_orders.extend(orders)
        print(f"[OK] {len(orders):3d} pedidos | Total: {len(all_orders):6,}")

        # NAO parar quando < 500! Continuar ate retornar vazio!
        # (O codigo antigo parava aqui e perdia pedidos)

        skip += page_size

        # Limite de seguranca apenas
        if skip >= 100000:
            print(f"\n[AVISO] Limite de seguranca atingido (100k pedidos)")
            break

    print("\n" + "=" * 80)
    print("RESULTADO FINAL:")
    print("=" * 80)
    print(f"  Total de pedidos na loja: {len(all_orders):,}")
    print(f"  Paginas processadas: {page_count}")
    print(f"  Media por pagina: {len(all_orders)/page_count:.1f}")

    # Analise por data
    if all_orders:
        datas = []
        for order in all_orders:
            try:
                order_date = datetime.fromisoformat(
                    order.get('date', '').replace('Z', '+00:00')
                ).date()
                datas.append(order_date)
            except:
                continue

        if datas:
            datas.sort()
            print(f"\n  Data mais antiga: {datas[0]}")
            print(f"  Data mais recente: {datas[-1]}")
            periodo_dias = (datas[-1] - datas[0]).days
            print(f"  Periodo total: {periodo_dias} dias (~{periodo_dias/30:.1f} meses)")

    print("=" * 80)

except Exception as e:
    print(f"\n[ERRO] {str(e)}")
    import traceback
    traceback.print_exc()
