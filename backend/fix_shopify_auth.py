#!/usr/bin/env python3
"""
Script para corrigir problemas de autenticação do Shopify
Autor: Backend Agent
Data: 2025-08-15
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.processamento.models import ShopifyConfig
from features.processamento.services.shopify_detector import ShopifyDuplicateOrderDetector
from django.utils import timezone

def diagnose_shopify_auth():
    """Diagnostica problemas de autenticação do Shopify"""
    print("=== DIAGNOSTICO DE AUTENTICACAO SHOPIFY ===\n")
    
    configs = ShopifyConfig.objects.filter(ativo=True)
    print(f"Total de lojas ativas: {configs.count()}")
    
    issues_found = []
    
    for config in configs:
        print(f"\nLOJA: {config.nome_loja}")
        print(f"   URL: {config.shop_url}")
        print(f"   Criada em: {config.data_criacao.strftime('%d/%m/%Y %H:%M')}")
        
        # Teste de conexão
        detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
        
        try:
            success, message = detector.test_connection()
            if success:
                print(f"   Status: CONECTADO - {message}")
            else:
                print(f"   Status: ERRO - {message}")
                issues_found.append({
                    'config': config,
                    'error': message,
                    'type': 'connection_failed'
                })
                
        except Exception as e:
            print(f"   Status: EXCECAO - {str(e)}")
            issues_found.append({
                'config': config,
                'error': str(e),
                'type': 'exception'
            })
    
    print(f"\nRESUMO:")
    print(f"   Total de problemas encontrados: {len(issues_found)}")
    
    if issues_found:
        print(f"\nPROBLEMAS DETECTADOS:")
        for i, issue in enumerate(issues_found, 1):
            config = issue['config']
            print(f"   {i}. {config.nome_loja} ({config.shop_url})")
            print(f"      Erro: {issue['error']}")
            print(f"      Tipo: {issue['type']}")
    
    return issues_found

def fix_test_store_config():
    """Remove configuração de loja de teste inválida"""
    print("\n=== CORRECAO DE CONFIGURACAO INVALIDA ===\n")
    
    test_configs = ShopifyConfig.objects.filter(
        shop_url__icontains='test-store'
    )
    
    if test_configs.exists():
        print(f"Encontradas {test_configs.count()} configuracoes de teste")
        
        for config in test_configs:
            print(f"   Desativando: {config.nome_loja} ({config.shop_url})")
            config.ativo = False
            config.save()
            
        print("Configuracoes de teste desativadas")
    else:
        print("Nenhuma configuracao de teste encontrada")

def show_configuration_guide():
    """Mostra guia para configurar nova loja"""
    print("\n=== GUIA DE CONFIGURACAO NOVA LOJA ===\n")
    
    print("Para adicionar uma loja Shopify valida:")
    print("   1. Acesse o Admin da loja Shopify")
    print("   2. Va em Settings > Apps and sales channels")
    print("   3. Clique em 'Develop apps'")  
    print("   4. Crie um novo app privado")
    print("   5. Configure as permissoes necessarias:")
    print("      - read_orders (obrigatorio)")
    print("      - write_orders (para cancelamentos)")
    print("      - read_customers (recomendado)")
    print("   6. Instale o app e copie o Access Token")
    print("   7. Use o endpoint /api/processamento/lojas-config/ para adicionar")
    
    print("\nExemplo de requisicao:")
    print("""
    POST /api/processamento/lojas-config/
    {
        "nome_loja": "Minha Loja Real",
        "shop_url": "minha-loja-real.myshopify.com", 
        "access_token": "shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
    """)

def main():
    """Função principal"""
    print("INICIANDO DIAGNOSTICO E CORRECAO SHOPIFY AUTH")
    print("=" * 60)
    
    # 1. Diagnóstico
    issues = diagnose_shopify_auth()
    
    # 2. Correção de configurações inválidas
    fix_test_store_config()
    
    # 3. Guia de configuração
    show_configuration_guide()
    
    print("\n" + "=" * 60)
    print("DIAGNOSTICO CONCLUIDO")
    
    if issues:
        print("ACAO NECESSARIA: Configure uma loja Shopify valida")
        print("Consulte o guia acima para instrucoes detalhadas")
    else:
        print("Todas as configuracoes estao funcionais")

if __name__ == "__main__":
    main()