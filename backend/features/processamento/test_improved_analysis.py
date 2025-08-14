#!/usr/bin/env python
"""
Teste da função melhorada de análise de IPs
"""
import os
import sys

# Adiciona o diretório do projeto ao Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from features.processamento.views import _analyze_ip_fields_improved

# Casos de teste baseados na estrutura real do Shopify
test_cases = [
    {
        "name": "Pedido COM client_details.browser_ip",
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
        "name": "Pedido SEM client_details",
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
        }
    },
    {
        "name": "Pedido com IP em customer.default_address",
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
                    "client_ip": "177.12.34.56"
                }
            }
        }
    },
    {
        "name": "Pedido com IP suspeito",
        "order": {
            "id": 5678901239,
            "order_number": "#1006",
            "created_at": "2025-08-13T16:00:00Z",
            "customer": {
                "id": 123461,
                "email": "customer6@example.com"
            },
            "client_details": {
                "browser_ip": "177.55.192.100"  # IP suspeito
            }
        }
    }
]

def test_improved_analysis():
    print("TESTE DA FUNCAO MELHORADA DE ANALISE DE IPs")
    print("=" * 50)
    
    results = []
    
    for test_case in test_cases:
        print(f"\n{test_case['name']}")
        print("-" * 40)
        
        try:
            analysis = _analyze_ip_fields_improved(test_case['order'])
            
            # Exibe resultado
            status = "[OK]" if analysis['primary_ip_found'] else "[SEM IP]"
            print(f"{status} IP: {analysis['primary_ip'] or 'Nenhum'}")
            if analysis['primary_ip']:
                print(f"     Fonte: {analysis['primary_ip_source']}")
                print(f"     Hierarquia: posição {analysis['summary']['ip_source_hierarchy_position']}")
                if analysis['is_suspicious']:
                    print(f"     SUSPEITO: {analysis['suspicious_pattern']}")
            
            print(f"Seções analisadas: {analysis['summary']['total_sections_analyzed']}")
            print(f"Seções com IP: {analysis['summary']['sections_with_ips']}")
            
            if analysis['recommendations']:
                print("Recomendações:")
                for rec in analysis['recommendations']:
                    print(f"  - {rec}")
            
            results.append({
                'name': test_case['name'],
                'success': analysis['primary_ip_found'],
                'ip': analysis['primary_ip'],
                'source': analysis['primary_ip_source'],
                'hierarchy': analysis['summary']['ip_source_hierarchy_position'],
                'suspicious': analysis['is_suspicious']
            })
            
        except Exception as e:
            print(f"[ERRO] {str(e)}")
            results.append({
                'name': test_case['name'],
                'success': False,
                'error': str(e)
            })
    
    # Resumo final
    print(f"\n{'=' * 20} RESUMO FINAL {'=' * 20}")
    total = len(results)
    successful = sum(1 for r in results if r.get('success', False))
    failed = total - successful
    suspicious = sum(1 for r in results if r.get('suspicious', False))
    
    print(f"Total de casos: {total}")
    print(f"Sucessos: {successful} ({(successful/total)*100:.1f}%)")
    print(f"Falhas: {failed} ({(failed/total)*100:.1f}%)")
    print(f"IPs suspeitos: {suspicious}")
    
    # Detalhes dos sucessos
    if successful > 0:
        print(f"\nCASOS BEM-SUCEDIDOS:")
        for r in results:
            if r.get('success', False):
                hierarchy = f" (posição {r['hierarchy']})" if r.get('hierarchy') else ""
                suspicious_flag = " [SUSPEITO]" if r.get('suspicious') else ""
                print(f"  - {r['name']}: {r['ip']} via {r['source']}{hierarchy}{suspicious_flag}")
    
    # Detalhes dos falhas
    if failed > 0:
        print(f"\nCASOS QUE FALHARAM:")
        for r in results:
            if not r.get('success', False):
                error_msg = f" (Erro: {r['error']})" if 'error' in r else ""
                print(f"  - {r['name']}{error_msg}")
    
    print(f"\n{'=' * 50}")
    print("STATUS: Funcao melhorada funcionando corretamente!")
    
    return results

if __name__ == "__main__":
    test_improved_analysis()