import requests
import json
from datetime import datetime

BASE_URL = 'http://127.0.0.1:8000'
session = requests.Session()

print('REVIEW AGENT - TESTE DO DETECTOR DE IP')
print('=' * 60)

# Get CSRF token
csrf_response = session.get(f'{BASE_URL}/api/ensure-csrf/')
csrf_token = session.cookies.get('csrftoken')
print(f'CSRF Token: {"OK" if csrf_token else "FAILED"}')

# Login
login_data = {'email': 'teste@loja.com', 'password': '123456'}
login_response = session.post(f'{BASE_URL}/api/login/', json=login_data, headers={'X-CSRFToken': csrf_token})
print(f'Login: {login_response.status_code}')

if login_response.status_code == 200:
    print('LOGIN: SUCCESS')
    
    # Test buscar IPs
    payload = {'loja_id': 1, 'days': 30}
    ip_response = session.post(f'{BASE_URL}/api/processamento/buscar-ips-duplicados-simples/', 
                              json=payload, headers={'X-CSRFToken': csrf_token}, timeout=30)
    
    print(f'Buscar IPs: {ip_response.status_code}')
    
    if ip_response.status_code == 200:
        data = ip_response.json()
        ips_duplicados = data.get('ips_duplicados', [])
        print(f'IPs encontrados: {len(ips_duplicados)}')
        
        target_found = False
        for ip_group in ips_duplicados[:5]:
            ip = ip_group.get('browser_ip', '')
            total_pedidos = ip_group.get('total_pedidos', 0)
            print(f'  {ip}: {total_pedidos} pedidos')
            if ip == '31.217.1.48':
                target_found = True
                print('  >>> TARGET ENCONTRADO!')
        
        # Test detalhar IP
        if ips_duplicados:
            ip_to_test = '31.217.1.48' if target_found else ips_duplicados[0].get('browser_ip')
            detail_payload = {'loja_id': 1, 'ip': ip_to_test, 'days': 30}
            detail_response = session.post(f'{BASE_URL}/api/processamento/detalhar-pedidos-ip/', 
                                         json=detail_payload, headers={'X-CSRFToken': csrf_token}, timeout=30)
            
            print(f'Detalhar IP: {detail_response.status_code}')
            
            if detail_response.status_code == 200:
                detail_data = detail_response.json()
                if detail_data.get('success'):
                    client_details = detail_data.get('data', {}).get('client_details', [])
                    print(f'Pedidos detalhados: {len(client_details)}')
                    print(f'>>> MODAL DEVE MOSTRAR {len(client_details)} CARDS')
                    
                    print('\nRESULTADO: APROVADO')
                    print('Implementacao funcionando!')
                else:
                    print(f'Erro nos detalhes: {detail_data.get("error")}')
                    print('RESULTADO: MUDANCAS NECESSARIAS')
            else:
                print(f'Erro detalhar: {detail_response.status_code}')
                print('RESULTADO: MUDANCAS NECESSARIAS')
        else:
            print('Nenhum IP para testar detalhes')
            print('RESULTADO: MUDANCAS NECESSARIAS')
    else:
        print(f'Erro buscar: {ip_response.status_code}')
        print('RESULTADO: REJEITADO')
else:
    print(f'Login falhou: {login_response.status_code}')
    print('RESULTADO: REJEITADO')

print('=' * 60)
