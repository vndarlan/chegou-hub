# backend/test_comparar_apis.py
"""Comparar resultados entre API V2 (direta) e dados do sistema"""

import sys
import os
import django
from datetime import date, timedelta

# Configurar Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chegou_hub.settings')
django.setup()

from features.metricas_ecomhub.services.efetividade_v2_service import (
    fetch_orders_from_ecomhub_api,
    calcular_efetividade
)

# Credenciais da loja 2 (Romênia)
TOKEN = "52cd74c3-b3cc-47a0-b23d-7c2fd00e517d"
SECRET = "secret_1f4b53ced9de4ea7ac09d729b815300f"

# Período de 3 meses
DATA_FIM = date.today()
DATA_INICIO = DATA_FIM - timedelta(days=90)

print("=" * 80)
print("COMPARACAO - API V2 (DIRETA ECOMHUB)")
print("=" * 80)
print(f"Loja: {TOKEN}")
print(f"Periodo: {DATA_INICIO} a {DATA_FIM} (3 meses)")
print(f"Pais: Romania (ID 142)")
print("=" * 80)

try:
    print("\n[1/2] Buscando pedidos da API ECOMHUB (V2)...")

    # Buscar pedidos usando a função V2
    pedidos = fetch_orders_from_ecomhub_api(
        token=TOKEN,
        secret=SECRET,
        data_inicio=DATA_INICIO,
        data_fim=DATA_FIM,
        country_id=142  # Romênia
    )

    print(f"      Total de pedidos encontrados: {len(pedidos)}")

    if len(pedidos) > 0:
        # Análise por status
        from collections import Counter
        status_count = Counter(p.get('status') for p in pedidos)

        print(f"\n[2/2] Distribuicao por status:")
        print("-" * 80)
        for status, count in sorted(status_count.items(), key=lambda x: x[1], reverse=True):
            print(f"  {status}: {count}")

        print("\n" + "=" * 80)
        print("RESULTADO:")
        print("=" * 80)
        print(f"  Total de pedidos (API V2): {len(pedidos)}")
        print(f"  Periodo completo: {DATA_INICIO} a {DATA_FIM}")

        # Calcular efetividade
        print(f"\n[3/3] Calculando efetividade...")
        resultado = calcular_efetividade(pedidos)

        visualizacao = resultado.get('visualizacao_otimizada', [])
        if visualizacao:
            print(f"\n  Produtos encontrados: {len(visualizacao)}")
            for item in visualizacao[:5]:  # Primeiros 5
                print(f"    - {item.get('Produto')}: {item.get('Totais')} pedidos")

        print("\n" + "=" * 80)
        print("COMPARACAO COM ESPERADO:")
        print("=" * 80)
        print(f"  Esperado (ECOMHUB manual): 40 pedidos")
        print(f"  Encontrado (API V2): {len(pedidos)} pedidos")
        print(f"  Diferenca: {40 - len(pedidos)} pedidos faltando")

        if len(pedidos) < 40:
            print(f"\n[CONCLUSAO] API V2 esta retornando MENOS pedidos que o esperado!")
            print(f"            Faltam {40 - len(pedidos)} pedidos.")
            print(f"            Possivel causa: API ECOMHUB filtra alguns pedidos.")
        elif len(pedidos) == 40:
            print(f"\n[SUCESSO] API V2 retornou exatamente os 40 pedidos esperados!")
        else:
            print(f"\n[ATENCAO] API V2 retornou MAIS pedidos que o esperado ({len(pedidos)} > 40)")

        print("=" * 80)

    else:
        print("\n[ERRO] Nenhum pedido encontrado!")

except Exception as e:
    print(f"\n[ERRO] {str(e)}")
    import traceback
    traceback.print_exc()
