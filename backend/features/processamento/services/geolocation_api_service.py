# backend/features/processamento/services/geolocation_api_service.py

import requests
import json
import time
from abc import ABC, abstractmethod
from typing import Dict, Optional, Tuple
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

class GeolocationAPIInterface(ABC):
    """Interface abstrata para serviços de geolocalização"""
    
    @abstractmethod
    def get_location_by_ip(self, ip_address: str) -> Dict:
        """Obtém localização baseada no IP"""
        pass
    
    @abstractmethod
    def get_ip_by_location(self, location_data: Dict) -> Optional[str]:
        """Obtém IP aproximado baseado na localização"""
        pass
    
    @abstractmethod
    def validate_api_key(self) -> bool:
        """Valida se a chave da API está funcionando"""
        pass

class IPInfoService(GeolocationAPIInterface):
    """Implementação para API do IPInfo.io"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, 'IPINFO_API_KEY', None)
        self.base_url = "https://ipinfo.io"
        self.cache_timeout = 3600 * 24  # 24 horas
        self.rate_limit_delay = 1  # 1 segundo entre chamadas
        self.last_request_time = 0
        
    def get_location_by_ip(self, ip_address: str) -> Dict:
        """
        Obtém localização baseada no IP usando IPInfo.io
        
        Args:
            ip_address (str): Endereço IP para consultar
            
        Returns:
            Dict: Dados de localização
        """
        if not self._is_valid_ip(ip_address):
            return {'error': 'IP inválido'}
            
        # Verifica cache primeiro
        cache_key = f"ipinfo_location_{ip_address}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
            
        try:
            self._respect_rate_limit()
            
            url = f"{self.base_url}/{ip_address}/json"
            params = {}
            
            if self.api_key:
                params['token'] = self.api_key
                
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Padroniza formato de resposta
            result = {
                'success': True,
                'ip': data.get('ip'),
                'city': data.get('city'),
                'region': data.get('region'),
                'country': data.get('country'),
                'country_code': data.get('country'),
                'postal_code': data.get('postal'),
                'latitude': None,
                'longitude': None,
                'org': data.get('org'),
                'timezone': data.get('timezone'),
                'source': 'ipinfo.io'
            }
            
            # Parse coordenadas se disponíveis
            if 'loc' in data:
                try:
                    lat, lon = data['loc'].split(',')
                    result['latitude'] = float(lat)
                    result['longitude'] = float(lon)
                except (ValueError, AttributeError):
                    pass
            
            # Cache resultado
            cache.set(cache_key, result, self.cache_timeout)
            
            return result
            
        except requests.RequestException as e:
            logger.error(f"Erro na API IPInfo para IP {ip_address}: {e}")
            return {'error': f'Erro na API: {str(e)}', 'success': False}
        except Exception as e:
            logger.error(f"Erro inesperado IPInfo para IP {ip_address}: {e}")
            return {'error': f'Erro inesperado: {str(e)}', 'success': False}
    
    def get_ip_by_location(self, location_data: Dict) -> Optional[str]:
        """
        IPInfo.io não suporta busca reversa por localização.
        Retorna None - usar outros serviços para essa funcionalidade.
        """
        logger.warning("IPInfo.io não suporta busca de IP por localização")
        return None
    
    def validate_api_key(self) -> bool:
        """Valida se a chave da API está funcionando"""
        if not self.api_key:
            return False  # Funciona sem chave mas com limites
            
        try:
            # Testa com IP público conhecido
            test_ip = "8.8.8.8"
            result = self.get_location_by_ip(test_ip)
            return result.get('success', False)
            
        except Exception as e:
            logger.error(f"Erro ao validar chave IPInfo: {e}")
            return False
    
    def _respect_rate_limit(self):
        """Garante que não excede rate limit"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - time_since_last)
            
        self.last_request_time = time.time()
    
    def _is_valid_ip(self, ip_address: str) -> bool:
        """Valida formato do IP"""
        try:
            import ipaddress
            ipaddress.ip_address(ip_address)
            return True
        except ValueError:
            return False

class AbstractAPIService(GeolocationAPIInterface):
    """Implementação para API do Abstract API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, 'ABSTRACT_API_KEY', None)
        self.base_url = "https://ipgeolocation.abstractapi.com/v1"
        self.cache_timeout = 3600 * 24  # 24 horas
        self.rate_limit_delay = 1  # 1 segundo entre chamadas
        self.last_request_time = 0
        
    def get_location_by_ip(self, ip_address: str) -> Dict:
        """
        Obtém localização baseada no IP usando Abstract API
        
        Args:
            ip_address (str): Endereço IP para consultar
            
        Returns:
            Dict: Dados de localização
        """
        if not self.api_key:
            return {'error': 'Chave da API não configurada', 'success': False}
            
        if not self._is_valid_ip(ip_address):
            return {'error': 'IP inválido', 'success': False}
            
        # Verifica cache primeiro
        cache_key = f"abstract_location_{ip_address}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
            
        try:
            self._respect_rate_limit()
            
            params = {
                'api_key': self.api_key,
                'ip_address': ip_address
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Padroniza formato de resposta
            result = {
                'success': True,
                'ip': data.get('ip_address'),
                'city': data.get('city'),
                'region': data.get('region'),
                'country': data.get('country'),
                'country_code': data.get('country_code'),
                'postal_code': data.get('postal_code'),
                'latitude': data.get('latitude'),
                'longitude': data.get('longitude'),
                'org': data.get('connection', {}).get('organization_name'),
                'timezone': data.get('timezone', {}).get('name'),
                'source': 'abstractapi.com'
            }
            
            # Converte coordenadas para float se necessário
            for coord in ['latitude', 'longitude']:
                if result[coord] is not None:
                    try:
                        result[coord] = float(result[coord])
                    except (ValueError, TypeError):
                        result[coord] = None
            
            # Cache resultado
            cache.set(cache_key, result, self.cache_timeout)
            
            return result
            
        except requests.RequestException as e:
            logger.error(f"Erro na API Abstract para IP {ip_address}: {e}")
            return {'error': f'Erro na API: {str(e)}', 'success': False}
        except Exception as e:
            logger.error(f"Erro inesperado Abstract para IP {ip_address}: {e}")
            return {'error': f'Erro inesperado: {str(e)}', 'success': False}
    
    def get_ip_by_location(self, location_data: Dict) -> Optional[str]:
        """
        Abstract API não suporta busca reversa por localização.
        Retorna None - usar outros serviços para essa funcionalidade.
        """
        logger.warning("Abstract API não suporta busca de IP por localização")
        return None
    
    def validate_api_key(self) -> bool:
        """Valida se a chave da API está funcionando"""
        if not self.api_key:
            return False
            
        try:
            # Testa com IP público conhecido
            test_ip = "8.8.8.8"
            result = self.get_location_by_ip(test_ip)
            return result.get('success', False)
            
        except Exception as e:
            logger.error(f"Erro ao validar chave Abstract: {e}")
            return False
    
    def _respect_rate_limit(self):
        """Garante que não excede rate limit"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - time_since_last)
            
        self.last_request_time = time.time()
    
    def _is_valid_ip(self, ip_address: str) -> bool:
        """Valida formato do IP"""
        try:
            import ipaddress
            ipaddress.ip_address(ip_address)
            return True
        except ValueError:
            return False

class GeolocationServiceManager:
    """Gerenciador para múltiplos serviços de geolocalização com fallback"""
    
    def __init__(self):
        self.services = []
        self._initialize_services()
        
    def _initialize_services(self):
        """Inicializa serviços disponíveis baseado nas configurações"""
        
        # IPInfo.io (funciona sem chave mas com limites)
        ipinfo_service = IPInfoService()
        self.services.append(ipinfo_service)
        
        # Abstract API (requer chave)
        if hasattr(settings, 'ABSTRACT_API_KEY') and settings.ABSTRACT_API_KEY:
            abstract_service = AbstractAPIService()
            self.services.append(abstract_service)
        
        logger.info(f"Inicializados {len(self.services)} serviços de geolocalização")
    
    def get_location_by_ip(self, ip_address: str, use_cache: bool = True) -> Dict:
        """
        Obtém localização usando serviços disponíveis com fallback
        
        Args:
            ip_address (str): IP para consultar
            use_cache (bool): Se deve usar cache
            
        Returns:
            Dict: Dados de localização do primeiro serviço que funcionar
        """
        if not self.services:
            return {'error': 'Nenhum serviço de geolocalização configurado', 'success': False}
        
        # Cache global para resultados consolidados
        cache_key = f"geo_consolidated_{ip_address}"
        if use_cache:
            cached_result = cache.get(cache_key)
            if cached_result:
                cached_result['source'] = f"{cached_result.get('source', 'unknown')} (cached)"
                return cached_result
        
        errors = []
        
        for service in self.services:
            try:
                logger.info(f"Tentando geolocalização com {service.__class__.__name__}")
                result = service.get_location_by_ip(ip_address)
                
                if result.get('success'):
                    # Cache resultado consolidado por 24h
                    if use_cache:
                        cache.set(cache_key, result, 3600 * 24)
                    
                    logger.info(f"Geolocalização bem-sucedida com {service.__class__.__name__}")
                    return result
                else:
                    errors.append(f"{service.__class__.__name__}: {result.get('error', 'Erro desconhecido')}")
                    
            except Exception as e:
                error_msg = f"{service.__class__.__name__}: {str(e)}"
                errors.append(error_msg)
                logger.error(f"Erro no serviço {service.__class__.__name__}: {e}")
        
        # Se todos os serviços falharam
        return {
            'error': f'Todos os serviços falharam: {"; ".join(errors)}',
            'success': False,
            'errors': errors
        }
    
    def get_multiple_locations(self, ip_list: list, max_concurrent: int = 5) -> Dict:
        """
        Obtém localização para múltiplos IPs (com rate limiting)
        
        Args:
            ip_list (list): Lista de IPs para consultar
            max_concurrent (int): Máximo de consultas simultâneas
            
        Returns:
            Dict: Resultados para cada IP
        """
        import time
        
        results = {}
        
        for i, ip in enumerate(ip_list):
            if i > 0 and i % max_concurrent == 0:
                # Pausa a cada lote para respeitar rate limits
                time.sleep(2)
                
            result = self.get_location_by_ip(ip)
            results[ip] = result
            
            # Log de progresso
            if i % 10 == 0:
                logger.info(f"Processados {i}/{len(ip_list)} IPs")
        
        return results
    
    def validate_services(self) -> Dict:
        """
        Valida todos os serviços configurados
        
        Returns:
            Dict: Status de cada serviço
        """
        validation_results = {}
        
        for service in self.services:
            service_name = service.__class__.__name__
            try:
                is_valid = service.validate_api_key()
                validation_results[service_name] = {
                    'valid': is_valid,
                    'error': None if is_valid else 'Validação falhou'
                }
            except Exception as e:
                validation_results[service_name] = {
                    'valid': False,
                    'error': str(e)
                }
        
        return validation_results
    
    def get_service_status(self) -> Dict:
        """
        Retorna status de todos os serviços
        
        Returns:
            Dict: Status detalhado dos serviços
        """
        status = {
            'total_services': len(self.services),
            'services_detail': [],
            'cache_stats': self._get_cache_stats()
        }
        
        for service in self.services:
            service_info = {
                'name': service.__class__.__name__,
                'has_api_key': bool(getattr(service, 'api_key', None)),
                'base_url': getattr(service, 'base_url', 'N/A')
            }
            status['services_detail'].append(service_info)
        
        return status
    
    def _get_cache_stats(self) -> Dict:
        """Obtém estatísticas do cache (simplificado)"""
        # Como Django cache não expõe estatísticas facilmente,
        # retorna informações básicas
        return {
            'timeout_hours': 24,
            'note': 'Cache configurado para 24h por resultado'
        }

class GeolocationFallbackService:
    """Serviço de fallback quando APIs externas não estão disponíveis"""
    
    def __init__(self):
        # Database básico de ranges IP conhecidos (pode ser expandido)
        self.ip_ranges = {
            # Brasil - ranges principais
            'BR': {
                'ranges': [
                    '200.0.0.0/8', '201.0.0.0/8', '189.0.0.0/8',
                    '177.0.0.0/8', '179.0.0.0/8', '191.0.0.0/8'
                ],
                'country': 'Brazil',
                'country_code': 'BR'
            },
            # Estados Unidos
            'US': {
                'ranges': ['8.0.0.0/8', '4.0.0.0/8', '12.0.0.0/8'],
                'country': 'United States',
                'country_code': 'US'
            },
            # Adicionar mais conforme necessário
        }
    
    def get_basic_location_by_ip(self, ip_address: str) -> Dict:
        """
        Fornece localização básica usando ranges IP conhecidos
        
        Args:
            ip_address (str): IP para analisar
            
        Returns:
            Dict: Localização básica inferida
        """
        import ipaddress
        
        try:
            ip_obj = ipaddress.ip_address(ip_address)
            
            for country_code, data in self.ip_ranges.items():
                for ip_range in data['ranges']:
                    try:
                        network = ipaddress.ip_network(ip_range, strict=False)
                        if ip_obj in network:
                            return {
                                'success': True,
                                'ip': ip_address,
                                'country': data['country'],
                                'country_code': data['country_code'],
                                'city': 'Unknown',
                                'region': 'Unknown',
                                'source': 'fallback_ranges',
                                'confidence': 'low',
                                'note': 'Localização aproximada baseada em ranges IP'
                            }
                    except ValueError:
                        continue
            
            # Se não encontrou em ranges conhecidos
            return {
                'success': False,
                'error': 'IP não encontrado em ranges conhecidos',
                'ip': ip_address,
                'source': 'fallback_ranges'
            }
            
        except ValueError:
            return {
                'success': False,
                'error': 'IP inválido',
                'ip': ip_address,
                'source': 'fallback_ranges'
            }


# Factory function para facilitar uso
def get_geolocation_service() -> GeolocationServiceManager:
    """
    Factory function para obter serviço de geolocalização configurado
    
    Returns:
        GeolocationServiceManager: Serviço configurado
    """
    return GeolocationServiceManager()


# Classe para configuração de APIs externas
class GeolocationConfig:
    """Configuração centralizada para APIs de geolocalização"""
    
    @staticmethod
    def get_api_settings() -> Dict:
        """Retorna configurações de API do Django settings"""
        return {
            'ipinfo_api_key': getattr(settings, 'IPINFO_API_KEY', None),
            'abstract_api_key': getattr(settings, 'ABSTRACT_API_KEY', None),
            'cache_timeout': getattr(settings, 'GEOLOCATION_CACHE_TIMEOUT', 3600 * 24),
            'rate_limit_delay': getattr(settings, 'GEOLOCATION_RATE_LIMIT', 1),
            'max_retries': getattr(settings, 'GEOLOCATION_MAX_RETRIES', 3)
        }
    
    @staticmethod
    def validate_configuration() -> Dict:
        """Valida configuração completa"""
        config = GeolocationConfig.get_api_settings()
        
        validation = {
            'valid': True,
            'warnings': [],
            'errors': [],
            'services_available': 0
        }
        
        # Valida IPInfo
        if config['ipinfo_api_key']:
            validation['services_available'] += 1
        else:
            validation['warnings'].append('IPInfo API key not configured (will use free tier)')
        
        # Valida Abstract API
        if config['abstract_api_key']:
            validation['services_available'] += 1
        else:
            validation['warnings'].append('Abstract API key not configured')
        
        if validation['services_available'] == 0:
            validation['valid'] = False
            validation['errors'].append('No geolocation APIs configured')
        
        return validation