# backend/features/metricas_ecomhub/services/efetividade_v2_service.py
"""
Serviço para Efetividade V2 - Chamadas diretas à API ECOMHUB

Este serviço busca dados diretamente da API oficial ECOMHUB (sem Selenium),
processa pedidos individuais e calcula métricas de efetividade por produto.

Diferente da V1 que usa scraping web, a V2 integra com lojas cadastradas
e usa tokens/secrets do modelo EcomhubStore.
"""

import requests
import logging
from datetime import datetime, date
from collections import defaultdict
from typing import List, Dict, Any, Optional
from django.utils import timezone

logger = logging.getLogger(__name__)

# ===========================================
# CONSTANTES
# ===========================================

API_BASE_URL = "https://api.ecomhub.app/apps"
REQUEST_TIMEOUT = 30  # segundos

# Mapeamento de status (baseado em dados reais)
STATUS_ATIVOS = [
    'processing',
    'preparing_for_shipping',
    'ready_to_ship',
    'shipped',
    'with_courier',
    'out_for_delivery',
    'issue',
    'returning'
]

STATUS_FINAIS = [
    'delivered',
    'returned',
    'cancelled'
]

# Mapeamento de países
PAISES = {
    164: 'Spain',
    41: 'Croatia',
    66: 'Greece',
    82: 'Italy',
    142: 'Romania',
    44: 'Czechia',
    139: 'Poland'
}


# ===========================================
# FUNÇÕES DE BUSCA NA API ECOMHUB
# ===========================================

def fetch_orders_from_ecomhub_api(
    token: str,
    secret: str,
    data_inicio: date,
    data_fim: date,
    country_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Busca pedidos da API ECOMHUB no período especificado

    CORREÇÃO: Implementa paginação para buscar TODOS os pedidos (API limita 500 por requisição)

    Args:
        token: Token de autenticação da loja
        secret: Secret da loja
        data_inicio: Data inicial do período
        data_fim: Data final do período
        country_id: ID do país (opcional) - filtra apenas pedidos deste país

    Returns:
        list: Pedidos brutos da API (formato JSON)

    Raises:
        requests.RequestException: Erro na comunicação com a API
    """
    logger.info(f"Buscando pedidos da API ECOMHUB ({data_inicio} a {data_fim})")

    try:
        # Buscar TODOS os pedidos com paginação
        all_orders = []
        skip = 0
        page_size = 500
        max_pages = 20  # Limite de segurança: até 10.000 pedidos

        while True:
            response = requests.get(
                f"{API_BASE_URL}/orders",
                params={
                    'token': token,
                    'orderBy': 'date',
                    'skip': skip
                },
                headers={
                    'Secret': secret,
                    'Content-Type': 'application/json'
                },
                timeout=REQUEST_TIMEOUT
            )

            if response.status_code != 200:
                # Se primeira página falha, lança exceção
                if skip == 0:
                    if response.status_code == 401:
                        logger.error("API ECOMHUB: Credenciais inválidas (401)")
                        raise ValueError("Token ou Secret inválido")
                    elif response.status_code == 403:
                        logger.error("API ECOMHUB: Acesso negado (403)")
                        raise ValueError("Sem permissão para acessar esta loja")
                    else:
                        logger.error(f"API ECOMHUB retornou status {response.status_code}: {response.text}")
                        raise requests.RequestException(f"Erro na API: {response.status_code}")
                # Se páginas seguintes falham, usa o que já coletou
                break

            orders = response.json()

            # Se retornou vazio, fim da paginação
            if not orders or len(orders) == 0:
                break

            all_orders.extend(orders)
            logger.info(f"Página {skip//page_size + 1}: {len(orders)} pedidos (total acumulado: {len(all_orders)})")

            # Se retornou menos que page_size, é a última página
            if len(orders) < page_size:
                break

            # Próxima página
            skip += page_size

            # Limite de segurança
            if skip >= (max_pages * page_size):
                logger.warning(f"Atingido limite máximo de {max_pages} páginas. Interrompendo paginação.")
                break

        logger.info(f"API retornou {len(all_orders)} pedidos total após paginação")

        # Filtrar por período
        orders_filtrados = []
        for order in all_orders:
            try:
                # Converter data do pedido
                order_date_str = order.get('date', '')
                order_date = datetime.fromisoformat(
                    order_date_str.replace('Z', '+00:00')
                ).date()

                # Filtrar por período
                if data_inicio <= order_date <= data_fim:
                    # Filtrar por país (se especificado)
                    if country_id is None or order.get('shippingCountry_id') == country_id:
                        orders_filtrados.append(order)
            except Exception as e:
                logger.warning(f"Erro ao processar data do pedido {order.get('id')}: {e}")
                continue

        logger.info(f"Após filtro: {len(orders_filtrados)} pedidos no período")
        return orders_filtrados

    except requests.Timeout:
        logger.error("Timeout ao buscar pedidos da API ECOMHUB")
        raise

    except requests.ConnectionError as e:
        logger.error(f"Erro de conexão com API ECOMHUB: {e}")
        raise

    except Exception as e:
        logger.error(f"Erro inesperado ao buscar pedidos: {e}")
        raise


# ===========================================
# FUNÇÕES DE PROCESSAMENTO
# ===========================================

def extrair_produtos_do_pedido(order_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extrai produtos de um pedido, tratando múltiplos items

    IMPORTANTE: ordersItems é um ARRAY - um pedido pode ter vários produtos!

    Args:
        order_data: Dados brutos do pedido da API

    Returns:
        list: Lista de dicts com informações de cada produto do pedido
              [{produto, status, order_id, date, country_id, price}, ...]
    """
    produtos = []
    order_id = order_data.get('id')
    status = order_data.get('status')
    date = order_data.get('date')
    country_id = order_data.get('shippingCountry_id')
    price = order_data.get('price', 0)

    # Iterar sobre todos os items do pedido
    for item in order_data.get('ordersItems', []):
        try:
            # Navegar na estrutura aninhada
            pv = item.get('productsVariants', {})
            product = pv.get('products', {})

            # Extrair nome do produto
            produto_nome = product.get('name', 'Sem Nome')

            # Opcionalmente, incluir atributos (variante)
            attributes = pv.get('attributes', '')

            # Decidir se inclui atributos no nome
            if attributes and attributes != produto_nome:
                produto_nome_completo = f"{produto_nome} ({attributes})"
            else:
                produto_nome_completo = produto_nome

            produtos.append({
                'produto': produto_nome_completo,
                'produto_base': produto_nome,  # Nome sem atributos
                'attributes': attributes,
                'status': status,
                'order_id': order_id,
                'date': date,
                'country_id': country_id,
                'price': float(price) if price else 0
            })

        except Exception as e:
            logger.warning(f"Erro ao extrair produto do pedido {order_id}: {e}")
            continue

    # Se não encontrou nenhum produto, logar aviso
    if not produtos:
        logger.warning(f"Pedido {order_id} não possui items (ordersItems vazio)")

    return produtos


def calcular_efetividade(pedidos_raw: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calcula métricas de efetividade por produto

    Args:
        pedidos_raw: Lista de pedidos brutos da API

    Returns:
        dict: {
            'visualizacao_otimizada': [...],
            'visualizacao_total': [...],
            'stats_total': {...}
        }
    """
    logger.info(f"Calculando efetividade de {len(pedidos_raw)} pedidos")

    # Agrupar por (produto, país) para manter informação de país
    produtos = defaultdict(lambda: {
        'Totais': 0,
        'delivered': 0,
        'returned': 0,
        'cancelled': 0,
        'issue': 0,
        'shipped': 0,
        'with_courier': 0,
        'out_for_delivery': 0,
        'ready_to_ship': 0,
        'preparing_for_shipping': 0,
        'processing': 0,
        'returning': 0,
        'country_id': None
    })

    # Processar cada pedido
    for pedido in pedidos_raw:
        items = extrair_produtos_do_pedido(pedido)

        for item in items:
            produto_nome = item['produto']
            status = item['status']
            price = item['price']
            country_id = item.get('country_id')

            # Chave única: produto + país
            chave = (produto_nome, country_id)

            # Contabilizar
            produtos[chave]['Totais'] += 1
            produtos[chave]['country_id'] = country_id

            # Contar por status
            if status in produtos[chave]:
                produtos[chave][status] += 1

    # Gerar visualização otimizada
    visualizacao_otimizada = []
    total_vendas = 0
    total_entregues = 0

    for chave, counts in produtos.items():
        produto_nome, country_id = chave

        # Obter nome do país
        pais_nome = PAISES.get(country_id, f"ID {country_id}" if country_id else "N/A")

        entregues = counts['delivered']
        totais = counts['Totais']
        finalizados = counts['delivered'] + counts['returned'] + counts['cancelled'] + counts['issue']
        em_transito = (
            counts['shipped'] +
            counts['with_courier'] +
            counts['out_for_delivery'] +
            counts['ready_to_ship'] +
            counts['preparing_for_shipping'] +
            counts['processing']
        )
        devolucao = counts['returning'] + counts['returned'] + counts['issue']
        problemas = counts.get('issue', 0)
        cancelados = counts['cancelled']

        # Calcular percentuais
        pct_a_caminho = (em_transito / totais * 100) if totais > 0 else 0
        pct_devolvidos = (devolucao / totais * 100) if totais > 0 else 0
        efetividade_parcial = (entregues / finalizados * 100) if finalizados > 0 else 0
        efetividade_total = (entregues / totais * 100) if totais > 0 else 0

        visualizacao_otimizada.append({
            'Produto': produto_nome,
            'Pais': pais_nome,
            'Totais': totais,
            'Entregues': entregues,
            'Finalizados': finalizados,
            'Em_Transito': em_transito,
            'Problemas': problemas,
            'Devolucao': devolucao,
            'Cancelados': cancelados,
            'Pct_A_Caminho': f"{pct_a_caminho:.1f}%",
            'Pct_Devolvidos': f"{pct_devolvidos:.1f}%",
            'Efetividade_Parcial': f"{efetividade_parcial:.1f}%",
            'Efetividade_Total': f"{efetividade_total:.1f}%",
            # Campos numéricos para ordenação
            '_efetividade_total_num': efetividade_total,
            '_efetividade_parcial_num': efetividade_parcial
        })

        total_vendas += totais
        total_entregues += entregues

    # Ordenar por efetividade total (decrescente)
    visualizacao_otimizada.sort(key=lambda x: x['_efetividade_total_num'], reverse=True)

    # Adicionar linha TOTAL com somas de todas as colunas
    if visualizacao_otimizada:
        total_finalizados = sum(item['Finalizados'] for item in visualizacao_otimizada)
        total_em_transito = sum(item['Em_Transito'] for item in visualizacao_otimizada)
        total_problemas = sum(item['Problemas'] for item in visualizacao_otimizada)
        total_devolucao = sum(item['Devolucao'] for item in visualizacao_otimizada)
        total_cancelados = sum(item['Cancelados'] for item in visualizacao_otimizada)

        # Calcular percentuais totais
        total_pct_a_caminho = (total_em_transito / total_vendas * 100) if total_vendas > 0 else 0
        total_pct_devolvidos = (total_devolucao / total_vendas * 100) if total_vendas > 0 else 0
        total_efetividade_parcial = (total_entregues / total_finalizados * 100) if total_finalizados > 0 else 0
        total_efetividade_total = (total_entregues / total_vendas * 100) if total_vendas > 0 else 0

        visualizacao_otimizada.append({
            'Produto': 'Total',
            'Pais': '-',
            'Totais': total_vendas,
            'Entregues': total_entregues,
            'Finalizados': total_finalizados,
            'Em_Transito': total_em_transito,
            'Problemas': total_problemas,
            'Devolucao': total_devolucao,
            'Cancelados': total_cancelados,
            'Pct_A_Caminho': f"{total_pct_a_caminho:.1f}%",
            'Pct_Devolvidos': f"{total_pct_devolvidos:.1f}%",
            'Efetividade_Parcial': f"{total_efetividade_parcial:.1f}%",
            'Efetividade_Total': f"{total_efetividade_total:.1f}%",
            '_efetividade_total_num': total_efetividade_total,
            '_efetividade_parcial_num': total_efetividade_parcial
        })

    # Estatísticas gerais
    efetividade_media = (total_entregues / total_vendas * 100) if total_vendas > 0 else 0

    melhor_produto = max(visualizacao_otimizada, key=lambda x: x['_efetividade_total_num']) if visualizacao_otimizada else None
    pior_produto = min(visualizacao_otimizada, key=lambda x: x['_efetividade_total_num']) if visualizacao_otimizada else None

    stats_total = {
        'total_produtos': len(produtos),
        'total_vendas': total_vendas,
        'total_entregues': total_entregues,
        'efetividade_media': round(efetividade_media, 2),
        'melhor_produto': {
            'nome': melhor_produto['Produto'],
            'efetividade': melhor_produto['Efetividade_Total']
        } if melhor_produto else None,
        'pior_produto': {
            'nome': pior_produto['Produto'],
            'efetividade': pior_produto['Efetividade_Total']
        } if pior_produto else None
    }

    logger.info(f"Processados {len(produtos)} produtos únicos")

    return {
        'visualizacao_otimizada': visualizacao_otimizada,
        'visualizacao_total': _gerar_visualizacao_total(produtos),
        'stats_total': stats_total
    }


def _gerar_visualizacao_total(produtos: Dict[str, Dict]) -> List[Dict[str, Any]]:
    """
    Gera visualização detalhada com todos os status separados

    Args:
        produtos: Dict de produtos processados

    Returns:
        list: Visualização expandida com cada status em coluna separada
    """
    visualizacao_total = []

    for produto_nome, counts in produtos.items():
        visualizacao_total.append({
            'Produto': produto_nome,
            'Totais': counts['Totais'],
            'Processing': counts['processing'],
            'Preparing_For_Shipping': counts['preparing_for_shipping'],
            'Ready_To_Ship': counts['ready_to_ship'],
            'Shipped': counts['shipped'],
            'With_Courier': counts['with_courier'],
            'Out_For_Delivery': counts['out_for_delivery'],
            'Delivered': counts['delivered'],
            'Returning': counts['returning'],
            'Returned': counts['returned'],
            'Cancelled': counts['cancelled'],
            'Issue': counts.get('issue', 0)
        })

    # Ordenar por totais
    visualizacao_total.sort(key=lambda x: x['Totais'], reverse=True)

    # Adicionar linha TOTAL com somas de todas as colunas
    if visualizacao_total:
        total_row = {
            'Produto': 'Total',
            'Totais': sum(item['Totais'] for item in visualizacao_total),
            'Processing': sum(item['Processing'] for item in visualizacao_total),
            'Preparing_For_Shipping': sum(item['Preparing_For_Shipping'] for item in visualizacao_total),
            'Ready_To_Ship': sum(item['Ready_To_Ship'] for item in visualizacao_total),
            'Shipped': sum(item['Shipped'] for item in visualizacao_total),
            'With_Courier': sum(item['With_Courier'] for item in visualizacao_total),
            'Out_For_Delivery': sum(item['Out_For_Delivery'] for item in visualizacao_total),
            'Delivered': sum(item['Delivered'] for item in visualizacao_total),
            'Returning': sum(item['Returning'] for item in visualizacao_total),
            'Returned': sum(item['Returned'] for item in visualizacao_total),
            'Cancelled': sum(item['Cancelled'] for item in visualizacao_total),
            'Issue': sum(item['Issue'] for item in visualizacao_total)
        }
        visualizacao_total.append(total_row)

    return visualizacao_total


# ===========================================
# FUNÇÃO PRINCIPAL
# ===========================================

def processar_efetividade_v2(
    store_ids: List[str],
    data_inicio: date,
    data_fim: date
) -> Dict[str, Any]:
    """
    Processa efetividade para uma ou múltiplas lojas

    Args:
        store_ids: Lista de UUIDs de lojas (ou lista vazia para todas)
        data_inicio: Data inicial
        data_fim: Data final

    Returns:
        dict: {
            'status': 'success' | 'error',
            'dados_processados': {...},
            'estatisticas': {...},
            'lojas_processadas': [...],
            'message': '...'
        }
    """
    from ..models import EcomhubStore

    logger.info(f"Processando efetividade V2: {len(store_ids)} lojas")

    # Buscar lojas do banco
    if store_ids:
        lojas = EcomhubStore.objects.filter(id__in=store_ids, is_active=True)
    else:
        lojas = EcomhubStore.objects.filter(is_active=True)

    if not lojas.exists():
        return {
            'status': 'error',
            'message': 'Nenhuma loja ativa encontrada',
            'lojas_processadas': []
        }

    # Buscar pedidos de cada loja
    todos_pedidos = []
    lojas_processadas = []

    for loja in lojas:
        try:
            pedidos = fetch_orders_from_ecomhub_api(
                token=loja.token,
                secret=loja.secret,
                data_inicio=data_inicio,
                data_fim=data_fim,
                country_id=None  # Buscar todos os países da loja
            )

            todos_pedidos.extend(pedidos)
            lojas_processadas.append({
                'id': str(loja.id),
                'name': loja.name,
                'country': loja.country_name,
                'pedidos_encontrados': len(pedidos)
            })

            logger.info(f"Loja {loja.name}: {len(pedidos)} pedidos")

        except Exception as e:
            logger.error(f"Erro ao processar loja {loja.name}: {e}")
            lojas_processadas.append({
                'id': str(loja.id),
                'name': loja.name,
                'erro': str(e)
            })

    # Processar todos os pedidos juntos
    if not todos_pedidos:
        return {
            'status': 'success',
            'message': 'Nenhum pedido encontrado no período',
            'dados_processados': {
                'visualizacao_otimizada': [],
                'visualizacao_total': [],
                'stats_total': {}
            },
            'estatisticas': {},
            'lojas_processadas': lojas_processadas
        }

    # Calcular efetividade
    resultado = calcular_efetividade(todos_pedidos)

    return {
        'status': 'success',
        'message': f'{len(todos_pedidos)} pedidos processados com sucesso',
        'dados_processados': resultado,
        'estatisticas': resultado['stats_total'],
        'lojas_processadas': lojas_processadas,
        'dados_brutos': todos_pedidos  # Incluir para salvar se necessário
    }
