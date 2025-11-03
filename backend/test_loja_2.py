# backend/test_loja_2.py
"""Testar segunda loja para verificar total de pedidos"""

import requests
from datetime import datetime

TOKEN = "52cd74c3-b3cc-47a0-b23d-7c2fd00e517d"
SECRET = "secret_1f4b53ced9de4ea7ac09d729b815300f"

print("=" * 80)
print("TESTE - LOJA 2")
print("=" * 80)
print(f"Token: {TOKEN}")
print("=" * 80)

try:
    all_orders = []
    skip = 0
    page_size = 500
    page_count = 0

    print("\n[*] Buscando TODOS os pedidos...\n")

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
                print(f"\nErro na primeira pagina: {response.text[:200]}")
                raise Exception(f"Erro {response.status_code}")
            print(f"\n[INFO] Erro na pagina {page_count}, parando aqui")
            break

        orders = response.json()

        if not orders or len(orders) == 0:
            print(f"[VAZIO] Fim da paginacao")
            break

        all_orders.extend(orders)
        print(f"[OK] {len(orders):3d} pedidos | Total: {len(all_orders):6,}")

        skip += page_size

        # Limite de segurança
        if skip >= 100000:
            print(f"\n[AVISO] Limite de seguranca (100k)")
            break

    print("\n" + "=" * 80)
    print("RESULTADO:")
    print("=" * 80)
    print(f"  Total de pedidos: {len(all_orders):,}")
    print(f"  Paginas processadas: {page_count}")

    if all_orders:
        # Análise por data
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
            print(f"  Media: ~{len(all_orders)/max(periodo_dias, 1):.1f} pedidos/dia")

        # País
        paises = {}
        for order in all_orders:
            country_id = order.get('shippingCountry_id')
            if country_id:
                paises[country_id] = paises.get(country_id, 0) + 1

        if paises:
            print(f"\n  Distribuicao por pais:")
            for country_id, count in sorted(paises.items(), key=lambda x: x[1], reverse=True):
                print(f"    Country ID {country_id}: {count:,} pedidos ({count/len(all_orders)*100:.1f}%)")

    print("\n" + "=" * 80)

    if len(all_orders) > 1093:
        print(f"\n[INFO] Esta loja tem MAIS pedidos que a anterior!")
        print(f"       Loja 1 (Romania): 1.093 pedidos")
        print(f"       Loja 2 (atual): {len(all_orders):,} pedidos")
    else:
        print(f"\n[INFO] Loja tem {len(all_orders):,} pedidos")

    print("=" * 80)

except Exception as e:
    print(f"\n[ERRO] {str(e)}")
    import traceback
    traceback.print_exc()
