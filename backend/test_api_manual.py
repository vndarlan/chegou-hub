"""
Script de teste manual para endpoints da API
IMPORTANTE: Ajustar credenciais antes de executar
"""
import requests
import json

# CONFIGURAR AQUI
BASE_URL = "http://localhost:8000/api"
EMAIL = "admin@exemplo.com"  # AJUSTAR COM EMAIL REAL
PASSWORD = "senha123"         # AJUSTAR COM SENHA REAL

print("=" * 80)
print("TESTE MANUAL DE ENDPOINTS DA API")
print("=" * 80)

# Criar sessão para manter cookies
session = requests.Session()

# 1. LOGIN
print(f"\n1️⃣ TESTANDO LOGIN")
print(f"   URL: {BASE_URL}/login/")
print(f"   Email: {EMAIL}")

try:
    login_response = session.post(f'{BASE_URL}/login/', json={
        'email': EMAIL,
        'password': PASSWORD
    })

    print(f"   Status: {login_response.status_code}")

    if login_response.status_code == 200:
        print(f"   ✅ Login bem-sucedido!")
        print(f"   Response: {json.dumps(login_response.json(), indent=2, ensure_ascii=False)}")
    else:
        print(f"   ❌ Login falhou!")
        print(f"   Response: {login_response.text}")
        print("\n⚠️ AJUSTE AS CREDENCIAIS NO ARQUIVO test_api_manual.py")
        exit(1)

except Exception as e:
    print(f"   ❌ Erro na requisição: {str(e)}")
    exit(1)

# 2. CURRENT STATE
print(f"\n2️⃣ TESTANDO CURRENT-STATE")
print(f"   URL: {BASE_URL}/current-state/")

try:
    state_response = session.get(f'{BASE_URL}/current-state/')
    print(f"   Status: {state_response.status_code}")

    if state_response.status_code == 200:
        data = state_response.json()
        print(f"   Response: {json.dumps(data, indent=2, ensure_ascii=False)}")

        # Verificar dados importantes
        print(f"\n   📊 ANÁLISE:")
        print(f"      Logged in: {data.get('logged_in')}")
        print(f"      Nome: {data.get('name')}")
        print(f"      Email: {data.get('email')}")
        print(f"      Organization: {data.get('organization')}")
        print(f"      Organization Role: {data.get('organization_role')}")

        if not data.get('organization'):
            print(f"\n      ⚠️ PROBLEMA: Organização não está sendo retornada!")
        else:
            print(f"\n      ✅ Organização encontrada no current-state")
    else:
        print(f"   ❌ Falha ao buscar current-state")
        print(f"   Response: {state_response.text}")

except Exception as e:
    print(f"   ❌ Erro na requisição: {str(e)}")

# 3. MINHAS ORGANIZAÇÕES
print(f"\n3️⃣ TESTANDO MINHAS ORGANIZAÇÕES")
print(f"   URL: {BASE_URL}/organizations/minhas_organizacoes/")

try:
    orgs_response = session.get(f'{BASE_URL}/organizations/minhas_organizacoes/')
    print(f"   Status: {orgs_response.status_code}")

    if orgs_response.status_code == 200:
        data = orgs_response.json()
        print(f"   Response: {json.dumps(data, indent=2, ensure_ascii=False)}")

        print(f"\n   📊 ANÁLISE:")
        print(f"      Total de organizações: {len(data)}")

        if len(data) == 0:
            print(f"\n      ⚠️ PROBLEMA: Nenhuma organização retornada!")
        else:
            print(f"\n      ✅ Organizações encontradas:")
            for org in data:
                print(f"         - {org.get('nome')} (ID: {org.get('id')}, Role: {org.get('role')})")
    else:
        print(f"   ❌ Falha ao buscar organizações")
        print(f"   Response: {orgs_response.text}")

except Exception as e:
    print(f"   ❌ Erro na requisição: {str(e)}")

print("\n" + "=" * 80)
print("FIM DOS TESTES")
print("=" * 80)