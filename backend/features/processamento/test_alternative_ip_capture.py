# backend/features/processamento/test_alternative_ip_capture.py

"""
Script de teste para os novos métodos alternativos de captura de IP.

Este script testa todas as funcionalidades implementadas:
1. Geolocalização por endereço
2. Análise de padrões comportamentais
3. APIs de geolocalização externa
4. Sistema de scoring e validação
5. Fallback inteligente

Para executar:
cd backend
python -m features.processamento.test_alternative_ip_capture
"""

import sys
import os
import django
from pathlib import Path

# Configuração do Django
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.processamento.services.alternative_ip_capture import (
    AlternativeIPCaptureService, 
    IPScoringSystem
)
from features.processamento.services.geolocation_api_service import (
    get_geolocation_service,
    GeolocationConfig,
    GeolocationFallbackService
)
from features.processamento.services.improved_ip_detection import get_improved_ip_detector

def test_alternative_ip_capture():
    """Testa serviço de captura alternativa"""
    print("=== TESTE: SERVIÇO DE CAPTURA ALTERNATIVA ===")
    
    # Dados de pedido simulados sem IP direto
    order_data = {
        'id': 12345,
        'order_number': 'TEST001',
        'created_at': '2025-08-13T10:30:00Z',
        'total_price': '149.90',
        'currency': 'BRL',
        'customer': {
            'email': 'cliente@teste.com',
            'first_name': 'João',
            'last_name': 'Silva',
            'phone': '+5511999998888'
        },
        'shipping_address': {
            'city': 'São Paulo',
            'province': 'SP',
            'province_code': 'SP',
            'country': 'Brazil',
            'country_code': 'BR',
            'zip': '01310-100',
            'address1': 'Av. Paulista, 1000'
        },
        'line_items': [
            {
                'title': 'Smartphone Samsung Galaxy',
                'sku': 'SMART001',
                'price': '149.90'
            }
        ],
        # Propositalmente SEM client_details.browser_ip para testar alternativas
        'client_details': {}
    }
    
    # Pedidos similares simulados
    similar_orders = [
        {
            'id': 12340,
            'created_at': '2025-08-10T09:15:00Z',
            'total_price': '129.90',
            '_customer_ip': '201.10.50.123',  # IP válido conhecido
            'customer': {'email': 'cliente@teste.com'}
        },
        {
            'id': 12342,
            'created_at': '2025-08-11T14:22:00Z',
            'total_price': '179.90',
            '_customer_ip': '201.10.50.123',  # Mesmo IP
            'customer': {'email': 'cliente@teste.com'}
        }
    ]
    
    service = AlternativeIPCaptureService()
    
    # 1. Teste de análise por localização
    print("\n1. Análise por Geolocalização de Endereço:")
    location_analysis = service.analyze_order_location(order_data)
    print(f"   IP Inferido: {location_analysis['inferred_ip']}")
    print(f"   Confiança: {location_analysis['confidence_score']:.2f}")
    print(f"   Método: {location_analysis['method']}")
    print(f"   Detalhes: {location_analysis['details']}")
    
    # 2. Teste de análise comportamental
    print("\n2. Análise de Padrões Comportamentais:")
    behavioral_analysis = service.analyze_behavioral_patterns(order_data, similar_orders)
    print(f"   IP Inferido: {behavioral_analysis['inferred_ip']}")
    print(f"   Confiança: {behavioral_analysis['confidence_score']:.2f}")
    print(f"   Padrões Encontrados: {len(behavioral_analysis['patterns_found'])}")
    for pattern in behavioral_analysis['patterns_found']:
        print(f"     - {pattern['type']}: {pattern['details']}")
    
    # 3. Teste de análise temporal
    print("\n3. Análise de Padrões Temporais:")
    temporal_analysis = service.analyze_temporal_patterns(order_data)
    print(f"   IP Inferido: {temporal_analysis['inferred_ip']}")
    print(f"   Confiança: {temporal_analysis['confidence_score']:.2f}")
    print(f"   Análise de Fuso: {temporal_analysis['timezone_analysis']}")
    
    # 4. Teste de análise composta
    print("\n4. Análise Composta (Todos os Métodos):")
    composite_analysis = service.create_composite_analysis(order_data, similar_orders)
    print(f"   IP Final: {composite_analysis['final_inferred_ip']}")
    print(f"   Confiança Final: {composite_analysis['final_confidence_score']:.2f}")
    print(f"   Método Usado: {composite_analysis['method_used']}")
    print(f"   Recomendação: {composite_analysis['recommendation']}")
    
    return composite_analysis

def test_geolocation_services():
    """Testa serviços de geolocalização"""
    print("\n=== TESTE: SERVIÇOS DE GEOLOCALIZAÇÃO ===")
    
    # 1. Teste de configuração
    print("\n1. Validação de Configuração:")
    config_validation = GeolocationConfig.validate_configuration()
    print(f"   Configuração Válida: {config_validation['valid']}")
    print(f"   Serviços Disponíveis: {config_validation['services_available']}")
    if config_validation['warnings']:
        print("   Avisos:")
        for warning in config_validation['warnings']:
            print(f"     - {warning}")
    
    # 2. Teste de serviços
    print("\n2. Teste de Serviços:")
    geo_service = get_geolocation_service()
    service_status = geo_service.get_service_status()
    print(f"   Total de Serviços: {service_status['total_services']}")
    
    for service_detail in service_status['services_detail']:
        print(f"   - {service_detail['name']}: API Key = {service_detail['has_api_key']}")
    
    # 3. Teste com IP real (se serviços disponíveis)
    print("\n3. Teste de Geolocalização (IP: 8.8.8.8):")
    if service_status['total_services'] > 0:
        location_result = geo_service.get_location_by_ip('8.8.8.8')
        print(f"   Sucesso: {location_result.get('success', False)}")
        print(f"   País: {location_result.get('country', 'N/A')}")
        print(f"   Cidade: {location_result.get('city', 'N/A')}")
        print(f"   Fonte: {location_result.get('source', 'N/A')}")
    else:
        print("   Nenhum serviço configurado - testando fallback")
        
        # Teste do serviço de fallback
        fallback_service = GeolocationFallbackService()
        fallback_result = fallback_service.get_basic_location_by_ip('201.10.50.100')
        print(f"   Fallback - Sucesso: {fallback_result.get('success', False)}")
        print(f"   Fallback - País: {fallback_result.get('country', 'N/A')}")

def test_ip_scoring_system():
    """Testa sistema de scoring de IP"""
    print("\n=== TESTE: SISTEMA DE SCORING DE IP ===")
    
    scoring_system = IPScoringSystem()
    
    # Dados de análise simulados
    ip_analysis_results = {
        'final_inferred_ip': '201.10.50.123',
        'final_confidence_score': 0.7,
        'method_used': 'behavioral_analysis',
        'all_methods_results': [
            {
                'method': 'geolocation_address',
                'inferred_ip': '201.10.50.123',
                'confidence_score': 0.6
            },
            {
                'method': 'behavioral_analysis',
                'inferred_ip': '201.10.50.123',
                'confidence_score': 0.8,
                'patterns_found': [
                    {'type': 'consistent_purchase_time', 'confidence': 0.7},
                    {'type': 'consistent_order_value', 'confidence': 0.5}
                ]
            }
        ]
    }
    
    print("\n1. Cálculo de Score de IP:")
    scoring_result = scoring_system.calculate_ip_score(ip_analysis_results)
    print(f"   Score Total: {scoring_result['total_score']:.1f}/100")
    print(f"   Nível de Confiança: {scoring_result['confidence_level']}")
    print(f"   Recomendações:")
    for rec in scoring_result['recommendations']:
        print(f"     - {rec}")
    
    if scoring_result['risk_factors']:
        print(f"   Fatores de Risco:")
        for risk in scoring_result['risk_factors']:
            print(f"     - {risk}")
    
    print("\n2. Breakdown por Critério:")
    for criterion, details in scoring_result['criteria_scores'].items():
        print(f"   {criterion}: {details['raw_score']:.1f} (peso: {details['weight']:.1f})")

def test_improved_ip_detector():
    """Testa detector melhorado de IP"""
    print("\n=== TESTE: DETECTOR MELHORADO DE IP ===")
    
    # Dados de pedido com IP no Shopify (cenário normal)
    order_with_ip = {
        'id': 12346,
        'order_number': 'TEST002',
        'created_at': '2025-08-13T11:45:00Z',
        'client_details': {
            'browser_ip': '201.15.75.200'  # IP válido do Shopify
        },
        'customer': {
            'email': 'cliente2@teste.com'
        },
        'shipping_address': {
            'city': 'Rio de Janeiro',
            'province_code': 'RJ',
            'country_code': 'BR'
        }
    }
    
    # Dados de pedido SEM IP no Shopify (cenário de fallback)
    order_without_ip = {
        'id': 12347,
        'order_number': 'TEST003',
        'created_at': '2025-08-13T15:20:00Z',
        'client_details': {},  # Sem browser_ip
        'customer': {
            'email': 'cliente3@teste.com'
        },
        'shipping_address': {
            'city': 'Belo Horizonte',
            'province_code': 'MG',
            'country_code': 'BR'
        }
    }
    
    detector = get_improved_ip_detector()
    
    print("\n1. Detecção com IP Disponível no Shopify:")
    result1 = detector.detect_customer_ip(order_with_ip, use_external_apis=False)
    print(f"   IP Encontrado: {result1['customer_ip']}")
    print(f"   Método: {result1['method_used']}")
    print(f"   Confiança: {result1['confidence_score']:.2f}")
    print(f"   Recomendação: {result1['recommendation']}")
    print(f"   Suspeito: {result1['is_suspicious']}")
    
    print("\n2. Detecção SEM IP no Shopify (Métodos Alternativos):")
    result2 = detector.detect_customer_ip(order_without_ip, use_external_apis=False)
    print(f"   IP Encontrado: {result2['customer_ip']}")
    print(f"   Método: {result2['method_used']}")
    print(f"   Confiança: {result2['confidence_score']:.2f}")
    print(f"   Recomendação: {result2['recommendation']}")
    
    print("\n3. Análise de Qualidade de IP:")
    if result1['customer_ip']:
        quality_analysis = detector.analyze_ip_quality(result1['customer_ip'], order_with_ip)
        print(f"   Score de Qualidade: {quality_analysis['quality_score']:.2f}")
        print(f"   Recomendação: {quality_analysis['recommendation']}")
        if quality_analysis['risk_factors']:
            print(f"   Fatores de Risco: {quality_analysis['risk_factors']}")
    
    print("\n4. Estatísticas do Detector:")
    stats = detector.get_detection_statistics()
    if stats.get('total_requests', 0) > 0:
        print(f"   Total de Requisições: {stats['total_requests']}")
        print(f"   Taxa de Sucesso Total: {stats['success_rates']['total_success']:.1f}%")
        print(f"   Shopify Direto: {stats['success_rates']['shopify_direct']:.1f}%")
        print(f"   Captura Alternativa: {stats['success_rates']['alternative_capture']:.1f}%")

def test_batch_processing():
    """Testa processamento em lote"""
    print("\n=== TESTE: PROCESSAMENTO EM LOTE ===")
    
    # Lista de pedidos simulados
    orders_batch = [
        {
            'id': 12350,
            'client_details': {'browser_ip': '201.20.30.40'},
            'customer': {'email': 'batch1@teste.com'},
            'shipping_address': {'city': 'São Paulo', 'province_code': 'SP'}
        },
        {
            'id': 12351,
            'client_details': {},  # Sem IP
            'customer': {'email': 'batch2@teste.com'},
            'shipping_address': {'city': 'Curitiba', 'province_code': 'PR'}
        },
        {
            'id': 12352,
            'client_details': {'browser_ip': '177.55.192.100'},  # IP suspeito
            'customer': {'email': 'batch3@teste.com'},
            'shipping_address': {'city': 'Salvador', 'province_code': 'BA'}
        }
    ]
    
    detector = get_improved_ip_detector()
    
    print(f"\n1. Processando {len(orders_batch)} pedidos em lote:")
    batch_results = detector.batch_detect_ips(orders_batch, use_external_apis=False)
    
    print(f"   Total Processados: {batch_results['total_processed']}")
    print(f"   Detecções Bem-sucedidas: {batch_results['successful_detections']}")
    print(f"   Tempo de Processamento: {batch_results['processing_time']:.2f}s")
    
    print("\n2. Resultados Individuais:")
    for order_id, result in batch_results['results'].items():
        print(f"   Pedido {order_id}:")
        print(f"     IP: {result.get('customer_ip', 'N/A')}")
        print(f"     Método: {result.get('method_used', 'N/A')}")
        print(f"     Confiança: {result.get('confidence_score', 0):.2f}")
    
    print("\n3. Estatísticas do Lote:")
    summary = batch_results['summary_stats']
    print(f"   Métodos Mais Usados: {dict(summary['methods_used'])}")
    print(f"   Confiança Média: {summary['average_confidence']:.2f}")

def main():
    """Executa todos os testes"""
    print("🔍 TESTE COMPLETO: MÉTODOS ALTERNATIVOS DE CAPTURA DE IP")
    print("=" * 70)
    
    try:
        # 1. Testa captura alternativa
        composite_result = test_alternative_ip_capture()
        
        # 2. Testa serviços de geolocalização
        test_geolocation_services()
        
        # 3. Testa sistema de scoring
        test_ip_scoring_system()
        
        # 4. Testa detector melhorado
        test_improved_ip_detector()
        
        # 5. Testa processamento em lote
        test_batch_processing()
        
        print("\n" + "=" * 70)
        print("✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!")
        print("\n📊 RESUMO DOS RECURSOS IMPLEMENTADOS:")
        print("1. ✅ Geolocalização por endereço")
        print("2. ✅ Análise de padrões comportamentais")
        print("3. ✅ APIs de geolocalização externa (preparado)")
        print("4. ✅ Sistema de scoring e validação")
        print("5. ✅ Fallback inteligente")
        print("6. ✅ Detector melhorado integrado")
        print("7. ✅ Processamento em lote")
        print("8. ✅ Análise de qualidade de IP")
        
        if composite_result['final_inferred_ip']:
            print(f"\n🎯 DEMONSTRAÇÃO: IP inferido com sucesso!")
            print(f"   IP: {composite_result['final_inferred_ip']}")
            print(f"   Confiança: {composite_result['final_confidence_score']:.2f}")
            print(f"   Método: {composite_result['method_used']}")
            print(f"   Recomendação: {composite_result['recommendation']}")
        
    except Exception as e:
        print(f"\n❌ ERRO DURANTE OS TESTES: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()