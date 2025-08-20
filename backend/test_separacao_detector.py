#!/usr/bin/env python3
"""
🧪 TESTE DA SEPARAÇÃO DETECTOR IP vs DUPLICATAS
Verifica se a separação dos métodos está funcionando corretamente
"""

import sys
import os
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.processamento.services.shopify_detector import ShopifyDuplicateOrderDetector
from features.processamento.models import ShopifyConfig

def test_separacao_metodos():
    """Testa se os métodos estão separados corretamente"""
    
    print("🧪 INICIANDO TESTE DE SEPARAÇÃO DOS DETECTORES")
    print("=" * 60)
    
    # Pega primeira loja ativa para teste
    config = ShopifyConfig.objects.filter(ativo=True).first()
    if not config:
        print("❌ Nenhuma loja ativa encontrada para teste")
        return False
    
    print(f"📊 Testando com loja: {config.nome_loja}")
    
    # Inicializa detector
    detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
    
    # TESTE 1: Método para IP (deve incluir cancelados)
    print("\n🔍 TESTE 1: Detector de IP (deve incluir cancelados)")
    try:
        ip_orders = detector.get_all_orders_for_ip_detection(days_back=7)
        cancelled_count_ip = sum(1 for order in ip_orders if order.get('_is_cancelled', False))
        print(f"   ✅ Total pedidos IP: {len(ip_orders)}")
        print(f"   📊 Cancelados incluídos: {cancelled_count_ip}")
        print(f"   🎯 Inclui cancelados: {'SIM' if cancelled_count_ip > 0 else 'NÃO'}")
    except Exception as e:
        print(f"   ❌ Erro no detector IP: {e}")
        return False
    
    # TESTE 2: Método para duplicatas (deve excluir cancelados)
    print("\n🔄 TESTE 2: Detector de Duplicatas (deve excluir cancelados)")
    try:
        dup_orders = detector.get_all_orders_for_duplicates(days_back=7)
        cancelled_count_dup = sum(1 for order in dup_orders if order.get('_is_cancelled', False))
        print(f"   ✅ Total pedidos Duplicatas: {len(dup_orders)}")
        print(f"   📊 Cancelados incluídos: {cancelled_count_dup}")
        print(f"   🎯 Exclui cancelados: {'SIM' if cancelled_count_dup == 0 else 'NÃO'}")
    except Exception as e:
        print(f"   ❌ Erro no detector duplicatas: {e}")
        return False
    
    # TESTE 3: Método legado (deve usar lógica de duplicatas)
    print("\n⚙️ TESTE 3: Método Legado get_all_orders() (deve usar lógica duplicatas)")
    try:
        legacy_orders = detector.get_all_orders(days_back=7)
        cancelled_count_legacy = sum(1 for order in legacy_orders if order.get('_is_cancelled', False))
        print(f"   ✅ Total pedidos Legado: {len(legacy_orders)}")
        print(f"   📊 Cancelados incluídos: {cancelled_count_legacy}")
        print(f"   🎯 Usa lógica duplicatas: {'SIM' if cancelled_count_legacy == 0 else 'NÃO'}")
        
        # Deve ser igual ao método de duplicatas
        same_as_duplicates = len(legacy_orders) == len(dup_orders)
        print(f"   🔗 Igual ao método duplicatas: {'SIM' if same_as_duplicates else 'NÃO'}")
    except Exception as e:
        print(f"   ❌ Erro no método legado: {e}")
        return False
    
    # TESTE 4: Teste do find_duplicate_orders (deve usar método correto)
    print("\n🔄 TESTE 4: find_duplicate_orders() (deve usar método sem cancelados)")
    try:
        duplicates = detector.find_duplicate_orders()
        print(f"   ✅ Duplicatas encontradas: {len(duplicates)}")
        print(f"   🎯 Método funcionando: SIM")
    except Exception as e:
        print(f"   ❌ Erro na busca de duplicatas: {e}")
        return False
    
    # VALIDAÇÃO FINAL
    print("\n" + "=" * 60)
    print("📋 RESULTADO DA SEPARAÇÃO:")
    
    ip_includes_cancelled = cancelled_count_ip > 0
    dup_excludes_cancelled = cancelled_count_dup == 0
    legacy_uses_dup_logic = cancelled_count_legacy == 0
    
    success = ip_includes_cancelled and dup_excludes_cancelled and legacy_uses_dup_logic
    
    print(f"   🔍 Detector IP inclui cancelados: {'✅ SIM' if ip_includes_cancelled else '❌ NÃO'}")
    print(f"   🔄 Detector Duplicatas exclui cancelados: {'✅ SIM' if dup_excludes_cancelled else '❌ NÃO'}")  
    print(f"   ⚙️ Método legado usa lógica duplicatas: {'✅ SIM' if legacy_uses_dup_logic else '❌ NÃO'}")
    
    if success:
        print("\n🎉 SEPARAÇÃO BEM-SUCEDIDA! Ambos detectores funcionando independentemente")
        print("   ✨ Detector IP: mantém pedidos cancelados para análise completa")
        print("   ✨ Detector Duplicatas: remove pedidos cancelados para evitar falsos positivos")
        return True
    else:
        print("\n❌ SEPARAÇÃO FALHOU! Verifique a implementação")
        return False

if __name__ == "__main__":
    success = test_separacao_metodos()
    sys.exit(0 if success else 1)