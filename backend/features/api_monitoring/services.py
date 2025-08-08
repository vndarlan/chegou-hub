import requests
import os
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from django.conf import settings
from django.utils import timezone
from .models import ApiProvider, ApiKey, UsageRecord, CostRecord, DataSync

# Configurar logger
logger = logging.getLogger(__name__)


class OpenAIAPIService:
    """Serviço para integração com OpenAI Usage/Costs API"""
    
    def __init__(self):
        self.api_base = "https://api.openai.com/v1"
        self.admin_key = os.getenv('OPENAI_ADMIN_API_KEY')
        
        # Validações melhoradas da API key
        if not self.admin_key:
            raise ValueError("OPENAI_ADMIN_API_KEY não configurada. Configure no arquivo .env ou nas variáveis de ambiente.")
        
        if self.admin_key.startswith('your_') or 'placeholder' in self.admin_key.lower():
            raise ValueError("OPENAI_ADMIN_API_KEY parece ser um placeholder. Configure com uma API key real da OpenAI.")
        
        if not self.admin_key.startswith('sk-'):
            raise ValueError("OPENAI_ADMIN_API_KEY deve começar com 'sk-'. Verifique se é uma API key válida da OpenAI.")
        
        self.headers = {
            'Authorization': f'Bearer {self.admin_key}',
            'Content-Type': 'application/json'
        }
        
        logger.info(f"OpenAI API Service inicializado com key: ...{self.admin_key[-8:]}")
    
    def validate_api_key(self) -> Dict[str, Any]:
        """
        Valida se a API key tem permissões de admin
        
        Returns:
            Dict com status da validação e informações da organização
        """
        try:
            # Primeiro, tentar buscar informações da organização
            org_endpoint = f"{self.api_base}/organization"
            org_response = requests.get(org_endpoint, headers=self.headers)
            
            if org_response.status_code != 200:
                error_details = org_response.text[:200] if org_response.text else None
                
                if org_response.status_code == 401:
                    error_msg = "API key inválida ou expirada. Verifique se a OPENAI_ADMIN_API_KEY está correta."
                elif org_response.status_code == 404:
                    error_msg = "Organização não encontrada. Verifique se a API key pertence a uma organização válida."
                elif org_response.status_code == 403:
                    error_msg = "Acesso negado. A API key precisa ter permissões de organização."
                else:
                    error_msg = f"Erro {org_response.status_code} ao acessar organização"
                
                return {
                    'valid': False,
                    'has_admin_permissions': False,
                    'error': error_msg,
                    'details': error_details,
                    'suggestion': 'Verifique se a API key é uma Admin Key criada em https://platform.openai.com/settings/organization/admin-keys'
                }
            
            org_data = org_response.json()
            
            # Tentar fazer uma chamada pequena para a API de usage para verificar permissões
            # Usar período de apenas 1 dia para minimizar carga
            yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
            test_endpoint = f"{self.api_base}/organization/usage/completions"
            test_params = {
                'start_time': int(datetime.strptime(yesterday, '%Y-%m-%d').timestamp()),
                'bucket_width': '1d',
                'limit': 1
            }
            
            test_response = requests.get(test_endpoint, headers=self.headers, params=test_params)
            
            # Analisar resposta
            if test_response.status_code == 200:
                return {
                    'valid': True,
                    'has_admin_permissions': True,
                    'organization': org_data.get('name', 'Unknown'),
                    'organization_id': org_data.get('id', 'Unknown'),
                    'message': 'API key validada com sucesso. Tem permissões de admin.'
                }
            elif test_response.status_code == 403:
                return {
                    'valid': True,
                    'has_admin_permissions': False,
                    'organization': org_data.get('name', 'Unknown'),
                    'organization_id': org_data.get('id', 'Unknown'),
                    'error': 'API key válida mas sem permissões de admin',
                    'details': 'Você precisa criar uma Admin Key em https://platform.openai.com/settings/organization/admin-keys'
                }
            elif test_response.status_code == 401:
                return {
                    'valid': False,
                    'has_admin_permissions': False,
                    'error': 'API key inválida ou expirada'
                }
            else:
                return {
                    'valid': False,
                    'has_admin_permissions': False,
                    'error': f"Erro ao validar permissões (status {test_response.status_code})",
                    'details': test_response.text[:200] if test_response.text else None
                }
                
        except Exception as e:
            logger.error(f"Erro ao validar API key: {str(e)}")
            return {
                'valid': False,
                'has_admin_permissions': False,
                'error': f"Erro ao validar API key: {str(e)}"
            }
    
    def get_usage_data(self, start_date: str, end_date: str = None, 
                      bucket_width: str = '1d', limit: int = 1000) -> Dict[str, Any]:
        """
        Busca dados de uso da OpenAI Usage API
        
        Args:
            start_date: Data inicial (YYYY-MM-DD)
            end_date: Data final (YYYY-MM-DD), opcional
            bucket_width: Granularidade ('1m', '1h', '1d')
            limit: Limite de resultados
        """
        endpoint = f"{self.api_base}/organization/usage/completions"
        
        # Converter datas para unix timestamp com validação
        now = datetime.now()
        start_dt = datetime.strptime(start_date, '%Y-%m-%d')
        
        # Validar que a data não é futura
        if start_dt > now:
            logger.warning(f"Data inicial {start_date} é futura, ajustando para hoje")
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        start_timestamp = int(start_dt.timestamp())
        
        params = {
            'start_time': start_timestamp,
            'bucket_width': bucket_width,
            'limit': limit,
        }
        
        if end_date:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            # Validar que a data final não é futura
            if end_dt > now:
                logger.warning(f"Data final {end_date} é futura, ajustando para hoje")
                end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            # Validar que end_date >= start_date
            if end_dt < start_dt:
                logger.warning(f"Data final {end_date} é anterior à inicial, ajustando")
                end_dt = start_dt
            
            end_timestamp = int(end_dt.timestamp())
            params['end_time'] = end_timestamp
        
        logger.info(f"Buscando dados de uso OpenAI: {endpoint}")
        logger.debug(f"Parâmetros: {params}")
        
        try:
            response = requests.get(endpoint, headers=self.headers, params=params)
            
            # Log detalhado em caso de erro com timestamps para debug
            if response.status_code != 200:
                logger.error(f"Erro na API OpenAI Usage: Status {response.status_code}")
                logger.error(f"URL chamada: {endpoint}?{params}")
                logger.error(f"Timestamps enviados: start={params.get('start_time')} ({datetime.fromtimestamp(params.get('start_time', 0))}), end={params.get('end_time', 'N/A')}")
                logger.error(f"Resposta da API: {response.text[:500]}")
                
                # Mensagens de erro específicas e detalhadas
                if response.status_code == 400:
                    # Verificar se é problema de timestamp futuro
                    response_text = response.text.lower()
                    if 'start_time' in response_text or 'timestamp' in response_text:
                        error_msg = f"Parâmetros de data inválidos. Timestamps: start={params.get('start_time')} ({datetime.fromtimestamp(params.get('start_time', 0))}). Verifique se as datas não são futuras."
                    else:
                        error_msg = "Requisição inválida. Verifique os parâmetros enviados."
                elif response.status_code == 401:
                    error_msg = "API key inválida. Configure uma API key válida em OPENAI_ADMIN_API_KEY."
                elif response.status_code == 403:
                    error_msg = "Sem permissões de admin. Crie uma Admin Key em https://platform.openai.com/settings/organization/admin-keys"
                elif response.status_code == 429:
                    error_msg = "Limite de requisições excedido. Aguarde alguns minutos antes de tentar novamente."
                elif response.status_code == 404:
                    error_msg = "Endpoint não encontrado. Verifique se sua organização tem acesso à API de Usage."
                else:
                    error_msg = f"Erro {response.status_code}: {response.text[:200]}"
                
                raise Exception(error_msg)
            
            response.raise_for_status()
            data = response.json()
            logger.info(f"Dados de uso obtidos com sucesso: {len(data.get('data', []))} buckets")
            return data
            
        except requests.RequestException as e:
            logger.error(f"Erro ao buscar dados de uso OpenAI: {str(e)}")
            raise Exception(f"Erro ao buscar dados de uso OpenAI: {str(e)}")
    
    def get_costs_data(self, start_date: str, end_date: str = None,
                      bucket_width: str = '1d', limit: int = 1000) -> Dict[str, Any]:
        """
        Busca dados de custos da OpenAI Costs API
        
        Args:
            start_date: Data inicial (YYYY-MM-DD)
            end_date: Data final (YYYY-MM-DD), opcional
            bucket_width: Granularidade (apenas '1d' suportado)
            limit: Limite de resultados
        """
        endpoint = f"{self.api_base}/organization/costs"
        
        # Converter datas para unix timestamp com validação
        now = datetime.now()
        start_dt = datetime.strptime(start_date, '%Y-%m-%d')
        
        # Validar que a data não é futura
        if start_dt > now:
            logger.warning(f"Data inicial {start_date} é futura, ajustando para hoje")
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        start_timestamp = int(start_dt.timestamp())
        
        params = {
            'start_time': start_timestamp,
            'bucket_width': bucket_width,
            'limit': limit,
        }
        
        if end_date:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            # Validar que a data final não é futura
            if end_dt > now:
                logger.warning(f"Data final {end_date} é futura, ajustando para hoje")
                end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            # Validar que end_date >= start_date
            if end_dt < start_dt:
                logger.warning(f"Data final {end_date} é anterior à inicial, ajustando")
                end_dt = start_dt
            
            end_timestamp = int(end_dt.timestamp())
            params['end_time'] = end_timestamp
        
        logger.info(f"Buscando dados de custos OpenAI: {endpoint}")
        logger.debug(f"Parâmetros: {params}")
        
        try:
            response = requests.get(endpoint, headers=self.headers, params=params)
            
            # Log detalhado em caso de erro com timestamps para debug
            if response.status_code != 200:
                logger.error(f"Erro na API OpenAI Costs: Status {response.status_code}")
                logger.error(f"URL chamada: {endpoint}?{params}")
                logger.error(f"Timestamps enviados: start={params.get('start_time')} ({datetime.fromtimestamp(params.get('start_time', 0))}), end={params.get('end_time', 'N/A')}")
                logger.error(f"Resposta da API: {response.text[:500]}")
                
                # Mensagens de erro específicas e detalhadas
                if response.status_code == 400:
                    # Verificar se é problema de timestamp futuro
                    response_text = response.text.lower()
                    if 'start_time' in response_text or 'timestamp' in response_text:
                        error_msg = f"Parâmetros de data inválidos. Timestamps: start={params.get('start_time')} ({datetime.fromtimestamp(params.get('start_time', 0))}). Verifique se as datas não são futuras."
                    else:
                        error_msg = "Requisição inválida. Verifique os parâmetros enviados."
                elif response.status_code == 401:
                    error_msg = "API key inválida. Configure uma API key válida em OPENAI_ADMIN_API_KEY."
                elif response.status_code == 403:
                    error_msg = "Sem permissões de admin. Crie uma Admin Key em https://platform.openai.com/settings/organization/admin-keys"
                elif response.status_code == 429:
                    error_msg = "Limite de requisições excedido. Aguarde alguns minutos antes de tentar novamente."
                elif response.status_code == 404:
                    error_msg = "Endpoint não encontrado. Verifique se sua organização tem acesso à API de Costs."
                else:
                    error_msg = f"Erro {response.status_code}: {response.text[:200]}"
                
                raise Exception(error_msg)
            
            response.raise_for_status()
            data = response.json()
            logger.info(f"Dados de custos obtidos com sucesso: {len(data.get('data', []))} buckets")
            return data
            
        except requests.RequestException as e:
            logger.error(f"Erro ao buscar dados de custos OpenAI: {str(e)}")
            raise Exception(f"Erro ao buscar dados de custos OpenAI: {str(e)}")


class APIMonitoringService:
    """Serviço principal para monitoramento de APIs"""
    
    def __init__(self):
        self.openai_service = OpenAIAPIService()
    
    def sync_openai_data(self, days_back: int = 7) -> Dict[str, Any]:
        """
        Sincroniza dados da OpenAI para os últimos X dias
        
        Args:
            days_back: Quantos dias atrás sincronizar
            
        Returns:
            Dict com resultados da sincronização
        """
        try:
            # Configurar datas
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=days_back)
            
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            # Garantir que o provider OpenAI existe
            openai_provider, _ = ApiProvider.objects.get_or_create(
                name='openai',
                defaults={'is_active': True}
            )
            
            # Buscar dados de uso
            usage_data = self.openai_service.get_usage_data(start_date_str, end_date_str)
            usage_synced = self._process_usage_data(openai_provider, usage_data)
            
            # Buscar dados de custos
            costs_data = self.openai_service.get_costs_data(start_date_str, end_date_str)
            costs_synced = self._process_costs_data(openai_provider, costs_data)
            
            # Atualizar status de sincronização
            sync_record, _ = DataSync.objects.get_or_create(
                provider=openai_provider,
                defaults={
                    'last_sync_date': end_date,
                    'sync_status': 'success'
                }
            )
            sync_record.last_sync_date = end_date
            sync_record.sync_status = 'success'
            sync_record.error_message = ''
            sync_record.save()
            
            return {
                'success': True,
                'usage_records_synced': usage_synced,
                'cost_records_synced': costs_synced,
                'sync_period': f"{start_date_str} to {end_date_str}"
            }
            
        except Exception as e:
            # Registrar erro na sincronização
            if 'openai_provider' in locals():
                sync_record, _ = DataSync.objects.get_or_create(
                    provider=openai_provider,
                    defaults={
                        'last_sync_date': timezone.now().date(),
                        'sync_status': 'error',
                        'error_message': str(e)
                    }
                )
                sync_record.sync_status = 'error'
                sync_record.error_message = str(e)
                sync_record.save()
            
            return {
                'success': False,
                'error': str(e)
            }
    
    def _process_usage_data(self, provider: ApiProvider, usage_data: Dict[str, Any]) -> int:
        """Processa dados de uso da API OpenAI"""
        synced_count = 0
        
        for bucket in usage_data.get('data', []):
            # Extrair informações do bucket
            start_time = bucket.get('start_time')
            if not start_time:
                continue
                
            # Converter timestamp para data
            bucket_date = datetime.fromtimestamp(start_time).date()
            
            # Processar cada item de uso no bucket
            for usage_item in bucket.get('results', []):
                api_key_id = usage_item.get('api_key_id', 'unknown')
                model_name = usage_item.get('model', 'unknown')
                project_id = usage_item.get('project_id', '')
                
                # Garantir que a API key existe
                api_key_name = usage_item.get('api_key_name', api_key_id)
                api_key, _ = ApiKey.objects.get_or_create(
                    provider=provider,
                    key_id=api_key_id,
                    defaults={
                        'name': api_key_name,
                        'description': f'Auto-criada durante sincronização',
                        'is_active': True
                    }
                )
                
                # Criar ou atualizar registro de uso
                usage_record, created = UsageRecord.objects.update_or_create(
                    api_key=api_key,
                    date=bucket_date,
                    model_name=model_name,
                    project_id=project_id,
                    defaults={
                        'total_requests': usage_item.get('num_model_requests', 0),
                        'input_tokens': usage_item.get('input_tokens', 0),
                        'output_tokens': usage_item.get('output_tokens', 0),
                        'cached_tokens': usage_item.get('input_cached_tokens', 0),
                        'is_batch': usage_item.get('batch', False),
                    }
                )
                
                if created or usage_record.total_requests != usage_item.get('num_model_requests', 0):
                    synced_count += 1
        
        return synced_count
    
    def _process_costs_data(self, provider: ApiProvider, costs_data: Dict[str, Any]) -> int:
        """Processa dados de custos da API OpenAI"""
        synced_count = 0
        
        for bucket in costs_data.get('data', []):
            start_time = bucket.get('start_time')
            if not start_time:
                continue
                
            bucket_date = datetime.fromtimestamp(start_time).date()
            
            for cost_item in bucket.get('results', []):
                api_key_id = cost_item.get('api_key_id', 'unknown')
                model_name = cost_item.get('model', 'unknown')
                project_id = cost_item.get('project_id', '')
                
                # Garantir que a API key existe
                api_key_name = cost_item.get('api_key_name', api_key_id)
                api_key, _ = ApiKey.objects.get_or_create(
                    provider=provider,
                    key_id=api_key_id,
                    defaults={
                        'name': api_key_name,
                        'description': f'Auto-criada durante sincronização',
                        'is_active': True
                    }
                )
                
                # Extrair custos
                input_cost = Decimal(str(cost_item.get('input_cost_usd', 0)))
                output_cost = Decimal(str(cost_item.get('output_cost_usd', 0)))
                cached_cost = Decimal(str(cost_item.get('input_cached_cost_usd', 0)))
                other_costs = Decimal(str(cost_item.get('web_search_cost_usd', 0)))
                
                # Criar ou atualizar registro de custo
                cost_record, created = CostRecord.objects.update_or_create(
                    api_key=api_key,
                    date=bucket_date,
                    model_name=model_name,
                    project_id=project_id,
                    defaults={
                        'input_cost': input_cost,
                        'output_cost': output_cost,
                        'cached_cost': cached_cost,
                        'other_costs': other_costs,
                        'currency': 'USD',
                    }
                )
                
                if created or cost_record.input_cost != input_cost:
                    synced_count += 1
        
        return synced_count
    
    def get_available_api_keys(self) -> List[Dict[str, Any]]:
        """Retorna lista de API keys disponíveis"""
        return list(ApiKey.objects.filter(is_active=True).values(
            'id', 'name', 'key_id', 'provider__name'
        ))
    
    def get_last_sync_status(self) -> Dict[str, Any]:
        """Retorna status da última sincronização"""
        try:
            sync_record = DataSync.objects.filter(provider__name='openai').first()
            if sync_record:
                return {
                    'last_sync': sync_record.last_sync_date.isoformat(),
                    'status': sync_record.sync_status,
                    'error_message': sync_record.error_message
                }
            return {'status': 'never_synced'}
        except DataSync.DoesNotExist:
            return {'status': 'never_synced'}