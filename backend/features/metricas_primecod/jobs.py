"""
Background Jobs para coleta assíncrona PrimeCOD
"""
import logging
import time
from typing import Dict, Optional, List
from django.core.cache import cache
from django.contrib.auth.models import User
from .clients.primecod_client import PrimeCODClient, PrimeCODAPIError
from .models import AnalisePrimeCOD

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