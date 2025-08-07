import requests
import os
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from django.conf import settings
from django.utils import timezone
from .models import ApiProvider, ApiKey, UsageRecord, CostRecord, DataSync


class OpenAIAPIService:
    """Serviço para integração com OpenAI Usage/Costs API"""
    
    def __init__(self):
        self.api_base = "https://api.openai.com/v1"
        self.admin_key = os.getenv('OPENAI_ADMIN_API_KEY')
        if not self.admin_key:
            raise ValueError("OPENAI_ADMIN_API_KEY não configurada")
        
        self.headers = {
            'Authorization': f'Bearer {self.admin_key}',
            'Content-Type': 'application/json'
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
        
        # Converter datas para unix timestamp
        start_timestamp = int(datetime.strptime(start_date, '%Y-%m-%d').timestamp())
        params = {
            'start_time': start_timestamp,
            'bucket_width': bucket_width,
            'limit': limit,
        }
        
        if end_date:
            end_timestamp = int(datetime.strptime(end_date, '%Y-%m-%d').timestamp())
            params['end_time'] = end_timestamp
        
        try:
            response = requests.get(endpoint, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
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
        
        start_timestamp = int(datetime.strptime(start_date, '%Y-%m-%d').timestamp())
        params = {
            'start_time': start_timestamp,
            'bucket_width': bucket_width,
            'limit': limit,
        }
        
        if end_date:
            end_timestamp = int(datetime.strptime(end_date, '%Y-%m-%d').timestamp())
            params['end_time'] = end_timestamp
        
        try:
            response = requests.get(endpoint, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
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