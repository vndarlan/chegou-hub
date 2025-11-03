#!/usr/bin/env python3
"""
Script de diagnóstico: Comparar paginação correta vs incorreta
para descobrir se o sistema está deixando de buscar pedidos
"""

import requests
from datetime import datetime, date, timedelta
import json

TOKEN = "2f1ca7fc-7246-4d1b-8a4e-14583c782bfc"
SECRET = "secret_31086cf8d27a4a8cacfffe948e8afb60"

print("\n" + "=" * 90)
print("DIAGNÓSTICO DE PAGINAÇÃO - COMPARAR BUSCAS CORRETAS E INCORRETAS")
print("=" * 90)


def busca_incorreta():
    """Simula o que sync_service.py faz: busca apenas 1 página"""
    print("\n[1] BUSCANDO COM MÉTODO INCORRETO (sem paginação)...")
    print("    Isso é o que sync_service.py está fazendo agora\n")
    
    try:
        response = requests.get(
            "https://api.ecomhub.app/apps/orders",
            params={'token': TOKEN, 'orderBy': 'updatedAt', 'skip': 0},
            headers={'Secret': SECRET, 'Content-Type': 'application/json'},
            timeout=15
        )
        
        if response.status_code == 200:
            orders = response.json()
            print(f"    Status: {response.status_code}")
            print(f"    Pedidos retornados: {len(orders)}")
            
            if orders:
                print(f"    Primeiro pedido: {orders[0].get('id')} - {orders[0].get('date')}")
                print(f"    Último pedido: {orders[-1].get('id')} - {orders[-1].get('date')}")
            
            return orders
        else:
            print(f"    ERRO: Status {response.status_code}")
            return []
            
    except Exception as e:
        print(f"    ERRO: {e}")
        return []


def busca_correta():
    """Simula o que efetividade_v2_service.py faz: busca com paginação"""
    print("\n[2] BUSCANDO COM MÉTODO CORRETO (com paginação)...")
    print("    Isso é o que deveríamos estar fazendo\n")
    
    all_orders = []
    skip = 0
    page_size = 500
    max_pages = 200
    
    try:
        while True:
            page_num = (skip // page_size) + 1
            print(f"    Página {page_num:3d} (skip={skip:6d})...", end=" ")
            
            response = requests.get(
                "https://api.ecomhub.app/apps/orders",
                params={'token': TOKEN, 'orderBy': 'date', 'skip': skip},
                headers={'Secret': SECRET, 'Content-Type': 'application/json'},
                timeout=15
            )
            
            if response.status_code != 200:
                print(f"[ERRO {response.status_code}]")
                if skip == 0:
                    raise Exception(f"Falha na primeira página")
                break
            
            orders = response.json()
            
            if not orders or len(orders) == 0:
                print("[FIM - Array vazio]")
                break
            
            all_orders.extend(orders)
            print(f"[OK] {len(orders)} pedidos (total: {len(all_orders):6d})")
            
            if len(orders) < page_size:
                print(f"             [FIM - Menos de {page_size} retornados]")
                break
            
            skip += page_size
            
            if skip >= (max_pages * page_size):
                print(f"[AVISO] Atingido limite de {max_pages} páginas!")
                break
        
        return all_orders
        
    except Exception as e:
        print(f"    ERRO: {e}")
        return all_orders


def comparar_resultados(incorreta, correta):
    """Compara os dois resultados e calcula diferença"""
    print("\n" + "=" * 90)
    print("COMPARAÇÃO DOS RESULTADOS")
    print("=" * 90)
    
    total_incorreto = len(incorreta)
    total_correto = len(correta)
    diferenca = total_correto - total_incorreto
    pct_diferenca = (diferenca / total_correto * 100) if total_correto > 0 else 0
    
    print(f"\nMétodo INCORRETO (sem paginação): {total_incorreto:,} pedidos")
    print(f"Método CORRETO (com paginação):   {total_correto:,} pedidos")
    print(f"\nPEDIDOS FALTANDO: {diferenca:,} ({pct_diferenca:.1f}%)")
    
    if diferenca > 0:
        print("\n[PROBLEMA CONFIRMADO!]")
        print(f"O sistema está deixando de buscar {diferenca:,} pedidos!")
    elif diferenca == 0:
        print("\n[OK] Ambos os métodos retornam o mesmo número de pedidos")
    else:
        print(f"\n[Informação] Método correto retornou {abs(diferenca)} a menos")
    
    # Análise de datas
    if incorreta and correta:
        incorreta_datas = [o.get('date') for o in incorreta if o.get('date')]
        correta_datas = [o.get('date') for o in correta if o.get('date')]
        
        if incorreta_datas and correta_datas:
            print(f"\nRanges de datas:")
            print(f"  Método INCORRETO: {min(incorreta_datas)} a {max(incorreta_datas)}")
            print(f"  Método CORRETO:   {min(correta_datas)} a {max(correta_datas)}")
    
    return diferenca


def main():
    print("\nCarregando dados da API ECOMHUB...")
    print(f"Token: {TOKEN}")
    print(f"Secret: {SECRET[:20]}...")
    
    # Executar ambas as buscas
    incorreta = busca_incorreta()
    correta = busca_correta()
    
    # Comparar
    diferenca = comparar_resultados(incorreta, correta)
    
    # Recomendações
    print("\n" + "=" * 90)
    print("RECOMENDAÇÕES")
    print("=" * 90)
    
    if diferenca > 100:
        print(f"""
[AÇÃO IMEDIATA NECESSÁRIA]

O sistema NÃO está buscando todos os pedidos!

Problema: sync_service.py:fetch_orders_from_api() não implementa paginação
Arquivo: backend/features/metricas_ecomhub/services/sync_service.py (linhas 202-235)

Solução: Implementar paginação como em efetividade_v2_service.py (linhas 62-146)

Isso afeta:
- Sincronização automática de pedidos (sync_ecomhub_orders.py)
- Alertas e notificações podem estar baseados em dados incompletos
- Métricas de efetividade podem estar erradas

Próximo passo: Corrigir fetch_orders_from_api() para implementar paginação.
        """)
    elif diferenca > 0:
        print(f"""
[PROBLEMA IDENTIFICADO]

Sistema está deixando de buscar ~{diferenca} pedidos.

Implementar paginação em sync_service.py:fetch_orders_from_api()
        """)
    else:
        print("\n[OK] Sistema está funcionando corretamente (não há pedidos faltando)")
    
    print("=" * 90)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrompido pelo usuário")
    except Exception as e:
        print(f"\nErro: {e}")
        import traceback
        traceback.print_exc()
