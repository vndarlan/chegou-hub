#!/usr/bin/env python
"""
Script de teste para análise de dados Shopify RAW
Este script simula dados reais do Shopify para testar nossa lógica de extração de IPs
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

from features.processamento.views import _analyze_ip_fields

# === DADOS SHOPIFY SIMULADOS BASEADOS NA ESTRUTURA REAL ===

# Caso 1: Pedido com client_details.browser_ip (cenário atual que deveria funcionar)
shopify_order_com_client_details = {
    "id": 5678901234,
    "order_number": "#1001",
    "created_at": "2025-08-13T11:00:00Z",
    "total_price": "29.99",
    "currency": "BRL",
    "financial_status": "paid",
    "fulfillment_status": None,
    "customer": {
        "id": 123456,
        "email": "customer@example.com",
        "first_name": "João",
        "last_name": "Silva",
        "phone": "+5511999887766",
        "accepts_marketing": True,
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2025-08-13T11:00:00Z",
        "orders_count": 3,
        "state": "enabled",
        "total_spent": "89.97",
        "last_order_id": 5678901234,
        "note": "",
        "verified_email": True,
        "multipass_identifier": None,
        "tax_exempt": False,
        "tags": "",
        "last_order_name": "#1001",
        "currency": "BRL",
        "marketing_opt_in_level": "single_opt_in",
        "tax_exemptions": [],
        "email_marketing_consent": {
            "state": "subscribed",
            "opt_in_level": "single_opt_in",
            "consent_updated_at": "2024-01-15T10:00:00Z"
        },
        "sms_marketing_consent": None,
        "admin_graphql_api_id": "gid://shopify/Customer/123456",
        "default_address": {
            "id": 234567,
            "customer_id": 123456,
            "first_name": "João",
            "last_name": "Silva",
            "company": None,
            "address1": "Rua das Flores, 123",
            "address2": "Apt 45",
            "city": "São Paulo",
            "province": "São Paulo",
            "country": "Brazil",
            "zip": "01310-100",
            "phone": "+5511999887766",
            "name": "João Silva",
            "province_code": "SP",
            "country_code": "BR",
            "country_name": "Brazil",
            "default": True
        }
    },
    "shipping_address": {
        "first_name": "João",
        "last_name": "Silva",
        "company": None,
        "address1": "Rua das Flores, 123",
        "address2": "Apt 45",
        "city": "São Paulo",
        "province": "São Paulo",
        "country": "Brazil",
        "zip": "01310-100",
        "phone": "+5511999887766",
        "name": "João Silva",
        "country_code": "BR",
        "province_code": "SP",
        "latitude": -23.5505,
        "longitude": -46.6333
    },
    "billing_address": {
        "first_name": "João",
        "last_name": "Silva",
        "company": None,
        "address1": "Rua das Flores, 123",
        "address2": "Apt 45",
        "city": "São Paulo",
        "province": "São Paulo",
        "country": "Brazil",
        "zip": "01310-100",
        "phone": "+5511999887766",
        "name": "João Silva",
        "country_code": "BR",
        "province_code": "SP",
        "latitude": -23.5505,
        "longitude": -46.6333
    },
    "client_details": {
        "browser_ip": "201.17.123.45",  # IP REAL esperado
        "accept_language": "pt-BR,pt;q=0.9,en;q=0.8",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "session_hash": "abc123def456789"
    },
    "line_items": [
        {
            "id": 789012345,
            "product_id": 987654321,
            "variant_id": 111222333,
            "title": "Produto Teste",
            "name": "Produto Teste",
            "vendor": "Minha Loja",
            "quantity": 1,
            "price": "29.99",
            "sku": "PROD-001",
            "variant_title": "Padrão",
            "fulfillment_service": "manual",
            "product_exists": True,
            "fulfillable_quantity": 1,
            "grams": 250,
            "requires_shipping": True,
            "taxable": True,
            "gift_card": False
        }
    ],
    "payment_details": {
        "credit_card_bin": "424242",
        "avs_result_code": "Y",
        "cvv_result_code": "M",
        "credit_card_number": "•••• •••• •••• 4242",
        "credit_card_company": "Visa"
    },
    "gateway": "shopify_payments",
    "source_name": "web",
    "processing_method": "direct",
    "checkout_token": "abc123def456",
    "reference": None,
    "source_identifier": None,
    "source_url": None,
    "device_id": None,
    "phone": None,
    "customer_url": "https://minha-loja.myshopify.com/customers/123456",
    "order_status_url": "https://minha-loja.myshopify.com/12345678/orders/abc123def456/authenticate?key=xyz789",
    "admin_graphql_api_id": "gid://shopify/Order/5678901234"
}

# Caso 2: Pedido SEM client_details (problema que estamos investigando)
shopify_order_sem_client_details = {
    "id": 5678901235,
    "order_number": "#1002",
    "created_at": "2025-08-13T12:00:00Z",
    "total_price": "49.99",
    "currency": "BRL",
    "financial_status": "paid",
    "fulfillment_status": None,
    "customer": {
        "id": 123457,
        "email": "customer2@example.com",
        "first_name": "Maria",
        "last_name": "Santos",
        "phone": "+5511888776655",
        "default_address": {
            "id": 234568,
            "customer_id": 123457,
            "first_name": "Maria",
            "last_name": "Santos",
            "address1": "Av. Paulista, 1000",
            "city": "São Paulo",
            "province": "São Paulo",
            "country": "Brazil",
            "zip": "01310-200",
            "phone": "+5511888776655"
        }
    },
    "shipping_address": {
        "first_name": "Maria",
        "last_name": "Santos",
        "address1": "Av. Paulista, 1000",
        "city": "São Paulo",
        "province": "São Paulo",
        "country": "Brazil",
        "zip": "01310-200",
        "phone": "+5511888776655"
    },
    "billing_address": {
        "first_name": "Maria",
        "last_name": "Santos",
        "address1": "Av. Paulista, 1000",
        "city": "São Paulo",
        "province": "São Paulo",
        "country": "Brazil",
        "zip": "01310-200",
        "phone": "+5511888776655"
    },
    # NOTA: client_details ausente completamente
    "line_items": [
        {
            "id": 789012346,
            "product_id": 987654322,
            "title": "Produto Teste 2",
            "quantity": 1,
            "price": "49.99",
            "sku": "PROD-002"
        }
    ],
    "gateway": "manual",
    "source_name": "shopify_draft_order"
}

# Caso 3: Pedido com possíveis IPs alternativos (cenários a investigar)
shopify_order_com_ips_alternativos = {
    "id": 5678901236,
    "order_number": "#1003",
    "created_at": "2025-08-13T13:00:00Z",
    "total_price": "79.99",
    "currency": "BRL",
    "customer": {
        "id": 123458,
        "email": "customer3@example.com",
        "first_name": "Pedro",
        "last_name": "Costa",
        "default_address": {
            "id": 234569,
            "first_name": "Pedro",
            "last_name": "Costa",
            "address1": "Rua B, 456",
            "city": "Rio de Janeiro",
            "country": "Brazil",
            "zip": "20040-020",
            # Possíveis campos IP alternativos que podem existir
            "client_ip": "177.12.34.56",  # Possível IP alternativo
            "customer_ip": "177.12.34.56"  # Outro possível campo
        }
    },
    "shipping_address": {
        "first_name": "Pedro",
        "last_name": "Costa",
        "address1": "Rua B, 456",
        "city": "Rio de Janeiro",
        "country": "Brazil",
        "zip": "20040-020",
        # Possível IP nos endereços
        "origin_ip": "177.12.34.56"
    },
    "billing_address": {
        "first_name": "Pedro",
        "last_name": "Costa",
        "address1": "Rua B, 456",
        "city": "Rio de Janeiro",
        "country": "Brazil",
        "zip": "20040-020"
    },
    "client_details": {
        # client_details existe mas sem browser_ip
        "accept_language": "pt-BR,pt;q=0.9",
        "user_agent": "Mozilla/5.0 Mobile",
        "session_hash": "mobile123456"
    },
    # Possíveis IPs no nível do pedido
    "customer_ip": "177.12.34.56",
    "browser_ip": "177.12.34.56",  # IP diretamente no pedido
    "line_items": [
        {
            "id": 789012347,
            "title": "Produto Premium",
            "quantity": 1,
            "price": "79.99",
            "sku": "PROD-003"
        }
    ]
}

def test_ip_analysis():
    """Testa a análise de IPs em diferentes cenários"""
    
    print("TESTE DE ANALISE DE IPs EM DADOS SHOPIFY RAW")
    print("=" * 60)
    
    test_cases = [
        ("Pedido COM client_details.browser_ip (cenário esperado)", shopify_order_com_client_details),
        ("Pedido SEM client_details (problema atual)", shopify_order_sem_client_details),
        ("Pedido com IPs alternativos (possíveis soluções)", shopify_order_com_ips_alternativos)
    ]
    
    for case_name, order_data in test_cases:
        print(f"\n{'=' * 20} {case_name} {'=' * 20}")
        
        # Executa análise usando nossa função MELHORADA
        try:
            from features.processamento.views import _analyze_ip_fields_improved
            ip_analysis = _analyze_ip_fields_improved(order_data)
            using_improved = True
        except ImportError:
            # Fallback para função antiga se a nova não estiver disponível
            ip_analysis = _analyze_ip_fields(order_data) 
            using_improved = False
        
        if using_improved:
            print(f"RESUMO (FUNCAO MELHORADA):")
            print(f"   - IP principal encontrado: {ip_analysis['primary_ip_found']}")
            print(f"   - IP: {ip_analysis['primary_ip'] or 'Nenhum'}")
            print(f"   - Fonte: {ip_analysis['primary_ip_source'] or 'N/A'}")
            print(f"   - Suspeito: {ip_analysis['is_suspicious']}")
            if ip_analysis['suspicious_pattern']:
                print(f"   - Padrao suspeito: {ip_analysis['suspicious_pattern']}")
            print(f"   - Secoes com IPs: {ip_analysis['summary']['sections_with_ips']}")
            print(f"   - Hierarquia (posicao): {ip_analysis['summary']['ip_source_hierarchy_position'] or 'N/A'}")
            
            print(f"\nRECOMENDACOES:")
            for rec in ip_analysis.get('recommendations', []):
                print(f"   - {rec}")
                
            print(f"\nANALISE ESTRUTURAL:")
            for section, data in ip_analysis['structure_analysis'].items():
                if data.get('exists', False):
                    status = "[OK]" if data.get('has_valid_ip', False) else "[SEM IP]"
                    print(f"   {status} {section}: {data['total_fields']} campos, IP valido: {data['has_valid_ip']}")
                    if data['ip_related_fields']:
                        for field, field_info in data['ip_related_fields'].items():
                            ip_status = "[VALIDO]" if field_info['is_valid_ip'] else "[INVALIDO]"
                            susp_status = " [SUSPEITO]" if field_info.get('is_suspicious', False) else ""
                            print(f"      {ip_status} {field}: {field_info['value']}{susp_status}")
                else:
                    print(f"   [NAO EXISTE] {section}")
        else:
            print(f"RESUMO (FUNCAO ANTIGA):")
            print(f"   - Total de IPs encontrados: {ip_analysis['summary']['total_ips_found']}")
            print(f"   - Possui client_details: {ip_analysis['summary']['has_client_details']}")
            print(f"   - Possui customer.default_address: {ip_analysis['summary']['has_customer_default_address']}")
            
            print(f"\nIPs ENCONTRADOS:")
            if ip_analysis['ips_found']:
                for ip_info in ip_analysis['ips_found']:
                    print(f"   [OK] IP: {ip_info['ip']} (Fonte: {ip_info['source_path']})")
            else:
                print("   [ERRO] Nenhum IP encontrado")
        
        print(f"\nANALISE POR SECAO:")
        
        # Client Details
        cd_analysis = ip_analysis['client_details_analysis']
        if cd_analysis.get('exists'):
            print(f"   Client Details: EXISTE")
            print(f"      - Campos totais: {len(cd_analysis['all_fields'])}")
            print(f"      - Campos: {cd_analysis['all_fields']}")
            if cd_analysis['ip_related_fields']:
                for field, info in cd_analysis['ip_related_fields'].items():
                    status = "[OK]" if info['looks_like_ip'] else "[AVISO]"
                    print(f"      {status} {field}: {info['value']}")
            else:
                print("      [ERRO] Nenhum campo de IP em client_details")
        else:
            print(f"   [ERRO] Client Details: NAO EXISTE")
        
        # Customer Analysis
        customer_analysis = ip_analysis['customer_analysis']
        if customer_analysis.get('exists'):
            print(f"   Customer: EXISTE")
            if customer_analysis.get('default_address', {}).get('exists'):
                da = customer_analysis['default_address']
                print(f"      Default Address: EXISTE")
                print(f"         - Campos: {da['all_fields']}")
                if da['ip_related_fields']:
                    for field, info in da['ip_related_fields'].items():
                        status = "[OK]" if info['looks_like_ip'] else "[AVISO]"
                        print(f"         {status} {field}: {info['value']}")
                else:
                    print("         [ERRO] Nenhum IP em default_address")
            else:
                print(f"      [ERRO] Default Address: NAO EXISTE")
        else:
            print(f"   [ERRO] Customer: NAO EXISTE")
        
        # Order Level
        order_analysis = ip_analysis['order_level_analysis']
        if order_analysis['ip_related_fields']:
            print(f"   Nivel do Pedido: {len(order_analysis['ip_related_fields'])} campos IP")
            for field, info in order_analysis['ip_related_fields'].items():
                status = "[OK]" if info['looks_like_ip'] else "[AVISO]"
                print(f"      {status} {field}: {info['value']}")
        else:
            print(f"   [ERRO] Nivel do Pedido: Nenhum campo IP")
        
        print(f"\n{'-' * 80}")
    
    print(f"\nCONCLUSOES E RECOMENDACOES:")
    print(f"1. [OK] Cenario 1 (COM client_details.browser_ip) funcionara perfeitamente")
    print(f"2. [ERRO] Cenario 2 (SEM client_details) e o problema atual - sem IP disponivel")
    print(f"3. [SOLUCAO] Cenario 3 (IPs alternativos) mostra possiveis solucoes:")
    print(f"   - customer.default_address.client_ip")
    print(f"   - shipping_address.origin_ip")
    print(f"   - order.customer_ip (nivel raiz)")
    print(f"   - order.browser_ip (nivel raiz)")
    print(f"\nPROXIMOS PASSOS:")
    print(f"1. Executar este teste com dados REAIS de producao")
    print(f"2. Implementar hierarquia de busca de IPs baseada nos resultados")
    print(f"3. Atualizar shopify_detector.py com novas fontes de IP")

if __name__ == "__main__":
    test_ip_analysis()