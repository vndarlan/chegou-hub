#!/usr/bin/env python3
"""
Teste do endpoint de produtos compartilhados COM AUTENTICAÇÃO
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/login/"
CSRF_URL = f"{BASE_URL}/api/ensure-csrf/"
ENDPOINT_URL = f"{BASE_URL}/api/estoque/produtos-compartilhados/"

def test_with_authentication():
    """Testa o endpoint com autenticação completa"""
    print("=== TESTE COM AUTENTICACAO ===")

    session = requests.Session()

    # 1. Fazer login para obter autenticação
    print("1. Fazendo login...")
    login_data = {
        "email": "admin@example.com",
        "password": "123456"
    }

    try:
        # Primeiro obter CSRF token
        csrf_response = session.get(CSRF_URL)
        print(f"CSRF Status: {csrf_response.status_code}")

        # Também tentar obter a página principal para CSRF
        if csrf_response.status_code != 200:
            home_response = session.get(BASE_URL + "/")
            print(f"Home page status: {home_response.status_code}")

        # Fazer login
        login_response = session.post(LOGIN_URL, json=login_data)
        print(f"Login Status: {login_response.status_code}")
        print(f"Login Response: {login_response.text[:200]}")

        if login_response.status_code not in [200, 201, 302]:
            print("ERRO no login, tentando sem CSRF...")

            # Tentar login direto
            login_response = session.post(LOGIN_URL, json=login_data)
            print(f"Login direto Status: {login_response.status_code}")

        # 2. Testar GET com autenticação
        print("\n2. Testando GET autenticado...")
        get_response = session.get(ENDPOINT_URL)
        print(f"GET Status: {get_response.status_code}")

        if get_response.status_code == 200:
            data = get_response.json()
            if isinstance(data, dict):
                print(f"GET Sucesso! Produtos existentes: {data.get('count', len(data.get('results', [])))}")
            else:
                print(f"GET Sucesso! Produtos existentes: {len(data) if isinstance(data, list) else 1}")
            print(f"Produtos: {json.dumps(data, indent=2)[:500]}...")
        else:
            print(f"GET Erro: {get_response.text}")

        # 3. Testar POST para criar produto
        print("\n3. Testando POST para criar produto...")

        produto_data = {
            "nome": "Produto Teste Auth",
            "descricao": "Produto criado via teste autenticado",
            "fornecedor": "N1",
            "estoque_compartilhado": 15,
            "estoque_minimo": 3,
            "custo_unitario": "39.90",
            "ativo": True,
            "skus_data": [
                {
                    "sku": "TEST-AUTH-001",
                    "descricao_variacao": "Variacao teste autenticado"
                }
            ]
        }

        # Obter CSRF token para POST
        csrf_token = session.cookies.get('csrftoken')
        headers = {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf_token
        } if csrf_token else {'Content-Type': 'application/json'}

        post_response = session.post(ENDPOINT_URL, json=produto_data, headers=headers)
        print(f"POST Status: {post_response.status_code}")

        if post_response.status_code in [200, 201]:
            created_data = post_response.json()
            print(f"PRODUTO CRIADO COM SUCESSO!")
            print(f"ID: {created_data.get('id')}")
            print(f"Nome: {created_data.get('nome')}")
            print(f"Estoque: {created_data.get('estoque_compartilhado')}")

            # 4. Verificar se foi salvo
            print("\n4. Verificando se produto foi salvo...")
            verify_response = session.get(ENDPOINT_URL)
            if verify_response.status_code == 200:
                verify_data = verify_response.json()

                if isinstance(verify_data, dict):
                    total = verify_data.get('count', len(verify_data.get('results', [])))
                    produtos = verify_data.get('results', [])
                else:
                    total = len(verify_data) if isinstance(verify_data, list) else 1
                    produtos = verify_data if isinstance(verify_data, list) else [verify_data]

                print(f"Total de produtos após criação: {total}")

                # Procurar o produto criado
                produto_criado = None
                for p in produtos:
                    if p.get('nome') == 'Produto Teste Auth':
                        produto_criado = p
                        break

                if produto_criado:
                    print("PRODUTO ENCONTRADO NA LISTAGEM!")
                    print(f"Confirmação - ID: {produto_criado.get('id')}, Nome: {produto_criado.get('nome')}")
                    return True
                else:
                    print("PRODUTO NAO ENCONTRADO NA LISTAGEM!")
                    print(f"Produtos disponíveis: {[p.get('nome') for p in produtos[:5]]}")
                    return False
            else:
                print("Erro ao verificar listagem")
                return False
        else:
            print(f"POST Erro: {post_response.text}")
            print(f"Headers enviados: {headers}")
            return False

    except Exception as e:
        print(f"ERRO na requisição: {e}")
        return False

def test_via_django_admin():
    """Testa via endpoint de admin do Django"""
    print("\n=== TESTE VIA DJANGO ADMIN ===")

    session = requests.Session()

    try:
        # Acessar página de admin
        admin_url = f"{BASE_URL}/admin/"
        admin_response = session.get(admin_url)
        print(f"Admin page status: {admin_response.status_code}")

        # Procurar por CSRF token na página
        csrf_token = None
        if 'csrfmiddlewaretoken' in admin_response.text:
            import re
            csrf_match = re.search(r'name=\'csrfmiddlewaretoken\' value=\'([^\']+)\'', admin_response.text)
            if csrf_match:
                csrf_token = csrf_match.group(1)
                print(f"CSRF token encontrado: {csrf_token[:10]}...")

        # Login via admin
        login_data = {
            'username': 'admin',
            'password': '123456',
            'csrfmiddlewaretoken': csrf_token,
            'next': '/admin/'
        }

        admin_login_response = session.post(f"{BASE_URL}/admin/login/", data=login_data)
        print(f"Admin login status: {admin_login_response.status_code}")

        if admin_login_response.status_code in [200, 302]:
            print("Login admin bem-sucedido!")

            # Agora testar API
            api_response = session.get(ENDPOINT_URL)
            print(f"API após login admin status: {api_response.status_code}")

            if api_response.status_code == 200:
                data = api_response.json()
                print(f"API funcionando! Produtos: {data.get('count', 0)}")
            else:
                print(f"API error: {api_response.text}")

    except Exception as e:
        print(f"Erro no teste admin: {e}")

def main():
    print("TESTE COMPLETO COM AUTENTICACAO")
    print("="*50)

    # Aguardar servidor iniciar
    print("Aguardando servidor local...")
    time.sleep(2)

    # Teste 1: Com autenticação via API
    success = test_with_authentication()

    # Teste 2: Via Django admin
    test_via_django_admin()

    print("\n" + "="*50)
    if success:
        print("RESULTADO: ENDPOINT FUNCIONANDO CORRETAMENTE!")
        print("O problema NAO está no backend Django.")
        print("O problema deve estar na integração frontend -> backend Railway.")
    else:
        print("RESULTADO: Problema identificado no backend.")

if __name__ == "__main__":
    main()