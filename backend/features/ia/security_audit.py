# backend/features/ia/security_audit.py - SISTEMA DE AUDITORIA DE SEGURANÇA
import logging
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.cache import cache
from typing import Dict, Optional, Any
import json
import hashlib

logger = logging.getLogger(__name__)

class SecurityAuditLogger:
    """Sistema de auditoria de segurança para WhatsApp Business"""
    
    def __init__(self):
        self.audit_cache_prefix = "security_audit"
    
    def log_access_attempt(self, user: User, action: str, resource: str, 
                          success: bool, details: Optional[Dict] = None, 
                          ip_address: Optional[str] = None):
        """Registra tentativa de acesso a recursos sensíveis"""
        
        audit_data = {
            'timestamp': timezone.now().isoformat(),
            'user_id': user.id if user else None,
            'username': user.username if user else 'anonymous',
            'action': action,
            'resource': resource,
            'success': success,
            'ip_address': ip_address,
            'details': details or {}
        }
        
        # Log estruturado
        logger.info(f"[SECURITY_AUDIT] {action} {resource} - "
                   f"User: {audit_data['username']} - "
                   f"Success: {success} - "
                   f"IP: {ip_address}")
        
        # Cache para análise rápida
        cache_key = f"{self.audit_cache_prefix}_{user.id if user else 'anon'}_{timezone.now().date()}"
        daily_events = cache.get(cache_key, [])
        daily_events.append(audit_data)
        cache.set(cache_key, daily_events, 86400)  # 24 horas
    
    def log_token_operation(self, user: User, operation: str, business_manager_id: str,
                           success: bool, ip_address: Optional[str] = None):
        """Registra operações com tokens (criar, atualizar, usar)"""
        
        # Hash do business_manager_id para logs
        bm_hash = hashlib.sha256(business_manager_id.encode()).hexdigest()[:8]
        
        self.log_access_attempt(
            user=user,
            action=f"token_{operation}",
            resource=f"business_manager_{bm_hash}",
            success=success,
            details={'operation_type': operation},
            ip_address=ip_address
        )
    
    def log_api_request(self, business_manager_id: str, endpoint: str,
                       success: bool, response_code: Optional[int] = None):
        """Registra requisições para Meta API"""
        
        bm_hash = hashlib.sha256(business_manager_id.encode()).hexdigest()[:8]
        
        api_data = {
            'timestamp': timezone.now().isoformat(),
            'business_manager_hash': bm_hash,
            'endpoint': endpoint,
            'success': success,
            'response_code': response_code
        }
        
        logger.info(f"[META_API_AUDIT] BM: {bm_hash} - "
                   f"Endpoint: {endpoint} - "
                   f"Success: {success} - "
                   f"Code: {response_code}")
        
        # Cache para monitoramento
        cache_key = f"api_audit_{bm_hash}_{timezone.now().date()}"
        daily_api_calls = cache.get(cache_key, [])
        daily_api_calls.append(api_data)
        cache.set(cache_key, daily_api_calls, 86400)
    
    def detect_suspicious_activity(self, user: User) -> Dict[str, Any]:
        """Detecta atividade suspeita do usuário"""
        
        cache_key = f"{self.audit_cache_prefix}_{user.id}_{timezone.now().date()}"
        daily_events = cache.get(cache_key, [])
        
        # Análise de padrões suspeitos
        suspicious_indicators = {
            'multiple_failed_attempts': 0,
            'unusual_hours': 0,
            'rapid_requests': 0,
            'suspicious_ips': [],
            'risk_score': 0
        }
        
        if not daily_events:
            return suspicious_indicators
        
        # Contar falhas
        failed_attempts = [e for e in daily_events if not e['success']]
        suspicious_indicators['multiple_failed_attempts'] = len(failed_attempts)
        
        # Detectar horários incomuns (entre 22h e 6h)
        import datetime
        for event in daily_events:
            event_time = datetime.datetime.fromisoformat(event['timestamp'])
            hour = event_time.hour
            if hour >= 22 or hour <= 6:
                suspicious_indicators['unusual_hours'] += 1
        
        # Detectar requests muito rápidos (mais de 20 por hora)
        if len(daily_events) > 20:
            suspicious_indicators['rapid_requests'] = len(daily_events)
        
        # IPs únicos
        ips = set([e.get('ip_address') for e in daily_events if e.get('ip_address')])
        if len(ips) > 5:  # Mais de 5 IPs diferentes em um dia
            suspicious_indicators['suspicious_ips'] = list(ips)
        
        # Calcular score de risco
        risk_score = 0
        if suspicious_indicators['multiple_failed_attempts'] > 5:
            risk_score += 30
        if suspicious_indicators['unusual_hours'] > 10:
            risk_score += 20
        if suspicious_indicators['rapid_requests'] > 50:
            risk_score += 25
        if len(suspicious_indicators['suspicious_ips']) > 3:
            risk_score += 25
        
        suspicious_indicators['risk_score'] = risk_score
        
        # Log se score alto
        if risk_score > 50:
            logger.warning(f"[SECURITY_ALERT] High risk score for user {user.username}: {risk_score}")
        
        return suspicious_indicators
    
    def get_security_summary(self, days: int = 7) -> Dict[str, Any]:
        """Gera resumo de segurança dos últimos N dias"""
        
        summary = {
            'period_days': days,
            'total_events': 0,
            'failed_attempts': 0,
            'successful_operations': 0,
            'unique_users': set(),
            'unique_ips': set(),
            'high_risk_users': []
        }
        
        # Buscar eventos dos últimos dias (simplificado - em prod usar DB)
        from django.contrib.auth.models import User
        users = User.objects.filter(is_active=True)
        
        for user in users:
            for day_offset in range(days):
                date = timezone.now().date() - timezone.timedelta(days=day_offset)
                cache_key = f"{self.audit_cache_prefix}_{user.id}_{date}"
                daily_events = cache.get(cache_key, [])
                
                if daily_events:
                    summary['total_events'] += len(daily_events)
                    summary['failed_attempts'] += len([e for e in daily_events if not e['success']])
                    summary['successful_operations'] += len([e for e in daily_events if e['success']])
                    summary['unique_users'].add(user.username)
                    
                    for event in daily_events:
                        if event.get('ip_address'):
                            summary['unique_ips'].add(event['ip_address'])
            
            # Verificar usuários de alto risco
            risk_data = self.detect_suspicious_activity(user)
            if risk_data['risk_score'] > 50:
                summary['high_risk_users'].append({
                    'username': user.username,
                    'risk_score': risk_data['risk_score'],
                    'indicators': risk_data
                })
        
        # Converter sets para listas
        summary['unique_users'] = list(summary['unique_users'])
        summary['unique_ips'] = list(summary['unique_ips'])
        
        return summary


# Instância global
security_audit = SecurityAuditLogger()