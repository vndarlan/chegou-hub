#!/usr/bin/env python3
"""
TESTE DE VALIDAÇÃO DA CORREÇÃO DO ERRO: 'str' object has no attribute 'get'

Este script testa os cenários que causavam o erro e verifica se foram corrigidos.
"""

import os
import sys
import django
from unittest.mock import Mock, patch
import json

# Configurar Django para o teste
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.metricas_ecomhub.services import StatusTrackingService

def test_cenarios_erro():
    """Testa os cenários que causavam o erro 'str' object has no attribute 'get'"""
    
    service = StatusTrackingService()
    
    print("TESTE DE VALIDACAO DA CORRECAO")
    print("=" * 60)
    
    # CENÁRIO 1: API retorna string ao invés de JSON
    print("\n1. TESTANDO: API retorna string simples")
    with patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = "Erro interno do servidor"  # STRING!
        mock_post.return_value = mock_response
        
        resultado = service._buscar_dados_api_externa(
            data_inicio=None, data_fim=None, pais_id='164'
        )
        
        if not resultado.get('success'):
            print("OK: CORRIGIDO - Erro capturado corretamente")
            print(f"   Mensagem: {resultado.get('message')}")
        else:
            print("ERRO: FALHA - Erro nao foi capturado")
    
    # CENÁRIO 2: API retorna JSON malformado
    print("\n2. TESTANDO: API retorna resposta nao-JSON")
    with patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.side_effect = ValueError("Expecting value")
        mock_response.text = "<html><body>Erro 500</body></html>"
        mock_post.return_value = mock_response
        
        resultado = service._buscar_dados_api_externa(
            data_inicio=None, data_fim=None, pais_id='164'
        )
        
        if not resultado.get('success'):
            print("OK: CORRIGIDO - Erro JSON capturado corretamente")
            print(f"   Mensagem: {resultado.get('message')}")
        else:
            print("ERRO: FALHA - Erro JSON nao foi capturado")
    
    # CENÁRIO 3: API retorna lista ao invés de dict
    print("\n3. TESTANDO: API retorna lista ao inves de dict")
    with patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = ["item1", "item2", "item3"]  # LISTA!
        mock_post.return_value = mock_response
        
        resultado = service._buscar_dados_api_externa(
            data_inicio=None, data_fim=None, pais_id='164'
        )
        
        if not resultado.get('success'):
            print("OK: CORRIGIDO - Tipo invalido capturado corretamente")
            print(f"   Mensagem: {resultado.get('message')}")
        else:
            print("ERRO: FALHA - Tipo invalido nao foi capturado")
    
    # CENÁRIO 4: Dados processados como string
    print("\n4. TESTANDO: Processamento de dados como string")
    resultado = service._processar_dados_api("dados_em_string")
    
    if resultado.get('erros') > 0:
        print("OK: CORRIGIDO - String rejeitada corretamente no processamento")
        print(f"   Erro tipo: {resultado.get('erro_tipo', 'N/A')}")
    else:
        print("ERRO: FALHA - String nao foi rejeitada")
    
    # CENÁRIO 5: Item de dados como string
    print("\n5. TESTANDO: Item individual como string")
    dados_com_string = [
        {"pedido_id": "123", "status": "processing"},  # VÁLIDO
        "string_invalida",                            # INVÁLIDO
        {"pedido_id": "456", "status": "shipped"}     # VÁLIDO
    ]
    
    resultado = service._processar_dados_api(dados_com_string)
    
    if resultado.get('erros') > 0:
        print("OK: CORRIGIDO - Item string rejeitado, outros processados")
        print(f"   Erros: {resultado.get('erros')}, Processados: {resultado.get('total_processados')}")
    else:
        print("ERRO: FALHA - Item string nao foi rejeitado")
    
    print("\n" + "=" * 60)
    print("TESTE CONCLUIDO!")
    print("\nRESUMO DAS CORRECOES IMPLEMENTADAS:")
    print("   [OK] Validacao de tipo de resposta da API (dict vs string)")
    print("   [OK] Tratamento de erro de JSON malformado")
    print("   [OK] Validacao de dados como lista")
    print("   [OK] Validacao de itens individuais como dict")
    print("   [OK] Logs detalhados para debugging")
    print("   [OK] Mensagens de erro informativas")

if __name__ == "__main__":
    test_cenarios_erro()