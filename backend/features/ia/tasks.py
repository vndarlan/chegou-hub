# backend/features/ia/tasks.py - Tasks para sincronização WhatsApp
import logging
from django.utils import timezone
from .models import WhatsAppPhoneNumber, WhatsAppBusinessAccount
from .services import WhatsAppMetaAPIService

logger = logging.getLogger(__name__)

def sincronizar_numero_whatsapp_task(numero_id: int, access_token: str):
    """
    Task para sincronizar dados de um número WhatsApp em background
    """
    try:
        logger.info(f"🔄 Iniciando sincronização em background do número ID {numero_id}")
        
        # Buscar o número no banco
        try:
            numero = WhatsAppPhoneNumber.objects.get(id=numero_id)
            logger.info(f"📋 Número encontrado: {numero.phone_number_id}")
        except WhatsAppPhoneNumber.DoesNotExist:
            logger.error(f"❌ Número ID {numero_id} não encontrado no banco")
            return {'erro': 'Número não encontrado'}
        
        # Inicializar serviço da API
        api_service = WhatsAppMetaAPIService()
        
        # Buscar dados atualizados da API
        sucesso, dados_api = api_service.obter_detalhes_numero(
            numero.phone_number_id, 
            access_token
        )
        
        if not sucesso:
            logger.error(f"❌ Erro ao buscar dados da API: {dados_api}")
            return {'erro': 'Falha ao buscar dados da API', 'detalhes': dados_api}
        
        logger.info(f"✅ Dados obtidos da API: {dados_api}")
        
        # Mapear dados da API
        display_phone_number = dados_api.get('display_phone_number', numero.display_phone_number)
        verified_name = dados_api.get('verified_name', numero.verified_name)
        quality_rating = api_service._mapear_quality_rating(dados_api.get('quality_rating'))
        messaging_limit_tier = api_service._mapear_messaging_limit(dados_api.get('messaging_limit_tier'))
        status_numero = api_service._mapear_status(dados_api.get('status'))
        
        # Atualizar número com dados reais da API
        numero.display_phone_number = display_phone_number
        numero.verified_name = verified_name
        numero.quality_rating = quality_rating
        numero.messaging_limit_tier = messaging_limit_tier
        numero.status = status_numero
        numero.detalhes_api = dados_api
        numero.ultima_verificacao = timezone.now()
        numero.save()
        
        # Se WABA ID real foi obtido, atualizar a WhatsApp Business Account
        waba_id_real = dados_api.get('whatsapp_business_account_id')
        if waba_id_real and numero.whatsapp_business_account:
            waba = numero.whatsapp_business_account
            if waba.whatsapp_business_account_id.startswith('temp_'):
                logger.info(f"🏢 Atualizando WABA ID temporário para real: {waba_id_real}")
                waba.whatsapp_business_account_id = waba_id_real
                waba.save()
        
        logger.info(f"✅ Sincronização concluída para número {numero.phone_number_id}")
        logger.info(f"   - Número formatado: {numero.display_phone_number}")
        logger.info(f"   - Nome verificado: {numero.verified_name}")
        logger.info(f"   - Qualidade: {numero.get_quality_rating_display()}")
        logger.info(f"   - Limite: {numero.get_messaging_limit_tier_display()}")
        logger.info(f"   - Status: {numero.get_status_display()}")
        
        return {
            'sucesso': True,
            'numero_id': numero.id,
            'phone_number_id': numero.phone_number_id,
            'display_phone_number': numero.display_phone_number,
            'verified_name': numero.verified_name,
            'quality_rating': numero.quality_rating,
            'messaging_limit_tier': numero.messaging_limit_tier,
            'status': numero.status
        }
        
    except Exception as e:
        logger.error(f"❌ Erro inesperado na sincronização: {e}")
        import traceback
        traceback.print_exc()
        return {'erro': str(e), 'numero_id': numero_id}


def sincronizar_todos_numeros_whatsapp_task(force_update: bool = False):
    """
    Task para sincronizar todos os números WhatsApp em background
    """
    try:
        logger.info("🔄 Iniciando sincronização geral de números WhatsApp")
        
        api_service = WhatsAppMetaAPIService()
        resultado = api_service.sincronizar_qualidade_numeros(
            whatsapp_business_account_id=None,
            force_update=force_update
        )
        
        logger.info(f"✅ Sincronização geral concluída: {resultado}")
        return resultado
        
    except Exception as e:
        logger.error(f"❌ Erro na sincronização geral: {e}")
        return {'erro': str(e), 'sucesso': False}