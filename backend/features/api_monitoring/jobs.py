"""
Jobs RQ para monitoramento de APIs
"""
import logging
from django.utils import timezone
from .services import APIMonitoringService

logger = logging.getLogger(__name__)


def sync_openai_daily():
    """
    Job que sincroniza dados diários da OpenAI
    Deve ser executado diariamente via RQ scheduler
    """
    logger.info("Iniciando job de sincronização diária OpenAI")
    
    try:
        service = APIMonitoringService()
        result = service.sync_openai_data(days_back=1)  # Apenas último dia
        
        if result['success']:
            logger.info(
                f"Sincronização OpenAI concluída: "
                f"{result['usage_records_synced']} uso, "
                f"{result['cost_records_synced']} custos"
            )
            return {
                'success': True,
                'message': f"Sincronizados {result['usage_records_synced']} registros de uso e {result['cost_records_synced']} de custo",
                'timestamp': timezone.now().isoformat()
            }
        else:
            logger.error(f"Erro na sincronização OpenAI: {result['error']}")
            return {
                'success': False,
                'error': result['error'],
                'timestamp': timezone.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Erro inesperado na sincronização OpenAI: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }


def sync_openai_weekly():
    """
    Job que sincroniza dados semanais da OpenAI
    Deve ser executado semanalmente para garantir integridade dos dados
    """
    logger.info("Iniciando job de sincronização semanal OpenAI")
    
    try:
        service = APIMonitoringService()
        result = service.sync_openai_data(days_back=7)  # Última semana
        
        if result['success']:
            logger.info(
                f"Sincronização semanal OpenAI concluída: "
                f"{result['usage_records_synced']} uso, "
                f"{result['cost_records_synced']} custos"
            )
            return {
                'success': True,
                'message': f"Sincronização semanal: {result['usage_records_synced']} uso, {result['cost_records_synced']} custos",
                'timestamp': timezone.now().isoformat()
            }
        else:
            logger.error(f"Erro na sincronização semanal OpenAI: {result['error']}")
            return {
                'success': False,
                'error': result['error'],
                'timestamp': timezone.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Erro inesperado na sincronização semanal OpenAI: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }


# Dicionário de jobs disponíveis para agendamento
AVAILABLE_JOBS = {
    'sync_openai_daily': sync_openai_daily,
    'sync_openai_weekly': sync_openai_weekly,
}