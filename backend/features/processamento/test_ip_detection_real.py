#!/usr/bin/env python
"""
Teste REAL da detecção de IPs usando a lógica do detector Shopify atual
"""
import os
import sys
import json
from datetime import datetime, timedelta

# Adiciona o diretório do projeto ao Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from features.processamento.services.shopify_detector import ShopifyDuplicateOrderDetector

# Casos de teste baseados na estrutura real do Shopify
test_cases = [
    {
        "name": "Pedido COM client_details.browser_ip (cenário atual funcionando)",
        "order": {
            "id": 5678901234,
            "order_number": "#1001", 
            "created_at": "2025-08-13T11:00:00Z",
            "customer": {
                "id": 123456,
                "email": "customer@example.com",
                "default_address": {
                    "id": 234567,
                    "address1": "Rua das Flores, 123",
                    "city": "São Paulo",
                    "zip": "01310-100"
                }
            },
            "client_details": {
                "browser_ip": "201.17.123.45",
                "user_agent": "Mozilla/5.0...",
                "session_hash": "abc123"
            }
        }
    },
    {
        "name": "Pedido SEM client_details (problema atual)",
        "order": {
            "id": 5678901235,
            "order_number": "#1002",
            "created_at": "2025-08-13T12:00:00Z", 
            "customer": {
                "id": 123457,
                "email": "customer2@example.com",
                "default_address": {
                    "id": 234568,
                    "address1": "Av. Paulista, 1000",
                    "city": "São Paulo",
                    "zip": "01310-200"
                }
            }
            # NOTA: client_details ausente completamente
        }
    },
    {
        "name": "Pedido com IP em customer.default_address (solução prioritária)",
        "order": {
            "id": 5678901236,
            "order_number": "#1003", 
            "created_at": "2025-08-13T13:00:00Z",
            "customer": {
                "id": 123458,
                "email": "customer3@example.com",
                "default_address": {
                    "id": 234569,
                    "address1": "Rua B, 456",
                    "city": "Rio de Janeiro",
                    "zip": "20040-020",
                    "client_ip": "177.12.34.56"  # IP no endereço padrão do cliente
                }
            },
            "client_details": {
                # client_details existe mas SEM browser_ip
                "user_agent": "Mozilla/5.0...",
                "session_hash": "mobile123"
            }
        }
    },
    {
        "name": "Pedido com IP em shipping_address",
        "order": {
            "id": 5678901237,
            "order_number": "#1004",
            "created_at": "2025-08-13T14:00:00Z",
            "customer": {
                "id": 123459,
                "email": "customer4@example.com"
            },
            "shipping_address": {
                "first_name": "Ana",
                "last_name": "Silva", 
                "address1": "Rua C, 789",
                "city": "Brasília",
                "zip": "70040-010",
                "customer_ip": "191.34.56.78"  # IP no endereço de entrega
            }
        }
    },
    {
        "name": "Pedido com IP direto no pedido (nível raiz)", 
        "order": {
            "id": 5678901238,
            "order_number": "#1005",
            "created_at": "2025-08-13T15:00:00Z",
            "customer": {
                "id": 123460,
                "email": "customer5@example.com"
            },
            "customer_ip": "187.45.67.89"  # IP direto no pedido
        }
    },
    {
        "name": "Pedido com IP suspeito (servidor/proxy)",
        "order": {
            "id": 5678901239,
            "order_number": "#1006",
            "created_at": "2025-08-13T16:00:00Z",
            "customer": {
                "id": 123461,
                "email": "customer6@example.com"
            },
            "client_details": {
                "browser_ip": "177.55.192.100"  # IP suspeito conhecido
            }
        }
    },
    {
        "name": "Pedido completamente SEM IPs",
        "order": {
            "id": 5678901240,
            "order_number": "#1007", 
            "created_at": "2025-08-13T17:00:00Z",
            "customer": {
                "id": 123462,
                "email": "customer7@example.com"
            }
            # Nenhum IP disponível em lugar algum
        }
    }
]

def test_real_ip_detection():
    """Testa a detecção de IPs usando a lógica REAL do detector"""
    
    print("TESTE REAL DE DETECCAO DE IPs - USANDO LOGICA DO SHOPIFY_DETECTOR")
    print("=" * 70)
    
    # Cria instância do detector (sem credenciais reais - apenas para usar os métodos)
    detector = ShopifyDuplicateOrderDetector("test.myshopify.com", "fake_token")
    
    results = []
    
    for test_case in test_cases:
        print(f"\n{'=' * 20} {test_case['name']} {'=' * 20}")
        
        order = test_case['order']
        
        # USA A FUNÇÃO REAL DO DETECTOR
        real_ip, ip_source = detector._extract_real_customer_ip(order)
        
        # Verifica se IP é suspeito (se encontrado)
        is_suspicious = False
        suspicious_pattern = None
        if real_ip:
            is_suspicious = detector._is_suspicious_ip(real_ip)
            if is_suspicious:
                suspicious_pattern = detector._get_suspicious_pattern(real_ip)
        
        result = {
            "test_name": test_case['name'],
            "order_id": order['id'],
            "order_number": order['order_number'],
            "ip_found": bool(real_ip),
            "ip_value": real_ip,
            "ip_source": ip_source,
            "is_suspicious": is_suspicious,
            "suspicious_pattern": suspicious_pattern
        }
        
        results.append(result)
        
        # Log do resultado
        if real_ip:
            status = "[OK]" if not is_suspicious else "[SUSPEITO]"
            print(f"  {status} IP ENCONTRADO: {real_ip}")
            print(f"      - Fonte: {ip_source}")
            if is_suspicious:
                print(f"      - Padrão suspeito: {suspicious_pattern}")
        else:
            print("  [ERRO] NENHUM IP ENCONTRADO")
        
        # Debug da estrutura disponível
        available_sections = []
        if order.get('client_details'):
            cd = order['client_details']
            fields = list(cd.keys())
            has_ip = any('ip' in field.lower() for field in fields)
            available_sections.append(f"client_details({len(fields)} campos, IP: {has_ip})")
        
        if order.get('customer', {}).get('default_address'):
            da = order['customer']['default_address']
            fields = list(da.keys())
            has_ip = any('ip' in field.lower() for field in fields)
            available_sections.append(f"customer.default_address({len(fields)} campos, IP: {has_ip})")
        
        if order.get('shipping_address'):
            sa = order['shipping_address']
            fields = list(sa.keys())
            has_ip = any('ip' in field.lower() for field in fields)
            available_sections.append(f"shipping_address({len(fields)} campos, IP: {has_ip})")
        
        if order.get('billing_address'):
            ba = order['billing_address']
            fields = list(ba.keys())
            has_ip = any('ip' in field.lower() for field in fields)
            available_sections.append(f"billing_address({len(fields)} campos, IP: {has_ip})")
        
        # Campos diretos do pedido com 'ip'
        order_ip_fields = [key for key in order.keys() if 'ip' in key.lower()]
        if order_ip_fields:
            available_sections.append(f"order_level_ips({order_ip_fields})")
        
        print(f"      - Estrutura disponível: {', '.join(available_sections) if available_sections else 'Nenhuma seção com IP'}")
        
        print(f"\n{'-' * 80}")
    
    # Resumo dos resultados
    print(f"\n{'='*20} RESUMO FINAL {'='*20}")
    
    total_tests = len(results)
    tests_with_ip = sum(1 for r in results if r['ip_found'])
    tests_without_ip = total_tests - tests_with_ip
    suspicious_ips = sum(1 for r in results if r.get('is_suspicious', False))
    
    print(f"Total de testes: {total_tests}")
    print(f"IPs encontrados: {tests_with_ip} ({(tests_with_ip/total_tests)*100:.1f}%)")
    print(f"IPs NOT encontrados: {tests_without_ip} ({(tests_without_ip/total_tests)*100:.1f}%)")
    print(f"IPs suspeitos: {suspicious_ips} ({(suspicious_ips/total_tests)*100:.1f}%)")
    
    # Fontes de IP utilizadas
    sources_used = {}
    for r in results:
        if r['ip_found'] and r['ip_source']:
            source = r['ip_source']
            if source not in sources_used:
                sources_used[source] = 0
            sources_used[source] += 1
    
    if sources_used:
        print(f"\nFONTES DE IP UTILIZADAS:")
        for source, count in sorted(sources_used.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / tests_with_ip) * 100 if tests_with_ip > 0 else 0
            print(f"  - {source}: {count} casos ({percentage:.1f}%)")
    
    # Casos problemáticos 
    problematic_cases = [r for r in results if not r['ip_found']]
    if problematic_cases:
        print(f"\nCASOS PROBLEMATICOS (sem IP):")
        for case in problematic_cases:
            print(f"  - {case['test_name']}")
    
    # Casos suspeitos
    suspicious_cases = [r for r in results if r.get('is_suspicious', False)]
    if suspicious_cases:
        print(f"\nCASOS SUSPEITOS:")
        for case in suspicious_cases:
            print(f"  - {case['test_name']}: IP {case['ip_value']} ({case['suspicious_pattern']})")
    
    print(f"\n{'='*20} CONCLUSOES {'='*20}")
    
    if tests_with_ip >= tests_without_ip:
        print("[OK] A lógica atual do detector consegue extrair IPs na maioria dos casos")
    else:
        print("[PROBLEMA] A lógica atual falha em muitos casos - precisa de melhorias")
    
    if suspicious_ips > 0:
        print(f"[ATENCAO] {suspicious_ips} IP(s) detectado(s) como suspeito(s) - filtrar duplicatas")
    
    expected_working_cases = [
        "Pedido COM client_details.browser_ip (cenário atual funcionando)",
        "Pedido com IP em customer.default_address (solução prioritária)",
        "Pedido com IP em shipping_address", 
        "Pedido com IP direto no pedido (nível raiz)"
    ]
    
    working_cases = sum(1 for r in results if r['ip_found'] and r['test_name'] in expected_working_cases)
    expected_cases = len(expected_working_cases)
    
    print(f"\nCasos que DEVERIAM funcionar: {working_cases}/{expected_cases}")
    
    if working_cases == expected_cases:
        print("[OK] Todos os casos esperados estão funcionando!")
        print("PRÓXIMO PASSO: Testar com dados REAIS de produção")
    else:
        print("[PROBLEMA] Nem todos os casos esperados funcionam")
        print("PRÓXIMO PASSO: Corrigir lógica de extração de IPs")
    
    return results

if __name__ == "__main__":
    test_real_ip_detection()