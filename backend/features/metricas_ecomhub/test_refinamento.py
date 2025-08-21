# Teste do Refinamento do Sistema de Status Tracking
# backend/features/metricas_ecomhub/test_refinamento.py

import sys
import os
import django

# Configurar Django
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.metricas_ecomhub.models import PedidoStatusAtual
from datetime import datetime, timedelta
from django.utils import timezone

def test_status_classification():
    """Testa classificação de status finais vs ativos"""
    print("=== TESTE: Classificação de Status ===")
    
    # Status finais
    finais = ['delivered', 'returned', 'cancelled']
    for status in finais:
        pedido = PedidoStatusAtual()
        pedido.status_atual = status
        print(f"Status '{status}': is_finalizado={pedido.is_finalizado}, is_ativo={pedido.is_ativo}")
    
    # Status ativos
    ativos = ['processing', 'shipped', 'out_for_delivery', 'issue']
    for status in ativos:
        pedido = PedidoStatusAtual()
        pedido.status_atual = status
        print(f"Status '{status}': is_finalizado={pedido.is_finalizado}, is_ativo={pedido.is_ativo}")

def test_alert_logic():
    """Testa nova lógica de alertas"""
    print("\n=== TESTE: Lógica de Alertas ===")
    
    # Teste status finais (devem retornar 'normal')
    print("\n--- Status Finais (devem ser 'normal') ---")
    pedido = PedidoStatusAtual()
    for status in ['delivered', 'returned', 'cancelled']:
        pedido.status_atual = status
        pedido.tempo_no_status_atual = 1000  # Muito tempo
        alerta = pedido.calcular_nivel_alerta()
        print(f"Status '{status}' com 1000h: {alerta}")
    
    # Teste status 'issue' (sempre crítico se > 24h)
    print("\n--- Status 'issue' ---")
    pedido.status_atual = 'issue'
    for horas in [12, 24, 48]:
        pedido.tempo_no_status_atual = horas
        alerta = pedido.calcular_nivel_alerta()
        print(f"Issue com {horas}h: {alerta}")
    
    # Teste 'out_for_delivery' (limites baixos)
    print("\n--- Status 'out_for_delivery' ---")
    pedido.status_atual = 'out_for_delivery'
    for horas in [48, 72, 120, 168]:
        pedido.tempo_no_status_atual = horas
        alerta = pedido.calcular_nivel_alerta()
        print(f"Out for delivery com {horas}h: {alerta}")
    
    # Teste 'shipped'
    print("\n--- Status 'shipped' ---")
    pedido.status_atual = 'shipped'
    for horas in [100, 168, 240, 336]:
        pedido.tempo_no_status_atual = horas
        alerta = pedido.calcular_nivel_alerta()
        print(f"Shipped com {horas}h: {alerta}")

def test_constants():
    """Testa constantes da classe"""
    print("\n=== TESTE: Constantes ===")
    print(f"STATUS_FINAIS: {PedidoStatusAtual.STATUS_FINAIS}")
    print(f"STATUS_ATIVOS: {PedidoStatusAtual.STATUS_ATIVOS}")

if __name__ == "__main__":
    print("🔧 TESTE DO REFINAMENTO STATUS TRACKING ECOMHUB")
    print("=" * 50)
    
    test_constants()
    test_status_classification()
    test_alert_logic()
    
    print("\n✅ TESTES CONCLUÍDOS!")
    print("\n🎯 FOCO: Apenas pedidos ativos que podem ter problemas!")
    print("📊 IGNORANDO: Pedidos já finalizados (delivered, returned, cancelled)")