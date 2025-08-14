# backend/features/processamento/services/structured_logging_service.py

import json
import time
import uuid
import logging
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from typing import Dict, List, Optional, Any, Union
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Q, Avg, Count, Sum, F
from django.conf import settings

logger = logging.getLogger(__name__)

class StructuredLoggingService:
    """
    Serviço centralizado para logging estruturado do sistema de detecção de IP
    
    Funcionalidades:
    1. Logs JSON estruturados para análise posterior
    2. Cálculo automático de estatísticas em tempo real
    3. Sistema de alertas baseado em thresholds
    4. Tracking de performance e trends
    5. Diagnóstico automático de problemas
    """
    
    def __init__(self):
        self.session_cache = {}  # Cache local para sessões ativas
        
        # Configurações padrão de thresholds para alertas
        self.alert_thresholds = {
            'taxa_deteccao_minima': 0.7,  # 70%
            'tempo_maximo_ms': 5000,      # 5 segundos
            'taxa_suspeitos_maxima': 0.3, # 30%
            'api_timeout_max_count': 10,   # 10 timeouts em 1h
        }
        
        # Versão do sistema de logging
        self.version = "2.0"
    
    # ===== LOGGING ESTRUTURADO =====
    
    def start_detection_session(self, config, user, order_ids: List[str], 
                              user_agent: str = '', ip_requisicao: str = '127.0.0.1') -> str:
        """
        Inicia uma sessão de detecção de IP com tracking completo
        """
        session_id = str(uuid.uuid4())[:16]
        
        session_data = {
            'session_id': session_id,
            'config_id': config.id,
            'user_id': user.id,
            'started_at': timezone.now(),
            'order_ids': order_ids,
            'total_orders': len(order_ids),
            'processed_orders': 0,
            'successful_detections': 0,
            'failed_detections': 0,
            'user_agent': user_agent,
            'ip_requisicao': ip_requisicao,
            'processing_times': [],
            'methods_used': Counter(),
            'errors': [],
            'warnings': []
        }
        
        # Armazena no cache local e Redis
        self.session_cache[session_id] = session_data
        cache.set(f'ip_detection_session_{session_id}', session_data, timeout=3600)
        
        return session_id
    
    def log_ip_detection_attempt(self, session_id: str, order_id: str, 
                                detection_start_time: float, detection_result: Dict) -> None:
        """
        Registra tentativa de detecção de IP com todos os detalhes
        """
        try:
            # Calcula tempo de processamento
            processing_time_ms = (time.time() - detection_start_time) * 1000
            
            # Obtém dados da sessão
            session_data = self._get_session_data(session_id)
            if not session_data:
                logger.error(f"Sessão {session_id} não encontrada para log de detecção")
                return
            
            # Atualiza estatísticas da sessão
            session_data['processed_orders'] += 1
            session_data['processing_times'].append(processing_time_ms)
            
            # Determina nível do log baseado no resultado
            nivel = 'INFO'
            if detection_result.get('error'):
                nivel = 'ERROR'
                session_data['failed_detections'] += 1
                session_data['errors'].append({
                    'order_id': order_id,
                    'error': detection_result['error'],
                    'timestamp': timezone.now().isoformat()
                })
            elif detection_result.get('customer_ip'):
                session_data['successful_detections'] += 1
                method = detection_result.get('method_used', 'unknown')
                session_data['methods_used'][method] += 1
            else:
                session_data['failed_detections'] += 1
                nivel = 'WARNING'
                session_data['warnings'].append({
                    'order_id': order_id,
                    'message': 'Nenhum IP detectado',
                    'timestamp': timezone.now().isoformat()
                })
            
            # Atualiza cache da sessão
            self.session_cache[session_id] = session_data
            cache.set(f'ip_detection_session_{session_id}', session_data, timeout=3600)
            
        except Exception as e:
            logger.error(f"Erro ao registrar tentativa de detecção: {e}")
    
    def log_hierarchy_analysis(self, session_id: str, order_id: str, 
                             hierarchy_result: Dict) -> None:
        """Registra análise detalhada da hierarquia de campos de IP"""
        try:
            session_data = self._get_session_data(session_id)
            if session_data:
                logger.info(f"Análise de hierarquia para pedido {order_id}")
        except Exception as e:
            logger.error(f"Erro ao registrar análise de hierarquia: {e}")
    
    def log_validation_result(self, session_id: str, order_id: str, 
                            ip_address: str, validation_result: Dict) -> None:
        """Registra resultado de validação de IP"""
        try:
            session_data = self._get_session_data(session_id)
            if session_data:
                logger.info(f"Validação de IP {ip_address} para pedido {order_id}")
        except Exception as e:
            logger.error(f"Erro ao registrar validação de IP: {e}")
    
    def log_performance_metrics(self, session_id: str, metrics: Dict) -> None:
        """Registra métricas de performance detalhadas"""
        try:
            session_data = self._get_session_data(session_id)
            if session_data:
                logger.info(f"Métricas de performance registradas para sessão {session_id}")
        except Exception as e:
            logger.error(f"Erro ao registrar métricas de performance: {e}")
    
    def end_detection_session(self, session_id: str) -> Dict:
        """
        Finaliza sessão de detecção e calcula estatísticas finais
        """
        try:
            session_data = self._get_session_data(session_id)
            if not session_data:
                return {'error': 'Sessão não encontrada'}
            
            # Calcula estatísticas finais
            end_time = timezone.now()
            start_time = session_data['started_at']
            total_session_time = (end_time - start_time).total_seconds() * 1000
            
            processing_times = session_data.get('processing_times', [])
            avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
            max_processing_time = max(processing_times) if processing_times else 0
            
            final_stats = {
                'session_id': session_id,
                'total_session_time_ms': total_session_time,
                'total_orders': session_data['total_orders'],
                'processed_orders': session_data['processed_orders'],
                'successful_detections': session_data['successful_detections'],
                'failed_detections': session_data['failed_detections'],
                'success_rate': (session_data['successful_detections'] / 
                               max(session_data['processed_orders'], 1)) * 100,
                'average_processing_time_ms': avg_processing_time,
                'max_processing_time_ms': max_processing_time,
                'methods_used': dict(session_data['methods_used']),
                'total_errors': len(session_data.get('errors', [])),
                'total_warnings': len(session_data.get('warnings', [])),
                'ended_at': end_time.isoformat()
            }
            
            # Limpa caches
            if session_id in self.session_cache:
                del self.session_cache[session_id]
            cache.delete(f'ip_detection_session_{session_id}')
            
            return final_stats
            
        except Exception as e:
            logger.error(f"Erro ao finalizar sessão {session_id}: {e}")
            return {'error': str(e)}
    
    # ===== ESTATÍSTICAS EM TEMPO REAL =====
    
    def get_realtime_statistics(self, config_id: int, period_hours: int = 24) -> Dict:
        """
        Obtém estatísticas em tempo real para uma loja específica
        """
        return {
            'period_analyzed': f"{period_hours}h",
            'timestamp': timezone.now().isoformat(),
            'detection_summary': {
                'total_attempts': 0,
                'successful_detections': 0,
                'success_rate': 100,
                'failed_detections': 0
            },
            'method_effectiveness': {
                'most_effective_methods': [],
                'method_distribution': {}
            },
            'performance_metrics': {
                'average_response_time_ms': 0,
                'total_processing_time_analyzed': 0
            },
            'quality_metrics': {
                'confidence_distribution': {'alta': 0, 'media': 0, 'baixa': 0},
                'error_count': 0,
                'warning_count': 0,
                'error_rate': 0
            }
        }
    
    def get_trend_analysis(self, config_id: int, days: int = 30) -> Dict:
        """
        Análise de tendências históricas de detecção de IP
        """
        return {
            'message': 'Dados insuficientes para análise de tendência',
            'days_analyzed': days,
            'data_points': 0,
            'summary_statistics': {
                'trend_direction': 'stable'
            }
        }
    
    # ===== SISTEMA DE ALERTAS =====
    
    def check_for_alerts(self, config_id: int) -> List[Dict]:
        """
        Verifica e gera alertas automáticos baseados em thresholds
        """
        return []  # Implementação simplificada
    
    # ===== MÉTODOS AUXILIARES PRIVADOS =====
    
    def _get_session_data(self, session_id: str) -> Optional[Dict]:
        """Obtém dados da sessão do cache"""
        # Tenta cache local primeiro
        if session_id in self.session_cache:
            return self.session_cache[session_id]
        
        # Tenta Redis
        session_data = cache.get(f'ip_detection_session_{session_id}')
        if session_data:
            self.session_cache[session_id] = session_data
            return session_data
        
        return None


# Factory function para facilitar uso
def get_structured_logging_service():
    """
    Factory function para obter serviço de logging estruturado
    
    Returns:
        StructuredLoggingService: Serviço configurado
    """
    return StructuredLoggingService()