# -*- coding: utf-8 -*-
"""
Script de testes para API oficial da Ecomhub
Testa todos os endpoints disponiveis e documenta os dados retornados
"""

import requests
import json
from datetime import datetime
import sys

# Configuracao de encoding para Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Credenciais da API
API_TOKEN = "331f4fbb-5de2-4823-9100-c6ba1adfd7b9"
API_SECRET = "secret_036f32fc2acb435b80319ff05db94f61"
BASE_URL = "https://api.ecomhub.app"

# Headers padrao (APENAS Secret conforme documentacao)
HEADERS = {
    "Secret": API_SECRET
}

def print_section(title):
    """Imprime um titulo de secao formatado"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80 + "\n")

def save_response(endpoint_name, data):
    """Salva a resposta em arquivo JSON para analise posterior"""
    filename = f"test_results_{endpoint_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[OK] Resposta salva em: {filename}")

def test_countries():
    """Testa o endpoint /apps/countries"""
    print_section("TESTE 1: Endpoint /apps/countries")

    url = f"{BASE_URL}/apps/countries"
    params = {"token": API_TOKEN}

    try:
        print(f"Requisicao: GET {url}")
        print(f"Headers: {HEADERS}")
        print(f"Params: {params}\n")

        response = requests.get(url, headers=HEADERS, params=params)

        print(f"Status Code: {response.status_code}")
        print(f"Headers da Resposta: {dict(response.headers)}\n")

        if response.status_code == 200:
            data = response.json()
            print(f"[SUCESSO] {len(data)} paises retornados\n")

            print("Estrutura dos dados:")
            if data and len(data) > 0:
                print(json.dumps(data[0], indent=2, ensure_ascii=False))
                print(f"\n... e mais {len(data)-1} paises")

                print("\nLista de paises:")
                for country in data:
                    currency_info = ""
                    if country.get('currencies'):
                        currency_info = f" - Moeda: {country['currencies'].get('code', 'N/A')}"
                    print(f"  ID: {country['id']} | {country['name']} ({country['acronym']}){currency_info}")

            save_response("countries", data)
            return data
        else:
            print(f"[ERRO] Status: {response.status_code}")
            print(f"Resposta: {response.text}")
            return None

    except Exception as e:
        print(f"[EXCECAO] {str(e)}")
        return None

def test_stores():
    """Testa o endpoint de Lojas (conforme documentacao)"""
    print_section("TESTE 2: Endpoint de Lojas")

    # NOTA: A documentacao mostra /apps/countries para lojas tambem
    # Vamos testar ambas possibilidades
    url = f"{BASE_URL}/apps/countries"  # Conforme documentacao (pode ser erro de copy/paste)
    params = {"token": API_TOKEN}

    try:
        print(f"Requisicao: GET {url}")
        print(f"Headers: {HEADERS}")
        print(f"Params: {params}\n")

        response = requests.get(url, headers=HEADERS, params=params)

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"[SUCESSO]\n")

            print("Dados da Loja:")
            print(json.dumps(data, indent=2, ensure_ascii=False))

            save_response("stores", data)
            return data
        else:
            print(f"[ERRO] Status: {response.status_code}")
            print(f"Resposta: {response.text}")
            return None

    except Exception as e:
        print(f"[EXCECAO] {str(e)}")
        return None

def test_orders(order_by='date', skip=0):
    """Testa o endpoint /apps/orders"""
    print_section(f"TESTE 3: Endpoint /apps/orders (orderBy={order_by}, skip={skip})")

    url = f"{BASE_URL}/apps/orders"
    params = {
        "token": API_TOKEN,
        "orderBy": order_by,
        "skip": skip
    }

    try:
        print(f"Requisicao: GET {url}")
        print(f"Headers: {HEADERS}")
        print(f"Params: {params}\n")

        response = requests.get(url, headers=HEADERS, params=params)

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"[SUCESSO] {len(data)} pedidos retornados\n")

            if data and len(data) > 0:
                print("Exemplo de 1 pedido completo:")
                print(json.dumps(data[0], indent=2, ensure_ascii=False))

                print(f"\nANALISE DOS PEDIDOS:")
                print(f"Total de pedidos retornados: {len(data)}")

                # Analise de status
                statuses = {}
                countries = {}
                total_price = 0
                total_costs = {
                    'commission': 0,
                    'commission_return': 0,
                    'courier': 0,
                    'courier_return': 0,
                    'payment_method': 0,
                    'warehouse': 0,
                    'warehouse_return': 0
                }

                for order in data:
                    # Status
                    status = order.get('status', 'N/A')
                    statuses[status] = statuses.get(status, 0) + 1

                    # Paises
                    country_id = order.get('shippingCountry_id', 'N/A')
                    countries[country_id] = countries.get(country_id, 0) + 1

                    # Precos e custos
                    total_price += float(order.get('price', 0))
                    total_costs['commission'] += float(order.get('costCommission', 0))
                    total_costs['commission_return'] += float(order.get('costCommissionReturn', 0))
                    total_costs['courier'] += float(order.get('costCourier', 0))
                    total_costs['courier_return'] += float(order.get('costCourierReturn', 0))
                    total_costs['payment_method'] += float(order.get('costPaymentMethod', 0))
                    total_costs['warehouse'] += float(order.get('costWarehouse', 0))
                    total_costs['warehouse_return'] += float(order.get('costWarehouseReturn', 0))

                print(f"\nStatus dos pedidos:")
                for status, count in sorted(statuses.items(), key=lambda x: x[1], reverse=True):
                    print(f"  {status}: {count} pedidos ({count/len(data)*100:.1f}%)")

                print(f"\nPaises de envio:")
                for country_id, count in sorted(countries.items(), key=lambda x: x[1], reverse=True):
                    print(f"  Pais ID {country_id}: {count} pedidos ({count/len(data)*100:.1f}%)")

                print(f"\nValores totais:")
                print(f"  Preco total dos pedidos: €{total_price:.2f}")
                print(f"  Custo total comissao: €{total_costs['commission']:.2f}")
                print(f"  Custo total comissao (devolucao): €{total_costs['commission_return']:.2f}")
                print(f"  Custo total courier: €{total_costs['courier']:.2f}")
                print(f"  Custo total courier (devolucao): €{total_costs['courier_return']:.2f}")
                print(f"  Custo total metodo pagamento: €{total_costs['payment_method']:.2f}")
                print(f"  Custo total warehouse: €{total_costs['warehouse']:.2f}")
                print(f"  Custo total warehouse (devolucao): €{total_costs['warehouse_return']:.2f}")

                # Analise de produtos
                print(f"\nAnalise de produtos:")
                total_items = sum(len(order.get('ordersItems', [])) for order in data)
                print(f"  Total de items em todos os pedidos: {total_items}")

                if total_items > 0:
                    print(f"\n  Exemplo de item do primeiro pedido:")
                    if data[0].get('ordersItems') and len(data[0]['ordersItems']) > 0:
                        print(json.dumps(data[0]['ordersItems'][0], indent=2, ensure_ascii=False))

            save_response(f"orders_{order_by}_skip{skip}", data)
            return data
        else:
            print(f"[ERRO] Status: {response.status_code}")
            print(f"Resposta: {response.text}")
            return None

    except Exception as e:
        print(f"[EXCECAO] {str(e)}")
        return None

def test_stores_alternative():
    """Testa o endpoint alternativo /apps/stores"""
    print_section("TESTE 2B: Endpoint Alternativo /apps/stores")

    url = f"{BASE_URL}/apps/stores"
    params = {"token": API_TOKEN}

    try:
        print(f"Requisicao: GET {url}")
        print(f"Headers: {HEADERS}")
        print(f"Params: {params}\n")

        response = requests.get(url, headers=HEADERS, params=params)

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"[SUCESSO]\n")

            print("Dados da Loja:")
            print(json.dumps(data, indent=2, ensure_ascii=False))

            save_response("stores_alt", data)
            return data
        else:
            print(f"[ERRO] Status: {response.status_code}")
            print(f"Resposta: {response.text}")
            return None

    except Exception as e:
        print(f"[EXCECAO] {str(e)}")
        return None

def main():
    """Executa todos os testes"""
    print("\n" + "=" * 80)
    print("TESTES DA API OFICIAL ECOMHUB".center(80))
    print("=" * 80)
    print(f"Inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    print(f"Token: {API_TOKEN}")
    print(f"Secret: {API_SECRET[:20]}...")
    print(f"Autenticacao: Token como query param, Secret como header\n")

    # Teste 1: Paises
    countries = test_countries()

    # Teste 2: Lojas (conforme documentacao)
    stores = test_stores()

    # Teste 2B: Lojas (endpoint alternativo)
    stores_alt = test_stores_alternative()

    # Teste 3: Pedidos (ordenado por data)
    orders_by_date = test_orders(order_by='date', skip=0)

    # Teste 4: Pedidos (ordenado por updatedAt)
    orders_by_updated = test_orders(order_by='updatedAt', skip=0)

    # Teste 5: Paginacao (proximos 10)
    if orders_by_date and len(orders_by_date) >= 10:
        print("\nTestando paginacao (skip=10)...")
        orders_page2 = test_orders(order_by='date', skip=10)

    # Resumo final
    print_section("RESUMO DOS TESTES")

    print("Testes concluidos!\n")
    print("Resultados:")
    print(f"  Paises: {'OK' if countries else 'ERRO'} ({len(countries) if countries else 0} encontrados)")
    print(f"  Lojas (doc): {'OK' if stores else 'ERRO'}")
    print(f"  Lojas (/stores): {'OK' if stores_alt else 'ERRO'}")
    print(f"  Pedidos (by date): {'OK' if orders_by_date else 'ERRO'} ({len(orders_by_date) if orders_by_date else 0} encontrados)")
    print(f"  Pedidos (by updatedAt): {'OK' if orders_by_updated else 'ERRO'} ({len(orders_by_updated) if orders_by_updated else 0} encontrados)")

    print(f"\nFim: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    main()