#!/usr/bin/env python3
"""
Script para testar sincronização Django com logs ultra-detalhados
"""
import os
import sys
import django
from datetime import datetime, timedelta

# Configurar Django
sys.path.append(r'C:\Users\Vinic\OneDrive\Documentos\Programação\chegou-hub\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Importar após setup do Django
from features.metricas_ecomhub.services import status_tracking_service

def testar_sincronizacao():
    """Testa a sincronização com logs ultra-detalhados"""
    
    print("="*80)
    print("TESTE DE SINCRONIZAÇÃO DJANGO COM LOGS ULTRA-DETALHADOS")
    print("="*80)
    
    # Período de teste (últimos 30 dias)
    data_fim = datetime.now().date()
    data_inicio = (datetime.now() - timedelta(days=30)).date()
    
    print(f"Período: {data_inicio} até {data_fim}")
    print(f"País: todos")
    print(f"Forçar: True (ignorar tempo de sincronização)")
    print()
    
    try:
        print("Iniciando sincronização...")
        
        # Chamar sincronização
        resultado = status_tracking_service.sincronizar_dados_pedidos(
            data_inicio=data_inicio,
            data_fim=data_fim,
            pais_id='todos',
            forcar=True  # Forçar para ignorar tempo de sincronização
        )
        
        print("\n" + "="*80)
        print("RESULTADO FINAL DA SINCRONIZAÇÃO")
        print("="*80)
        print(f"Status: {resultado.get('status')}")
        print(f"Mensagem: {resultado.get('message')}")
        
        if resultado.get('dados_processados'):
            dados = resultado['dados_processados']
            print(f"Total processados: {dados.get('total_processados', 0)}")
            print(f"Novos pedidos: {dados.get('novos_pedidos', 0)}")
            print(f"Pedidos atualizados: {dados.get('pedidos_atualizados', 0)}")
            print(f"Mudanças de status: {dados.get('mudancas_status', 0)}")
            print(f"Erros: {dados.get('erros', 0)}")
        
        if resultado.get('ultima_sincronizacao'):
            print(f"Última sincronização: {resultado['ultima_sincronizacao']}")
            
        print("\nOK TESTE CONCLUÍDO!")
        
    except Exception as e:
        print(f"\nERRO NO TESTE: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    testar_sincronizacao()