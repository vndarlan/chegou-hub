# backend/features/metricas_ecomhub/tests.py - TESTES BÁSICOS PARA STATUS TRACKING
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock

from .models import (
    PedidoStatusAtual, HistoricoStatus, ConfiguracaoStatusTracking, AnaliseEcomhub
)
from .services import StatusTrackingService


class PedidoStatusAtualModelTest(TestCase):
    """Testes para o model PedidoStatusAtual"""
    
    def setUp(self):
        self.pedido = PedidoStatusAtual.objects.create(
            pedido_id='TEST001',
            status_atual='processing',
            customer_name='João Silva',
            customer_email='joao@teste.com',
            produto_nome='Produto Teste',
            pais='Brasil',
            preco=100.00,
            data_criacao=timezone.now() - timedelta(days=10),
            data_ultima_atualizacao=timezone.now() - timedelta(days=8),
            shopify_order_number='ORD001',
            tempo_no_status_atual=192  # 8 dias
        )
    
    def test_calculo_nivel_alerta_normal(self):
        """Testa cálculo de alerta para situação normal"""
        self.pedido.tempo_no_status_atual = 120  # 5 dias
        nivel = self.pedido.calcular_nivel_alerta()
        self.assertEqual(nivel, 'normal')
    
    def test_calculo_nivel_alerta_amarelo(self):
        """Testa cálculo de alerta amarelo"""
        self.pedido.tempo_no_status_atual = 200  # >7 dias
        nivel = self.pedido.calcular_nivel_alerta()
        self.assertEqual(nivel, 'amarelo')
    
    def test_calculo_nivel_alerta_vermelho(self):
        """Testa cálculo de alerta vermelho"""
        self.pedido.tempo_no_status_atual = 400  # >14 dias
        nivel = self.pedido.calcular_nivel_alerta()
        self.assertEqual(nivel, 'vermelho')
    
    def test_calculo_nivel_alerta_critico(self):
        """Testa cálculo de alerta crítico"""
        self.pedido.tempo_no_status_atual = 600  # >21 dias
        nivel = self.pedido.calcular_nivel_alerta()
        self.assertEqual(nivel, 'critico')
    
    def test_status_finalizado_sempre_normal(self):
        """Testa que status finalizados sempre retornam normal"""
        self.pedido.status_atual = 'delivered'
        self.pedido.tempo_no_status_atual = 1000  # Muito tempo
        nivel = self.pedido.calcular_nivel_alerta()
        self.assertEqual(nivel, 'normal')
    
    def test_out_for_delivery_limite_menor(self):
        """Testa limites menores para out_for_delivery"""
        self.pedido.status_atual = 'out_for_delivery'
        self.pedido.tempo_no_status_atual = 80  # ~3.3 dias
        nivel = self.pedido.calcular_nivel_alerta()
        self.assertEqual(nivel, 'amarelo')
    
    def test_save_atualiza_nivel_alerta(self):
        """Testa que save() atualiza automaticamente o nível de alerta"""
        self.pedido.tempo_no_status_atual = 400  # Deveria ser vermelho
        self.pedido.save()
        self.assertEqual(self.pedido.nivel_alerta, 'vermelho')


class ConfiguracaoStatusTrackingModelTest(TestCase):
    """Testes para ConfiguracaoStatusTracking"""
    
    def test_get_configuracao_cria_padrao(self):
        """Testa que get_configuracao() cria configuração padrão se não existir"""
        config = ConfiguracaoStatusTracking.get_configuracao()
        self.assertIsNotNone(config)
        self.assertEqual(config.limite_amarelo_padrao, 168)
        self.assertEqual(config.limite_vermelho_padrao, 336)
        self.assertEqual(config.limite_critico_padrao, 504)
    
    def test_get_configuracao_retorna_existente(self):
        """Testa que get_configuracao() retorna configuração existente"""
        # Criar configuração
        config1 = ConfiguracaoStatusTracking.objects.create(
            limite_amarelo_padrao=100
        )
        
        # Buscar novamente
        config2 = ConfiguracaoStatusTracking.get_configuracao()
        self.assertEqual(config1.id, config2.id)
        self.assertEqual(config2.limite_amarelo_padrao, 100)


class StatusTrackingServiceTest(TestCase):
    """Testes para StatusTrackingService"""
    
    def setUp(self):
        self.service = StatusTrackingService()
    
    def test_converter_data_string(self):
        """Testa conversão de string para datetime"""
        # Formato ISO
        data_str = '2023-12-01T10:30:00'
        data_convertida = self.service._converter_data(data_str)
        self.assertEqual(data_convertida.year, 2023)
        self.assertEqual(data_convertida.month, 12)
        self.assertEqual(data_convertida.day, 1)
    
    def test_converter_data_datetime(self):
        """Testa que datetime já convertido é retornado como está"""
        data_original = timezone.now()
        data_convertida = self.service._converter_data(data_original)
        self.assertEqual(data_original, data_convertida)
    
    def test_calcular_tempo_status(self):
        """Testa cálculo de tempo em horas"""
        data_passada = timezone.now() - timedelta(hours=5)
        tempo_horas = self.service._calcular_tempo_status(data_passada)
        self.assertEqual(tempo_horas, 5)
    
    def test_processar_pedido_individual_novo(self):
        """Testa processamento de pedido novo"""
        dados = {
            'pedido_id': 'NEW001',
            'status': 'processing',
            'customer_name': 'Cliente Teste',
            'customer_email': 'cliente@teste.com',
            'produto_nome': 'Produto Novo',
            'pais': 'Brasil',
            'preco': 150.00,
            'data_criacao': timezone.now().isoformat(),
            'data_ultima_atualizacao': timezone.now().isoformat(),
            'shopify_order_number': 'NEW_ORD001'
        }
        
        resultado = self.service._processar_pedido_individual(dados)
        
        self.assertEqual(resultado['acao'], 'criado')
        self.assertTrue(PedidoStatusAtual.objects.filter(pedido_id='NEW001').exists())
        
        # Verificar histórico criado
        pedido = PedidoStatusAtual.objects.get(pedido_id='NEW001')
        self.assertTrue(HistoricoStatus.objects.filter(pedido=pedido).exists())
    
    def test_processar_pedido_individual_atualizado(self):
        """Testa processamento de pedido existente"""
        # Criar pedido existente
        pedido_existente = PedidoStatusAtual.objects.create(
            pedido_id='EXIST001',
            status_atual='processing',
            customer_name='Cliente Existente',
            customer_email='existente@teste.com',
            produto_nome='Produto Existente',
            pais='Brasil',
            preco=100.00,
            data_criacao=timezone.now(),
            data_ultima_atualizacao=timezone.now(),
            shopify_order_number='EXIST_ORD001',
            tempo_no_status_atual=100
        )
        
        # Atualizar com novo status
        dados = {
            'pedido_id': 'EXIST001',
            'status': 'shipped',  # Mudança de status
            'customer_name': 'Cliente Existente Atualizado',
            'customer_email': 'existente@teste.com',
            'produto_nome': 'Produto Existente',
            'pais': 'Brasil',
            'preco': 100.00,
            'data_criacao': timezone.now().isoformat(),
            'data_ultima_atualizacao': timezone.now().isoformat(),
            'shopify_order_number': 'EXIST_ORD001'
        }
        
        resultado = self.service._processar_pedido_individual(dados)
        
        self.assertEqual(resultado['acao'], 'atualizado')
        self.assertTrue(resultado['mudanca_status'])
        
        # Verificar mudança
        pedido_atualizado = PedidoStatusAtual.objects.get(pedido_id='EXIST001')
        self.assertEqual(pedido_atualizado.status_atual, 'shipped')
        self.assertEqual(pedido_atualizado.customer_name, 'Cliente Existente Atualizado')
        
        # Verificar histórico de mudança
        historico = HistoricoStatus.objects.filter(
            pedido=pedido_atualizado,
            status_anterior='processing',
            status_novo='shipped'
        )
        self.assertTrue(historico.exists())


class StatusTrackingAPITest(APITestCase):
    """Testes para as APIs de status tracking"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Criar alguns dados de teste
        self.pedido1 = PedidoStatusAtual.objects.create(
            pedido_id='API001',
            status_atual='processing',
            customer_name='Cliente API 1',
            customer_email='api1@teste.com',
            produto_nome='Produto API 1',
            pais='Brasil',
            preco=100.00,
            data_criacao=timezone.now(),
            data_ultima_atualizacao=timezone.now(),
            shopify_order_number='API_ORD001',
            tempo_no_status_atual=200  # Alerta amarelo
        )
        
        self.pedido2 = PedidoStatusAtual.objects.create(
            pedido_id='API002',
            status_atual='shipped',
            customer_name='Cliente API 2',
            customer_email='api2@teste.com',
            produto_nome='Produto API 2',
            pais='Brasil',
            preco=200.00,
            data_criacao=timezone.now(),
            data_ultima_atualizacao=timezone.now(),
            shopify_order_number='API_ORD002',
            tempo_no_status_atual=400  # Alerta vermelho
        )
    
    def test_dashboard_endpoint(self):
        """Testa endpoint do dashboard"""
        url = '/api/metricas/ecomhub/status-tracking/dashboard/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verificar estrutura da resposta
        self.assertIn('total_pedidos', data)
        self.assertIn('alertas_criticos', data)
        self.assertIn('alertas_vermelhos', data)
        self.assertIn('alertas_amarelos', data)
        self.assertIn('pedidos_normais', data)
        self.assertIn('distribuicao_status', data)
        self.assertIn('tempo_medio_por_status', data)
        
        # Verificar valores
        self.assertEqual(data['total_pedidos'], 2)
        self.assertGreaterEqual(data['alertas_amarelos'], 1)  # pedido1
        self.assertGreaterEqual(data['alertas_vermelhos'], 1)  # pedido2
    
    def test_pedidos_endpoint(self):
        """Testa endpoint de listagem de pedidos"""
        url = '/api/metricas/ecomhub/status-tracking/pedidos/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verificar estrutura paginada
        self.assertIn('results', data)
        self.assertIn('count', data)
        self.assertEqual(len(data['results']), 2)
    
    def test_pedidos_endpoint_filtros(self):
        """Testa filtros no endpoint de pedidos"""
        # Filtro por status
        url = '/api/metricas/ecomhub/status-tracking/pedidos/?status_atual=processing'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data['results']), 1)
        self.assertEqual(data['results'][0]['pedido_id'], 'API001')
        
        # Filtro por nível de alerta
        url = '/api/metricas/ecomhub/status-tracking/pedidos/?nivel_alerta=vermelho'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data['results']), 1)
        self.assertEqual(data['results'][0]['pedido_id'], 'API002')
    
    def test_historico_endpoint(self):
        """Testa endpoint de histórico de pedido"""
        # Criar histórico para o pedido
        HistoricoStatus.objects.create(
            pedido=self.pedido1,
            status_anterior='',
            status_novo='processing',
            data_mudanca=timezone.now(),
            tempo_no_status_anterior=0
        )
        
        url = f'/api/metricas/ecomhub/status-tracking/historico/{self.pedido1.pedido_id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verificar estrutura
        self.assertIn('pedido', data)
        self.assertIn('historico', data)
        self.assertEqual(data['pedido']['pedido_id'], 'API001')
        self.assertGreaterEqual(len(data['historico']), 1)
    
    def test_historico_endpoint_pedido_inexistente(self):
        """Testa histórico para pedido que não existe"""
        url = '/api/metricas/ecomhub/status-tracking/historico/INEXISTENTE/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_configuracao_endpoint(self):
        """Testa endpoint de configuração"""
        url = '/api/metricas/ecomhub/status-tracking/configuracao/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verificar campos de configuração
        self.assertIn('limite_amarelo_padrao', data)
        self.assertIn('limite_vermelho_padrao', data)
        self.assertIn('limite_critico_padrao', data)
    
    @patch('features.metricas_ecomhub.services.status_tracking_service.sincronizar_dados_pedidos')
    def test_sincronizar_endpoint(self, mock_sincronizar):
        """Testa endpoint de sincronização"""
        # Mock da resposta do serviço
        mock_sincronizar.return_value = {
            'status': 'success',
            'message': 'Sincronização concluída',
            'dados_processados': {
                'novos_pedidos': 5,
                'pedidos_atualizados': 3,
                'mudancas_status': 2,
                'erros': 0
            }
        }
        
        url = '/api/metricas/ecomhub/status-tracking/sincronizar/'
        data = {
            'pais_id': 'todos',
            'forcar_sincronizacao': True
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        
        self.assertEqual(response_data['status'], 'success')
        self.assertIn('dados_processados', response_data)
        
        # Verificar que o serviço foi chamado
        mock_sincronizar.assert_called_once()
    
    def test_auth_required(self):
        """Testa que autenticação é obrigatória"""
        self.client.force_authenticate(user=None)
        
        url = '/api/metricas/ecomhub/status-tracking/dashboard/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AnaliseEcomhubAPITest(APITestCase):
    """Testes para APIs existentes de AnaliseEcomhub"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    @patch('requests.post')
    def test_processar_selenium_endpoint(self, mock_post):
        """Testa endpoint processar_selenium (endpoint existente)"""
        # Mock da resposta do servidor externo
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'dados_processados': [{'pedido_id': 'TEST001'}],
            'estatisticas': {'total': 1}
        }
        mock_post.return_value = mock_response
        
        url = '/api/metricas/ecomhub/analises/processar_selenium/'
        data = {
            'data_inicio': '2023-12-01',
            'data_fim': '2023-12-31',
            'pais_id': '164'
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        
        self.assertEqual(response_data['status'], 'success')
        self.assertIn('dados_processados', response_data)
        
        # Verificar que requests.post foi chamado
        mock_post.assert_called_once()
    
    def test_processar_selenium_dados_invalidos(self):
        """Testa validação de dados no endpoint processar_selenium"""
        url = '/api/metricas/ecomhub/analises/processar_selenium/'
        
        # Data início maior que data fim
        data = {
            'data_inicio': '2023-12-31',
            'data_fim': '2023-12-01',
            'pais_id': '164'
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # País inválido
        data = {
            'data_inicio': '2023-12-01',
            'data_fim': '2023-12-31',
            'pais_id': '999'  # País inválido
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)