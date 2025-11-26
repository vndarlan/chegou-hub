"""
Background Jobs para coleta assíncrona PrimeCOD
"""
import logging
import time
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from django.core.cache import cache
from django.contrib.auth.models import User
from django.utils import timezone
from .clients.primecod_client import PrimeCODClient, PrimeCODAPIError
from .models import AnalisePrimeCOD, PrimeCODCatalogProduct, PrimeCODCatalogSnapshot

logger = logging.getLogger(__name__)

def coletar_orders_primecod_async(
    user_id: int,
    data_inicio: str,
    data_fim: str,
    pais_filtro: Optional[str] = None,
    max_paginas: int = 1000,  # ⚡ ULTRA-OTIMIZADO: Suporte completo a 1000+ páginas
    nome_analise: Optional[str] = None,
    job_id: Optional[str] = None,
    timeout_limite: int = 20 * 60  # 20 minutos de limite seguro (10 min buffer)
) -> Dict:
    """
    Job assíncrono para coletar orders PrimeCOD sem timeout
    
    Args:
        user_id: ID do usuário que solicitou
        data_inicio: Data início filtro
        data_fim: Data fim filtro  
        pais_filtro: País para filtrar
        max_paginas: Máximo de páginas
        nome_analise: Nome para salvar análise
        job_id: ID do job RQ para tracking
        
    Returns:
        Dict com resultado da coleta
    """
    
    # Cache key para progresso
    progress_key = f"primecod_job_progress_{job_id}" if job_id else None
    
    try:
        # Atualizar progresso inicial
        if progress_key:
            cache.set(progress_key, {
                'status': 'iniciando',
                'progresso': 0,
                'paginas_processadas': 0,
                'orders_coletados': 0,
                'tempo_decorrido': 0,
                'message': 'Inicializando cliente PrimeCOD...'
            }, timeout=1800)  # 30 minutos
        
        logger.info(f"🚀 Iniciando coleta assíncrona PrimeCOD para usuário {user_id}")
        
        # Verificar usuário
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise Exception(f"Usuário {user_id} não encontrado")
        
        # Inicializar cliente
        client = PrimeCODClient()
        
        # Configurar coleta SEM timeouts agressivos
        date_range = {
            'start': data_inicio,
            'end': data_fim
        }
        
        logger.info(f"📊 Configuração da coleta:")
        logger.info(f"   Usuário: {user.username}")
        logger.info(f"   Período: {data_inicio} até {data_fim}")
        logger.info(f"   País: {pais_filtro or 'Todos'}")
        logger.info(f"   Max páginas: {max_paginas}")
        
        # Callback para atualizar progresso
        def update_progress(pages_processed: int, orders_collected: int, elapsed_time: float, total_pages: Optional[int] = None):
            if progress_key:
                progress_percent = 0
                if total_pages and total_pages > 0:
                    progress_percent = min((pages_processed / min(total_pages, max_paginas)) * 100, 100)
                
                cache.set(progress_key, {
                    'status': 'coletando',
                    'progresso': progress_percent,
                    'paginas_processadas': pages_processed,
                    'orders_coletados': orders_collected,
                    'tempo_decorrido': elapsed_time,
                    'total_paginas': total_pages,
                    'max_paginas': max_paginas,
                    'message': f'Coletando página {pages_processed}... ({orders_collected} orders coletados)'
                }, timeout=1800)
        
        # Coletar orders com callback de progresso E limite de tempo
        start_time = time.time()
        
        # Limite de tempo inteligente (buffer maior para segurança)
        tempo_limite = timeout_limite  # 20 minutos por padrão com buffer
        
        # Wrapper de progresso com timeout inteligente
        def progress_with_timeout(pages_processed: int, orders_collected: int, elapsed_time: float, total_pages: Optional[int] = None):
            # Verificar se estamos próximos do timeout
            if elapsed_time > tempo_limite:
                logger.warning(f"[TIMEOUT] Timeout inteligente ativado após {elapsed_time:.1f}s (limite: {tempo_limite}s)")
                logger.warning(f"[TIMEOUT] Coletados {orders_collected} orders em {pages_processed} páginas até agora")
                raise TimeoutError(f"Timeout inteligente: {elapsed_time:.1f}s > {tempo_limite}s")
            
            # Callback normal de progresso
            update_progress(pages_processed, orders_collected, elapsed_time, total_pages)
        
        # Coletar orders com timeout inteligente
        try:
            resultado = client.get_orders_with_progress(
                page=1,
                date_range=date_range,
                max_pages=max_paginas,
                country_filter=pais_filtro,
                progress_callback=progress_with_timeout,
                timeout_limite=tempo_limite
            )
        except TimeoutError as e:
            # Timeout inteligente: retornar dados parciais
            logger.warning(f"[TIMEOUT] Job interrompido por timeout inteligente: {str(e)}")
            logger.warning(f"[TIMEOUT] Tentando recuperar dados parciais...")
            
            # Simular resultado parcial (API pode ter coletado dados antes do timeout)
            resultado = {
                'orders': [],
                'total_orders': 0,
                'pages_processed': 0,
                'status': 'timeout_parcial',
                'timeout_reason': str(e)
            }
        
        end_time = time.time()
        duration = end_time - start_time
        
        logger.info(f"✅ Coleta assíncrona finalizada:")
        logger.info(f"   Duração: {duration:.1f}s ({duration/60:.1f} min)")
        logger.info(f"   Orders coletados: {resultado['total_orders']}")
        logger.info(f"   Páginas processadas: {resultado['pages_processed']}")
        
        # Atualizar progresso final
        if progress_key:
            cache.set(progress_key, {
                'status': 'processando',
                'progresso': 95,
                'paginas_processadas': resultado['pages_processed'],
                'orders_coletados': resultado['total_orders'],
                'tempo_decorrido': duration,
                'message': 'Processando dados coletados...'
            }, timeout=1800)
        
        # Processar dados
        orders_processados = client.process_orders_data(
            orders=resultado['orders'],
            pais_filtro=None  # Filtro já aplicado
        )
        
        # Salvar análise se nome foi fornecido
        analise_id = None
        if nome_analise:
            try:
                analise = AnalisePrimeCOD.objects.create(
                    nome=nome_analise,
                    tipo='PRIMECOD_API_ASYNC',
                    criado_por=user,
                    dados_processados=orders_processados['dados_processados'],
                    dados_orders=resultado['orders']  # Manter dados originais
                )
                analise_id = analise.id
                logger.info(f"📁 Análise '{nome_analise}' salva com ID {analise_id}")
            except Exception as e:
                logger.error(f"❌ Erro ao salvar análise: {str(e)}")
        
        # Resultado final
        resultado_final = {
            'status': 'success',
            'job_id': job_id,
            'user_id': user_id,
            'duracao': duration,
            'analise_id': analise_id,
            'dados_brutos': {
                'total_orders_raw': resultado.get('total_orders_raw', resultado['total_orders']),
                'total_orders_filtered': resultado['total_orders'],
                'pages_processed': resultado['pages_processed'],
                'date_range_applied': resultado['date_range_applied'],
                'country_filter_applied': resultado.get('country_filter_applied'),
                'data_source': 'async_job'
            },
            'dados_processados': orders_processados['dados_processados'],
            'estatisticas': orders_processados['estatisticas'],
            'status_nao_mapeados': orders_processados['status_nao_mapeados'],
            'message': f"Coleta assíncrona concluída em {duration/60:.1f} min: {resultado['total_orders']} orders processados",
            'timeout_aplicado': duration > tempo_limite,
            'dados_parciais': resultado.get('status') == 'timeout_parcial'
        }
        
        # Atualizar progresso final
        if progress_key:
            cache.set(progress_key, {
                'status': 'concluido',
                'progresso': 100,
                'paginas_processadas': resultado['pages_processed'],
                'orders_coletados': resultado['total_orders'],
                'tempo_decorrido': duration,
                'analise_id': analise_id,
                'message': f'Concluído! {resultado["total_orders"]} orders em {duration/60:.1f} min',
                'resultado': resultado_final
            }, timeout=3600)  # Manter resultado por 1 hora
        
        logger.info(f"🎯 Job assíncrono finalizado com sucesso para {user.username}")
        return resultado_final
        
    except PrimeCODAPIError as e:
        error_msg = f"Erro na API PrimeCOD: {str(e)}"
        logger.error(error_msg)
        
        if progress_key:
            cache.set(progress_key, {
                'status': 'erro',
                'progresso': 0,
                'message': error_msg,
                'error': str(e)
            }, timeout=3600)
        
        return {
            'status': 'error',
            'job_id': job_id,
            'user_id': user_id,
            'message': error_msg
        }
        
    except Exception as e:
        error_msg = f"Erro inesperado: {str(e)}"
        logger.error(error_msg)

        if progress_key:
            cache.set(progress_key, {
                'status': 'erro',
                'progresso': 0,
                'message': error_msg,
                'error': str(e)
            }, timeout=3600)

        return {
            'status': 'error',
            'job_id': job_id,
            'user_id': user_id,
            'message': error_msg
        }


def sync_primecod_catalog() -> Dict:
    """
    Sincroniza catálogo PrimeCOD automaticamente.

    Executa diariamente às 6h da manhã (horário de Brasília).

    Fluxo:
    1. Busca todas as páginas da API do catálogo PrimeCOD
    2. Para cada produto:
       - Se não existe (by primecod_id): criar como is_new=True
       - Se existe: atualizar dados
    3. Criar snapshot diário para todos os produtos
    4. Marcar is_new=False para produtos > 24h

    Returns:
        Dict com resultado da sincronização
    """

    logger.info("🔄 [SYNC CATALOG] Iniciando sincronização automática do catálogo PrimeCOD")
    start_time = time.time()

    try:
        # Validar token antes de inicializar cliente
        from .models import PrimeCODConfig
        token = PrimeCODConfig.get_token()

        if not token:
            error_msg = (
                "Token da API PrimeCOD não configurado. "
                "Configure em: Fornecedor > PrimeCOD > Configuração"
            )
            logger.error(f"❌ [SYNC CATALOG] {error_msg}")
            return {
                'status': 'error',
                'message': error_msg,
                'error_type': 'config_error'
            }

        # Inicializar cliente PrimeCOD
        client = PrimeCODClient()
        logger.info("✅ [SYNC CATALOG] Cliente PrimeCOD inicializado com sucesso")

        # Buscar todas as páginas do catálogo
        logger.info("📡 [SYNC CATALOG] Buscando produtos da API PrimeCOD...")

        all_products = []
        current_page = 1

        # URL da API de catálogo
        catalog_url = f"{client.base_url}/catalog/products"

        while True:
            logger.info(f"📄 [SYNC CATALOG] Buscando página {current_page}...")

            try:
                # Fazer requisição POST para o catálogo
                response = client._make_request('POST', catalog_url, json={"page": current_page})
                data = response.json()

                # Extrair produtos da resposta
                products = data.get('data', [])

                if not products:
                    logger.info(f"✅ [SYNC CATALOG] Página {current_page} sem produtos - fim da coleta")
                    break

                logger.info(f"✅ [SYNC CATALOG] Página {current_page}: {len(products)} produtos coletados")
                all_products.extend(products)

                # Verificar paginação
                current_page_api = data.get('current_page', current_page)
                last_page = data.get('last_page', 1)

                if current_page_api >= last_page:
                    logger.info(f"✅ [SYNC CATALOG] Última página ({last_page}) alcançada")
                    break

                current_page += 1

            except Exception as e:
                logger.error(f"❌ [SYNC CATALOG] Erro ao buscar página {current_page}: {str(e)}")
                break

        logger.info(f"✅ [SYNC CATALOG] Total de produtos coletados: {len(all_products)}")

        # Estatísticas
        products_created = 0
        products_updated = 0
        products_error = 0
        snapshots_created = 0

        # Data de hoje para snapshots
        today = timezone.now().date()

        # Processar cada produto
        for product_data in all_products:
            try:
                primecod_id = product_data.get('id')

                if not primecod_id:
                    logger.warning(f"⚠️ [SYNC CATALOG] Produto sem ID, pulando: {product_data}")
                    products_error += 1
                    continue

                # Extrair dados do produto
                sku = product_data.get('sku', '')
                name = product_data.get('name', '')
                description = product_data.get('description', '')
                quantity = product_data.get('quantity', 0)
                stock_label = product_data.get('stock_label') or product_data.get('stock', '')
                total_units_sold = product_data.get('total_units_sold', 0)
                total_orders = product_data.get('total_orders', 0)
                price = product_data.get('price', 0)
                cost = product_data.get('cost', 0)

                # Processar countries (array de objetos)
                countries_raw = product_data.get('countries', [])
                countries = [
                    {'name': c.get('name', ''), 'code': c.get('code', '')}
                    for c in countries_raw
                ] if countries_raw else []

                # Processar images (array de objetos com path)
                images_raw = product_data.get('images', [])
                images = [img.get('path', '') for img in images_raw] if images_raw else []

                # Buscar ou criar produto
                product, created = PrimeCODCatalogProduct.objects.update_or_create(
                    primecod_id=primecod_id,
                    defaults={
                        'sku': sku,
                        'name': name,
                        'description': description,
                        'quantity': quantity,
                        'stock_label': stock_label,
                        'total_units_sold': total_units_sold,
                        'total_orders': total_orders,
                        'price': price,
                        'cost': cost,
                        'countries': countries,
                        'images': images,
                        # is_new só é True se for criação
                        'is_new': created,
                    }
                )

                if created:
                    products_created += 1
                    logger.info(f"✨ [SYNC CATALOG] Produto NOVO criado: [{sku}] {name}")
                else:
                    products_updated += 1
                    logger.info(f"🔄 [SYNC CATALOG] Produto atualizado: [{sku}] {name}")

                # Criar snapshot diário para este produto
                snapshot, snapshot_created = PrimeCODCatalogSnapshot.objects.update_or_create(
                    product=product,
                    snapshot_date=today,
                    defaults={
                        'quantity': quantity,
                        'total_units_sold': total_units_sold,
                    }
                )

                if snapshot_created:
                    snapshots_created += 1

            except Exception as e:
                logger.error(f"❌ [SYNC CATALOG] Erro ao processar produto {product_data.get('id', 'unknown')}: {str(e)}")
                products_error += 1
                continue

        # Marcar is_new=False para produtos > 24h
        yesterday = timezone.now() - timedelta(hours=24)
        old_products_count = PrimeCODCatalogProduct.objects.filter(
            is_new=True,
            first_seen_at__lt=yesterday
        ).update(is_new=False)

        logger.info(f"🔄 [SYNC CATALOG] Produtos marcados como não-novos: {old_products_count}")

        # Resultado final
        duration = time.time() - start_time

        result = {
            'status': 'success',
            'duration': duration,
            'total_products_api': len(all_products),
            'products_created': products_created,
            'products_updated': products_updated,
            'products_error': products_error,
            'snapshots_created': snapshots_created,
            'old_products_updated': old_products_count,
            'sync_date': today.isoformat(),
            'message': f'Sincronização concluída: {products_created} novos, {products_updated} atualizados, {snapshots_created} snapshots'
        }

        logger.info(f"✅ [SYNC CATALOG] Sincronização finalizada com sucesso em {duration:.1f}s")
        logger.info(f"📊 [SYNC CATALOG] Produtos novos: {products_created}")
        logger.info(f"📊 [SYNC CATALOG] Produtos atualizados: {products_updated}")
        logger.info(f"📊 [SYNC CATALOG] Snapshots criados: {snapshots_created}")
        logger.info(f"📊 [SYNC CATALOG] Erros: {products_error}")

        return result

    except PrimeCODAPIError as e:
        error_msg = f"Erro na API PrimeCOD: {str(e)}"
        logger.error(f"❌ [SYNC CATALOG] {error_msg}")

        return {
            'status': 'error',
            'message': error_msg,
            'error_type': 'api_error'
        }

    except Exception as e:
        error_msg = f"Erro inesperado na sincronização: {str(e)}"
        logger.error(f"❌ [SYNC CATALOG] {error_msg}")

        return {
            'status': 'error',
            'message': error_msg,
            'error_type': 'unexpected_error'
        }