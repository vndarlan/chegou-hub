# backend/features/processamento/tests/test_security.py
import json
import time
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from django.core.cache import cache
from unittest.mock import patch, MagicMock

from ..models import ShopifyConfig, IPSecurityAuditLog
from ..utils.security_utils import IPSecurityUtils, RateLimitManager, AuditLogger
from ..middleware.ip_security_middleware import IPDetectorSecurityMiddleware

class IPSecurityUtilsTest(TestCase):
    """Testa utilitários de segurança para IPs"""
    
    def setUp(self):
        self.valid_ipv4 = "192.168.1.100"
        self.valid_ipv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
        self.invalid_ip = "invalid.ip.address"
    
    def test_mask_ip_ipv4(self):
        """Testa mascaramento de IPv4"""
        masked = IPSecurityUtils.mask_ip(self.valid_ipv4)
        self.assertEqual(masked, "192.168.xxx.xxx")
    
    def test_mask_ip_ipv6(self):
        """Testa mascaramento de IPv6"""
        masked = IPSecurityUtils.mask_ip(self.valid_ipv6)
        self.assertTrue(masked.endswith("xxxx:xxxx:xxxx:xxxx"))
    
    def test_mask_invalid_ip(self):
        """Testa mascaramento de IP inválido"""
        masked = IPSecurityUtils.mask_ip(self.invalid_ip)
        self.assertEqual(masked, "xxx.xxx.xxx.xxx")
    
    def test_hash_ip(self):
        """Testa geração de hash SHA256"""
        hash1 = IPSecurityUtils.hash_ip(self.valid_ipv4)
        hash2 = IPSecurityUtils.hash_ip(self.valid_ipv4)
        
        # Mesmo IP deve gerar mesmo hash
        self.assertEqual(hash1, hash2)
        self.assertEqual(len(hash1), 64)  # SHA256 tem 64 caracteres hex
    
    def test_validate_ip_format(self):
        """Testa validação de formato IP"""
        self.assertTrue(IPSecurityUtils.validate_ip_format(self.valid_ipv4))
        self.assertTrue(IPSecurityUtils.validate_ip_format(self.valid_ipv6))
        self.assertFalse(IPSecurityUtils.validate_ip_format(self.invalid_ip))
    
    def test_sanitize_ip_input(self):
        """Testa sanitização de input IP"""
        # IP válido deve passar
        sanitized = IPSecurityUtils.sanitize_ip_input("192.168.1.1")
        self.assertEqual(sanitized, "192.168.1.1")
        
        # IP com caracteres suspeitos deve ser limpo
        dirty_ip = "192.168.1.1'; DROP TABLE users; --"
        sanitized = IPSecurityUtils.sanitize_ip_input(dirty_ip)
        self.assertEqual(sanitized, "192.168.1.1")
        
        # Input inválido deve retornar None
        invalid = IPSecurityUtils.sanitize_ip_input("invalid")
        self.assertIsNone(invalid)

class RateLimitManagerTest(TestCase):
    """Testa gerenciamento de rate limiting"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        cache.clear()  # Limpa cache entre testes
    
    def test_rate_limit_within_bounds(self):
        """Testa rate limit dentro dos limites"""
        allowed, remaining = RateLimitManager.check_rate_limit(self.user, 'ip_search')
        self.assertTrue(allowed)
        self.assertEqual(remaining, 9)  # 10 - 1 = 9 restantes
    
    def test_rate_limit_exceeded(self):
        """Testa rate limit excedido"""
        # Simula 10 requisições (limite)
        for i in range(10):
            allowed, remaining = RateLimitManager.check_rate_limit(self.user, 'ip_search')
            self.assertTrue(allowed)
        
        # 11ª requisição deve ser negada
        allowed, remaining = RateLimitManager.check_rate_limit(self.user, 'ip_search')
        self.assertFalse(allowed)
        self.assertEqual(remaining, 0)
    
    def test_different_users_separate_limits(self):
        """Testa que usuários diferentes têm limites separados"""
        user2 = User.objects.create_user(
            username='testuser2',
            password='testpass123'
        )
        
        # Esgota limite do user1
        for i in range(10):
            RateLimitManager.check_rate_limit(self.user, 'ip_search')
        
        # User2 deve ainda ter limite disponível
        allowed, remaining = RateLimitManager.check_rate_limit(user2, 'ip_search')
        self.assertTrue(allowed)
        self.assertEqual(remaining, 9)

class SecurityMiddlewareTest(TestCase):
    """Testa middleware de segurança"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client = Client()
        self.client.force_login(self.user)
        
        self.config = ShopifyConfig.objects.create(
            user=self.user,
            nome_loja="Test Store",
            shop_url="test-store.myshopify.com",
            access_token="test-token"
        )
    
    def test_rate_limit_middleware_blocks_excess_requests(self):
        """Testa se middleware bloqueia requisições excessivas"""
        url = reverse('processamento:buscar_pedidos_mesmo_ip')
        data = {'loja_id': self.config.id, 'days': 7}
        
        # Faz 10 requisições (limite)
        for i in range(10):
            response = self.client.post(url, data, content_type='application/json')
        
        # 11ª requisição deve ser bloqueada com 429
        response = self.client.post(url, data, content_type='application/json')
        self.assertEqual(response.status_code, 429)
        self.assertIn('Rate limit exceeded', response.json()['error'])
    
    def test_security_headers_added(self):
        """Testa se headers de segurança são adicionados"""
        with patch('features.processamento.services.shopify_detector.ShopifyDuplicateOrderDetector') as mock_detector:
            mock_detector.return_value.get_orders_by_ip.return_value = {
                'ip_groups': [],
                'total_ips_found': 0,
                'total_orders_analyzed': 0
            }
            
            url = reverse('processamento:buscar_pedidos_mesmo_ip')
            response = self.client.post(url, {
                'loja_id': self.config.id,
                'days': 7
            }, content_type='application/json')
            
            # Verifica headers de segurança
            self.assertEqual(response['Cache-Control'], 'no-store, no-cache, must-revalidate')
            self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
            self.assertEqual(response['X-Frame-Options'], 'DENY')
    
    def test_malicious_request_blocked(self):
        """Testa se requisições maliciosas são bloqueadas"""
        url = reverse('processamento:buscar_pedidos_mesmo_ip')
        malicious_data = {
            'loja_id': "1; DROP TABLE users; --",
            'days': '<script>alert("xss")</script>'
        }
        
        response = self.client.post(url, malicious_data, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('security policy', response.json()['error'])

class IPAuditLogTest(TestCase):
    """Testa logging de auditoria"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
    
    def test_audit_log_creation(self):
        """Testa criação de log de auditoria"""
        log = IPSecurityAuditLog.log_activity(
            user=self.user,
            action='ip_search',
            user_ip='127.0.0.1',
            target_ip='192.168.1.100',
            details={'test': 'data'},
            risk_level='medium'
        )
        
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.action, 'ip_search')
        self.assertEqual(log.user_ip, '127.0.0.1')
        self.assertEqual(log.risk_level, 'medium')
        self.assertIn('test', log.details)
        
        # Verifica se IP foi hasheado e mascarado
        self.assertNotEqual(log.target_ip_hash, '')
        self.assertEqual(log.target_ip_masked, '192.168.xxx.xxx')

class IPDetectorSecurityTest(TestCase):
    """Testa segurança dos endpoints do detector de IP"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client = Client()
        self.client.force_login(self.user)
        
        self.config = ShopifyConfig.objects.create(
            user=self.user,
            nome_loja="Test Store",
            shop_url="test-store.myshopify.com",
            access_token="test-token"
        )
    
    @patch('features.processamento.services.shopify_detector.ShopifyDuplicateOrderDetector')
    def test_ip_masking_in_response(self, mock_detector):
        """Testa se IPs são mascarados na resposta"""
        # Mock da resposta do detector
        mock_detector.return_value.get_orders_by_ip.return_value = {
            'ip_groups': [
                {
                    'ip': '192.168.1.100',
                    'order_count': 3,
                    'orders': []
                }
            ],
            'total_ips_found': 1,
            'total_orders_analyzed': 3
        }
        
        url = reverse('processamento:buscar_pedidos_mesmo_ip')
        response = self.client.post(url, {
            'loja_id': self.config.id,
            'days': 7
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verifica se IP foi mascarado
        ip_group = data['data']['ip_groups'][0]
        self.assertEqual(ip_group['ip'], '192.168.xxx.xxx')
        self.assertIn('ip_hash', ip_group)
        self.assertIn('security_notice', data)
    
    def test_input_validation_days_limit(self):
        """Testa limitação de dias por segurança"""
        url = reverse('processamento:buscar_pedidos_mesmo_ip')
        
        response = self.client.post(url, {
            'loja_id': self.config.id,
            'days': 90  # Acima do limite de 30
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('30 dias', response.json()['error'])
    
    def test_input_validation_invalid_params(self):
        """Testa validação de parâmetros inválidos"""
        url = reverse('processamento:buscar_pedidos_mesmo_ip')
        
        # Teste com loja_id inválido
        response = self.client.post(url, {
            'loja_id': 'invalid',
            'days': 7
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('inválidos', response.json()['error'])
    
    @patch('features.processamento.services.shopify_detector.ShopifyDuplicateOrderDetector')
    def test_audit_log_created_on_access(self, mock_detector):
        """Testa se log de auditoria é criado no acesso"""
        mock_detector.return_value.get_orders_by_ip.return_value = {
            'ip_groups': [],
            'total_ips_found': 0,
            'total_orders_analyzed': 0
        }
        
        url = reverse('processamento:buscar_pedidos_mesmo_ip')
        self.client.post(url, {
            'loja_id': self.config.id,
            'days': 7
        }, content_type='application/json')
        
        # Verifica se log de auditoria foi criado
        audit_logs = IPSecurityAuditLog.objects.filter(user=self.user)
        self.assertTrue(audit_logs.exists())
    
    def test_unauthenticated_access_denied(self):
        """Testa se acesso não autenticado é negado"""
        client = Client()  # Cliente sem login
        url = reverse('processamento:buscar_pedidos_mesmo_ip')
        
        response = client.post(url, {
            'loja_id': self.config.id,
            'days': 7
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 401)

class DataSanitizationTest(TestCase):
    """Testa sanitização de dados sensíveis"""
    
    def test_order_details_sanitization(self):
        """Testa sanitização de detalhes de pedidos"""
        from features.processamento.views import _sanitize_order_details
        
        # Dados com informações sensíveis
        order_details = {
            'shipping_address': {
                'latitude': '-23.550520',
                'longitude': '-46.633308',
                'zip': '01310-100',
                'city': 'São Paulo'
            },
            'customer_info': {
                'email': 'customer@example.com',
                'note': 'Cliente VIP - dados privados',
                'multipass_identifier': 'secret123'
            }
        }
        
        sanitized = _sanitize_order_details(order_details)
        
        # Verifica remoção de coordenadas
        self.assertNotIn('latitude', sanitized['shipping_address'])
        self.assertNotIn('longitude', sanitized['shipping_address'])
        
        # Verifica mascaramento de CEP
        self.assertEqual(sanitized['shipping_address']['zip'], '013xxx')
        
        # Verifica remoção de dados sensíveis do cliente
        self.assertNotIn('note', sanitized['customer_info'])
        self.assertNotIn('multipass_identifier', sanitized['customer_info'])
        
        # Verifica que dados importantes são mantidos
        self.assertEqual(sanitized['shipping_address']['city'], 'São Paulo')
        self.assertEqual(sanitized['customer_info']['email'], 'customer@example.com')

if __name__ == '__main__':
    # Executa testes de segurança
    import unittest
    unittest.main()