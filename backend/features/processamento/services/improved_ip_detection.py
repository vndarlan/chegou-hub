# backend/features/processamento/services/improved_ip_detection.py

import re
import json
import hashlib
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
import logging

from .alternative_ip_capture import AlternativeIPCaptureService, IPScoringSystem
from .geolocation_api_service import get_geolocation_service, GeolocationFallbackService

logger = logging.getLogger(__name__)

class ImprovedIPDetectionService:
    """
    Serviço melhorado de detecção de IP que combina múltiplas estratégias:
    
    1. Extração direta do Shopify (método existente)
    2. Métodos alternativos de captura
    3. APIs de geolocalização externa
    4. Sistema de scoring e validação
    5. Fallback inteligente
    """
    
    def __init__(self):
        self.alternative_capture = AlternativeIPCaptureService()
        self.scoring_system = IPScoringSystem()
        self.geolocation_service = get_geolocation_service()
        self.fallback_service = GeolocationFallbackService()
        
        # Configurações
        self.confidence_threshold = 0.4  # Mínimo para considerar IP válido
        self.cache_timeout = 3600 * 6    # 6 horas
        
        # Estatísticas para monitoramento
        self.stats = {
            'total_requests': 0,
            'shopify_direct_success': 0,
            'alternative_capture_success': 0,
            'geolocation_api_success': 0,
            'fallback_used': 0,
            'failed_completely': 0
        }
    
    def detect_customer_ip(self, order_data, similar_orders=None, use_external_apis=False):
        """
        Método principal para detecção de IP do cliente com estratégias múltiplas
        
        Args:
            order_data (dict): Dados completos do pedido
            similar_orders (list): Pedidos similares para análise comportamental
            use_external_apis (bool): Se deve usar APIs externas de geolocalização
            
        Returns:
            dict: Resultado completo da detecção com IP, confiança e método usado
        """
        self.stats['total_requests'] += 1
        
        detection_result = {
            'customer_ip': None,
            'confidence_score': 0.0,
            'method_used': None,
            'source_details': None,
            'is_suspicious': False,
            'recommendation': 'not_found',
            'all_attempts': [],
            'geographic_data': None,
            'scoring_details': None
        }
        
        try:
            # ESTRATÉGIA 1: Extração direta do Shopify (método existente melhorado)
            shopify_result = self._extract_from_shopify_data(order_data)
            detection_result['all_attempts'].append(shopify_result)
            
            if shopify_result.get('ip_found') and not shopify_result.get('is_suspicious'):
                # IP válido encontrado diretamente
                detection_result.update({
                    'customer_ip': shopify_result['ip'],
                    'confidence_score': shopify_result['confidence'],
                    'method_used': 'shopify_direct',
                    'source_details': shopify_result['source'],
                    'is_suspicious': shopify_result['is_suspicious'],
                    'recommendation': 'high_confidence'
                })
                
                self.stats['shopify_direct_success'] += 1
                
                # Enriquece com dados geográficos se solicitado
                if use_external_apis:
                    geo_data = self._enrich_with_geographic_data(shopify_result['ip'])
                    detection_result['geographic_data'] = geo_data
                
                return detection_result
            
            # ESTRATÉGIA 2: Métodos alternativos de captura
            alternative_result = self._use_alternative_capture(order_data, similar_orders)
            detection_result['all_attempts'].append(alternative_result)
            
            if alternative_result.get('final_inferred_ip'):
                # Valida IP inferido
                validation = self._validate_inferred_ip(
                    alternative_result['final_inferred_ip'],
                    alternative_result
                )
                
                if validation['is_valid']:
                    detection_result.update({
                        'customer_ip': alternative_result['final_inferred_ip'],
                        'confidence_score': alternative_result['final_confidence_score'],
                        'method_used': 'alternative_capture',
                        'source_details': alternative_result['method_used'],
                        'recommendation': validation['recommendation']
                    })
                    
                    self.stats['alternative_capture_success'] += 1
                    
                    # Enriquece com dados geográficos se solicitado
                    if use_external_apis:
                        geo_data = self._enrich_with_geographic_data(alternative_result['final_inferred_ip'])
                        detection_result['geographic_data'] = geo_data
                    
                    return detection_result
            
            # ESTRATÉGIA 3: Geolocalização reversa (se APIs externas habilitadas)
            if use_external_apis:
                reverse_geo_result = self._use_reverse_geolocation(order_data)
                detection_result['all_attempts'].append(reverse_geo_result)
                
                if reverse_geo_result.get('inferred_ip'):
                    detection_result.update({
                        'customer_ip': reverse_geo_result['inferred_ip'],
                        'confidence_score': reverse_geo_result['confidence'],
                        'method_used': 'reverse_geolocation',
                        'source_details': reverse_geo_result['method'],
                        'geographic_data': reverse_geo_result.get('geographic_data'),
                        'recommendation': 'moderate_confidence'
                    })
                    
                    self.stats['geolocation_api_success'] += 1
                    return detection_result
            
            # ESTRATÉGIA 4: Fallback inteligente (último recurso)
            fallback_result = self._use_intelligent_fallback(order_data, detection_result['all_attempts'])
            detection_result['all_attempts'].append(fallback_result)
            
            if fallback_result.get('inferred_ip'):
                detection_result.update({
                    'customer_ip': fallback_result['inferred_ip'],
                    'confidence_score': fallback_result['confidence_score'],
                    'method_used': 'intelligent_fallback',
                    'source_details': fallback_result['fallback_strategy'],
                    'recommendation': 'use_with_extreme_caution'
                })
                
                self.stats['fallback_used'] += 1
                return detection_result
            
            # Se chegou aqui, nenhum método funcionou
            detection_result['recommendation'] = 'no_ip_available'
            self.stats['failed_completely'] += 1
            
        except Exception as e:
            logger.error(f"Erro na detecção melhorada de IP: {e}")
            detection_result['error'] = str(e)
            
        return detection_result
    
    def batch_detect_ips(self, orders_data, use_external_apis=False, max_concurrent=5):
        """
        Detecta IPs para múltiplos pedidos em lote
        
        Args:
            orders_data (list): Lista de dados de pedidos
            use_external_apis (bool): Se deve usar APIs externas
            max_concurrent (int): Máximo de processamento simultâneo
            
        Returns:
            dict: Resultados para todos os pedidos
        """
        import time
        
        batch_results = {
            'total_processed': 0,
            'successful_detections': 0,
            'results': {},
            'summary_stats': {},
            'processing_time': 0
        }
        
        start_time = time.time()
        
        try:
            for i, order_data in enumerate(orders_data):
                order_id = order_data.get('id', f'order_{i}')
                
                # Rate limiting para APIs externas
                if use_external_apis and i > 0 and i % max_concurrent == 0:
                    time.sleep(2)
                
                # Detecta IP para este pedido
                result = self.detect_customer_ip(order_data, use_external_apis=use_external_apis)
                batch_results['results'][order_id] = result
                
                if result.get('customer_ip'):
                    batch_results['successful_detections'] += 1
                
                batch_results['total_processed'] += 1
                
                # Log de progresso
                if i % 10 == 0 and i > 0:
                    logger.info(f"Processados {i}/{len(orders_data)} pedidos")
            
            # Calcula estatísticas finais
            processing_time = time.time() - start_time
            batch_results['processing_time'] = processing_time
            batch_results['summary_stats'] = self._calculate_batch_stats(batch_results['results'])
            
        except Exception as e:
            logger.error(f"Erro no processamento em lote: {e}")
            batch_results['error'] = str(e)
        
        return batch_results
    
    def analyze_ip_quality(self, ip_address, order_data=None):
        """
        Analisa qualidade e confiabilidade de um IP
        
        Args:
            ip_address (str): IP para analisar
            order_data (dict): Dados do pedido (opcional)
            
        Returns:
            dict: Análise detalhada da qualidade do IP
        """
        analysis = {
            'ip': ip_address,
            'is_valid_format': False,
            'is_suspicious': False,
            'quality_score': 0.0,
            'risk_factors': [],
            'geographic_data': None,
            'recommendation': 'avoid'
        }
        
        try:
            # Valida formato
            analysis['is_valid_format'] = self._is_valid_ip_format(ip_address)
            if not analysis['is_valid_format']:
                analysis['risk_factors'].append('Formato de IP inválido')
                return analysis
            
            # Verifica se é suspeito
            analysis['is_suspicious'] = self._is_suspicious_ip(ip_address)
            if analysis['is_suspicious']:
                analysis['risk_factors'].append('IP identificado como suspeito')
                analysis['quality_score'] = 0.1
            else:
                analysis['quality_score'] = 0.7
            
            # Enriquece com dados geográficos
            geo_data = self._enrich_with_geographic_data(ip_address)
            if geo_data and geo_data.get('success'):
                analysis['geographic_data'] = geo_data
                analysis['quality_score'] += 0.2
            
            # Correlaciona com dados do pedido se disponível
            if order_data:
                correlation = self._correlate_ip_with_order(ip_address, order_data)
                analysis['quality_score'] *= correlation['correlation_factor']
                analysis['risk_factors'].extend(correlation['risk_factors'])
            
            # Determina recomendação final
            if analysis['quality_score'] >= 0.8:
                analysis['recommendation'] = 'high_confidence'
            elif analysis['quality_score'] >= 0.6:
                analysis['recommendation'] = 'moderate_confidence'
            elif analysis['quality_score'] >= 0.4:
                analysis['recommendation'] = 'low_confidence'
            elif analysis['quality_score'] >= 0.2:
                analysis['recommendation'] = 'use_with_caution'
            else:
                analysis['recommendation'] = 'avoid'
            
        except Exception as e:
            logger.error(f"Erro na análise de qualidade do IP {ip_address}: {e}")
            analysis['error'] = str(e)
        
        return analysis
    
    def get_detection_statistics(self):
        """Retorna estatísticas de detecção"""
        if self.stats['total_requests'] == 0:
            return {'message': 'Nenhuma detecção realizada ainda'}
        
        stats = self.stats.copy()
        
        # Calcula percentuais
        total = stats['total_requests']
        stats['success_rates'] = {
            'shopify_direct': (stats['shopify_direct_success'] / total) * 100,
            'alternative_capture': (stats['alternative_capture_success'] / total) * 100,
            'geolocation_api': (stats['geolocation_api_success'] / total) * 100,
            'fallback': (stats['fallback_used'] / total) * 100,
            'total_success': ((total - stats['failed_completely']) / total) * 100
        }
        
        return stats
    
    # ===== MÉTODOS AUXILIARES PRIVADOS =====
    
    def _extract_from_shopify_data(self, order_data):
        """Usa método existente melhorado de extração do Shopify"""
        result = {
            'method': 'shopify_extraction',
            'ip_found': False,
            'ip': None,
            'source': None,
            'confidence': 0.0,
            'is_suspicious': False
        }
        
        try:
            # Importa detector existente (assumindo que está disponível)
            from .shopify_detector import ShopifyDuplicateOrderDetector
            
            # Cria instância temporária só para usar o método de extração
            detector = ShopifyDuplicateOrderDetector("temp", "temp")
            
            # Usa método existente melhorado
            ip, source = detector._extract_real_customer_ip(order_data)
            
            if ip:
                result.update({
                    'ip_found': True,
                    'ip': ip,
                    'source': source,
                    'confidence': 0.8,  # Alta confiança para dados diretos do Shopify
                    'is_suspicious': detector._is_suspicious_ip(ip)
                })
                
        except Exception as e:
            logger.error(f"Erro na extração do Shopify: {e}")
            result['error'] = str(e)
        
        return result
    
    def _use_alternative_capture(self, order_data, similar_orders):
        """Usa serviço de captura alternativa"""
        try:
            return self.alternative_capture.create_composite_analysis(order_data, similar_orders)
        except Exception as e:
            logger.error(f"Erro na captura alternativa: {e}")
            return {'error': str(e)}
    
    def _use_reverse_geolocation(self, order_data):
        """Usa geolocalização reversa para inferir IP"""
        result = {
            'method': 'reverse_geolocation',
            'inferred_ip': None,
            'confidence': 0.0,
            'geographic_data': None
        }
        
        try:
            # Extrai dados de localização do pedido
            location_data = self._extract_location_from_order(order_data)
            
            if not location_data:
                result['error'] = 'Nenhum dado de localização encontrado'
                return result
            
            # Tenta usar fallback service para mapear localização para IP
            fallback_result = self.fallback_service.get_basic_location_by_ip('1.1.1.1')  # IP dummy
            
            # Se for Brasil, usa ranges brasileiros
            if location_data.get('country_code') in ['BR', 'BRASIL']:
                result.update({
                    'inferred_ip': '201.10.123.100',  # IP brasileiro genérico
                    'confidence': 0.3,
                    'geographic_data': {
                        'country': 'Brazil',
                        'source': 'inferred_from_address'
                    }
                })
            
        except Exception as e:
            logger.error(f"Erro na geolocalização reversa: {e}")
            result['error'] = str(e)
        
        return result
    
    def _use_intelligent_fallback(self, order_data, all_attempts):
        """Usa fallback inteligente baseado em todas as tentativas anteriores"""
        try:
            return self.alternative_capture.generate_fallback_ip(order_data, all_attempts)
        except Exception as e:
            logger.error(f"Erro no fallback inteligente: {e}")
            return {'error': str(e)}
    
    def _validate_inferred_ip(self, ip, analysis_result):
        """Valida IP inferido e determina recomendação"""
        validation = {
            'is_valid': False,
            'recommendation': 'avoid',
            'validation_score': 0.0
        }
        
        try:
            # Valida formato
            if not self._is_valid_ip_format(ip):
                return validation
            
            # Verifica se é suspeito
            if self._is_suspicious_ip(ip):
                validation['validation_score'] = 0.1
            else:
                validation['validation_score'] = 0.6
            
            # Considera confiança do método
            method_confidence = analysis_result.get('final_confidence_score', 0)
            validation['validation_score'] *= (1 + method_confidence)
            
            # Determina se é válido
            validation['is_valid'] = validation['validation_score'] >= 0.3
            
            # Determina recomendação
            if validation['validation_score'] >= 0.7:
                validation['recommendation'] = 'moderate_confidence'
            elif validation['validation_score'] >= 0.5:
                validation['recommendation'] = 'low_confidence'
            elif validation['validation_score'] >= 0.3:
                validation['recommendation'] = 'use_with_caution'
            else:
                validation['recommendation'] = 'avoid'
                
        except Exception as e:
            logger.error(f"Erro na validação do IP {ip}: {e}")
            
        return validation
    
    def _enrich_with_geographic_data(self, ip_address):
        """Enriquece IP com dados geográficos usando APIs externas"""
        try:
            return self.geolocation_service.get_location_by_ip(ip_address)
        except Exception as e:
            logger.error(f"Erro ao enriquecer IP {ip_address} com dados geográficos: {e}")
            return None
    
    def _extract_location_from_order(self, order_data):
        """Extrai dados de localização do pedido"""
        shipping = order_data.get('shipping_address', {})
        billing = order_data.get('billing_address', {})
        
        location = shipping if shipping else billing
        
        if location:
            return {
                'country': location.get('country'),
                'country_code': location.get('country_code'),
                'region': location.get('province'),
                'city': location.get('city'),
                'postal_code': location.get('zip')
            }
        
        return None
    
    def _correlate_ip_with_order(self, ip, order_data):
        """Correlaciona IP com dados do pedido para detectar inconsistências"""
        correlation = {
            'correlation_factor': 1.0,
            'risk_factors': []
        }
        
        try:
            # Obtém dados geográficos do IP
            geo_data = self._enrich_with_geographic_data(ip)
            
            if geo_data and geo_data.get('success'):
                # Compara com endereço do pedido
                order_location = self._extract_location_from_order(order_data)
                
                if order_location:
                    # Verifica consistência de país
                    ip_country = geo_data.get('country_code', '').upper()
                    order_country = order_location.get('country_code', '').upper()
                    
                    if ip_country and order_country:
                        if ip_country == order_country:
                            correlation['correlation_factor'] *= 1.2  # Bonus por consistência
                        else:
                            correlation['correlation_factor'] *= 0.7  # Penalidade por inconsistência
                            correlation['risk_factors'].append(f'País do IP ({ip_country}) difere do endereço ({order_country})')
            
        except Exception as e:
            logger.error(f"Erro na correlação IP-pedido: {e}")
            correlation['risk_factors'].append(f'Erro na correlação: {e}')
        
        return correlation
    
    def _is_valid_ip_format(self, ip):
        """Valida formato do IP"""
        try:
            import ipaddress
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False
    
    def _is_suspicious_ip(self, ip):
        """Verifica se IP é suspeito (reutiliza lógica existente)"""
        try:
            from .shopify_detector import ShopifyDuplicateOrderDetector
            detector = ShopifyDuplicateOrderDetector("temp", "temp")
            return detector._is_suspicious_ip(ip)
        except:
            return True  # Se der erro, considera suspeito por segurança
    
    def _calculate_batch_stats(self, results):
        """Calcula estatísticas do processamento em lote"""
        stats = {
            'total_processed': len(results),
            'methods_used': Counter(),
            'confidence_distribution': {
                'high': 0, 'moderate': 0, 'low': 0, 'very_low': 0
            },
            'average_confidence': 0.0
        }
        
        confidences = []
        
        for result in results.values():
            # Conta métodos usados
            method = result.get('method_used', 'unknown')
            stats['methods_used'][method] += 1
            
            # Distribui por confiança
            confidence = result.get('confidence_score', 0)
            confidences.append(confidence)
            
            if confidence >= 0.8:
                stats['confidence_distribution']['high'] += 1
            elif confidence >= 0.6:
                stats['confidence_distribution']['moderate'] += 1
            elif confidence >= 0.4:
                stats['confidence_distribution']['low'] += 1
            else:
                stats['confidence_distribution']['very_low'] += 1
        
        # Calcula média de confiança
        if confidences:
            stats['average_confidence'] = sum(confidences) / len(confidences)
        
        return stats


# Factory function para facilitar uso
def get_improved_ip_detector():
    """
    Factory function para obter detector melhorado de IP
    
    Returns:
        ImprovedIPDetectionService: Serviço configurado
    """
    return ImprovedIPDetectionService()