"""
Teste de validação do token PrimeCOD - Migração de Segurança
"""

from django.test import TestCase
from django.conf import settings
from .utils.primecod_client import PrimeCODClient, PrimeCODAPIError
import os

class PrimeCODTokenValidationTest(TestCase):
    """Testes para validar a migração segura do token PrimeCOD"""
    
    def test_token_exists_in_settings(self):
        """Verifica se o token está configurado no Django settings"""
        token = getattr(settings, 'PRIMECOD_API_TOKEN', None)
        self.assertIsNotNone(token, "PRIMECOD_API_TOKEN deve estar configurado")
        self.assertNotEqual(token, '', "Token não pode estar vazio")
        self.assertNotEqual(token, 'your_primecod_api_token_here', "Token deve ser válido")
    
    def test_token_format(self):
        """Verifica se o token tem o formato correto"""
        token = getattr(settings, 'PRIMECOD_API_TOKEN', '')
        self.assertIn('|', token, "Token deve ter formato user_id|hash")
        parts = token.split('|')
        self.assertEqual(len(parts), 2, "Token deve ter exatamente uma barra vertical")
        self.assertTrue(parts[0].isdigit(), "Primeira parte deve ser ID numérico")
        self.assertTrue(len(parts[1]) > 20, "Hash deve ter pelo menos 20 caracteres")
    
    def test_client_initialization(self):
        """Verifica se o cliente PrimeCOD inicializa corretamente"""
        try:
            client = PrimeCODClient()
            self.assertIsNotNone(client.token)
            self.assertIn('Bearer', client.headers['Authorization'])
        except PrimeCODAPIError as e:
            self.fail(f"Cliente não deveria falhar: {e}")
    
    def test_no_react_app_token_in_env(self):
        """Verifica que não há token do frontend nas variáveis de ambiente"""
        react_token = os.getenv('REACT_APP_PRIMECOD_TOKEN')
        self.assertIsNone(react_token, "REACT_APP_PRIMECOD_TOKEN não deveria existir")
    
    def test_token_masking_in_logs(self):
        """Verifica se o token é mascarado nos logs"""
        token = getattr(settings, 'PRIMECOD_API_TOKEN', '')
        
        # Token nunca deve aparecer completo em logs de produção
        if token and '|' in token:
            user_id, hash_part = token.split('|', 1)
            masked_token = f"{user_id}|{'*' * (len(hash_part) - 4)}{hash_part[-4:]}"
            self.assertNotEqual(token, masked_token, "Token deve ser mascarado em logs")

if __name__ == '__main__':
    import django
    from django.test.utils import get_runner
    from django.conf import settings
    
    django.setup()
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(["features.metricas_primecod.test_token_validation"])