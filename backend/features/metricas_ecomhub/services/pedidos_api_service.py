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
import time
from datetime import date
from typing import Dict, Any, List, Optional, Callable
from django.conf import settings

logger = logging.getLogger(__name__)

# ===========================================
# CONSTANTES
# ===========================================

SELENIUM_AUTH_URL = "https://ecomhub-selenium-production.up.railway.app/api/auth"
ECOMHUB_API_BASE = "https://api.ecomhub.app/api/orders"
REQUEST_TIMEOUT = 120  # segundos (aumentado de 30s para 120s para evitar timeouts)
MAX_RETRIES = 3  # número máximo de tentativas em caso de falha
RETRY_BACKOFF_FACTOR = 2  # fator de multiplicação para backoff exponencial (1s, 2s, 4s)

# Proteções para paginação infinita
MAX_PAGES = 100  # limite máximo de páginas para evitar loops infinitos
TIMEOUT_TOTAL = 600  # timeout total em segundos (10 minutos)
MAX_FALHAS_CONSECUTIVAS = 3  # circuit breaker: parar após N falhas seguidas

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
# FUNÇÕES AUXILIARES
# ===========================================

def executar_com_retry(
    funcao: Callable,
    *args,
    max_retries: int = MAX_RETRIES,
    timeout: int = REQUEST_TIMEOUT,
    **kwargs
) -> Any:
    """
    Executa uma função com retry logic e backoff exponencial

    Args:
        funcao: Função a ser executada
        *args: Argumentos posicionais para a função
        max_retries: Número máximo de tentativas
        timeout: Timeout para cada tentativa
        **kwargs: Argumentos nomeados para a função

    Returns:
        Resultado da função se bem-sucedida

    Raises:
        Exception: Se todas as tentativas falharem
    """
    for tentativa in range(1, max_retries + 1):
        try:
            logger.info(f"Tentativa {tentativa}/{max_retries} (timeout: {timeout}s)")
            return funcao(*args, **kwargs)

        except requests.Timeout as e:
            if tentativa == max_retries:
                logger.error(f"❌ Timeout após {max_retries} tentativas (timeout total: {timeout}s)")
                raise

            # Calcular tempo de espera com backoff exponencial
            wait_time = RETRY_BACKOFF_FACTOR ** (tentativa - 1)
            logger.warning(f"⏳ Timeout na tentativa {tentativa}. Aguardando {wait_time}s antes de tentar novamente...")
            time.sleep(wait_time)

        except requests.ConnectionError as e:
            if tentativa == max_retries:
                logger.error(f"❌ Erro de conexão após {max_retries} tentativas: {e}")
                raise

            wait_time = RETRY_BACKOFF_FACTOR ** (tentativa - 1)
            logger.warning(f"⏳ Erro de conexão na tentativa {tentativa}. Aguardando {wait_time}s antes de tentar novamente...")
            time.sleep(wait_time)

        except Exception as e:
            # Para outros erros, não fazer retry
            logger.error(f"❌ Erro não recuperável: {type(e).__name__}: {e}")
            raise


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

    # Buscar API Key do settings (variável de ambiente) - SEM FALLBACK por segurança
    api_key = getattr(settings, 'ECOMHUB_SELENIUM_API_KEY', None)

    if not api_key:
        logger.error("❌ ECOMHUB_SELENIUM_API_KEY não configurada em settings")
        raise ValueError(
            "API Key não configurada. Configure ECOMHUB_SELENIUM_API_KEY no ambiente."
        )

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


def _buscar_pedidos_ecomhub_requisicao(
    tokens: Dict[str, Any],
    data_inicio: date,
    data_fim: date,
    offset: int = 0,
    country_ids: Optional[List[int]] = None,
    status_list: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Função interna que faz a requisição real à API EcomHub
    (Será chamada pela função com retry logic)
    """
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
        'conditions': urllib.parse.unquote(conditions),
        'search': ''
    }

    # DEBUG: Logar informações da requisição
    logger.info(f"🔍 DEBUG PAGINAÇÃO:")
    logger.info(f"   Offset: {offset}")
    logger.info(f"   Timeout: {REQUEST_TIMEOUT}s")
    logger.info(f"   Conditions: {urllib.parse.unquote(conditions)[:100]}...")

    # Fazer requisição com timeout configurado
    start_time = time.time()
    response = requests.get(
        ECOMHUB_API_BASE,
        params=params,
        cookies=cookies,
        headers=REQUIRED_HEADERS,
        timeout=REQUEST_TIMEOUT
    )
    elapsed_time = time.time() - start_time

    # DEBUG: Logar URL final e tempo de resposta
    logger.info(f"   URL chamada: {response.url}")
    logger.info(f"   ⏱️ Tempo de resposta: {elapsed_time:.2f}s")

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

    logger.info(f"✅ API retornou {len(pedidos)} pedidos (offset={offset})")

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
    (Com retry logic automático para timeouts e erros de conexão)

    GET https://api.ecomhub.app/api/orders

    Args:
        tokens: Dict com token, e_token, refresh_token (do Selenium)
        data_inicio: Data inicial
        data_fim: Data final
        offset: Número da página (0, 1, 2, 3...) - NÃO é offset de registros!
        country_ids: Filtro de países (opcional)
        status_list: Filtro de status (opcional)

    Returns:
        list: Array de pedidos (até 48 por página)

    Raises:
        requests.RequestException: Erro na comunicação
        ValueError: Resposta inválida
    """
    logger.info(f"🚀 Iniciando busca de pedidos da API EcomHub (offset={offset})...")

    try:
        # Executar com retry logic
        pedidos = executar_com_retry(
            _buscar_pedidos_ecomhub_requisicao,
            tokens=tokens,
            data_inicio=data_inicio,
            data_fim=data_fim,
            offset=offset,
            country_ids=country_ids,
            status_list=status_list
        )

        return pedidos

    except requests.Timeout:
        logger.error(f"❌ Timeout definitivo ao buscar pedidos (offset={offset}) após {MAX_RETRIES} tentativas")
        logger.error(f"   Timeout configurado: {REQUEST_TIMEOUT}s por tentativa")
        raise

    except requests.ConnectionError as e:
        logger.error(f"❌ Erro de conexão definitivo com API EcomHub (offset={offset}): {e}")
        raise

    except Exception as e:
        logger.error(f"❌ Erro inesperado ao buscar pedidos (offset={offset}): {type(e).__name__}: {e}")
        raise


def buscar_todos_pedidos_periodo(
    data_inicio: date,
    data_fim: date,
    country_ids: Optional[List[int]] = None,
    status_list: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Busca TODOS os pedidos de um período (com paginação automática)

    Proteções implementadas:
    - Timeout total (TIMEOUT_TOTAL)
    - Limite máximo de páginas (MAX_PAGES)
    - Circuit breaker (MAX_FALHAS_CONSECUTIVAS)

    Args:
        data_inicio: Data inicial
        data_fim: Data final
        country_ids: Filtro de países (opcional)
        status_list: Filtro de status (opcional)

    Returns:
        dict: {
            'status': 'success' | 'error' | 'partial',
            'pedidos': [array de pedidos],
            'total': int,
            'pages_fetched': int,
            'message': str,
            'timeout_atingido': bool,
            'limite_paginas_atingido': bool,
            'circuit_breaker_ativado': bool
        }
    """
    logger.info(f"Buscando todos os pedidos do período {data_inicio} a {data_fim}")

    try:
        # Buscar tokens
        tokens = obter_tokens_selenium()

        # Buscar pedidos com paginação controlada
        todos_pedidos = []
        page = 0
        page_size = 48
        falhas_consecutivas = 0

        # Controle de tempo total
        inicio_operacao = time.time()

        # Flags de controle
        timeout_atingido = False
        limite_paginas_atingido = False
        circuit_breaker_ativado = False

        while True:
            # PROTEÇÃO 1: Verificar timeout total
            tempo_decorrido = time.time() - inicio_operacao
            if tempo_decorrido > TIMEOUT_TOTAL:
                timeout_atingido = True
                logger.warning(
                    f"⏱️ Timeout total atingido ({TIMEOUT_TOTAL}s = {TIMEOUT_TOTAL/60:.1f}min). "
                    f"Páginas processadas: {page + 1}"
                )
                break

            # PROTEÇÃO 2: Verificar limite de páginas
            if page >= MAX_PAGES:
                limite_paginas_atingido = True
                logger.warning(
                    f"📄 Limite de páginas atingido ({MAX_PAGES}). "
                    f"Parando paginação por segurança."
                )
                break

            # PROTEÇÃO 3: Verificar circuit breaker
            if falhas_consecutivas >= MAX_FALHAS_CONSECUTIVAS:
                circuit_breaker_ativado = True
                logger.error(
                    f"🔴 Circuit breaker ativado: {MAX_FALHAS_CONSECUTIVAS} "
                    f"falhas consecutivas. Parando para evitar sobrecarga."
                )
                break

            # Renovar tokens a cada 5 páginas (tokens expiram em ~3 min)
            if page > 0 and page % 5 == 0:
                logger.info(f"Renovando tokens na página {page + 1}...")
                tokens = obter_tokens_selenium()

            # IMPORTANTE: offset é o NÚMERO DA PÁGINA (0, 1, 2...), não offset de registros!
            offset = page
            logger.info(
                f"Buscando página {page + 1} (offset={offset}, "
                f"tempo decorrido: {tempo_decorrido:.1f}s/{TIMEOUT_TOTAL}s)..."
            )

            try:
                pedidos_pagina = buscar_pedidos_ecomhub(
                    tokens=tokens,
                    data_inicio=data_inicio,
                    data_fim=data_fim,
                    offset=offset,
                    country_ids=country_ids,
                    status_list=status_list
                )

                # Reset falhas consecutivas em caso de sucesso
                falhas_consecutivas = 0

            except ValueError as e:
                # Se der erro de token expirado, renovar e tentar novamente
                if "Tokens inválidos ou expirados" in str(e):
                    logger.warning(f"Token expirado na página {page + 1}. Renovando...")
                    tokens = obter_tokens_selenium()
                    try:
                        pedidos_pagina = buscar_pedidos_ecomhub(
                            tokens=tokens,
                            data_inicio=data_inicio,
                            data_fim=data_fim,
                            offset=offset,
                            country_ids=country_ids,
                            status_list=status_list
                        )
                        # Reset falhas consecutivas em caso de sucesso
                        falhas_consecutivas = 0
                    except Exception as retry_error:
                        falhas_consecutivas += 1
                        logger.warning(
                            f"⚠️ Falha {falhas_consecutivas}/{MAX_FALHAS_CONSECUTIVAS} "
                            f"ao tentar novamente após renovar token: {retry_error}"
                        )
                        raise
                else:
                    falhas_consecutivas += 1
                    logger.warning(
                        f"⚠️ Falha {falhas_consecutivas}/{MAX_FALHAS_CONSECUTIVAS}: {e}"
                    )
                    raise

            except Exception as e:
                falhas_consecutivas += 1
                logger.warning(
                    f"⚠️ Falha {falhas_consecutivas}/{MAX_FALHAS_CONSECUTIVAS}: "
                    f"{type(e).__name__}: {e}"
                )
                raise

            # Se retornou vazio, fim da paginação
            if not pedidos_pagina:
                logger.info(f"⛔ Página {page + 1} retornou vazia. Fim da paginação.")
                break

            todos_pedidos.extend(pedidos_pagina)
            logger.info(
                f"✓ Página {page + 1}: {len(pedidos_pagina)} pedidos "
                f"(total acumulado: {len(todos_pedidos)})"
            )

            # Se retornou menos que page_size, é a última página
            if len(pedidos_pagina) < page_size:
                logger.info(
                    f"⛔ Página {page + 1} retornou {len(pedidos_pagina)} pedidos "
                    f"(< {page_size}). Última página."
                )
                break

            # DEBUG: Se retornou exatamente page_size, continuar
            logger.info(
                f"🔄 Página {page + 1} retornou {len(pedidos_pagina)} pedidos "
                f"(= {page_size}). Continuando paginação..."
            )
            page += 1

        # Determinar status final
        if timeout_atingido or limite_paginas_atingido or circuit_breaker_ativado:
            status_final = 'partial'
            mensagem = f'{len(todos_pedidos)} pedidos encontrados (busca interrompida)'
        else:
            status_final = 'success'
            mensagem = f'{len(todos_pedidos)} pedidos encontrados'

        tempo_total = time.time() - inicio_operacao
        logger.info(
            f"Busca concluída: {len(todos_pedidos)} pedidos total em {page + 1} páginas "
            f"(tempo total: {tempo_total:.1f}s)"
        )

        return {
            'status': status_final,
            'pedidos': todos_pedidos,
            'total': len(todos_pedidos),
            'pages_fetched': page + 1,
            'message': mensagem,
            'timeout_atingido': timeout_atingido,
            'limite_paginas_atingido': limite_paginas_atingido,
            'circuit_breaker_ativado': circuit_breaker_ativado,
            'tempo_total_segundos': round(tempo_total, 2)
        }

    except Exception as e:
        logger.error(f"Erro ao buscar pedidos: {e}", exc_info=True)
        return {
            'status': 'error',
            'pedidos': [],
            'total': 0,
            'pages_fetched': 0,
            'message': f'Erro: {str(e)}',
            'timeout_atingido': False,
            'limite_paginas_atingido': False,
            'circuit_breaker_ativado': False
        }
