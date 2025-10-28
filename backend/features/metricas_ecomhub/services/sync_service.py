# backend/features/metricas_ecomhub/services/sync_service.py
import requests
from datetime import datetime, timezone
from django.utils import timezone as django_timezone
from django.db import transaction
from ..models import EcomhubStore, EcomhubOrder, EcomhubStatusHistory, EcomhubAlertConfig, EcomhubUnknownStatus
import logging

logger = logging.getLogger(__name__)

# Status que consideramos "ativos" (não finalizados)
ACTIVE_STATUSES = [
    'processing',
    'preparing_for_shipping',
    'ready_to_ship',
    'shipped',
    'with_courier',
    'out_for_delivery',
    'issue',
    'returning'  # ADICIONADO
]

# Status finalizados (não aparecem no tracking)
FINAL_STATUSES = [
    'delivered',
    'returned',
    'cancelled'
]


def detect_unknown_status(status, order_id):
    """
    Detecta e registra status desconhecidos automaticamente

    Args:
        status: Status encontrado no pedido
        order_id: ID do pedido para exemplo

    Returns:
        bool: True se é um status desconhecido
    """
    if status not in ACTIVE_STATUSES and status not in FINAL_STATUSES:
        unknown, created = EcomhubUnknownStatus.objects.get_or_create(
            status=status,
            defaults={
                'sample_order_id': order_id,
                'first_detected': django_timezone.now()
            }
        )

        if not created:
            unknown.last_seen = django_timezone.now()
            unknown.occurrences_count += 1
            unknown.save(update_fields=['last_seen', 'occurrences_count'])

        logger.warning(f"Status desconhecido detectado: '{status}' no pedido {order_id}")
        return True
    return False

def sync_all_stores():
    """
    Sincroniza pedidos de todas as lojas ativas

    Returns:
        dict: Estatísticas da sincronização
    """
    stores = EcomhubStore.objects.filter(is_active=True)

    if not stores.exists():
        logger.warning("Nenhuma loja ativa encontrada para sincronizar")
        return {
            'success': False,
            'message': 'Nenhuma loja ativa',
            'stores_processed': 0
        }

    stats = {
        'stores_processed': 0,
        'orders_created': 0,
        'orders_updated': 0,
        'status_changes': 0,
        'errors': []
    }

    for store in stores:
        try:
            store_stats = sync_store(store)
            stats['stores_processed'] += 1
            stats['orders_created'] += store_stats['orders_created']
            stats['orders_updated'] += store_stats['orders_updated']
            stats['status_changes'] += store_stats['status_changes']

            # Atualizar last_sync
            store.last_sync = django_timezone.now()
            store.save(update_fields=['last_sync'])

        except Exception as e:
            error_msg = f"Erro ao sincronizar loja {store.name}: {str(e)}"
            logger.error(error_msg)
            stats['errors'].append(error_msg)

    # Contar status desconhecidos não revisados
    unknown_count = EcomhubUnknownStatus.objects.filter(reviewed=False).count()
    stats['unknown_statuses'] = unknown_count
    stats['success'] = True
    return stats

def sync_store(store):
    """
    Sincroniza pedidos de uma loja específica

    Args:
        store: Instância de EcomhubStore

    Returns:
        dict: Estatísticas da sincronização
    """
    logger.info(f"Sincronizando loja: {store.name}")

    stats = {
        'orders_created': 0,
        'orders_updated': 0,
        'status_changes': 0
    }

    # Buscar pedidos da API
    orders_from_api = fetch_orders_from_api(store.token, store.secret)

    if not orders_from_api:
        logger.warning(f"Nenhum pedido retornado para loja {store.name}")
        return stats

    # Filtrar apenas pedidos ativos
    active_orders = [o for o in orders_from_api if o.get('status') in ACTIVE_STATUSES]

    logger.info(f"Processando {len(active_orders)} pedidos ativos de {len(orders_from_api)} totais")

    # Processar cada pedido
    for order_data in active_orders:
        try:
            result = process_order(store, order_data)
            if result['created']:
                stats['orders_created'] += 1
            elif result['updated']:
                stats['orders_updated'] += 1
            if result['status_changed']:
                stats['status_changes'] += 1
        except Exception as e:
            logger.error(f"Erro ao processar pedido {order_data.get('id')}: {str(e)}")

    return stats

def fetch_orders_from_api(token, secret):
    """
    Busca pedidos da API ECOMHUB

    Args:
        token: Token da API
        secret: Secret da API

    Returns:
        list: Lista de pedidos
    """
    try:
        response = requests.get(
            'https://api.ecomhub.app/apps/orders',
            params={
                'token': token,
                'orderBy': 'updatedAt',
                'skip': 0
            },
            headers={
                'Secret': secret,
                'Content-Type': 'application/json'
            },
            timeout=30
        )

        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"API retornou status {response.status_code}")
            return []
    except Exception as e:
        logger.error(f"Erro ao buscar pedidos da API: {str(e)}")
        return []

@transaction.atomic
def process_order(store, order_data):
    """
    Processa um pedido: cria novo ou atualiza existente

    Args:
        store: Instância de EcomhubStore
        order_data: Dados do pedido da API

    Returns:
        dict: {created: bool, updated: bool, status_changed: bool}
    """
    order_id = order_data.get('id')
    current_status = order_data.get('status')
    now = django_timezone.now()

    # Detectar status desconhecido
    detect_unknown_status(current_status, order_id)

    # Extrair dados do cliente e produto
    customer_name = extract_customer_name(order_data)
    customer_email = extract_customer_email(order_data)
    product_name = extract_product_names(order_data)

    # Buscar país
    country_id = order_data.get('shippingCountry_id')
    country_name = get_country_name(country_id)

    # Tentar buscar pedido existente
    try:
        order = EcomhubOrder.objects.get(order_id=order_id, store=store)

        # Pedido existe - verificar mudança de status
        if order.status != current_status:
            # STATUS MUDOU!
            old_status = order.status
            duration_hours = (now - order.status_since).total_seconds() / 3600

            # Criar histórico
            EcomhubStatusHistory.objects.create(
                order=order,
                status_from=old_status,
                status_to=current_status,
                duration_in_previous_status_hours=duration_hours
            )

            # Atualizar pedido
            order.previous_status = old_status
            order.status = current_status
            order.status_since = now
            order.time_in_status_hours = 0

            logger.info(f"Pedido {order_id}: {old_status} → {current_status} (ficou {duration_hours:.1f}h)")

            status_changed = True
        else:
            # Status igual - apenas atualizar tempo
            order.time_in_status_hours = (now - order.status_since).total_seconds() / 3600
            status_changed = False

        # Atualizar outros campos
        order.price = order_data.get('price', 0)
        order.customer_name = customer_name
        order.customer_email = customer_email
        order.product_name = product_name
        order.country_id = country_id
        order.country_name = country_name

        # Atualizar custos
        update_costs(order, order_data)

        # Calcular alert_level
        order.alert_level = calculate_alert_level(order.status, order.time_in_status_hours)

        order.save()

        return {'created': False, 'updated': True, 'status_changed': status_changed}

    except EcomhubOrder.DoesNotExist:
        # Pedido novo - criar
        order = EcomhubOrder.objects.create(
            order_id=order_id,
            store=store,
            country_id=country_id,
            country_name=country_name,
            price=order_data.get('price', 0),
            date=parse_datetime(order_data.get('date')),
            status=current_status,
            shipping_postal_code=order_data.get('shippingPostalCode', ''),
            customer_name=customer_name,
            customer_email=customer_email,
            product_name=product_name,
            status_since=now,
            time_in_status_hours=0,
            previous_status='',
            alert_level='normal',
            # Custos
            cost_commission=order_data.get('costCommission'),
            cost_commission_return=order_data.get('costCommissionReturn'),
            cost_courier=order_data.get('costCourier'),
            cost_courier_return=order_data.get('costCourierReturn'),
            cost_payment_method=order_data.get('costPaymentMethod'),
            cost_warehouse=order_data.get('costWarehouse'),
            cost_warehouse_return=order_data.get('costWarehouseReturn'),
        )

        logger.info(f"Novo pedido criado: {order_id} - {current_status}")

        return {'created': True, 'updated': False, 'status_changed': False}

def calculate_alert_level(status, time_in_status_hours):
    """
    Calcula o nível de alerta baseado no tempo no status

    Args:
        status: Status atual
        time_in_status_hours: Horas no status atual

    Returns:
        str: 'normal', 'yellow', 'red', 'critical'
    """
    try:
        config = EcomhubAlertConfig.objects.get(status=status)
    except EcomhubAlertConfig.DoesNotExist:
        # Se não há config, usar valores padrão
        return 'normal' if time_in_status_hours < 168 else 'red'

    if time_in_status_hours >= config.critical_threshold_hours:
        return 'critical'
    elif time_in_status_hours >= config.red_threshold_hours:
        return 'red'
    elif time_in_status_hours >= config.yellow_threshold_hours:
        return 'yellow'
    else:
        return 'normal'

# Funções auxiliares

def extract_customer_name(order_data):
    """Extrai nome do cliente dos dados do pedido"""
    # API não retorna customer direto, tentar extrair de ordersItems se houver
    return order_data.get('customer_name', '') or ''

def extract_customer_email(order_data):
    """Extrai email do cliente dos dados do pedido"""
    return order_data.get('customer_email', '') or ''

def extract_product_names(order_data):
    """Extrai nomes dos produtos concatenados"""
    items = order_data.get('ordersItems', [])
    if not items:
        return ''

    product_names = []
    for item in items:
        pv = item.get('productsVariants', {})
        product = pv.get('products', {})
        name = product.get('name', '')
        attributes = pv.get('attributes', '')

        if name:
            full_name = f"{name} ({attributes})" if attributes else name
            product_names.append(full_name)

    return ', '.join(product_names)

def get_country_name(country_id):
    """Retorna nome do país pelo ID"""
    # Mapeamento local dos países principais
    COUNTRIES = {
        164: 'Spain', 41: 'Croatia', 66: 'Greece', 82: 'Italy',
        142: 'Romania', 44: 'Czechia', 139: 'Poland'
    }
    return COUNTRIES.get(country_id, f'Country {country_id}')

def parse_datetime(date_str):
    """Converte string de data para datetime"""
    if not date_str:
        return django_timezone.now()
    try:
        # API retorna formato ISO
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt
    except:
        return django_timezone.now()

def update_costs(order, order_data):
    """Atualiza custos do pedido"""
    order.cost_commission = order_data.get('costCommission')
    order.cost_commission_return = order_data.get('costCommissionReturn')
    order.cost_courier = order_data.get('costCourier')
    order.cost_courier_return = order_data.get('costCourierReturn')
    order.cost_payment_method = order_data.get('costPaymentMethod')
    order.cost_warehouse = order_data.get('costWarehouse')
    order.cost_warehouse_return = order_data.get('costWarehouseReturn')
