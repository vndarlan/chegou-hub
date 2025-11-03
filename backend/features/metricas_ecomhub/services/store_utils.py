# backend/features/metricas_ecomhub/services/store_utils.py
"""Funções auxiliares para validação e configuração de lojas ECOMHUB"""

import requests
from collections import Counter


def test_ecomhub_connection(token, secret):
    """
    Testa conexão com API ECOMHUB usando token e secret

    Returns:
        dict: {
            'success': bool,
            'store_id': str or None,
            'myshopify_domain': str or None,
            'error_message': str or None
        }
    """
    try:
        response = requests.get(
            f"https://api.ecomhub.app/apps/stores",
            params={'token': token},
            headers={'Secret': secret, 'Content-Type': 'application/json'},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            return {
                'success': True,
                'store_id': data.get('id'),
                'myshopify_domain': data.get('myshopifyDomain'),
                'error_message': None
            }
        else:
            return {
                'success': False,
                'store_id': None,
                'myshopify_domain': None,
                'error_message': f"API retornou status {response.status_code}"
            }
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'store_id': None,
            'myshopify_domain': None,
            'error_message': "Timeout ao conectar com API ECOMHUB"
        }
    except Exception as e:
        return {
            'success': False,
            'store_id': None,
            'myshopify_domain': None,
            'error_message': str(e)
        }


def get_store_country(token, secret):
    """
    Detecta o país da loja analisando pedidos recentes

    CORREÇÃO: Implementa paginação para buscar TODOS os pedidos (API ECOMHUB limita 500 por requisição)

    Returns:
        dict: {
            'country_id': int or None,
            'country_name': str or None,
            'error_message': str or None
        }
    """
    try:
        # Buscar TODOS os pedidos com paginação
        all_orders = []
        skip = 0
        page_size = 500
        max_pages = 10  # Limite de segurança: até 5.000 pedidos (10 páginas x 500)

        while True:
            response = requests.get(
                f"https://api.ecomhub.app/apps/orders",
                params={'token': token, 'orderBy': 'date', 'skip': skip},
                headers={'Secret': secret, 'Content-Type': 'application/json'},
                timeout=15
            )

            if response.status_code != 200:
                # Se primeira página falha, retorna erro
                if skip == 0:
                    return {
                        'country_id': None,
                        'country_name': None,
                        'error_message': f"Erro ao buscar pedidos: status {response.status_code}"
                    }
                # Se páginas seguintes falham, usa o que já coletou
                break

            orders = response.json()

            # Se retornou vazio, fim da paginação
            if not orders or len(orders) == 0:
                break

            all_orders.extend(orders)

            # Se retornou menos que page_size, é a última página
            if len(orders) < page_size:
                break

            # Próxima página
            skip += page_size

            # Limite de segurança
            if skip >= (max_pages * page_size):
                break

        # Se não tem nenhum pedido após buscar tudo
        if not all_orders or len(all_orders) == 0:
            return {
                'country_id': None,
                'country_name': None,
                'error_message': "Loja não possui pedidos para detectar país"
            }

        # Identificar país mais comum nos pedidos
        country_ids = [order.get('shippingCountry_id') for order in all_orders if order.get('shippingCountry_id')]

        if not country_ids:
            return {
                'country_id': None,
                'country_name': None,
                'error_message': "Pedidos não possuem informação de país"
            }

        most_common_country_id = Counter(country_ids).most_common(1)[0][0]

        # Buscar nome do país (cache local ou API)
        country_name = get_country_name_by_id(most_common_country_id)

        return {
            'country_id': most_common_country_id,
            'country_name': country_name,
            'error_message': None
        }
    except Exception as e:
        return {
            'country_id': None,
            'country_name': None,
            'error_message': str(e)
        }


def get_country_name_by_id(country_id):
    """
    Busca nome do país pelo ID (usando cache local ou API)
    """
    # Mapeamento dos países que usamos
    COUNTRIES_MAP = {
        164: 'Spain',
        41: 'Croatia',
        66: 'Greece',
        82: 'Italy',
        142: 'Romania',
        44: 'Czechia',
        139: 'Poland'
    }

    # Retorna do cache local se existir
    if country_id in COUNTRIES_MAP:
        return COUNTRIES_MAP[country_id]

    # Se não, busca na API (opcional, pode cachear depois)
    try:
        response = requests.get(
            f"https://api.ecomhub.app/apps/countries",
            params={'token': 'any'},  # Endpoint público não precisa token válido
            timeout=10
        )

        if response.status_code == 200:
            countries = response.json()
            for country in countries:
                if country.get('id') == country_id:
                    return country.get('name')
    except:
        pass

    return f"Country ID {country_id}"
