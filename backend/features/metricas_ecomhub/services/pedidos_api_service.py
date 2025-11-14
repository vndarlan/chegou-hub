# backend/features/metricas_ecomhub/services/pedidos_api_service.py
"""
Serviço para buscar pedidos via middleware Selenium + API oficial EcomHub

Este serviço NÃO usa lojas cadastradas no banco.
Usa o middleware Selenium para obter tokens e depois chama API oficial.

Fluxo:
1. GET /api/auth (Selenium) → Retorna tokens
2. GET https://api.ecomhub.app/api/orders (com tokens como cookies)
"""

import requests
import logging
import json
import urllib.parse
from datetime import date
from typing import Dict, Any, List, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

# ===========================================
# CONSTANTES
# ===========================================

SELENIUM_AUTH_URL = "https://ecomhub-selenium-production.up.railway.app/api/auth"
ECOMHUB_API_BASE = "https://api.ecomhub.app/api/orders"
REQUEST_TIMEOUT = 30  # segundos

# Headers obrigatórios (conforme documentação)
REQUIRED_HEADERS = {
    'Accept': '*/*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': 'https://go.ecomhub.app',
    'Referer': 'https://go.ecomhub.app/',
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json'
}

# Mapeamento de países
PAISES = {
    164: 'Spain',
    41: 'Croatia',
    66: 'Greece',
    82: 'Italy',
    142: 'Romania',
    44: 'Czech Republic',
    139: 'Poland'
}


# ===========================================
# FUNÇÕES PRINCIPAIS
# ===========================================

def obter_tokens_selenium() -> Dict[str, Any]:
    """
    Busca tokens válidos do middleware Selenium

    GET https://ecomhub-selenium-production.up.railway.app/api/auth

    Returns:
        dict: {
            'token': 'JWT_TOKEN',
            'e_token': 'EXTENDED_TOKEN',
            'refresh_token': 'REFRESH_TOKEN',
            'cookie': 'string com cookies',
            'timestamp': 'ISO_8601_DATE'
        }

    Raises:
        requests.RequestException: Erro na comunicação com Selenium
        ValueError: Resposta inválida ou tokens ausentes
    """
    logger.info("Buscando tokens do middleware Selenium...")

    # Buscar API Key do settings (variável de ambiente)
    api_key = getattr(settings, 'ECOMHUB_SELENIUM_API_KEY', 'cacn29cn49bhcxno32jkcmu2801jplsjq')

    try:
        response = requests.get(
            SELENIUM_AUTH_URL,
            headers={'X-API-Key': api_key},
            timeout=60  # Selenium demora ~50 segundos
        )

        if response.status_code != 200:
            logger.error(f"Selenium retornou status {response.status_code}: {response.text}")
            raise requests.RequestException(f"Erro ao buscar tokens: HTTP {response.status_code}")

        data = response.json()

        # Validar estrutura da resposta
        if 'cookies' not in data:
            logger.error(f"Resposta inválida do Selenium: {json.dumps(data, indent=2)}")
            raise ValueError("Campo 'cookies' ausente na resposta do Selenium")

        cookies = data['cookies']

        # Validar campos necessários dentro de cookies
        required_fields = ['token', 'e_token', 'refresh_token']
        for field in required_fields:
            if field not in cookies:
                logger.error(f"Resposta completa do Selenium: {json.dumps(data, indent=2)}")
                raise ValueError(f"Campo '{field}' ausente em cookies")

        logger.info("Tokens obtidos com sucesso do Selenium")

        # Retornar estrutura compatível
        return {
            'token': cookies['token'],
            'e_token': cookies['e_token'],
            'refresh_token': cookies['refresh_token'],
            'cookie_string': data.get('cookie_string', ''),
            'timestamp': data.get('timestamp', ''),
            'headers': data.get('headers', {})
        }

    except requests.Timeout:
        logger.error("Timeout ao buscar tokens do Selenium (>60s)")
        raise

    except requests.ConnectionError as e:
        logger.error(f"Erro de conexão com Selenium: {e}")
        raise

    except Exception as e:
        logger.error(f"Erro inesperado ao buscar tokens: {e}")
        raise


def montar_conditions_json(
    data_inicio: date,
    data_fim: date,
    country_ids: Optional[List[int]] = None,
    status_list: Optional[List[str]] = None
) -> str:
    """
    Monta JSON de conditions e retorna stringificado + URL encoded

    Args:
        data_inicio: Data inicial do período
        data_fim: Data final do período
        country_ids: Lista de IDs de países (opcional)
        status_list: Lista de status (opcional)

    Returns:
        str: JSON stringificado e URL encoded

    Example:
        >>> montar_conditions_json(date(2025,1,1), date(2025,1,31), [164])
        '%7B%22orders%22%3A%7B%22date%22%3A...'
    """
    conditions = {
        "orders": {
            "date": {
                "start": data_inicio.isoformat(),
                "end": data_fim.isoformat()
            }
        }
    }

    # Adicionar filtro de países se fornecido
    if country_ids:
        conditions["orders"]["shippingCountry_id"] = country_ids

    # Adicionar filtro de status se fornecido
    if status_list:
        conditions["orders"]["status"] = status_list

    # Stringificar e URL encode
    json_str = json.dumps(conditions, separators=(',', ':'))
    encoded = urllib.parse.quote(json_str)

    logger.debug(f"Conditions montado: {json_str}")
    return encoded


def buscar_pedidos_ecomhub(
    tokens: Dict[str, Any],
    data_inicio: date,
    data_fim: date,
    offset: int = 0,
    country_ids: Optional[List[int]] = None,
    status_list: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Busca pedidos da API oficial EcomHub usando tokens do Selenium

    GET https://api.ecomhub.app/api/orders

    Args:
        tokens: Dict com token, e_token, refresh_token (do Selenium)
        data_inicio: Data inicial
        data_fim: Data final
        offset: Página (0-indexed, múltiplo de 48)
        country_ids: Filtro de países (opcional)
        status_list: Filtro de status (opcional)

    Returns:
        list: Array de pedidos (até 48 por página)

    Raises:
        requests.RequestException: Erro na comunicação
        ValueError: Resposta inválida
    """
    logger.info(f"Buscando pedidos da API EcomHub (offset={offset})...")

    try:
        # Montar conditions
        conditions = montar_conditions_json(
            data_inicio=data_inicio,
            data_fim=data_fim,
            country_ids=country_ids,
            status_list=status_list
        )

        # Montar cookies
        cookies = {
            'token': tokens['token'],
            'e_token': tokens['e_token'],
            'refresh_token': tokens['refresh_token']
        }

        # Montar params
        params = {
            'offset': offset,
            'orderBy': 'null',
            'orderDirection': 'null',
            'conditions': urllib.parse.unquote(conditions),  # Unquote para requests fazer encode certo
            'search': ''
        }

        # DEBUG: Logar URL completa
        logger.info(f"🔍 DEBUG PAGINAÇÃO:")
        logger.info(f"   Offset: {offset}")
        logger.info(f"   Conditions: {urllib.parse.unquote(conditions)[:100]}...")

        # Fazer requisição
        response = requests.get(
            ECOMHUB_API_BASE,
            params=params,
            cookies=cookies,
            headers=REQUIRED_HEADERS,
            timeout=REQUEST_TIMEOUT
        )

        # DEBUG: Logar URL final
        logger.info(f"   URL chamada: {response.url}")

        if response.status_code != 200:
            logger.error(f"API EcomHub retornou status {response.status_code}: {response.text}")

            if response.status_code == 401:
                raise ValueError("Tokens inválidos ou expirados")
            elif response.status_code == 403:
                raise ValueError("Acesso negado à API EcomHub")
            else:
                raise requests.RequestException(f"Erro na API: HTTP {response.status_code}")

        pedidos = response.json()

        # Validar resposta
        if not isinstance(pedidos, list):
            raise ValueError("API retornou formato inesperado (esperado: array)")

        logger.info(f"API retornou {len(pedidos)} pedidos (offset={offset})")

        # DEBUG: Logar primeiros IDs para detectar duplicatas
        if pedidos:
            primeiros_ids = [p.get('id', 'N/A')[:20] for p in pedidos[:3]]
            logger.info(f"   Primeiros 3 IDs: {primeiros_ids}")

        # Garantir que cada pedido tenha countries.name
        for pedido in pedidos:
            if 'countries' not in pedido or not pedido.get('countries', {}).get('name'):
                country_id = pedido.get('shippingCountry_id')
                country_name = PAISES.get(country_id, pedido.get('shippingCountry', 'N/A'))
                pedido['countries'] = {
                    'id': country_id,
                    'name': country_name
                }

        return pedidos

    except requests.Timeout:
        logger.error("Timeout ao buscar pedidos da API EcomHub")
        raise

    except requests.ConnectionError as e:
        logger.error(f"Erro de conexão com API EcomHub: {e}")
        raise

    except Exception as e:
        logger.error(f"Erro inesperado ao buscar pedidos: {e}")
        raise


def buscar_todos_pedidos_periodo(
    data_inicio: date,
    data_fim: date,
    country_ids: Optional[List[int]] = None,
    status_list: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Busca TODOS os pedidos de um período (com paginação automática infinita)

    Args:
        data_inicio: Data inicial
        data_fim: Data final
        country_ids: Filtro de países (opcional)
        status_list: Filtro de status (opcional)

    Returns:
        dict: {
            'status': 'success' | 'error',
            'pedidos': [array de pedidos],
            'total': int,
            'pages_fetched': int,
            'message': str
        }
    """
    logger.info(f"Buscando todos os pedidos do período {data_inicio} a {data_fim}")

    try:
        # Buscar tokens
        tokens = obter_tokens_selenium()

        # Buscar pedidos com paginação infinita
        todos_pedidos = []
        page = 0
        page_size = 48

        while True:
            # Renovar tokens a cada 5 páginas (tokens expiram em ~3 min)
            if page > 0 and page % 5 == 0:
                logger.info(f"Renovando tokens na página {page + 1}...")
                tokens = obter_tokens_selenium()

            offset = page * page_size
            logger.info(f"Buscando página {page + 1} (offset={offset})...")

            try:
                pedidos_pagina = buscar_pedidos_ecomhub(
                    tokens=tokens,
                    data_inicio=data_inicio,
                    data_fim=data_fim,
                    offset=offset,
                    country_ids=country_ids,
                    status_list=status_list
                )
            except ValueError as e:
                # Se der erro de token expirado, renovar e tentar novamente
                if "Tokens inválidos ou expirados" in str(e):
                    logger.warning(f"Token expirado na página {page + 1}. Renovando...")
                    tokens = obter_tokens_selenium()
                    pedidos_pagina = buscar_pedidos_ecomhub(
                        tokens=tokens,
                        data_inicio=data_inicio,
                        data_fim=data_fim,
                        offset=offset,
                        country_ids=country_ids,
                        status_list=status_list
                    )
                else:
                    raise

            # Se retornou vazio, fim da paginação
            if not pedidos_pagina:
                logger.info(f"⛔ Página {page + 1} retornou vazia. Fim da paginação.")
                break

            todos_pedidos.extend(pedidos_pagina)
            logger.info(f"✓ Página {page + 1}: {len(pedidos_pagina)} pedidos (total acumulado: {len(todos_pedidos)})")

            # Se retornou menos que page_size, é a última página
            if len(pedidos_pagina) < page_size:
                logger.info(f"⛔ Página {page + 1} retornou {len(pedidos_pagina)} pedidos (< {page_size}). Última página.")
                break

            # DEBUG: Se retornou exatamente page_size, continuar
            logger.info(f"🔄 Página {page + 1} retornou {len(pedidos_pagina)} pedidos (= {page_size}). Continuando paginação...")
            page += 1

        logger.info(f"Busca concluída: {len(todos_pedidos)} pedidos total em {page + 1} páginas")

        return {
            'status': 'success',
            'pedidos': todos_pedidos,
            'total': len(todos_pedidos),
            'pages_fetched': page + 1,
            'message': f'{len(todos_pedidos)} pedidos encontrados'
        }

    except Exception as e:
        logger.error(f"Erro ao buscar pedidos: {e}", exc_info=True)
        return {
            'status': 'error',
            'pedidos': [],
            'total': 0,
            'pages_fetched': 0,
            'message': f'Erro: {str(e)}'
        }
