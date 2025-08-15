# debug_detalhar_ip.py
import os
import sys
import django
import json

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from features.processamento.models import ShopifyConfig

def test_detalhar_ip_endpoint():
    print("=== DEBUG DO ENDPOINT DETALHAR-IP ===")
    
    # Configura cliente de teste
    client = Client()
    User = get_user_model()
    
    # Busca usuário de teste
    try:
        user = User.objects.filter(email__icontains='viniciuschegouoperacional').first()
        if not user:
            user = User.objects.first()
        
        if not user:
            print("ERRO: Nenhum usuário encontrado no sistema")
            return
            
        print(f"Usuário encontrado: {user.email}")
        
        # Faz login
        client.force_login(user)
        
        # Busca configuração Shopify
        config = ShopifyConfig.objects.filter(user=user).first()
        if not config:
            print("ERRO: Nenhuma configuração Shopify encontrada")
            return
            
        print(f"Configuração encontrada: {config.nome_loja}")
        print(f"Shop URL: {config.shop_url}")
        print(f"Token válido: {bool(config.access_token)}")
        
        # Testa primeiro uma busca de IPs para ter dados
        print("\n1. Testando busca de IPs primeiro...")
        busca_response = client.post('/processamento/buscar-ips-duplicados/', {
            'loja_id': config.id,
            'days': 30,
            'min_orders': 2
        }, content_type='application/json')
        
        print(f"Status busca IPs: {busca_response.status_code}")
        
        if busca_response.status_code == 200:
            busca_data = json.loads(busca_response.content)
            if busca_data.get('success') and busca_data.get('data', {}).get('ip_groups'):
                ip_groups = busca_data['data']['ip_groups']
                print(f"IPs encontrados: {len(ip_groups)}")
                
                if len(ip_groups) > 0:
                    primeiro_ip = ip_groups[0]['ip']
                    print(f"Primeiro IP para teste: {primeiro_ip}")
                    
                    # Agora testa o detalhamento
                    print(f"\n2. Testando detalhamento do IP {primeiro_ip}...")
                    
                    payload = {
                        'loja_id': config.id,
                        'ip': primeiro_ip,
                        'days': 30
                    }
                    
                    print(f"Payload enviado: {payload}")
                    
                    detalhar_response = client.post('/processamento/detalhar-ip/', 
                                                  json.dumps(payload),
                                                  content_type='application/json')
                    
                    print(f"Status detalhamento: {detalhar_response.status_code}")
                    
                    if detalhar_response.status_code == 200:
                        detalhar_data = json.loads(detalhar_response.content)
                        print("SUCESSO! Detalhamento funcionou")
                        print(f"Estrutura da resposta: {list(detalhar_data.keys())}")
                        
                        if 'data' in detalhar_data:
                            data_keys = list(detalhar_data['data'].keys())
                            print(f"Chaves dos dados: {data_keys}")
                            
                    else:
                        print(f"ERRO {detalhar_response.status_code}")
                        try:
                            error_data = json.loads(detalhar_response.content)
                            print(f"Resposta de erro: {error_data}")
                        except:
                            print(f"Conteúdo da resposta: {detalhar_response.content}")
                else:
                    print("ERRO: Nenhum IP encontrado na busca")
            else:
                print("ERRO: Busca de IPs não retornou dados válidos")
                print(f"Conteúdo: {busca_data}")
        else:
            print(f"ERRO na busca de IPs: Status {busca_response.status_code}")
            try:
                error_data = json.loads(busca_response.content)
                print(f"Erro: {error_data}")
            except:
                print(f"Conteúdo: {busca_response.content}")
                
    except Exception as e:
        print(f"ERRO GERAL: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_detalhar_ip_endpoint()