# backend/features/ia/test_whatsapp_integration.py - Teste da integração WhatsApp
"""
Script de teste para verificar se a integração com WhatsApp API está funcionando corretamente
"""

import os
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from .services import WhatsAppMetaAPIService
from .models import WhatsAppPhoneNumber, WhatsAppBusinessAccount

def test_api_connection():
    """Testa a conexão básica com a API"""
    print("🔍 Testando conexão com WhatsApp Meta API...")
    
    # Exemplo de tokens (você deve substituir pelos reais para testar)
    test_phone_number_id = "SEU_PHONE_NUMBER_ID_AQUI"  # Ex: "123456789012345"
    test_access_token = "SEU_ACCESS_TOKEN_AQUI"  # Seu token real
    
    if test_phone_number_id == "SEU_PHONE_NUMBER_ID_AQUI":
        print("❌ Configure os tokens de teste antes de executar:")
        print("   - test_phone_number_id: ID do número de telefone WhatsApp")
        print("   - test_access_token: Token de acesso da Meta API")
        return
    
    service = WhatsAppMetaAPIService()
    
    # Testar obtenção de detalhes do número
    print(f"📡 Buscando detalhes do número {test_phone_number_id}...")
    sucesso, dados = service.obter_detalhes_numero(test_phone_number_id, test_access_token)
    
    if sucesso:
        print("✅ Conexão com API funcionando!")
        print(f"📋 Dados obtidos:")
        print(f"   - ID: {dados.get('id')}")
        print(f"   - Número: {dados.get('display_phone_number')}")
        print(f"   - Nome verificado: {dados.get('verified_name')}")
        print(f"   - Qualidade: {dados.get('quality_rating')}")
        print(f"   - Limite: {dados.get('messaging_limit_tier')}")
        print(f"   - Status: {dados.get('status')}")
        print(f"   - WABA ID: {dados.get('whatsapp_business_account_id')}")
    else:
        print("❌ Erro na conexão:")
        print(f"   {dados}")

def test_serializer_create():
    """Testa a criação via serializer"""
    print("\n🧪 Testando criação via serializer...")
    
    # Exemplo de dados (substitua pelos reais)
    test_data = {
        'phone_number_id': 'SEU_PHONE_NUMBER_ID_AQUI',
        'access_token': 'SEU_ACCESS_TOKEN_AQUI',
        'bm_nome_customizado': 'Teste Business Manager',
        'pais_nome_customizado': 'Brasil',
        'perfil': 'Número de teste',
    }
    
    if test_data['phone_number_id'] == 'SEU_PHONE_NUMBER_ID_AQUI':
        print("❌ Configure os dados de teste antes de executar")
        return
    
    from .serializers import WhatsAppPhoneNumberCreateSerializer
    from django.contrib.auth.models import User
    
    # Buscar um usuário existente ou criar um de teste
    try:
        user = User.objects.first()
        if not user:
            user = User.objects.create_user(
                username='test_user', 
                password='test_pass',
                email='test@example.com'
            )
    except:
        print("❌ Erro ao buscar/criar usuário de teste")
        return
    
    # Simular contexto de request
    class MockRequest:
        def __init__(self, user):
            self.user = user
    
    context = {'request': MockRequest(user)}
    
    # Testar serializer
    serializer = WhatsAppPhoneNumberCreateSerializer(data=test_data, context=context)
    
    if serializer.is_valid():
        try:
            numero = serializer.save()
            print("✅ Número criado com sucesso via serializer!")
            print(f"   - ID: {numero.id}")
            print(f"   - Número: {numero.display_phone_number}")
            print(f"   - Qualidade: {numero.get_quality_rating_display()}")
            
        except Exception as e:
            print(f"❌ Erro ao salvar: {e}")
    else:
        print("❌ Dados inválidos:")
        print(f"   {serializer.errors}")

def test_database_models():
    """Testa os modelos de banco"""
    print("\n💾 Testando modelos de banco...")
    
    # Contar registros existentes
    wabas = WhatsAppBusinessAccount.objects.count()
    numeros = WhatsAppPhoneNumber.objects.count()
    
    print(f"📊 Estado atual do banco:")
    print(f"   - WhatsApp Business Accounts: {wabas}")
    print(f"   - Números WhatsApp: {numeros}")
    
    # Listar últimos números criados
    ultimos_numeros = WhatsAppPhoneNumber.objects.order_by('-criado_em')[:5]
    
    if ultimos_numeros:
        print(f"📋 Últimos {len(ultimos_numeros)} números:")
        for numero in ultimos_numeros:
            print(f"   - {numero.display_phone_number} ({numero.get_quality_rating_display()})")

if __name__ == "__main__":
    print("🚀 TESTE DA INTEGRAÇÃO WHATSAPP API")
    print("=" * 50)
    
    # Testar modelos primeiro
    test_database_models()
    
    # Testar API (descomente e configure para testar)
    # test_api_connection()
    
    # Testar serializer (descomente e configure para testar)  
    # test_serializer_create()
    
    print("\n✅ Teste concluído!")
    print("\nPara testar a API real:")
    print("1. Substitua os tokens de exemplo pelos reais")
    print("2. Descomente as funções test_api_connection() e test_serializer_create()")
    print("3. Execute novamente o script")