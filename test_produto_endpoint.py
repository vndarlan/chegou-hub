#!/usr/bin/env python3
"""
Script para testar o endpoint de produtos compartilhados manualmente
e verificar se o problema está no backend ou na integração
"""
import requests
import json
import sys

# Configuração da URL base (ajuste conforme seu ambiente)
# BASE_URL = "https://chegou-hub-production.up.railway.app"
BASE_URL = "http://localhost:8000"  # Para teste local

ENDPOINT_URL = f"{BASE_URL}/api/estoque/produtos-compartilhados/"

def test_endpoint_directly():
    """Testa o endpoint diretamente sem autenticação primeiro"""
    print("=== TESTE 1: GET sem autenticação ===")

    try:
        response = requests.get(ENDPOINT_URL)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print(f"Resposta: {json.dumps(data, indent=2)}")
        else:
            print(f"Erro: {response.text}")

    except Exception as e:
        print(f"ERRO na requisição: {e}")

    print("\n" + "="*50 + "\n")


def test_create_produto():
    """Testa criação de produto via POST"""
    print("=== TESTE 2: POST para criar produto ===")

    # Dados de exemplo para criar produto
    produto_data = {
        "nome": "Produto Teste API",
        "descricao": "Produto criado via teste direto da API",
        "fornecedor": "N1",
        "estoque_compartilhado": 10,
        "estoque_minimo": 5,
        "custo_unitario": "29.90",
        "ativo": True,
        "skus_data": [
            {
                "sku": "TEST-001",
                "descricao_variacao": "Variação teste"
            }
        ]
    }

    try:
        # Primeiro, tentar sem autenticação
        response = requests.post(
            ENDPOINT_URL,
            json=produto_data,
            headers={'Content-Type': 'application/json'}
        )

        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")

        if response.status_code in [200, 201]:
            data = response.json()
            print(f"PRODUTO CRIADO! Resposta: {json.dumps(data, indent=2)}")
            return data.get('id')
        else:
            print(f"ERRO: {response.text}")

            # Se der 401/403, pode ser autenticação
            if response.status_code in [401, 403]:
                print("Endpoint requer autenticacao")

            return None

    except Exception as e:
        print(f"ERRO na requisição: {e}")
        return None


def test_database_directly():
    """Testa verificação direta do banco via script Django"""
    print("=== TESTE 3: Verificação direta do banco ===")

    django_script = """
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.estoque.models import Produto
from django.contrib.auth.models import User

# Verificar se existe algum produto
total_produtos = Produto.objects.count()
print(f"Total de produtos no banco: {total_produtos}")

# Verificar usuários
total_usuarios = User.objects.count()
print(f"Total de usuários no banco: {total_usuarios}")

if total_usuarios > 0:
    usuario = User.objects.first()
    produtos_usuario = Produto.objects.filter(user=usuario).count()
    print(f"Produtos do primeiro usuário ({usuario.username}): {produtos_usuario}")

# Tentar criar um produto manualmente
try:
    if total_usuarios > 0:
        usuario = User.objects.first()
        produto_teste = Produto.objects.create(
            user=usuario,
            nome="Produto Teste Direto",
            fornecedor="N1",
            estoque_compartilhado=5,
            estoque_minimo=1
        )
        print(f"Produto criado diretamente no banco: ID {produto_teste.id}")

        # Verificar se foi salvo
        total_apos = Produto.objects.count()
        print(f"Total apos criacao: {total_apos}")

    else:
        print("Nenhum usuario encontrado para criar produto")

except Exception as e:
    print(f"Erro ao criar produto direto: {e}")
"""

    # Salvar script temporário
    script_path = "test_db_direct.py"
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(django_script)

    print(f"Script salvo em: {script_path}")
    print("Execute: cd backend && python ../test_db_direct.py")


def main():
    """Executa todos os testes"""
    print("INVESTIGACAO PROFUNDA - PROBLEMA PERSISTENCIA PRODUTOS")
    print("="*60)

    # Teste 1: Verificar endpoint básico
    test_endpoint_directly()

    # Teste 2: Tentar criar produto
    produto_id = test_create_produto()

    # Teste 3: Script para verificação direta do banco
    test_database_directly()

    print("\n" + "="*60)
    print("PROXIMOS PASSOS:")
    print("1. Execute o script de verificacao direta do banco")
    print("2. Verifique os logs do Railway em tempo real")
    print("3. Teste com autenticacao adequada se necessario")
    print("4. Verifique se ha middlewares bloqueando as requisicoes")


if __name__ == "__main__":
    main()